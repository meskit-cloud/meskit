import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { registerTool } from "./registry";
import { getOrgContext } from "@/lib/org-context";

// --- list_part_numbers ---

export const listPartNumbersSchema = z.object({});
export type ListPartNumbersInput = z.infer<typeof listPartNumbersSchema>;

export async function listPartNumbers(_input: ListPartNumbersInput) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("part_numbers")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw new Error(`list_part_numbers failed: ${error.message}`);
  return data;
}

registerTool({
  name: "list_part_numbers",
  description: "List all part numbers",
  schema: listPartNumbersSchema,
  execute: listPartNumbers,
});

// --- create_part_number ---

export const createPartNumberSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
});
export type CreatePartNumberInput = z.infer<typeof createPartNumberSchema>;

export async function createPartNumber(input: CreatePartNumberInput) {
  const validated = createPartNumberSchema.parse(input);
  const supabase = await createClient();
  const ctx = await getOrgContext();

  const { data, error } = await supabase
    .from("part_numbers")
    .insert({ ...validated, user_id: ctx.userId, org_id: ctx.orgId })
    .select()
    .single();

  if (error) throw new Error(`create_part_number failed: ${error.message}`);
  return data;
}

registerTool({
  name: "create_part_number",
  description: "Create a part number (product definition)",
  schema: createPartNumberSchema,
  execute: createPartNumber,
});

// --- update_part_number ---

export const updatePartNumberSchema = z.object({
  id: z.string().uuid(),
  name: z.string().optional(),
  description: z.string().optional(),
});
export type UpdatePartNumberInput = z.infer<typeof updatePartNumberSchema>;

export async function updatePartNumber(input: UpdatePartNumberInput) {
  const { id, ...updates } = updatePartNumberSchema.parse(input);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("part_numbers")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`update_part_number failed: ${error.message}`);
  return data;
}

registerTool({
  name: "update_part_number",
  description: "Update a part number's name or description",
  schema: updatePartNumberSchema,
  execute: updatePartNumber,
});

// --- delete_part_number ---

export const deletePartNumberSchema = z.object({
  id: z.string().uuid(),
});
export type DeletePartNumberInput = z.infer<typeof deletePartNumberSchema>;

export async function deletePartNumber(input: DeletePartNumberInput) {
  const validated = deletePartNumberSchema.parse(input);
  const supabase = await createClient();

  const { error } = await supabase
    .from("part_numbers")
    .delete()
    .eq("id", validated.id);

  if (error) throw new Error(`delete_part_number failed: ${error.message}`);
  return { success: true };
}

registerTool({
  name: "delete_part_number",
  description:
    "Delete a part number and its associated BOM, routes, and serial algorithm",
  schema: deletePartNumberSchema,
  execute: deletePartNumber,
});

// --- list_items ---

export const listItemsSchema = z.object({});
export type ListItemsInput = z.infer<typeof listItemsSchema>;

export async function listItems(_input: ListItemsInput) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw new Error(`list_items failed: ${error.message}`);
  return data;
}

registerTool({
  name: "list_items",
  description: "List all items (raw materials and components)",
  schema: listItemsSchema,
  execute: listItems,
});

// --- create_item ---

export const createItemSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
});
export type CreateItemInput = z.infer<typeof createItemSchema>;

export async function createItem(input: CreateItemInput) {
  const validated = createItemSchema.parse(input);
  const supabase = await createClient();
  const ctx = await getOrgContext();

  const { data, error } = await supabase
    .from("items")
    .insert({ ...validated, user_id: ctx.userId, org_id: ctx.orgId })
    .select()
    .single();

  if (error) throw new Error(`create_item failed: ${error.message}`);
  return data;
}

registerTool({
  name: "create_item",
  description: "Create an item (raw material or component)",
  schema: createItemSchema,
  execute: createItem,
});

// --- get_bom ---

