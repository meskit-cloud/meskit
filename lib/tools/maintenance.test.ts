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
  createMaintenanceRequest,
  listMaintenanceRequests,
  updateMaintenanceStatus,
} from "./maintenance";

const mockCreateClient = vi.mocked(createClient);
const mockGetOrgContext = vi.mocked(getOrgContext);

const ORG_CONTEXT = {
  userId: "user-abc",
  orgId: "org-123",
  plantId: "plant-456",
  role: "owner" as const,
  orgName: "Test Org",
};

const MACHINE_ID = "33333333-3333-3333-3333-333333333333";
const REQ_ID = "55555555-5555-5555-5555-555555555555";

function makeClient(fromChains: ReturnType<typeof dbChain>[]) {
  const client = { from: vi.fn() };
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

// --- create_maintenance_request ---

describe("createMaintenanceRequest", () => {
  it("creates a corrective request", async () => {
    const created = {
      id: REQ_ID,
      machine_id: MACHINE_ID,
      request_type: "corrective",
      priority: "high",
      description: "Motor overheating",
      status: "open",
      user_id: "user-abc",
      org_id: "org-123",
    };
    makeClient([dbChain({ data: created })]);

    const result = await createMaintenanceRequest({
      machine_id: MACHINE_ID,
      request_type: "corrective",
      priority: "high",
      description: "Motor overheating",
    });

    expect(result).toEqual(created);
  });

  it("creates a preventive request", async () => {
    const created = {
      id: REQ_ID,
      request_type: "preventive",
      priority: "low",
      status: "open",
    };
    makeClient([dbChain({ data: created })]);

    const result = await createMaintenanceRequest({
      machine_id: MACHINE_ID,
      request_type: "preventive",
      priority: "low",
      description: "Scheduled oil change",
    });

    expect(result.request_type).toBe("preventive");
    expect(result.status).toBe("open");
  });

  it("throws on insert error", async () => {
    makeClient([dbChain({ error: { message: "FK constraint" } })]);

    await expect(
      createMaintenanceRequest({
        machine_id: MACHINE_ID,
        request_type: "corrective",
        priority: "medium",
        description: "test",
      }),
    ).rejects.toThrow("create_maintenance_request failed");
  });

  it("rejects invalid priority", async () => {
    await expect(
      createMaintenanceRequest({
        machine_id: MACHINE_ID,
        request_type: "corrective",
        priority: "ultra" as never,
        description: "test",
      }),
    ).rejects.toThrow();
  });

  it("rejects invalid request_type", async () => {
    await expect(
      createMaintenanceRequest({
        machine_id: MACHINE_ID,
        request_type: "emergency" as never,
        priority: "high",
        description: "test",
      }),
    ).rejects.toThrow();
  });
});

// --- list_maintenance_requests ---

describe("listMaintenanceRequests", () => {
  it("returns all requests with no filters", async () => {
    const rows = [
      {
        id: REQ_ID,
        machine_id: MACHINE_ID,
        status: "open",
        machines: { name: "CNC Mill 1" },
      },
    ];
    makeClient([dbChain({ data: rows })]);

    const result = await listMaintenanceRequests({});

    expect(result).toHaveLength(1);
    expect(result[0].machine_name).toBe("CNC Mill 1");
    expect(result[0]).not.toHaveProperty("machines");
  });

  it("handles null machines join", async () => {
    const rows = [
      { id: REQ_ID, machine_id: MACHINE_ID, machines: null },
    ];
    makeClient([dbChain({ data: rows })]);

    const result = await listMaintenanceRequests({});

    expect(result[0].machine_name).toBeNull();
  });

  it("filters by machine_id", async () => {
    const chain = dbChain({ data: [] });
    const client = makeClient([chain]);

    await listMaintenanceRequests({ machine_id: MACHINE_ID });

    expect(client.from).toHaveBeenCalledWith("maintenance_requests");
    expect(chain.eq).toHaveBeenCalledWith("machine_id", MACHINE_ID);
  });

  it("filters by status", async () => {
    const chain = dbChain({ data: [] });
    makeClient([chain]);

    await listMaintenanceRequests({ status: "in_progress" });

    expect(chain.eq).toHaveBeenCalledWith("status", "in_progress");
  });

  it("filters by request_type", async () => {
    const chain = dbChain({ data: [] });
    makeClient([chain]);

    await listMaintenanceRequests({ request_type: "preventive" });

    expect(chain.eq).toHaveBeenCalledWith("request_type", "preventive");
  });

  it("throws on Supabase error", async () => {
    makeClient([dbChain({ error: { message: "db error" } })]);

    await expect(listMaintenanceRequests({})).rejects.toThrow(
      "list_maintenance_requests failed",
    );
  });
});

// --- update_maintenance_status ---

describe("updateMaintenanceStatus", () => {
  it("transitions open → in_progress", async () => {
    const fetchChain = dbChain({ data: { status: "open" } });
    const updateChain = dbChain({
      data: { id: REQ_ID, status: "in_progress" },
    });
    makeClient([fetchChain, updateChain]);

    const result = await updateMaintenanceStatus({
      id: REQ_ID,
      status: "in_progress",
    });

    expect(result.status).toBe("in_progress");
  });

  it("transitions open → cancelled", async () => {
    const fetchChain = dbChain({ data: { status: "open" } });
    const updateChain = dbChain({
      data: { id: REQ_ID, status: "cancelled" },
    });
    makeClient([fetchChain, updateChain]);

    const result = await updateMaintenanceStatus({
      id: REQ_ID,
      status: "cancelled",
    });

    expect(result.status).toBe("cancelled");
  });

  it("transitions in_progress → completed", async () => {
    const fetchChain = dbChain({ data: { status: "in_progress" } });
    const updateChain = dbChain({
      data: { id: REQ_ID, status: "completed" },
    });
    makeClient([fetchChain, updateChain]);

    const result = await updateMaintenanceStatus({
      id: REQ_ID,
      status: "completed",
    });

    expect(result.status).toBe("completed");
  });

  it("transitions in_progress → cancelled", async () => {
    const fetchChain = dbChain({ data: { status: "in_progress" } });
    const updateChain = dbChain({
      data: { id: REQ_ID, status: "cancelled" },
    });
    makeClient([fetchChain, updateChain]);

    const result = await updateMaintenanceStatus({
      id: REQ_ID,
      status: "cancelled",
    });

    expect(result.status).toBe("cancelled");
  });

  it("rejects open → completed (invalid transition)", async () => {
    const fetchChain = dbChain({ data: { status: "open" } });
    makeClient([fetchChain]);

    await expect(
      updateMaintenanceStatus({ id: REQ_ID, status: "completed" }),
    ).rejects.toThrow("invalid transition open → completed");
  });

  it("rejects completed → open (terminal state)", async () => {
    const fetchChain = dbChain({ data: { status: "completed" } });
    makeClient([fetchChain]);

    await expect(
      updateMaintenanceStatus({ id: REQ_ID, status: "open" }),
    ).rejects.toThrow("invalid transition");
  });

  it("rejects cancelled → in_progress (terminal state)", async () => {
    const fetchChain = dbChain({ data: { status: "cancelled" } });
    makeClient([fetchChain]);

    await expect(
      updateMaintenanceStatus({ id: REQ_ID, status: "in_progress" }),
    ).rejects.toThrow("invalid transition");
  });

  it("throws when request not found", async () => {
    const fetchChain = dbChain({
      data: null,
      error: { message: "not found" },
    });
    makeClient([fetchChain]);

    await expect(
      updateMaintenanceStatus({ id: REQ_ID, status: "in_progress" }),
    ).rejects.toThrow("maintenance request not found");
  });

  it("throws on update error", async () => {
    const fetchChain = dbChain({ data: { status: "open" } });
    const updateChain = dbChain({ error: { message: "update failed" } });
    makeClient([fetchChain, updateChain]);

    await expect(
      updateMaintenanceStatus({ id: REQ_ID, status: "in_progress" }),
    ).rejects.toThrow("update_maintenance_status failed");
  });
});
