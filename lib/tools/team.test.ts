import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: vi.fn() }));
vi.mock("./registry", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./registry")>();
  return { ...actual, registerTool: vi.fn() };
});
vi.mock("@/lib/org-context", () => ({
  getOrgContext: vi.fn(),
  hasRole: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getOrgContext, hasRole } from "@/lib/org-context";
import { dbChain } from "@/tests/mocks/supabase";
import {
  listMembers,
  inviteMember,
  updateMemberRole,
  removeMember,
} from "./team";

const mockCreateClient = vi.mocked(createClient);
const mockCreateServiceClient = vi.mocked(createServiceClient);
const mockGetOrgContext = vi.mocked(getOrgContext);
const mockHasRole = vi.mocked(hasRole);

const USER_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

const ORG_CONTEXT = {
  userId: USER_ID,
  orgId: "org-123",
  plantId: "plant-456",
  role: "owner" as const,
  orgName: "Test Org",
};

const TARGET_USER_ID = "11111111-1111-1111-1111-111111111111";

function makeClient(fromChains: ReturnType<typeof dbChain>[]) {
  const client = { from: vi.fn() };
  for (const chain of fromChains) {
    client.from.mockReturnValueOnce(chain);
  }
  mockCreateClient.mockResolvedValue(client as never);
  return client;
}

function makeServiceClient(users: { id: string; email: string }[]) {
  const service = {
    auth: {
      admin: {
        listUsers: vi.fn().mockResolvedValue({
          data: { users: users.map((u) => ({ ...u })) },
          error: null,
        }),
      },
    },
  };
  mockCreateServiceClient.mockReturnValue(service as never);
  return service;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetOrgContext.mockResolvedValue(ORG_CONTEXT);
  mockHasRole.mockImplementation((current, required) => {
    const levels = { viewer: 0, operator: 1, admin: 2, owner: 3 } as const;
    return levels[current] >= levels[required];
  });
});

// --- list_members ---

describe("listMembers", () => {
  it("returns members with emails", async () => {
    const members = [
      { user_id: "user-abc", role: "owner", joined_at: "2026-01-01" },
      { user_id: "user-222", role: "operator", joined_at: "2026-02-01" },
    ];
    const membersChain = dbChain({ data: members });
    makeClient([membersChain]);
    makeServiceClient([
      { id: "user-abc", email: "owner@test.com" },
      { id: "user-222", email: "op@test.com" },
    ]);

    const result = await listMembers({});

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      user_id: "user-abc",
      email: "owner@test.com",
      role: "owner",
      joined_at: "2026-01-01",
    });
    expect(result[1].email).toBe("op@test.com");
  });

  it("returns empty email for unknown users", async () => {
    const members = [
      { user_id: "ghost", role: "viewer", joined_at: "2026-03-01" },
    ];
    const membersChain = dbChain({ data: members });
    makeClient([membersChain]);
    makeServiceClient([]);

    const result = await listMembers({});

    expect(result[0].email).toBe("");
  });

  it("throws on Supabase error", async () => {
    const membersChain = dbChain({ error: { message: "query failed" } });
    makeClient([membersChain]);

    await expect(listMembers({})).rejects.toThrow("list_members");
  });

  it("throws on auth admin error", async () => {
    const membersChain = dbChain({ data: [] });
    makeClient([membersChain]);
    const service = {
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: { users: [] },
            error: { message: "auth service down" },
          }),
        },
      },
    };
    mockCreateServiceClient.mockReturnValue(service as never);

    await expect(listMembers({})).rejects.toThrow("failed to fetch user emails");
  });
});

// --- invite_member ---

