import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { registerTool } from "./registry";
import { getOrgContext, hasRole } from "@/lib/org-context";

// --- list_members ---

export const listMembersSchema = z.object({});

export type ListMembersInput = z.infer<typeof listMembersSchema>;

export async function listMembers(_input: ListMembersInput) {
  const ctx = await getOrgContext();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("org_members")
    .select("user_id, role, joined_at")
    .eq("org_id", ctx.orgId)
    .order("joined_at", { ascending: true });

  if (error) throw new Error(`list_members: ${error.message}`);

  // Look up emails from auth.users via service client
  const service = createServiceClient();
  const userIds = (data ?? []).map((m) => m.user_id);

  const { data: authData, error: authError } =
    await service.auth.admin.listUsers({ perPage: 1000 });

  if (authError)
    throw new Error(`list_members: failed to fetch user emails — ${authError.message}`);

  const emailMap = new Map<string, string>();
  for (const user of authData.users) {
    emailMap.set(user.id, user.email ?? "");
  }

  return (data ?? []).map((m) => ({
    user_id: m.user_id,
    email: emailMap.get(m.user_id) ?? "",
    role: m.role,
    joined_at: m.joined_at,
  }));
}

registerTool({
  name: "list_members",
  description: "List all members of the current organization with their roles and emails",
  schema: listMembersSchema,
  execute: listMembers,
});

// --- invite_member ---

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "operator", "viewer"]),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export async function inviteMember(input: InviteMemberInput) {
  const validated = inviteMemberSchema.parse(input);
  const ctx = await getOrgContext();

  if (!hasRole(ctx.role, "admin"))
    throw new Error("invite_member: requires admin or owner role");

  // Look up the user by email via service client
  const service = createServiceClient();
  const { data: authData, error: authError } =
    await service.auth.admin.listUsers({ perPage: 1000 });

  if (authError)
    throw new Error(`invite_member: failed to look up user — ${authError.message}`);

  const targetUser = authData.users.find(
    (u) => u.email?.toLowerCase() === validated.email.toLowerCase(),
  );

  if (!targetUser)
    throw new Error(
      "invite_member: user not found — they must sign up first",
    );

  // Check if user is already a member of this org
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("org_members")
    .select("id")
    .eq("org_id", ctx.orgId)
    .eq("user_id", targetUser.id)
    .maybeSingle();

  if (existing)
    throw new Error("invite_member: user is already a member of this organization");

  const { data, error } = await supabase
    .from("org_members")
    .insert({
      org_id: ctx.orgId,
      user_id: targetUser.id,
      role: validated.role,
      invited_by: ctx.userId,
    })
    .select()
    .single();

  if (error) throw new Error(`invite_member: ${error.message}`);
  return { ...data, email: validated.email };
}

registerTool({
  name: "invite_member",
  description:
    "Invite a user to the organization by email. The user must already have a MESkit account. Requires admin or owner role.",
  schema: inviteMemberSchema,
  execute: inviteMember,
});

// --- update_member_role ---

export const updateMemberRoleSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(["admin", "operator", "viewer"]),
});

export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;

export async function updateMemberRole(input: UpdateMemberRoleInput) {
  const validated = updateMemberRoleSchema.parse(input);
  const ctx = await getOrgContext();

  if (!hasRole(ctx.role, "admin"))
    throw new Error("update_member_role: requires admin or owner role");

  if (validated.user_id === ctx.userId)
    throw new Error("update_member_role: cannot change your own role");

  // Verify the target user is a member and not the owner
  const supabase = await createClient();
  const { data: member, error: memberError } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", ctx.orgId)
    .eq("user_id", validated.user_id)
    .single();

  if (memberError || !member)
    throw new Error("update_member_role: member not found in this organization");

  if (member.role === "owner")
    throw new Error("update_member_role: cannot change the owner's role");

  const { data, error } = await supabase
    .from("org_members")
    .update({ role: validated.role })
    .eq("org_id", ctx.orgId)
    .eq("user_id", validated.user_id)
    .select()
    .single();

  if (error) throw new Error(`update_member_role: ${error.message}`);
  return data;
}

registerTool({
  name: "update_member_role",
  description:
    "Change a team member's role. Cannot change your own role or the owner's role. Requires admin or owner role.",
  schema: updateMemberRoleSchema,
  execute: updateMemberRole,
});

// --- remove_member ---

export const removeMemberSchema = z.object({
  user_id: z.string().uuid(),
});

export type RemoveMemberInput = z.infer<typeof removeMemberSchema>;

export async function removeMember(input: RemoveMemberInput) {
  const validated = removeMemberSchema.parse(input);
  const ctx = await getOrgContext();

  if (!hasRole(ctx.role, "admin"))
    throw new Error("remove_member: requires admin or owner role");

  // Verify the target user is a member and not the owner
  const supabase = await createClient();
  const { data: member, error: memberError } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", ctx.orgId)
    .eq("user_id", validated.user_id)
    .single();

  if (memberError || !member)
    throw new Error("remove_member: member not found in this organization");

  if (member.role === "owner")
    throw new Error("remove_member: cannot remove the organization owner");

  const { error } = await supabase
    .from("org_members")
    .delete()
    .eq("org_id", ctx.orgId)
    .eq("user_id", validated.user_id);

  if (error) throw new Error(`remove_member: ${error.message}`);
  return { success: true };
}

registerTool({
  name: "remove_member",
  description:
    "Remove a member from the organization. Cannot remove the owner. Requires admin or owner role.",
  schema: removeMemberSchema,
  execute: removeMember,
});