export const getBomSchema = z.object({
  part_number_id: z.string().uuid(),
});
export type GetBomInput = z.infer<typeof getBomSchema>;

export async function getBom(input: GetBomInput) {
  const validated = getBomSchema.parse(input);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("bom_entries")
    .select("*, items(name, description)")
    .eq("part_number_id", validated.part_number_id)
    .order("position", { ascending: true });

  if (error) throw new Error(`get_bom failed: ${error.message}`);
  return data;
}

registerTool({
  name: "get_bom",
  description: "Get the Bill of Materials for a part number",
  schema: getBomSchema,
  execute: getBom,
});

// --- set_bom_entry ---

export const setBomEntrySchema = z.object({
  part_number_id: z.string().uuid(),
  item_id: z.string().uuid(),
  quantity: z.number().int().min(1),
  position: z.number().int().min(1),
});
export type SetBomEntryInput = z.infer<typeof setBomEntrySchema>;

export async function setBomEntry(input: SetBomEntryInput) {
  const validated = setBomEntrySchema.parse(input);
  const supabase = await createClient();

  // Check if an entry already exists for this part_number + item
  const { data: existing } = await supabase
    .from("bom_entries")
    .select("id")
    .eq("part_number_id", validated.part_number_id)
    .eq("item_id", validated.item_id)
    .maybeSingle();

  if (existing) {
    // Update existing entry
    const { data, error } = await supabase
      .from("bom_entries")
      .update({ quantity: validated.quantity, position: validated.position })
      .eq("id", existing.id)
      .select("*, items(name, description)")
      .single();

    if (error) throw new Error(`set_bom_entry failed: ${error.message}`);
    return data;
  }

  // Insert new entry
  const { data, error } = await supabase
    .from("bom_entries")
    .insert(validated)
    .select("*, items(name, description)")
    .single();

  if (error) throw new Error(`set_bom_entry failed: ${error.message}`);
  return data;
}

registerTool({
  name: "set_bom_entry",
  description: "Add or update a BOM entry (item with quantity and position)",
  schema: setBomEntrySchema,
  execute: setBomEntry,
});

// --- delete_bom_entry ---

export const deleteBomEntrySchema = z.object({
  id: z.string().uuid(),
});
export type DeleteBomEntryInput = z.infer<typeof deleteBomEntrySchema>;

export async function deleteBomEntry(input: DeleteBomEntryInput) {
  const validated = deleteBomEntrySchema.parse(input);
  const supabase = await createClient();

  const { error } = await supabase
    .from("bom_entries")
    .delete()
    .eq("id", validated.id);

  if (error) throw new Error(`delete_bom_entry failed: ${error.message}`);
  return { success: true };
}

registerTool({
  name: "delete_bom_entry",
  description: "Remove a BOM entry",
  schema: deleteBomEntrySchema,
  execute: deleteBomEntry,
});

// --- list_routes ---

export const listRoutesSchema = z.object({
  part_number_id: z.string().uuid().optional(),
});
export type ListRoutesInput = z.infer<typeof listRoutesSchema>;

export async function listRoutes(input: ListRoutesInput) {
  const validated = listRoutesSchema.parse(input);
  const supabase = await createClient();

  let query = supabase
    .from("routes")
    .select("*, route_steps(*, workstations(name))")
    .order("created_at", { ascending: true });

  if (validated.part_number_id) {
    query = query.eq("part_number_id", validated.part_number_id);
  }

  const { data, error } = await query;

  if (error) throw new Error(`list_routes failed: ${error.message}`);
  return data;
}

registerTool({
  name: "list_routes",
  description:
    "List routes with their steps, optionally filtered by part number",
  schema: listRoutesSchema,
  execute: listRoutes,
});

// --- create_route ---

