import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("./registry", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./registry")>();
  return { ...actual, registerTool: vi.fn() };
});
vi.mock("@/lib/org-context", () => ({
  getOrgContext: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org-context";
import { dbChain } from "@/tests/mocks/supabase";
import {
  generateUnitsSchema,
  generateUnits,
  updateOrderStatus,
  createProductionOrder,
  moveUnit,
  scrapUnit,
} from "./production";

const mockCreateClient = vi.mocked(createClient);
const mockGetOrgContext = vi.mocked(getOrgContext);

const USER = { id: "user-abc" };
const ORG_CONTEXT = {
  userId: USER.id,
  orgId: "org-123",
  plantId: "plant-456",
  role: "owner" as const,
  orgName: "Test Org",
};
const ALGO = {
  id: "algo-id",
  prefix: "SN",
  pad_length: 6,
  current_counter: 0,
  part_number_id: "pn-id",
};
const PART_NUMBER_ID = "11111111-1111-1111-1111-111111111111";
const ROUTE_ID = "22222222-2222-2222-2222-222222222222";
const PRODUCTION_ORDER_ID = "33333333-3333-3333-3333-333333333333";
const UNIT_ID = "44444444-4444-4444-4444-444444444444";

function makeClient(fromChains: ReturnType<typeof dbChain>[], rpcResult?: { data: unknown; error: unknown }) {
  const client = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: USER } }) },
    from: vi.fn(),
    rpc: vi.fn().mockResolvedValue(rpcResult ?? { data: null, error: null }),
  };
  for (const chain of fromChains) {
    client.from.mockReturnValueOnce(chain);
  }
  mockCreateClient.mockResolvedValue(client as never);
  return client;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetOrgContext.mockResolvedValue(ORG_CONTEXT);
});

// --- generateUnitsSchema ---

describe("generateUnitsSchema validation", () => {
  const valid = {
    part_number_id: PART_NUMBER_ID,
    route_id: ROUTE_ID,
    count: 10,
  };

  it("accepts a valid input", () => {
    expect(() => generateUnitsSchema.parse(valid)).not.toThrow();
  });

  it("rejects count = 0 (min is 1)", () => {
    expect(() =>
      generateUnitsSchema.parse({ ...valid, count: 0 }),
    ).toThrow();
  });

  it("rejects count = 1001 (max is 1000)", () => {
    expect(() =>
      generateUnitsSchema.parse({ ...valid, count: 1001 }),
    ).toThrow();
  });

  it("accepts count = 1 (boundary)", () => {
    expect(() =>
      generateUnitsSchema.parse({ ...valid, count: 1 }),
    ).not.toThrow();
  });

  it("accepts count = 1000 (boundary)", () => {
    expect(() =>
      generateUnitsSchema.parse({ ...valid, count: 1000 }),
    ).not.toThrow();
  });

  it("rejects non-UUID part_number_id", () => {
    expect(() =>
      generateUnitsSchema.parse({ ...valid, part_number_id: "not-a-uuid" }),
    ).toThrow();
  });

  it("rejects non-UUID route_id", () => {
    expect(() =>
      generateUnitsSchema.parse({ ...valid, route_id: "not-a-uuid" }),
    ).toThrow();
  });
});

// --- generateUnits: serial number generation ---

describe("generateUnits — serial number generation", () => {
  function makeUnits(startCounter: number, count: number) {
    return Array.from({ length: count }, (_, i) => ({
      id: `unit-${i}`,
      serial_number: `SN-${String(startCounter + i + 1).padStart(6, "0")}`,
    }));
  }

  it("generates serials with correct prefix and zero-padded counter", async () => {
    const count = 3;
    const units = makeUnits(0, count);

    makeClient(
      [
        dbChain({ data: ALGO }),                          // SELECT serial_algorithm
        dbChain({ data: units }),                         // INSERT units
      ],
      { data: count, error: null },                       // rpc increment_serial_counter returns new counter
    );

    const result = await generateUnits({
      part_number_id: PART_NUMBER_ID,
      route_id: ROUTE_ID,
      count,
    });

    expect(result).toEqual(units);
  });

  it("continues serial numbers from the current counter", async () => {
    const count = 5;
    const units = makeUnits(997, count);

    makeClient(
      [
        dbChain({ data: { ...ALGO, current_counter: 997 } }),
        dbChain({ data: units }),
      ],
      { data: 1002, error: null },                        // rpc returns new counter (997 + 5)
    );

    const result = await generateUnits({
      part_number_id: PART_NUMBER_ID,
      route_id: ROUTE_ID,
      count,
    });

    expect(result).toEqual(units);
  });

  it("throws when no serial algorithm is configured", async () => {
    makeClient([
      dbChain({ data: null, error: { message: "not found" } }), // SELECT serial_algorithm
    ]);

    await expect(
      generateUnits({ part_number_id: PART_NUMBER_ID, route_id: ROUTE_ID, count: 1 }),
    ).rejects.toThrow("no serial algorithm configured");
  });

  it("throws when counter update fails", async () => {
    makeClient(
      [
        dbChain({ data: ALGO }),                                        // SELECT serial_algorithm
      ],
      { data: null, error: { message: "counter locked" } },            // rpc fails
    );

    await expect(
      generateUnits({ part_number_id: PART_NUMBER_ID, route_id: ROUTE_ID, count: 1 }),
    ).rejects.toThrow("counter update failed");
  });

  it("throws when not authenticated", async () => {
    mockGetOrgContext.mockRejectedValue(new Error("Not authenticated"));
    makeClient([]);

    await expect(
      generateUnits({ part_number_id: PART_NUMBER_ID, route_id: ROUTE_ID, count: 1 }),
    ).rejects.toThrow("Not authenticated");
  });
});

