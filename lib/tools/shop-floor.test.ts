import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("./registry", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./registry")>();
  return { ...actual, registerTool: vi.fn() };
});

import { createClient } from "@/lib/supabase/server";
import { dbChain } from "@/tests/mocks/supabase";
import {
  PACKLML_STATES,
  PACKLML_TRANSITIONS,
  createLineSchema,
  createLine,
  updateLine,
  deleteLine,
  createWorkstationSchema,
  createWorkstation,
  deleteWorkstation,
  createMachineSchema,
  createMachine,
  deleteMachine,
  updateMachineStatus,
} from "./shop-floor";

const mockCreateClient = vi.mocked(createClient);

const USER = { id: "user-abc" };
const LINE_ID = "11111111-1111-1111-1111-111111111111";
const WS_ID = "22222222-2222-2222-2222-222222222222";
const MACHINE_ID = "33333333-3333-3333-3333-333333333333";

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

beforeEach(() => vi.clearAllMocks());

// --- PackML state machine ---

describe("PACKLML_STATES", () => {
  it("contains all 7 PackML states", () => {
    expect(PACKLML_STATES).toHaveLength(7);
    expect(PACKLML_STATES).toContain("STOPPED");
    expect(PACKLML_STATES).toContain("IDLE");
    expect(PACKLML_STATES).toContain("EXECUTE");
    expect(PACKLML_STATES).toContain("HELD");
    expect(PACKLML_STATES).toContain("SUSPENDED");
    expect(PACKLML_STATES).toContain("COMPLETE");
    expect(PACKLML_STATES).toContain("ABORTED");
  });
});

describe("PACKLML_TRANSITIONS — valid transitions", () => {
  it.each([
    ["STOPPED", "IDLE"],
    ["IDLE", "EXECUTE"],
    ["IDLE", "STOPPED"],
    ["EXECUTE", "HELD"],
    ["EXECUTE", "COMPLETE"],
    ["EXECUTE", "ABORTED"],
    ["HELD", "SUSPENDED"],
    ["HELD", "EXECUTE"],
    ["HELD", "ABORTED"],
    ["SUSPENDED", "EXECUTE"],
    ["SUSPENDED", "ABORTED"],
    ["COMPLETE", "IDLE"],
    ["COMPLETE", "STOPPED"],
    ["ABORTED", "STOPPED"],
  ] as const)("%s → %s is allowed", (from, to) => {
    expect(PACKLML_TRANSITIONS[from]).toContain(to);
  });
});

describe("PACKLML_TRANSITIONS — invalid transitions", () => {
  it.each([
    ["STOPPED", "EXECUTE"],
    ["STOPPED", "ABORTED"],
    ["IDLE", "COMPLETE"],
    ["IDLE", "HELD"],
    ["EXECUTE", "IDLE"],
    ["EXECUTE", "STOPPED"],
    ["COMPLETE", "EXECUTE"],
    ["ABORTED", "IDLE"],
    ["ABORTED", "EXECUTE"],
  ] as const)("%s → %s is rejected", (from, to) => {
    expect(PACKLML_TRANSITIONS[from]).not.toContain(to);
  });

  it("every state has defined transitions (none are missing from the map)", () => {
    for (const state of PACKLML_STATES) {
      expect(PACKLML_TRANSITIONS[state]).toBeDefined();
    }
  });
});

describe("updateMachineStatus", () => {
  function makeStatusClient(currentStatus: string, updateData = { id: MACHINE_ID, status: "IDLE" }) {
    makeClient([
      dbChain({ data: { status: currentStatus } }), // SELECT machine
      dbChain({ data: updateData }),                 // UPDATE machine
    ]);
  }

  it("allows STOPPED → IDLE", async () => {
    makeStatusClient("STOPPED");
    await expect(
      updateMachineStatus({ id: MACHINE_ID, status: "IDLE" }),
    ).resolves.toBeDefined();
  });

  it("allows IDLE → EXECUTE", async () => {
    makeStatusClient("IDLE", { id: MACHINE_ID, status: "EXECUTE" });
    await expect(
      updateMachineStatus({ id: MACHINE_ID, status: "EXECUTE" }),
    ).resolves.toBeDefined();
  });

  it("allows EXECUTE → COMPLETE", async () => {
    makeStatusClient("EXECUTE", { id: MACHINE_ID, status: "COMPLETE" });
    await expect(
      updateMachineStatus({ id: MACHINE_ID, status: "COMPLETE" }),
    ).resolves.toBeDefined();
  });

  it("allows ABORTED → STOPPED", async () => {
    makeStatusClient("ABORTED", { id: MACHINE_ID, status: "STOPPED" });
    await expect(
      updateMachineStatus({ id: MACHINE_ID, status: "STOPPED" }),
    ).resolves.toBeDefined();
  });

  it("rejects STOPPED → EXECUTE (invalid PackML transition)", async () => {
    makeClient([
      dbChain({ data: { status: "STOPPED" } }),
    ]);
    await expect(
      updateMachineStatus({ id: MACHINE_ID, status: "EXECUTE" }),
    ).rejects.toThrow("invalid PackML transition STOPPED → EXECUTE");
  });

  it("rejects ABORTED → EXECUTE (invalid PackML transition)", async () => {
    makeClient([
      dbChain({ data: { status: "ABORTED" } }),
    ]);
    await expect(
      updateMachineStatus({ id: MACHINE_ID, status: "EXECUTE" }),
    ).rejects.toThrow("invalid PackML transition ABORTED → EXECUTE");
  });

  it("rejects COMPLETE → EXECUTE (not a valid recovery path from COMPLETE)", async () => {
    makeClient([
      dbChain({ data: { status: "COMPLETE" } }),
    ]);
    await expect(
      updateMachineStatus({ id: MACHINE_ID, status: "EXECUTE" }),
    ).rejects.toThrow("invalid PackML transition COMPLETE → EXECUTE");
  });

  it("throws when machine is not found", async () => {
    makeClient([
      dbChain({ data: null, error: { message: "not found" } }),
    ]);
    await expect(
      updateMachineStatus({ id: MACHINE_ID, status: "IDLE" }),
    ).rejects.toThrow("machine not found");
  });
});

