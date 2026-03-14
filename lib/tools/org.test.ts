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
import { getOrganization, updateOrganization } from "./org";

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

// --- get_organization ---

describe("getOrganization", () => {
  it("returns org details with member count", async () => {
    const orgRow = {
      id: "org-123",
      name: "Acme",
      slug: "acme",
      tier: "free",
      metadata: null,
      created_at: "2026-01-01T00:00:00Z",
    };
    const orgChain = dbChain({ data: orgRow });
    const countChain = dbChain({ count: 5 });
    makeClient([orgChain, countChain]);

    const result = await getOrganization({});

    expect(result).toEqual({ ...orgRow, member_count: 5 });
  });

  it("throws when org not found", async () => {
    const orgChain = dbChain({ error: { message: "not found" } });
    makeClient([orgChain]);

    await expect(getOrganization({})).rejects.toThrow("get_organization");
  });

  it("throws when member count query fails", async () => {
    const orgChain = dbChain({
      data: { id: "org-123", name: "Acme" },
    });
    const countChain = dbChain({ error: { message: "count failed" } });
    makeClient([orgChain, countChain]);

    await expect(getOrganization({})).rejects.toThrow("failed to count members");
  });

  it("defaults member_count to 0 when count is null", async () => {
    const orgChain = dbChain({
      data: { id: "org-123", name: "Acme" },
    });
    const countChain = dbChain({ count: null });
    makeClient([orgChain, countChain]);

    const result = await getOrganization({});

    expect(result.member_count).toBe(0);
  });
});

// --- update_organization ---

describe("updateOrganization", () => {
  it("updates name", async () => {
    const updated = { id: "org-123", name: "New Name", slug: "acme" };
    const updateChain = dbChain({ data: updated });
    makeClient([updateChain]);

    const result = await updateOrganization({ name: "New Name" });

    expect(result).toEqual(updated);
  });

  it("updates slug", async () => {
    const updated = { id: "org-123", name: "Acme", slug: "new-slug" };
    const updateChain = dbChain({ data: updated });
    makeClient([updateChain]);

    const result = await updateOrganization({ slug: "new-slug" });

    expect(result).toEqual(updated);
  });

  it("rejects when neither name nor slug provided", async () => {
    await expect(updateOrganization({})).rejects.toThrow(
      "At least one of name or slug must be provided",
    );
  });

  it("rejects when user is operator (not admin)", async () => {
    mockGetOrgContext.mockResolvedValue({ ...ORG_CONTEXT, role: "operator" });

    await expect(
      updateOrganization({ name: "Hack" }),
    ).rejects.toThrow("requires admin or owner role");
  });

  it("rejects when user is viewer", async () => {
    mockGetOrgContext.mockResolvedValue({ ...ORG_CONTEXT, role: "viewer" });

    await expect(
      updateOrganization({ name: "Hack" }),
    ).rejects.toThrow("requires admin or owner role");
  });

  it("allows admin to update", async () => {
    mockGetOrgContext.mockResolvedValue({ ...ORG_CONTEXT, role: "admin" });
    const updateChain = dbChain({ data: { id: "org-123", name: "Admin Updated" } });
    makeClient([updateChain]);

    const result = await updateOrganization({ name: "Admin Updated" });

    expect(result.name).toBe("Admin Updated");
  });

  it("throws on Supabase error", async () => {
    const updateChain = dbChain({ error: { message: "unique violation" } });
    makeClient([updateChain]);

    await expect(
      updateOrganization({ slug: "duplicate" }),
    ).rejects.toThrow("update_organization");
  });
});
