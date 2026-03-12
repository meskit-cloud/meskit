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
  createPartNumber,
  deletePartNumber,
  setBomEntrySchema,
  setBomEntry,
  createRouteSchema,
  createRoute,
  updateRoute,
  configureSerialAlgorithmSchema,
  configureSerialAlgorithm,
  getSerialAlgorithm,
} from "./product";

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
const PART_NUMBER_ID = "11111111-1111-1111-1111-111111111111";
const ROUTE_ID = "22222222-2222-2222-2222-222222222222";
const WS_ID = "33333333-3333-3333-3333-333333333333";
const ITEM_ID = "44444444-4444-4444-4444-444444444444";
const BOM_ENTRY_ID = "55555555-5555-5555-5555-555555555555";

function makeClient(fromChains: ReturnType<typeof dbChain>[]) {
  const client = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: USER } }) },
    from: vi.fn(),
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

// --- createPartNumber ---

describe("createPartNumber", () => {
  it("inserts and returns the part number", async () => {
    const pn = { id: PART_NUMBER_ID, name: "Widget A", user_id: USER.id };
    makeClient([dbChain({ data: pn })]);

    const result = await createPartNumber({ name: "Widget A" });
    expect(result).toEqual(pn);
  });

  it("throws when not authenticated", async () => {
    mockGetOrgContext.mockRejectedValue(new Error("Not authenticated"));
    makeClient([]);

    await expect(createPartNumber({ name: "Widget A" })).rejects.toThrow("Not authenticated");
  });

  it("throws when DB insert fails", async () => {
    makeClient([dbChain({ data: null, error: { message: "unique constraint" } })]);
    await expect(createPartNumber({ name: "Widget A" })).rejects.toThrow("create_part_number failed");
  });
});

// --- deletePartNumber ---

describe("deletePartNumber", () => {
  it("returns { success: true } on success", async () => {
    makeClient([dbChain({ data: null })]);
    const result = await deletePartNumber({ id: PART_NUMBER_ID });
    expect(result).toEqual({ success: true });
  });

  it("throws when DB delete fails", async () => {
    makeClient([dbChain({ data: null, error: { message: "fk violation" } })]);
    await expect(deletePartNumber({ id: PART_NUMBER_ID })).rejects.toThrow("delete_part_number failed");
  });
});

// --- setBomEntrySchema ---

describe("setBomEntrySchema", () => {
  const valid = {
    part_number_id: PART_NUMBER_ID,
    item_id: ITEM_ID,
    quantity: 2,
    position: 1,
  };

  it("accepts valid input", () => {
    expect(() => setBomEntrySchema.parse(valid)).not.toThrow();
  });

  it("rejects quantity = 0 (min is 1)", () => {
    expect(() => setBomEntrySchema.parse({ ...valid, quantity: 0 })).toThrow();
  });

  it("rejects position = 0 (min is 1)", () => {
    expect(() => setBomEntrySchema.parse({ ...valid, position: 0 })).toThrow();
  });

  it("rejects non-UUID part_number_id", () => {
    expect(() =>
      setBomEntrySchema.parse({ ...valid, part_number_id: "bad" }),
    ).toThrow();
  });

  it("rejects non-UUID item_id", () => {
    expect(() =>
      setBomEntrySchema.parse({ ...valid, item_id: "bad" }),
    ).toThrow();
  });
});

// --- setBomEntry: upsert logic ---

describe("setBomEntry — upsert", () => {
  const input = {
    part_number_id: PART_NUMBER_ID,
    item_id: ITEM_ID,
    quantity: 3,
    position: 2,
  };

  it("updates when an entry already exists for part_number + item", async () => {
    const existing = { id: BOM_ENTRY_ID };
    const updated = { ...existing, quantity: 3, position: 2 };

    makeClient([
      dbChain({ data: existing }),  // maybeSingle: entry exists
      dbChain({ data: updated }),   // UPDATE bom_entries
    ]);

    const result = await setBomEntry(input);
    expect(result).toEqual(updated);
  });

  it("inserts when no entry exists for part_number + item", async () => {
    const inserted = { id: "new-entry", ...input };

    makeClient([
      dbChain({ data: null }),      // maybeSingle: no existing entry
      dbChain({ data: inserted }),  // INSERT bom_entries
    ]);

    const result = await setBomEntry(input);
    expect(result).toEqual(inserted);
  });

  it("throws on update failure", async () => {
    makeClient([
      dbChain({ data: { id: BOM_ENTRY_ID } }),
      dbChain({ data: null, error: { message: "update failed" } }),
    ]);
    await expect(setBomEntry(input)).rejects.toThrow("set_bom_entry failed");
  });

  it("throws on insert failure", async () => {
    makeClient([
      dbChain({ data: null }),
      dbChain({ data: null, error: { message: "insert failed" } }),
    ]);
    await expect(setBomEntry(input)).rejects.toThrow("set_bom_entry failed");
  });
});