// --- createLineSchema ---

describe("createLineSchema", () => {
  it("requires name", () => {
    expect(() => createLineSchema.parse({})).toThrow();
  });

  it("accepts name without description", () => {
    expect(() => createLineSchema.parse({ name: "Line A" })).not.toThrow();
  });

  it("accepts name with description", () => {
    expect(() =>
      createLineSchema.parse({ name: "Line A", description: "Main line" }),
    ).not.toThrow();
  });
});

// --- createLine ---

describe("createLine", () => {
  it("inserts a line with the user_id", async () => {
    const line = { id: "line-1", name: "Line A", user_id: USER.id };
    const client = makeClient([dbChain({ data: line })]);

    const result = await createLine({ name: "Line A" });

    expect(result).toEqual(line);
    expect(client.from).toHaveBeenCalledWith("lines");
  });

  it("throws when not authenticated", async () => {
    const client = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      from: vi.fn(),
    };
    mockCreateClient.mockResolvedValue(client as never);

    await expect(createLine({ name: "Line A" })).rejects.toThrow("Not authenticated");
  });

  it("throws when DB insert fails", async () => {
    makeClient([dbChain({ data: null, error: { message: "duplicate key" } })]);
    await expect(createLine({ name: "Line A" })).rejects.toThrow("create_line failed");
  });
});

// --- updateLine ---

describe("updateLine", () => {
  it("updates the line and returns the result", async () => {
    const updated = { id: LINE_ID, name: "Updated Line" };
    makeClient([dbChain({ data: updated })]);

    const result = await updateLine({ id: LINE_ID, name: "Updated Line" });
    expect(result).toEqual(updated);
  });

  it("throws when DB update fails", async () => {
    makeClient([dbChain({ data: null, error: { message: "not found" } })]);
    await expect(updateLine({ id: LINE_ID, name: "X" })).rejects.toThrow("update_line failed");
  });
});

// --- deleteLine ---

describe("deleteLine", () => {
  it("returns { success: true } on success", async () => {
    makeClient([dbChain({ data: null })]);
    const result = await deleteLine({ id: LINE_ID });
    expect(result).toEqual({ success: true });
  });

  it("throws when DB delete fails", async () => {
    makeClient([dbChain({ data: null, error: { message: "foreign key violation" } })]);
    await expect(deleteLine({ id: LINE_ID })).rejects.toThrow("delete_line failed");
  });
});

// --- createWorkstationSchema ---

describe("createWorkstationSchema", () => {
  const valid = { line_id: LINE_ID, name: "WS-1", position: 1 };

  it("accepts valid input", () => {
    expect(() => createWorkstationSchema.parse(valid)).not.toThrow();
  });

  it("rejects position = 0 (min is 1)", () => {
    expect(() =>
      createWorkstationSchema.parse({ ...valid, position: 0 }),
    ).toThrow();
  });

  it("rejects non-UUID line_id", () => {
    expect(() =>
      createWorkstationSchema.parse({ ...valid, line_id: "not-uuid" }),
    ).toThrow();
  });

  it("rejects missing name", () => {
    expect(() =>
      createWorkstationSchema.parse({ line_id: LINE_ID, position: 1 }),
    ).toThrow();
  });
});

// --- createWorkstation ---

describe("createWorkstation", () => {
  it("inserts a workstation and returns it", async () => {
    const ws = { id: WS_ID, name: "WS-1", position: 1, line_id: LINE_ID };
    makeClient([dbChain({ data: ws })]);

    const result = await createWorkstation({ line_id: LINE_ID, name: "WS-1", position: 1 });
    expect(result).toEqual(ws);
  });

  it("throws when not authenticated", async () => {
    const client = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
      from: vi.fn(),
    };
    mockCreateClient.mockResolvedValue(client as never);

    await expect(
      createWorkstation({ line_id: LINE_ID, name: "WS-1", position: 1 }),
    ).rejects.toThrow("Not authenticated");
  });
});

// --- deleteWorkstation ---

describe("deleteWorkstation", () => {
  it("returns { success: true } on success", async () => {
    makeClient([dbChain({ data: null })]);
    const result = await deleteWorkstation({ id: WS_ID });
    expect(result).toEqual({ success: true });
  });
});

// --- createMachineSchema ---

describe("createMachineSchema", () => {
  const valid = { workstation_id: WS_ID, name: "CNC-1", type: "cnc" };

  it("accepts valid input", () => {
    expect(() => createMachineSchema.parse(valid)).not.toThrow();
  });

  it("requires all three fields", () => {
    expect(() => createMachineSchema.parse({ name: "CNC-1" })).toThrow();
  });
});

// --- createMachine ---

describe("createMachine", () => {
  it("inserts machine and returns it", async () => {
    const machine = { id: MACHINE_ID, name: "CNC-1", type: "cnc" };
    makeClient([dbChain({ data: machine })]);

    const result = await createMachine({ workstation_id: WS_ID, name: "CNC-1", type: "cnc" });
    expect(result).toEqual(machine);
  });
});

// --- deleteMachine ---

describe("deleteMachine", () => {
  it("returns { success: true } on success", async () => {
    makeClient([dbChain({ data: null })]);
    const result = await deleteMachine({ id: MACHINE_ID });
    expect(result).toEqual({ success: true });
  });
});