export const createRouteSchema = z.object({
  part_number_id: z.string().uuid(),
  name: z.string(),
  steps: z.array(
    z.object({
      workstation_id: z.string().uuid(),
      step_number: z.number().int().min(1),
      name: z.string(),
      pass_fail_gate: z.boolean().optional(),
      ideal_cycle_time_seconds: z.number().positive().optional(),
    }),
  ),
});
export type CreateRouteInput = z.infer<typeof createRouteSchema>;

export async function createRoute(input: CreateRouteInput) {
  const validated = createRouteSchema.parse(input);
  const supabase = await createClient();
  const ctx = await getOrgContext();

  // Insert the route
  const { data: route, error: routeError } = await supabase
    .from("routes")
    .insert({
      part_number_id: validated.part_number_id,
      name: validated.name,
      user_id: ctx.userId,
      org_id: ctx.orgId,
    })
    .select()
    .single();

  if (routeError) throw new Error(`create_route failed: ${routeError.message}`);

  // Insert steps
  if (validated.steps.length > 0) {
    const stepsToInsert = validated.steps.map((step) => ({
      route_id: route.id,
      workstation_id: step.workstation_id,
      step_number: step.step_number,
      name: step.name,
      pass_fail_gate: step.pass_fail_gate ?? true,
      ideal_cycle_time_seconds: step.ideal_cycle_time_seconds ?? null,
    }));

    const { error: stepsError } = await supabase
      .from("route_steps")
      .insert(stepsToInsert);

    if (stepsError) {
      // Clean up orphaned route
      await supabase.from("routes").delete().eq("id", route.id);
      throw new Error(`create_route steps failed: ${stepsError.message}`);
    }
  }

  // Return route with steps
  const { data: fullRoute, error: fetchError } = await supabase
    .from("routes")
    .select("*, route_steps(*, workstations(name))")
    .eq("id", route.id)
    .single();

  if (fetchError)
    throw new Error(`create_route fetch failed: ${fetchError.message}`);
  return fullRoute;
}

registerTool({
  name: "create_route",
  description:
    "Create a route for a part number with ordered steps assigned to workstations. Each step can include an optional ideal_cycle_time_seconds.",
  schema: createRouteSchema,
  execute: createRoute,
});

// --- update_route ---

export const updateRouteSchema = z.object({
  id: z.string().uuid(),
  name: z.string().optional(),
  steps: z
    .array(
      z.object({
        workstation_id: z.string().uuid(),
        step_number: z.number().int().min(1),
        name: z.string(),
        pass_fail_gate: z.boolean().optional(),
        ideal_cycle_time_seconds: z.number().positive().optional(),
      }),
    )
    .optional(),
});
export type UpdateRouteInput = z.infer<typeof updateRouteSchema>;

export async function updateRoute(input: UpdateRouteInput) {
  const validated = updateRouteSchema.parse(input);
  const supabase = await createClient();

  // Build route-level updates
  const routeUpdates: Record<string, unknown> = {};
  if (validated.name) routeUpdates.name = validated.name;

  // Replace steps if provided — also bumps route version
  if (validated.steps) {
    // Delete existing steps
    const { error: deleteError } = await supabase
      .from("route_steps")
      .delete()
      .eq("route_id", validated.id);

    if (deleteError)
      throw new Error(`update_route delete steps failed: ${deleteError.message}`);

    // Insert new steps
    if (validated.steps.length > 0) {
      const stepsToInsert = validated.steps.map((step) => ({
        route_id: validated.id,
        workstation_id: step.workstation_id,
        step_number: step.step_number,
        name: step.name,
        pass_fail_gate: step.pass_fail_gate ?? true,
        ideal_cycle_time_seconds: step.ideal_cycle_time_seconds ?? null,
      }));

      const { error: insertError } = await supabase
        .from("route_steps")
        .insert(stepsToInsert);

      if (insertError)
        throw new Error(`update_route insert steps failed: ${insertError.message}`);
    }

    // Increment route version (steps changed)
    // Fetch current version first, then set version + 1
    const { data: current } = await supabase
      .from("routes")
      .select("version")
      .eq("id", validated.id)
      .single();

    routeUpdates.version = (current?.version ?? 1) + 1;
  }

  // Apply route-level updates (name and/or version bump)
  if (Object.keys(routeUpdates).length > 0) {
    const { error } = await supabase
      .from("routes")
      .update(routeUpdates)
      .eq("id", validated.id);

    if (error) throw new Error(`update_route failed: ${error.message}`);
  }

  // Return updated route with steps
  const { data, error } = await supabase
    .from("routes")
    .select("*, route_steps(*, workstations(name))")
    .eq("id", validated.id)
    .single();

  if (error)
    throw new Error(`update_route fetch failed: ${error.message}`);
  return data;
}