// --- updateOrderStatus: transition validation ---

describe("updateOrderStatus — state machine transitions", () => {
  function makeOrderClient(currentStatus: string, expectFetch = true) {
    const chains: ReturnType<typeof dbChain>[] = [
      dbChain({ data: { status: currentStatus } }), // SELECT order
    ];
    if (expectFetch) {
      chains.push(
        dbChain({ data: { id: "order-id", status: "running" } }), // UPDATE order
      );
    }
    return makeClient(chains);
  }

  it("allows new → scheduled", async () => {
    makeOrderClient("new");
    await expect(
      updateOrderStatus({ id: UNIT_ID, status: "scheduled" }),
    ).resolves.toBeDefined();
  });

  it("allows new → running", async () => {
    makeOrderClient("new");
    await expect(
      updateOrderStatus({ id: UNIT_ID, status: "running" }),
    ).resolves.toBeDefined();
  });

  it("allows running → complete", async () => {
    makeOrderClient("running");
    await expect(
      updateOrderStatus({ id: UNIT_ID, status: "complete" }),
    ).resolves.toBeDefined();
  });

  it("allows complete → closed", async () => {
    makeOrderClient("complete");
    await expect(
      updateOrderStatus({ id: UNIT_ID, status: "closed" }),
    ).resolves.toBeDefined();
  });

  it("rejects closed → running (no transitions from closed)", async () => {
    makeClient([
      dbChain({ data: { status: "closed" } }), // SELECT order
    ]);
    await expect(
      updateOrderStatus({ id: UNIT_ID, status: "running" }),
    ).rejects.toThrow("invalid transition closed → running");
  });

  it("rejects complete → new (backwards transition)", async () => {
    makeClient([
      dbChain({ data: { status: "complete" } }), // SELECT order
    ]);
    await expect(
      updateOrderStatus({ id: UNIT_ID, status: "new" }),
    ).rejects.toThrow("invalid transition complete → new");
  });

  it("rejects running → scheduled (backwards transition)", async () => {
    makeClient([
      dbChain({ data: { status: "running" } }),
    ]);
    await expect(
      updateOrderStatus({ id: UNIT_ID, status: "scheduled" }),
    ).rejects.toThrow("invalid transition running → scheduled");
  });

  it("throws when order is not found", async () => {
    makeClient([
      dbChain({ data: null, error: { message: "not found" } }),
    ]);
    await expect(
      updateOrderStatus({ id: UNIT_ID, status: "running" }),
    ).rejects.toThrow("order not found");
  });
});

// --- createProductionOrder: order number generation ---

describe("createProductionOrder — order number format", () => {
  it("generates PO-0001 when no prior orders exist", async () => {
    const countChain = dbChain({ count: 0, data: null });
    const insertChain = dbChain({ data: { id: "order-id", order_number: "PO-0001" } });

    makeClient([countChain, insertChain]);

    const result = await createProductionOrder({
      part_number_id: PART_NUMBER_ID,
      route_id: ROUTE_ID,
      quantity_ordered: 10,
    });

    expect(result).toEqual(expect.objectContaining({ order_number: "PO-0001" }));
  });

  it("generates PO-0100 when 99 prior orders exist", async () => {
    const countChain = dbChain({ count: 99, data: null });
    const insertChain = dbChain({ data: { id: "order-id", order_number: "PO-0100" } });

    makeClient([countChain, insertChain]);

    const result = await createProductionOrder({
      part_number_id: PART_NUMBER_ID,
      route_id: ROUTE_ID,
      quantity_ordered: 10,
    });

    expect(result).toEqual(expect.objectContaining({ order_number: "PO-0100" }));
  });
});

// --- moveUnit ---

