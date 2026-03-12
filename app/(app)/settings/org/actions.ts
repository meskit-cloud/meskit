"use server";

import { getOrgContext } from "@/lib/org-context";
import { createClient } from "@/lib/supabase/server";

export async function getOrganization() {
  const ctx = await getOrgContext();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", ctx.orgId)
    .single();

  // Table doesn't exist yet (migration not applied) — return synthetic org
  if (error && !data) {
    return {
      org: {
        id: ctx.orgId,
        name: ctx.orgName,
        slug: "my-org",
        tier: "starter" as const,
        created_at: new Date().toISOString(),
      },
      role: ctx.role,
      migrationPending: true,
    };
  }
  return { org: data, role: ctx.role, migrationPending: false };
}

export async function updateOrganization(formData: {
  name?: string;
  slug?: string;
}) {
  const ctx = await getOrgContext();
  if (ctx.role !== "owner" && ctx.role !== "admin")
    throw new Error("Requires admin role");
  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update(formData)
    .eq("id", ctx.orgId);
  if (error) throw new Error(error.message);
}