// --- createRouteSchema ---

describe("createRouteSchema", () => {
  const validStep = {
    workstation_id: WS_ID,
    step_number: 1,
    name: "Assembly",
  };
  const valid = {
    part_number_id: PART_NUMBER_ID,
    name: "Main Route",
    steps: [validStep],
  };

  it("accepts valid input with steps", () => {
    expect(() => createRouteSchema.parse(valid)).not.toThrow();
  });

  it("accepts empty steps array", () => {
    expect(() => createRouteSchema.parse({ ...valid, steps: [] })).not.toThrow();
  });

  it("rejects step_number = 0 (min is 1)", () => {
    expect(() =>
      createRouteSchema.parse({
        ...valid,
        steps: [{ ...validStep, step_number: 0 }],
      }),
    ).toThrow();
  });

  it("rejects non-UUID workstation_id in steps", () => {
    expect(() =>
      createRouteSchema.parse({
        ...valid,
        steps: [{ ...validStep, workstation_id: "bad" }],
      }),
    ).toThrow();
  });
});

// --- createRoute ---

describe("createRoute", () => {
  const STEP = { workstation_id: WS_ID, step_number: 1, name: "Assembly" };

  it("inserts route then steps, returns full route", async () => {
    const route = { id: ROUTE_ID, name: "Main Route" };
    const fullRoute = { ...route, route_steps: [{ ...STEP, id: "step-1" }] };

    makeClient([
      dbChain({ data: route }),       // INSERT routes
      dbChain({ data: null }),        // INSERT route_steps
      dbChain({ data: fullRoute }),   // SELECT routes with steps
    ]);

    const result = await createRoute({
      part_number_id: PART_NUMBER_ID,
      name: "Main Route",
      steps: [STEP],
    });

    expect(result).toEqual(fullRoute);
  });

  it("rolls back the route when step insert fails", async () => {
    const route = { id: ROUTE_ID, name: "Main Route" };

    const client = makeClient([
      dbChain({ data: route }),                                          // INSERT routes
      dbChain({ data: null, error: { message: "fk violation" } }),      // INSERT route_steps (fails)
      dbChain({ data: null }),                                           // DELETE routes (rollback)
    ]);

    await expect(
      createRoute({
        part_number_id: PART_NUMBER_ID,
        name: "Main Route",
        steps: [STEP],
      }),
    ).rejects.toThrow("create_route steps failed");

    // Verify rollback: delete was called on routes table
    expect(client.from).toHaveBeenCalledWith("routes");
    expect(client.from).toHaveBeenCalledTimes(3);
  });

  it("skips step insert when steps array is empty", async () => {
    const route = { id: ROUTE_ID, name: "Empty Route" };
    const fullRoute = { ...route, route_steps: [] };

    const client = makeClient([
      dbChain({ data: route }),     // INSERT routes
      dbChain({ data: fullRoute }), // SELECT routes with steps
    ]);

    await createRoute({
      part_number_id: PART_NUMBER_ID,
      name: "Empty Route",
      steps: [],
    });

    // Only 2 from() calls (no step insert)
    expect(client.from).toHaveBeenCalledTimes(2);
  });

  it("pass_fail_gate defaults to true when not provided", async () => {
    const route = { id: ROUTE_ID, name: "Route" };
    const client = makeClient([
      dbChain({ data: route }),
      dbChain({ data: null }),
      dbChain({ data: route }),
    ]);

    await createRoute({
      part_number_id: PART_NUMBER_ID,
      name: "Route",
      steps: [{ workstation_id: WS_ID, step_number: 1, name: "Step 1" }],
    });

    // The second from() call is route_steps INSERT — check inserted data includes pass_fail_gate: true
    const stepInsertChain = client.from.mock.results[1].value;
    expect(stepInsertChain.insert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ pass_fail_gate: true }),
      ]),
    );
  });

  it("throws when not authenticated", async () => {
    mockGetOrgContext.mockRejectedValue(new Error("Not authenticated"));
    makeClient([]);

    await expect(
      createRoute({ part_number_id: PART_NUMBER_ID, name: "Route", steps: [] }),
    ).rejects.toThrow("Not authenticated");
  });
});

