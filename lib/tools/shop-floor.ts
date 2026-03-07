import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { registerTool } from "./registry";

// --- list_lines ---

export const listLinesSchema = z.object({});

export type ListLinesInput = z.infer<typeof listLinesSchema>;

export async function listLines(_input: ListLinesInput) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lines")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw new Error(`list_lines failed: ${error.message}`);
  return data;
}

registerTool({
  name: "list_lines",
  description: "List all manufacturing lines",
  schema: listLinesSchema,
  execute: listLines,
});

// --- create_line ---

export const createLineSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
});

export type CreateLineInput = z.infer<typeof createLineSchema>;

export async function createLine(input: CreateLineInput) {
  const validated = createLineSchema.parse(input);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("lines")
    .insert({ ...validated, user_id: user.id })
    .select()
    .single();

  if (error) throw new Error(`create_line failed: ${error.message}`);
  return data;
}

registerTool({
  name: "create_line",
  description: "Create a new manufacturing line",
  schema: createLineSchema,
  execute: createLine,
});

// --- update_line ---

export const updateLineSchema = z.object({
  id: z.string().uuid(),
  name: z.string().optional(),
  description: z.string().optional(),
});

export type UpdateLineInput = z.infer<typeof updateLineSchema>;

export async function updateLine(input: UpdateLineInput) {
  const { id, ...updates } = updateLineSchema.parse(input);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("lines")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`update_line failed: ${error.message}`);
  return data;
}

registerTool({
  name: "update_line",
  description: "Update a manufacturing line",
  schema: updateLineSchema,
  execute: updateLine,
});

// --- delete_line ---

export const deleteLineSchema = z.object({
  id: z.string().uuid(),
});

export type DeleteLineInput = z.infer<typeof deleteLineSchema>;

export async function deleteLine(input: DeleteLineInput) {
  const validated = deleteLineSchema.parse(input);
  const supabase = await createClient();

  const { error } = await supabase
    .from("lines")
    .delete()
    .eq("id", validated.id);

  if (error) throw new Error(`delete_line failed: ${error.message}`);
  return { success: true };
}

registerTool({
  name: "delete_line",
  description: "Delete a manufacturing line and its workstations",
  schema: deleteLineSchema,
  execute: deleteLine,
});

// --- list_workstations ---

export const listWorkstationsSchema = z.object({
  line_id: z.string().uuid().optional(),
});

export type ListWorkstationsInput = z.infer<typeof listWorkstationsSchema>;

export async function listWorkstations(input: ListWorkstationsInput) {
  const validated = listWorkstationsSchema.parse(input);
  const supabase = await createClient();

  let query = supabase
    .from("workstations")
    .select("*")
    .order("position", { ascending: true });

  if (validated.line_id) {
    query = query.eq("line_id", validated.line_id);
  }

  const { data, error } = await query;

  if (error) throw new Error(`list_workstations failed: ${error.message}`);
  return data;
}

registerTool({
  name: "list_workstations",
  description: "List workstations, optionally filtered by line",
  schema: listWorkstationsSchema,
  execute: listWorkstations,
});

// --- create_workstation ---

export const createWorkstationSchema = z.object({
  line_id: z.string().uuid(),
  name: z.string(),
  position: z.number().int().min(1),
  operator_name: z.string().optional(),
});

export type CreateWorkstationInput = z.infer<typeof createWorkstationSchema>;

export async function createWorkstation(input: CreateWorkstationInput) {
  const validated = createWorkstationSchema.parse(input);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("workstations")
    .insert({ ...validated, user_id: user.id })
    .select()
    .single();

  if (error) throw new Error(`create_workstation failed: ${error.message}`);
  return data;
}

registerTool({
  name: "create_workstation",
  description: "Add a workstation to a manufacturing line",
  schema: createWorkstationSchema,
  execute: createWorkstation,
});

// --- update_workstation ---

export const updateWorkstationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().optional(),
  position: z.number().int().min(1).optional(),
  operator_name: z.string().nullable().optional(),
});

export type UpdateWorkstationInput = z.infer<typeof updateWorkstationSchema>;

export async function updateWorkstation(input: UpdateWorkstationInput) {
  const { id, ...updates } = updateWorkstationSchema.parse(input);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("workstations")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`update_workstation failed: ${error.message}`);
  return data;
}

registerTool({
  name: "update_workstation",
  description: "Update a workstation (name, position, or operator)",
  schema: updateWorkstationSchema,
  execute: updateWorkstation,
});

