import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { registerTool } from "./registry";
import { getOrgContext, hasRole } from "@/lib/org-context";

// --- list_plants ---

export const listPlantsSchema = z.object({});

export type ListPlantsInput = z.infer<typeof listPlantsSchema>;

export async function listPlants(_input: ListPlantsInput) {
  const ctx = await getOrgContext();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("plants")
    .select("*")
    .eq("org_id", ctx.orgId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`list_plants: ${error.message}`);
  return data;
}

registerTool({
  name: "list_plants",
  description: "List all plants in the current organization",
  schema: listPlantsSchema,
  execute: listPlants,
});

// --- create_plant ---

export const createPlantSchema = z.object({
  name: z.string(),
  location: z.string().optional(),
  timezone: z.string().optional(),
});

export type CreatePlantInput = z.infer<typeof createPlantSchema>;

export async function createPlant(input: CreatePlantInput) {
  const validated = createPlantSchema.parse(input);
  const ctx = await getOrgContext();

  if (!hasRole(ctx.role, "admin"))
    throw new Error("create_plant: requires admin or owner role");

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("plants")
    .insert({
      org_id: ctx.orgId,
      name: validated.name,
      location: validated.location,
      timezone: validated.timezone,
    })
    .select()
    .single();

  if (error) throw new Error(`create_plant: ${error.message}`);
  return data;
}

registerTool({
  name: "create_plant",
  description:
    "Create a new plant in the current organization. Requires admin or owner role.",
  schema: createPlantSchema,
  execute: createPlant,
});

// --- update_plant ---

export const updatePlantSchema = z.object({
  id: z.string().uuid(),
  name: z.string().optional(),
  location: z.string().optional(),
  timezone: z.string().optional(),
});

export type UpdatePlantInput = z.infer<typeof updatePlantSchema>;

export async function updatePlant(input: UpdatePlantInput) {
  const { id, ...updates } = updatePlantSchema.parse(input);
  const ctx = await getOrgContext();

  if (!hasRole(ctx.role, "admin"))
    throw new Error("update_plant: requires admin or owner role");

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("plants")
    .update(updates)
    .eq("id", id)
    .eq("org_id", ctx.orgId)
    .select()
    .single();

  if (error) throw new Error(`update_plant: ${error.message}`);
  return data;
}

registerTool({
  name: "update_plant",
  description:
    "Update a plant's name, location, or timezone. Requires admin or owner role.",
  schema: updatePlantSchema,
  execute: updatePlant,
});
