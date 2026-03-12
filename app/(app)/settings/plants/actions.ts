"use server";

import { getOrgContext } from "@/lib/org-context";
import { createClient } from "@/lib/supabase/server";

export async function listPlants() {
  const ctx = await getOrgContext();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plants")
    .select("*")
    .eq("org_id", ctx.orgId)
    .order("created_at");

  // Table doesn't exist (migration not applied) — return synthetic default plant
  if (error && !data) {
    return {
      plants: [{ id: "", org_id: ctx.orgId, name: "Main Plant", location: "Default", timezone: "UTC", created_at: new Date().toISOString() }],
      role: ctx.role,
      migrationPending: true,
    };
  }
  return { plants: data ?? [], role: ctx.role, migrationPending: false };
}

export async function createPlant(input: {
  name: string;
  location?: string;
  timezone?: string;
}) {
  const ctx = await getOrgContext();
  if (ctx.role !== "owner" && ctx.role !== "admin")
    throw new Error("Requires admin role");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plants")
    .insert({ ...input, org_id: ctx.orgId })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updatePlant(
  id: string,
  input: { name?: string; location?: string; timezone?: string },
) {
  const ctx = await getOrgContext();
  if (ctx.role !== "owner" && ctx.role !== "admin")
    throw new Error("Requires admin role");
  const supabase = await createClient();
  const { error } = await supabase
    .from("plants")
    .update(input)
    .eq("id", id)
    .eq("org_id", ctx.orgId);
  if (error) throw new Error(error.message);
}

export async function archivePlant(id: string) {
  const ctx = await getOrgContext();
  if (ctx.role !== "owner" && ctx.role !== "admin")
    throw new Error("Requires admin role");
  const supabase = await createClient();
  // Archive by setting metadata.archived = true (soft delete)
  const { error } = await supabase
    .from("plants")
    .update({ metadata: { archived: true } })
    .eq("id", id)
    .eq("org_id", ctx.orgId);
  if (error) throw new Error(error.message);
}