// --- delete_workstation ---

export const deleteWorkstationSchema = z.object({
  id: z.string().uuid(),
});

export type DeleteWorkstationInput = z.infer<typeof deleteWorkstationSchema>;

export async function deleteWorkstation(input: DeleteWorkstationInput) {
  const validated = deleteWorkstationSchema.parse(input);
  const supabase = await createClient();

  const { error } = await supabase
    .from("workstations")
    .delete()
    .eq("id", validated.id);

  if (error) throw new Error(`delete_workstation failed: ${error.message}`);
  return { success: true };
}

registerTool({
  name: "delete_workstation",
  description: "Delete a workstation from a manufacturing line",
  schema: deleteWorkstationSchema,
  execute: deleteWorkstation,
});

// --- create_machine ---

export const createMachineSchema = z.object({
  workstation_id: z.string().uuid(),
  name: z.string(),
  type: z.string(),
});

export type CreateMachineInput = z.infer<typeof createMachineSchema>;

export async function createMachine(input: CreateMachineInput) {
  const validated = createMachineSchema.parse(input);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("machines")
    .insert({ ...validated, user_id: user.id })
    .select()
    .single();

  if (error) throw new Error(`create_machine failed: ${error.message}`);
  return data;
}

registerTool({
  name: "create_machine",
  description: "Register a new machine and attach it to a workstation",
  schema: createMachineSchema,
  execute: createMachine,
});

// --- list_machines ---

export const listMachinesSchema = z.object({
  workstation_id: z.string().uuid().optional(),
  status: z.enum(["idle", "running", "down"]).optional(),
});

export type ListMachinesInput = z.infer<typeof listMachinesSchema>;

export async function listMachines(input: ListMachinesInput) {
  const validated = listMachinesSchema.parse(input);
  const supabase = await createClient();

  let query = supabase
    .from("machines")
    .select("*")
    .order("created_at", { ascending: true });

  if (validated.workstation_id) {
    query = query.eq("workstation_id", validated.workstation_id);
  }
  if (validated.status) {
    query = query.eq("status", validated.status);
  }

  const { data, error } = await query;

  if (error) throw new Error(`list_machines failed: ${error.message}`);
  return data;
}

registerTool({
  name: "list_machines",
  description: "List machines with optional filters by workstation or status",
  schema: listMachinesSchema,
  execute: listMachines,
});

// --- update_machine ---

export const updateMachineSchema = z.object({
  id: z.string().uuid(),
  name: z.string().optional(),
  type: z.string().optional(),
});

export type UpdateMachineInput = z.infer<typeof updateMachineSchema>;

export async function updateMachine(input: UpdateMachineInput) {
  const { id, ...updates } = updateMachineSchema.parse(input);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("machines")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`update_machine failed: ${error.message}`);
  return data;
}

registerTool({
  name: "update_machine",
  description: "Update a machine (name or type)",
  schema: updateMachineSchema,
  execute: updateMachine,
});

// --- delete_machine ---

export const deleteMachineSchema = z.object({
  id: z.string().uuid(),
});

export type DeleteMachineInput = z.infer<typeof deleteMachineSchema>;

export async function deleteMachine(input: DeleteMachineInput) {
  const validated = deleteMachineSchema.parse(input);
  const supabase = await createClient();

  const { error } = await supabase
    .from("machines")
    .delete()
    .eq("id", validated.id);

  if (error) throw new Error(`delete_machine failed: ${error.message}`);
  return { success: true };
}

registerTool({
  name: "delete_machine",
  description: "Delete a machine from a workstation",
  schema: deleteMachineSchema,
  execute: deleteMachine,
});

// --- update_machine_status ---

export const updateMachineStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["idle", "running", "down"]),
});

export type UpdateMachineStatusInput = z.infer<
  typeof updateMachineStatusSchema
>;

export async function updateMachineStatus(input: UpdateMachineStatusInput) {
  const validated = updateMachineStatusSchema.parse(input);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("machines")
    .update({ status: validated.status })
    .eq("id", validated.id)
    .select()
    .single();

  if (error)
    throw new Error(`update_machine_status failed: ${error.message}`);
  return data;
}

registerTool({
  name: "update_machine_status",
  description: "Change machine status (idle/running/down)",
  schema: updateMachineStatusSchema,
  execute: updateMachineStatus,
});
