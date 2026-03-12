"use server";

import { getOrgContext } from "@/lib/org-context";
import { createClient } from "@/lib/supabase/server";

export async function listMembers() {
  const ctx = await getOrgContext();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("org_members")
    .select("user_id, role, joined_at")
    .eq("org_id", ctx.orgId)
    .order("joined_at", { ascending: true });

  // Table doesn't exist (migration not applied) — return current user as sole owner
  if (error && !data) {
    return {
      members: [{ user_id: ctx.userId, role: "owner", joined_at: new Date().toISOString() }],
      currentRole: ctx.role,
      currentUserId: ctx.userId,
      migrationPending: true,
    };
  }
  return {
    members: data ?? [],
    currentRole: ctx.role,
    currentUserId: ctx.userId,
    migrationPending: false,
  };
}

export async function inviteMember(
  email: string,
  role: "admin" | "operator" | "viewer",
) {
  const ctx = await getOrgContext();
  if (ctx.role !== "owner" && ctx.role !== "admin")
    throw new Error("Requires admin role");

  // For MVP, look up user by email — they must already have signed up.
  // This requires the service role client to query auth.users.
  // As a workaround, we check if the user exists via a known email lookup.
  const supabase = await createClient();

  // Try to find user by email in auth.users via RPC or admin API
  // For MVP, this is a simplified flow that requires the user_id directly.
  // In production, this would send an email invite and create a pending membership.
  throw new Error(
    "Invite by email requires service role — use the team API endpoint for MVP",
  );
}

export async function addMemberByUserId(
  userId: string,
  role: "admin" | "operator" | "viewer",
) {
  const ctx = await getOrgContext();
  if (ctx.role !== "owner" && ctx.role !== "admin")
    throw new Error("Requires admin role");

  const supabase = await createClient();

  // Check if user is already a member
  const { data: existing } = await supabase
    .from("org_members")
    .select("id")
    .eq("org_id", ctx.orgId)
    .eq("user_id", userId)
    .single();

  if (existing) throw new Error("User is already a member of this organization");

  const { error } = await supabase.from("org_members").insert({
    org_id: ctx.orgId,
    user_id: userId,
    role,
    invited_by: ctx.userId,
  });
  if (error) throw new Error(error.message);
}

export async function updateMemberRole(
  userId: string,
  role: "admin" | "operator" | "viewer",
) {
  const ctx = await getOrgContext();
  if (ctx.role !== "owner" && ctx.role !== "admin")
    throw new Error("Requires admin role");
  if (userId === ctx.userId) throw new Error("Cannot change your own role");

  const supabase = await createClient();
  const { error } = await supabase
    .from("org_members")
    .update({ role })
    .eq("org_id", ctx.orgId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function removeMember(userId: string) {
  const ctx = await getOrgContext();
  if (ctx.role !== "owner" && ctx.role !== "admin")
    throw new Error("Requires admin role");

  // Check if target is owner
  const supabase = await createClient();
  const { data: target } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", ctx.orgId)
    .eq("user_id", userId)
    .single();

  if (target?.role === "owner") throw new Error("Cannot remove the owner");

  const { error } = await supabase
    .from("org_members")
    .delete()
    .eq("org_id", ctx.orgId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}