// --- updateRoute ---

describe("updateRoute", () => {
  const STEP = { workstation_id: WS_ID, step_number: 1, name: "Assembly" };

  it("replaces steps when steps are provided: delete then insert, bumps version", async () => {
    const updatedRoute = { id: ROUTE_ID, name: "Updated", route_steps: [] };
    const client = makeClient([
      dbChain({ data: null }),            // DELETE route_steps
      dbChain({ data: null }),            // INSERT route_steps
      dbChain({ data: { version: 1 } }), // SELECT routes (version fetch)
      dbChain({ data: null }),            // UPDATE routes (name + version bump)
      dbChain({ data: updatedRoute }),    // SELECT routes with steps
    ]);

    const result = await updateRoute({
      id: ROUTE_ID,
      name: "Updated",
      steps: [STEP],
    });

    expect(result).toEqual(updatedRoute);
    expect(client.from).toHaveBeenCalledTimes(5);
  });

  it("skips step replacement when steps are not provided", async () => {
    const updatedRoute = { id: ROUTE_ID, name: "Renamed", route_steps: [] };
    const client = makeClient([
      dbChain({ data: null }),          // UPDATE routes (name)
      dbChain({ data: updatedRoute }),  // SELECT routes with steps
    ]);

    await updateRoute({ id: ROUTE_ID, name: "Renamed" });
    expect(client.from).toHaveBeenCalledTimes(2);
  });

  it("skips name update when name is not provided, still bumps version", async () => {
    const updatedRoute = { id: ROUTE_ID, route_steps: [] };
    const client = makeClient([
      dbChain({ data: null }),            // DELETE route_steps
      dbChain({ data: null }),            // INSERT route_steps
      dbChain({ data: { version: 2 } }), // SELECT routes (version fetch)
      dbChain({ data: null }),            // UPDATE routes (version bump only)
      dbChain({ data: updatedRoute }),    // SELECT routes with steps
    ]);

    await updateRoute({ id: ROUTE_ID, steps: [STEP] });
    expect(client.from).toHaveBeenCalledTimes(5);
  });
});

// --- configureSerialAlgorithm: upsert logic ---

describe("configureSerialAlgorithm — upsert", () => {
  const input = { part_number_id: PART_NUMBER_ID, prefix: "SN", pad_length: 6 };

  it("updates when algorithm already exists", async () => {
    const existing = { id: "algo-id" };
    const updated = { ...existing, prefix: "SN", pad_length: 6 };

    makeClient([
      dbChain({ data: existing }), // maybeSingle: existing
      dbChain({ data: updated }),  // UPDATE
    ]);

    const result = await configureSerialAlgorithm(input);
    expect(result).toEqual(updated);
  });

  it("inserts when no algorithm exists", async () => {
    const inserted = { id: "new-algo", ...input };

    makeClient([
      dbChain({ data: null }),      // maybeSingle: not found
      dbChain({ data: inserted }),  // INSERT
    ]);

    const result = await configureSerialAlgorithm(input);
    expect(result).toEqual(inserted);
  });

  it("pad_length min is 1 (schema)", () => {
    expect(() =>
      configureSerialAlgorithmSchema.parse({ ...input, pad_length: 0 }),
    ).toThrow();
  });
});

// --- getSerialAlgorithm ---

describe("getSerialAlgorithm", () => {
  it("returns the algorithm when found", async () => {
    const algo = { id: "algo-id", prefix: "SN", pad_length: 6 };
    makeClient([dbChain({ data: algo })]);

    const result = await getSerialAlgorithm({ part_number_id: PART_NUMBER_ID });
    expect(result).toEqual(algo);
  });

  it("returns null when no algorithm is configured", async () => {
    makeClient([dbChain({ data: null })]);
    const result = await getSerialAlgorithm({ part_number_id: PART_NUMBER_ID });
    expect(result).toBeNull();
  });

  it("throws when DB query fails", async () => {
    makeClient([dbChain({ data: null, error: { message: "db error" } })]);
    await expect(
      getSerialAlgorithm({ part_number_id: PART_NUMBER_ID }),
    ).rejects.toThrow("get_serial_algorithm failed");
  });
});