registerTool({
  name: "update_route",
  description: "Update a route's name and/or replace its steps. Replacing steps auto-increments the route version.",
  schema: updateRouteSchema,
  execute: updateRoute,
});

// --- delete_route ---

export const deleteRouteSchema = z.object({
  id: z.string().uuid(),
});
export type DeleteRouteInput = z.infer<typeof deleteRouteSchema>;

export async function deleteRoute(input: DeleteRouteInput) {
  const validated = deleteRouteSchema.parse(input);
  const supabase = await createClient();

  const { error } = await supabase
    .from("routes")
    .delete()
    .eq("id", validated.id);

  if (error) throw new Error(`delete_route failed: ${error.message}`);
  return { success: true };
}

registerTool({
  name: "delete_route",
  description: "Delete a route and all its steps",
  schema: deleteRouteSchema,
  execute: deleteRoute,
});

// --- configure_serial_algorithm ---

export const configureSerialAlgorithmSchema = z.object({
  part_number_id: z.string().uuid(),
  prefix: z.string(),
  pad_length: z.number().int().min(1),
});
export type ConfigureSerialAlgorithmInput = z.infer<
  typeof configureSerialAlgorithmSchema
>;

export async function configureSerialAlgorithm(
  input: ConfigureSerialAlgorithmInput,
) {
  const validated = configureSerialAlgorithmSchema.parse(input);
  const supabase = await createClient();

  // Check if algorithm already exists for this part number
  const { data: existing } = await supabase
    .from("serial_algorithms")
    .select("id")
    .eq("part_number_id", validated.part_number_id)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from("serial_algorithms")
      .update({ prefix: validated.prefix, pad_length: validated.pad_length })
      .eq("id", existing.id)
      .select()
      .single();

    if (error)
      throw new Error(`configure_serial_algorithm failed: ${error.message}`);
    return data;
  }

  const { data, error } = await supabase
    .from("serial_algorithms")
    .insert({
      part_number_id: validated.part_number_id,
      prefix: validated.prefix,
      pad_length: validated.pad_length,
    })
    .select()
    .single();

  if (error)
    throw new Error(`configure_serial_algorithm failed: ${error.message}`);
  return data;
}

registerTool({
  name: "configure_serial_algorithm",
  description:
    "Set or update the serial number algorithm for a part number (prefix and padding)",
  schema: configureSerialAlgorithmSchema,
  execute: configureSerialAlgorithm,
});

// --- get_serial_algorithm ---

export const getSerialAlgorithmSchema = z.object({
  part_number_id: z.string().uuid(),
});
export type GetSerialAlgorithmInput = z.infer<typeof getSerialAlgorithmSchema>;

export async function getSerialAlgorithm(input: GetSerialAlgorithmInput) {
  const validated = getSerialAlgorithmSchema.parse(input);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("serial_algorithms")
    .select("*")
    .eq("part_number_id", validated.part_number_id)
    .maybeSingle();

  if (error)
    throw new Error(`get_serial_algorithm failed: ${error.message}`);
  return data;
}

registerTool({
  name: "get_serial_algorithm",
  description: "Get the serial number algorithm for a part number",
  schema: getSerialAlgorithmSchema,
  execute: getSerialAlgorithm,
});