describe("inviteMember", () => {
  it("invites an existing user by email", async () => {
    makeServiceClient([
      { id: TARGET_USER_ID, email: "new@test.com" },
    ]);
    const existingCheck = dbChain({ data: null });
    const insertChain = dbChain({
      data: {
        org_id: "org-123",
        user_id: TARGET_USER_ID,
        role: "operator",
      },
    });
    makeClient([existingCheck, insertChain]);

    const result = await inviteMember({
      email: "new@test.com",
      role: "operator",
    });

    expect(result).toMatchObject({
      user_id: TARGET_USER_ID,
      role: "operator",
      email: "new@test.com",
    });
  });

  it("rejects non-admin callers", async () => {
    mockGetOrgContext.mockResolvedValue({ ...ORG_CONTEXT, role: "operator" });

    await expect(
      inviteMember({ email: "x@test.com", role: "viewer" }),
    ).rejects.toThrow("requires admin or owner role");
  });

  it("throws when user not found by email", async () => {
    makeServiceClient([{ id: "someone-else", email: "other@test.com" }]);

    await expect(
      inviteMember({ email: "missing@test.com", role: "viewer" }),
    ).rejects.toThrow("user not found");
  });

  it("throws when user is already a member", async () => {
    makeServiceClient([
      { id: TARGET_USER_ID, email: "dup@test.com" },
    ]);
    const existingCheck = dbChain({ data: { id: "mem-existing" } });
    makeClient([existingCheck]);

    await expect(
      inviteMember({ email: "dup@test.com", role: "viewer" }),
    ).rejects.toThrow("already a member");
  });

  it("case-insensitive email lookup", async () => {
    makeServiceClient([
      { id: TARGET_USER_ID, email: "User@Test.COM" },
    ]);
    const existingCheck = dbChain({ data: null });
    const insertChain = dbChain({
      data: { org_id: "org-123", user_id: TARGET_USER_ID, role: "viewer" },
    });
    makeClient([existingCheck, insertChain]);

    const result = await inviteMember({
      email: "user@test.com",
      role: "viewer",
    });

    expect(result.user_id).toBe(TARGET_USER_ID);
  });

  it("throws on insert error", async () => {
    makeServiceClient([
      { id: TARGET_USER_ID, email: "new@test.com" },
    ]);
    const existingCheck = dbChain({ data: null });
    const insertChain = dbChain({ error: { message: "insert failed" } });
    makeClient([existingCheck, insertChain]);

    await expect(
      inviteMember({ email: "new@test.com", role: "viewer" }),
    ).rejects.toThrow("invite_member");
  });
});

// --- update_member_role ---

describe("updateMemberRole", () => {
  it("updates a member's role", async () => {
    const memberLookup = dbChain({ data: { role: "operator" } });
    const updateChain = dbChain({
      data: { user_id: TARGET_USER_ID, role: "admin" },
    });
    makeClient([memberLookup, updateChain]);

    const result = await updateMemberRole({
      user_id: TARGET_USER_ID,
      role: "admin",
    });

    expect(result.role).toBe("admin");
  });

  it("rejects non-admin callers", async () => {
    mockGetOrgContext.mockResolvedValue({ ...ORG_CONTEXT, role: "operator" });

    await expect(
      updateMemberRole({ user_id: TARGET_USER_ID, role: "viewer" }),
    ).rejects.toThrow("requires admin or owner role");
  });

  it("rejects changing own role", async () => {
    await expect(
      updateMemberRole({ user_id: USER_ID, role: "viewer" }),
    ).rejects.toThrow("cannot change your own role");
  });

  it("rejects changing the owner's role", async () => {
    const memberLookup = dbChain({ data: { role: "owner" } });
    makeClient([memberLookup]);

    await expect(
      updateMemberRole({ user_id: TARGET_USER_ID, role: "viewer" }),
    ).rejects.toThrow("cannot change the owner's role");
  });

  it("throws when member not found", async () => {
    const memberLookup = dbChain({
      data: null,
      error: { message: "not found" },
    });
    makeClient([memberLookup]);

    await expect(
      updateMemberRole({ user_id: TARGET_USER_ID, role: "viewer" }),
    ).rejects.toThrow("member not found");
  });
});

// --- remove_member ---

describe("removeMember", () => {
  it("removes a member", async () => {
    const memberLookup = dbChain({ data: { role: "operator" } });
    const deleteChain = dbChain({});
    makeClient([memberLookup, deleteChain]);

    const result = await removeMember({ user_id: TARGET_USER_ID });

    expect(result).toEqual({ success: true });
  });

  it("rejects non-admin callers", async () => {
    mockGetOrgContext.mockResolvedValue({ ...ORG_CONTEXT, role: "viewer" });

    await expect(
      removeMember({ user_id: TARGET_USER_ID }),
    ).rejects.toThrow("requires admin or owner role");
  });

  it("rejects removing the owner", async () => {
    const memberLookup = dbChain({ data: { role: "owner" } });
    makeClient([memberLookup]);

    await expect(
      removeMember({ user_id: TARGET_USER_ID }),
    ).rejects.toThrow("cannot remove the organization owner");
  });

  it("throws when member not found", async () => {
    const memberLookup = dbChain({
      data: null,
      error: { message: "not found" },
    });
    makeClient([memberLookup]);

    await expect(
      removeMember({ user_id: TARGET_USER_ID }),
    ).rejects.toThrow("member not found");
  });

  it("throws on delete error", async () => {
    const memberLookup = dbChain({ data: { role: "operator" } });
    const deleteChain = dbChain({ error: { message: "FK constraint" } });
    makeClient([memberLookup, deleteChain]);

    await expect(
      removeMember({ user_id: TARGET_USER_ID }),
    ).rejects.toThrow("remove_member");
  });
});
