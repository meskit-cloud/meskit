import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("./registry", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./registry")>();
  return { ...actual, registerTool: vi.fn() };
});
vi.mock("@/lib/org-context", () => ({
  getOrgContext: vi.fn(),
  hasRole: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { getOrgContext, hasRole } from "@/lib/org-context";
import { dbChain } from "@/tests/mocks/supabase";
import { listPlants, createPlant, updatePlant } from "./plant";

const mockCreateClient = vi.mocked(createClient);
const mockGetOrgContext = vi.mocked(getOrgContext);
const mockHasRole = vi.mocked(hasRole);

const ORG_CONTEXT = {
  userId: "user-abc",
  orgId: "org-123",
  plantId: "plant-456",
  role: "owner" as const,
  orgName: "Test Org",
};

const PLANT_ID = "44444444-4444-4444-4444-444444444444";

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
  mockHasRole.mockImplementation((current, required) => {
    const levels = { viewer: 0, operator: 1, admin: 2, owner: 3 } as const;
    return levels[current] >= levels[required];
  });
});

// --- list_plants ---

describe("listPlants", () => {
  it("returns all plants for the org", async () => {
    const plants = [
      { id: "p1", name: "Plant A", org_id: "org-123" },
      { id: "p2", name: "Plant B", org_id: "org-123" },
    ];
    makeClient([dbChain({ data: plants })]);

    const result = await listPlants({});

    expect(result).toEqual(plants);
  });

  it("returns empty array when no plants", async () => {
    makeClient([dbChain({ data: [] })]);

    const result = await listPlants({});

    expect(result).toEqual([]);
  });

  it("throws on Supabase error", async () => {
    makeClient([dbChain({ error: { message: "db error" } })]);

    await expect(listPlants({})).rejects.toThrow("list_plants");
  });
});

// --- create_plant ---

describe("createPlant", () => {
  it("creates a plant with all fields", async () => {
    const created = {
      id: PLANT_ID,
      org_id: "org-123",
      name: "New Plant",
      location: "Berlin",
      timezone: "Europe/Berlin",
    };
    makeClient([dbChain({ data: created })]);

    const result = await createPlant({
      name: "New Plant",
      location: "Berlin",
      timezone: "Europe/Berlin",
    });

    expect(result).toEqual(created);
  });

  it("creates a plant with name only", async () => {
    const created = { id: PLANT_ID, org_id: "org-123", name: "Simple" };
    makeClient([dbChain({ data: created })]);

    const result = await createPlant({ name: "Simple" });

    expect(result.name).toBe("Simple");
  });

  it("rejects non-admin callers", async () => {
    mockGetOrgContext.mockResolvedValue({ ...ORG_CONTEXT, role: "operator" });

    await expect(createPlant({ name: "X" })).rejects.toThrow(
      "requires admin or owner role",
    );
  });

  it("rejects viewer callers", async () => {
    mockGetOrgContext.mockResolvedValue({ ...ORG_CONTEXT, role: "viewer" });

    await expect(createPlant({ name: "X" })).rejects.toThrow(
      "requires admin or owner role",
    );
  });

  it("allows admin to create", async () => {
    mockGetOrgContext.mockResolvedValue({ ...ORG_CONTEXT, role: "admin" });
    makeClient([dbChain({ data: { id: PLANT_ID, name: "Admin Plant" } })]);

    const result = await createPlant({ name: "Admin Plant" });

    expect(result.name).toBe("Admin Plant");
  });

  it("throws on insert error", async () => {
    makeClient([dbChain({ error: { message: "unique violation" } })]);

    await expect(createPlant({ name: "Dup" })).rejects.toThrow("create_plant");
  });
});

// --- update_plant ---

describe("updatePlant", () => {
  it("updates plant name", async () => {
    const updated = { id: PLANT_ID, name: "Renamed" };
    makeClient([dbChain({ data: updated })]);

    const result = await updatePlant({ id: PLANT_ID, name: "Renamed" });

    expect(result.name).toBe("Renamed");
  });

  it("updates plant location and timezone", async () => {
    const updated = {
      id: PLANT_ID,
      location: "Munich",
      timezone: "Europe/Berlin",
    };
    makeClient([dbChain({ data: updated })]);

    const result = await updatePlant({
      id: PLANT_ID,
      location: "Munich",
      timezone: "Europe/Berlin",
    });

    expect(result.location).toBe("Munich");
  });

  it("rejects non-admin callers", async () => {
    mockGetOrgContext.mockResolvedValue({ ...ORG_CONTEXT, role: "operator" });

    await expect(
      updatePlant({ id: PLANT_ID, name: "X" }),
    ).rejects.toThrow("requires admin or owner role");
  });

  it("throws on Supabase error", async () => {
    makeClient([dbChain({ error: { message: "not found" } })]);

    await expect(
      updatePlant({ id: PLANT_ID, name: "X" }),
    ).rejects.toThrow("update_plant");
  });
});