describe("moveUnit", () => {
  const STEP = {
    id: "step-1",
    step_number: 1,
    name: "Assembly",
    workstation_id: "ws-1",
    pass_fail_gate: false,
  };
  const STEP_2 = { ...STEP, id: "step-2", step_number: 2, name: "Test" };

  it("throws when unit is not found", async () => {
    makeClient([
      dbChain({ data: null, error: { message: "not found" } }), // SELECT unit
    ]);
    await expect(moveUnit({ unit_id: UNIT_ID })).rejects.toThrow("unit not found");
  });

  it("throws when unit is not in_progress", async () => {
    makeClient([
      dbChain({ data: { id: UNIT_ID, status: "completed", current_step: 1, route_id: ROUTE_ID } }),
    ]);
    await expect(moveUnit({ unit_id: UNIT_ID })).rejects.toThrow("not in progress");
  });

  it("advances unit to next step when route is not complete", async () => {
    const unit = { id: UNIT_ID, status: "in_progress", current_step: 0, route_id: ROUTE_ID, production_order_id: null };
    const movedUnit = { ...unit, current_step: 1 };

    makeClient([
      dbChain({ data: unit }),                      // SELECT unit
      dbChain({ data: [STEP, STEP_2] }),            // SELECT route_steps
      dbChain({ data: movedUnit }),                  // UPDATE units (advance step)
    ]);

    const result = await moveUnit({ unit_id: UNIT_ID });
    expect(result).toMatchObject({ current_step: 1, current_step_name: "Assembly" });
  });

  it("marks unit as completed when last step is done", async () => {
    // Unit is at step 1 (the max step = 1), so nextStep > maxStep → complete
    const unit = { id: UNIT_ID, status: "in_progress", current_step: 1, route_id: ROUTE_ID, production_order_id: null };
    const completedUnit = { ...unit, status: "completed", current_step: 2 };

    makeClient([
      dbChain({ data: unit }),                       // SELECT unit
      dbChain({ data: [STEP] }),                     // SELECT route_steps (only 1 step)
      dbChain({ data: null }),                       // INSERT unit_history
      dbChain({ data: completedUnit }),              // UPDATE units (complete)
    ]);

    const result = await moveUnit({ unit_id: UNIT_ID });
    expect(result).toMatchObject({ completed: true });
  });
});

// --- scrapUnit ---

describe("scrapUnit", () => {
  it("throws when unit is not found", async () => {
    makeClient([
      dbChain({ data: null, error: { message: "not found" } }),
    ]);
    await expect(scrapUnit({ unit_id: UNIT_ID })).rejects.toThrow("unit not found");
  });

  it("throws when unit is already completed", async () => {
    makeClient([
      dbChain({ data: { id: UNIT_ID, status: "completed" } }),
    ]);
    await expect(scrapUnit({ unit_id: UNIT_ID })).rejects.toThrow("already completed");
  });

  it("marks unit as scrapped", async () => {
    const unit = { id: UNIT_ID, status: "in_progress", current_step: 0, route_id: ROUTE_ID };
    const scrapped = { ...unit, status: "scrapped" };

    makeClient([
      dbChain({ data: unit }),           // SELECT unit
      dbChain({ data: scrapped }),       // UPDATE units (scrap)
    ]);

    const result = await scrapUnit({ unit_id: UNIT_ID });
    expect(result).toMatchObject({ status: "scrapped" });
  });

  it("auto-completes order when last in_progress unit is scrapped", async () => {
    const unit = {
      id: UNIT_ID,
      status: "in_progress",
      current_step: 1,
      route_id: ROUTE_ID,
      production_order_id: PRODUCTION_ORDER_ID,
    };
    const scrapped = { ...unit, status: "scrapped" };

    const client = makeClient([
      dbChain({ data: unit }),                      // SELECT unit
      dbChain({ data: { id: "step-1", workstation_id: "ws-1" } }), // SELECT route_step
      dbChain({ data: null }),                      // INSERT unit_history
      dbChain({ data: scrapped }),                  // UPDATE units (scrap)
      dbChain({ data: null }),                      // INSERT quality_events
      dbChain({ count: 0, data: null }),            // SELECT units count (0 in_progress)
      dbChain({ data: null }),                      // UPDATE production_orders (complete)
    ]);

    const result = await scrapUnit({ unit_id: UNIT_ID });
    expect(result).toMatchObject({ status: "scrapped" });
    // Should have queried for remaining in_progress units and updated order
    expect(client.from).toHaveBeenCalledTimes(7);
  });

  it("does not auto-complete order when other units are still in_progress", async () => {
    const unit = {
      id: UNIT_ID,
      status: "in_progress",
      current_step: 1,
      route_id: ROUTE_ID,
      production_order_id: PRODUCTION_ORDER_ID,
    };
    const scrapped = { ...unit, status: "scrapped" };

    const client = makeClient([
      dbChain({ data: unit }),                      // SELECT unit
      dbChain({ data: { id: "step-1", workstation_id: "ws-1" } }), // SELECT route_step
      dbChain({ data: null }),                      // INSERT unit_history
      dbChain({ data: scrapped }),                  // UPDATE units (scrap)
      dbChain({ data: null }),                      // INSERT quality_events
      dbChain({ count: 3, data: null }),            // SELECT units count (3 still in_progress)
    ]);

    const result = await scrapUnit({ unit_id: UNIT_ID });
    expect(result).toMatchObject({ status: "scrapped" });
    // Should NOT update production_orders (6 calls, not 7)
    expect(client.from).toHaveBeenCalledTimes(6);
  });
});
