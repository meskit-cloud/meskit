import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { dbChain } from "@/tests/mocks/supabase";
import { getOrgContext, hasRole } from "./org-context";

const mockCreateClient = vi.mocked(createClient);

const USER = { id: "user-abc" };

function makeClient(overrides: {
  user?: { id: string } | null;
  fromChains?: ReturnType<typeof dbChain>[];
  rpcResult?: { data: unknown; error: unknown };
}) {
  const resolvedUser = "user" in overrides ? overrides.user : USER;
  const client = {
    auth: {
      getUser: vi
        .fn()
        .mockResolvedValue({ data: { user: resolvedUser } }),
    },
    from: vi.fn(),
    rpc: vi
      .fn()
      .mockResolvedValue(
        overrides.rpcResult ?? { data: null, error: null },
      ),
  };
  for (const chain of overrides.fromChains ?? []) {
    client.from.mockReturnValueOnce(chain);
  }
  mockCreateClient.mockResolvedValue(client as never);
  return client;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// --- hasRole (pure function) ---

describe("hasRole", () => {
  it("owner has all roles", () => {
    expect(hasRole("owner", "owner")).toBe(true);
    expect(hasRole("owner", "admin")).toBe(true);
    expect(hasRole("owner", "operator")).toBe(true);
    expect(hasRole("owner", "viewer")).toBe(true);
  });

  it("admin has admin, operator, viewer but not owner", () => {
    expect(hasRole("admin", "owner")).toBe(false);
    expect(hasRole("admin", "admin")).toBe(true);
    expect(hasRole("admin", "operator")).toBe(true);
    expect(hasRole("admin", "viewer")).toBe(true);
  });

  it("operator has operator, viewer but not admin or owner", () => {
    expect(hasRole("operator", "owner")).toBe(false);
    expect(hasRole("operator", "admin")).toBe(false);
    expect(hasRole("operator", "operator")).toBe(true);
    expect(hasRole("operator", "viewer")).toBe(true);
  });

  it("viewer only has viewer", () => {
    expect(hasRole("viewer", "owner")).toBe(false);
    expect(hasRole("viewer", "admin")).toBe(false);
    expect(hasRole("viewer", "operator")).toBe(false);
    expect(hasRole("viewer", "viewer")).toBe(true);
  });
});

// --- getOrgContext ---

describe("getOrgContext", () => {
  it("throws when not authenticated", async () => {
    makeClient({ user: null });

    await expect(getOrgContext()).rejects.toThrow("Not authenticated");
  });

  it("returns full context when membership and plant exist", async () => {
    const membershipChain = dbChain({
      data: {
        org_id: "org-123",
        role: "admin",
        organizations: { name: "Acme Corp" },
      },
    });
    const plantChain = dbChain({ data: { id: "plant-456" } });
    makeClient({ fromChains: [membershipChain, plantChain] });

    const ctx = await getOrgContext();

    expect(ctx).toEqual({
      userId: "user-abc",
      orgId: "org-123",
      plantId: "plant-456",
      role: "admin",
      orgName: "Acme Corp",
    });
  });

  it("handles organizations as array (Supabase join variant)", async () => {
    const membershipChain = dbChain({
      data: {
        org_id: "org-123",
        role: "operator",
        organizations: [{ name: "Array Org" }],
      },
    });
    const plantChain = dbChain({ data: { id: "plant-789" } });
    makeClient({ fromChains: [membershipChain, plantChain] });

    const ctx = await getOrgContext();

    expect(ctx.orgName).toBe("Array Org");
  });

  it("defaults orgName when organizations is null", async () => {
    const membershipChain = dbChain({
      data: {
        org_id: "org-123",
        role: "viewer",
        organizations: null,
      },
    });
    const plantChain = dbChain({ data: { id: "plant-456" } });
    makeClient({ fromChains: [membershipChain, plantChain] });

    const ctx = await getOrgContext();

    expect(ctx.orgName).toBe("My Organization");
  });

  it("returns empty plantId when no plant exists", async () => {
    const membershipChain = dbChain({
      data: {
        org_id: "org-123",
        role: "owner",
        organizations: { name: "No Plant Co" },
      },
    });
    const plantChain = dbChain({ data: null });
    makeClient({ fromChains: [membershipChain, plantChain] });

    const ctx = await getOrgContext();

    expect(ctx.plantId).toBe("");
  });

  it("falls back to user-scoped context when org_members table is missing (42P01)", async () => {
    const membershipChain = dbChain({
      error: { message: "relation does not exist", code: "42P01" },
    });
    makeClient({ fromChains: [membershipChain] });

    const ctx = await getOrgContext();

    expect(ctx).toEqual({
      userId: "user-abc",
      orgId: "user-abc",
      plantId: "",
      role: "owner",
      orgName: "My Organization",
    });
  });

  it("falls back when error message says 'Could not find'", async () => {
    const membershipChain = dbChain({
      error: { message: "Could not find the resource" },
    });
    makeClient({ fromChains: [membershipChain] });

    const ctx = await getOrgContext();

    expect(ctx).toEqual({
      userId: "user-abc",
      orgId: "user-abc",
      plantId: "",
      role: "owner",
      orgName: "My Organization",
    });
  });

  it("falls back when error says 'schema cache'", async () => {
    const membershipChain = dbChain({
      error: { message: "schema cache lookup failure" },
    });
    makeClient({ fromChains: [membershipChain] });

    const ctx = await getOrgContext();

    expect(ctx.orgId).toBe("user-abc");
  });

  it("creates org for first-time user (no membership, but table exists)", async () => {
    const membershipChain = dbChain({
      data: null,
      error: { message: "No rows found", code: "PGRST116" },
    });

    const client = makeClient({
      fromChains: [membershipChain],
      rpcResult: {
        data: [{ org_id: "new-org-111", plant_id: "new-plant-222" }],
        error: null,
      },
    });

    const ctx = await getOrgContext();

    expect(client.rpc).toHaveBeenCalledWith("create_org_for_user", {
      p_user_id: "user-abc",
    });
    expect(ctx).toEqual({
      userId: "user-abc",
      orgId: "new-org-111",
      plantId: "new-plant-222",
      role: "owner",
      orgName: "My Organization",
    });
  });

  it("falls back when RPC function is missing (42883)", async () => {
    const membershipChain = dbChain({
      data: null,
      error: { message: "No rows found", code: "PGRST116" },
    });

    makeClient({
      fromChains: [membershipChain],
      rpcResult: {
        data: null,
        error: { message: "undefined_function", code: "42883" },
      },
    });

    const ctx = await getOrgContext();

    expect(ctx.orgId).toBe("user-abc");
    expect(ctx.role).toBe("owner");
  });

  it("throws when RPC fails with a real error", async () => {
    const membershipChain = dbChain({
      data: null,
      error: { message: "No rows found", code: "PGRST116" },
    });

    makeClient({
      fromChains: [membershipChain],
      rpcResult: {
        data: null,
        error: { message: "database connection refused" },
      },
    });

    await expect(getOrgContext()).rejects.toThrow(
      "Failed to create organization",
    );
  });

  it("throws when RPC returns empty array", async () => {
    const membershipChain = dbChain({
      data: null,
      error: { message: "No rows found", code: "PGRST116" },
    });

    makeClient({
      fromChains: [membershipChain],
      rpcResult: { data: [], error: null },
    });

    await expect(getOrgContext()).rejects.toThrow(
      "Failed to create organization",
    );
  });
});
