import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { registerTool } from "./registry";
import { getOrgContext, hasRole } from "@/lib/org-context";

// --- get_organization ---

export const getOrganizationSchema = z.object({});

export type GetOrganizationInput = z.infer<typeof getOrganizationSchema>;

export async function getOrganization(_input: GetOrganizationInput) {
  const ctx = await getOrgContext();
  const supabase = await createClient();

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("id, name, slug, tier, metadata, created_at")
    .eq("id", ctx.orgId)
    .single();

  if (orgError || !org)
    throw new Error(`get_organization: ${orgError?.message ?? "organization not found"}`);

  // Get member count
  const { count, error: countError } = await supabase
    .from("org_members")
    .select("*", { count: "exact", head: true })
    .eq("org_id", ctx.orgId);

  if (countError)
    throw new Error(`get_organization: failed to count members — ${countError.message}`);

  return { ...org, member_count: count ?? 0 };
}

registerTool({
  name: "get_organization",
  description:
    "Get the current user's organization details including name, slug, tier, and member count",
  schema: getOrganizationSchema,
  execute: getOrganization,
});

// --- update_organization ---

export const updateOrganizationSchema = z
  .object({
    name: z.string().optional(),
    slug: z.string().optional(),
  })
  .refine((data) => data.name || data.slug, {
    message: "At least one of name or slug must be provided",
  });

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;

export async function updateOrganization(input: UpdateOrganizationInput) {
  const validated = updateOrganizationSchema.parse(input);
  const ctx = await getOrgContext();

  if (!hasRole(ctx.role, "admin"))
    throw new Error("update_organization: requires admin or owner role");

  const supabase = await createClient();

  const updates: Record<string, string> = {};
  if (validated.name) updates.name = validated.name;
  if (validated.slug) updates.slug = validated.slug;

  const { data, error } = await supabase
    .from("organizations")
    .update(updates)
    .eq("id", ctx.orgId)
    .select()
    .single();

  if (error) throw new Error(`update_organization: ${error.message}`);
  return data;
}

registerTool({
  name: "update_organization",
  description:
    "Update the current organization's name or slug. Requires admin or owner role.",
  schema: updateOrganizationSchema,
  execute: updateOrganization,
});
