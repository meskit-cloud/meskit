import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { registerTool } from "./registry";
import { getOrgContext } from "@/lib/org-context";

// --- create_maintenance_request ---

export const createMaintenanceRequestSchema = z.object({
  machine_id: z.string().uuid(),
  request_type: z.enum(["corrective", "preventive"]),
  priority: z.enum(["low", "medium", "high", "critical"]),
  description: z.string(),
});

export type CreateMaintenanceRequestInput = z.infer<typeof createMaintenanceRequestSchema>;

export async function createMaintenanceRequest(input: CreateMaintenanceRequestInput) {
  const validated = createMaintenanceRequestSchema.parse(input);
  const supabase = await createClient();
  const ctx = await getOrgContext();

  const { data, error } = await supabase
    .from("maintenance_requests")
    .insert({
      ...validated,
      status: "open",
      user_id: ctx.userId,
      org_id: ctx.orgId,
    })
    .select()
    .single();

  if (error) throw new Error(`create_maintenance_request failed: ${error.message}`);
  return data;
}

registerTool({
  name: "create_maintenance_request",
  description:
    "Create a maintenance request for a machine. Types: corrective (fix a fault) or preventive (scheduled maintenance). Priority: low, medium, high, critical.",
  schema: createMaintenanceRequestSchema,
  execute: createMaintenanceRequest,
});

// --- list_maintenance_requests ---

export const listMaintenanceRequestsSchema = z.object({
  machine_id: z.string().uuid().optional(),
  status: z.enum(["open", "in_progress", "completed", "cancelled"]).optional(),
  request_type: z.enum(["corrective", "preventive"]).optional(),
});

export type ListMaintenanceRequestsInput = z.infer<typeof listMaintenanceRequestsSchema>;

export async function listMaintenanceRequests(input: ListMaintenanceRequestsInput) {
  const validated = listMaintenanceRequestsSchema.parse(input);
  const supabase = await createClient();

  let query = supabase
    .from("maintenance_requests")
    .select("*, machines(name)")
    .order("created_at", { ascending: false });

  if (validated.machine_id) {
    query = query.eq("machine_id", validated.machine_id);
  }
  if (validated.status) {
    query = query.eq("status", validated.status);
  }
  if (validated.request_type) {
    query = query.eq("request_type", validated.request_type);
  }

  const { data, error } = await query;

  if (error) throw new Error(`list_maintenance_requests failed: ${error.message}`);

  // Flatten machine name into each row
  return (data ?? []).map((row) => {
    const { machines, ...rest } = row as Record<string, unknown> & { machines: { name: string } | null };
    return { ...rest, machine_name: machines?.name ?? null };
  });
}

registerTool({
  name: "list_maintenance_requests",
  description:
    "List maintenance requests with optional filters by machine, status (open/in_progress/completed/cancelled), or type (corrective/preventive). Includes machine name.",
  schema: listMaintenanceRequestsSchema,
  execute: listMaintenanceRequests,
});

// --- update_maintenance_status ---

const VALID_TRANSITIONS: Record<string, string[]> = {
  open: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
};

export const updateMaintenanceStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["open", "in_progress", "completed", "cancelled"]),
});

export type UpdateMaintenanceStatusInput = z.infer<typeof updateMaintenanceStatusSchema>;

export async function updateMaintenanceStatus(input: UpdateMaintenanceStatusInput) {
  const validated = updateMaintenanceStatusSchema.parse(input);
  const supabase = await createClient();

  // Fetch current status to validate transition
  const { data: existing, error: fetchError } = await supabase
    .from("maintenance_requests")
    .select("status")
    .eq("id", validated.id)
    .single();

  if (fetchError || !existing) {
    throw new Error("update_maintenance_status: maintenance request not found");
  }

  const currentStatus = existing.status as string;
  const allowed = VALID_TRANSITIONS[currentStatus] ?? [];
  if (!allowed.includes(validated.status)) {
    throw new Error(
      `update_maintenance_status: invalid transition ${currentStatus} → ${validated.status}. Allowed: ${allowed.join(", ") || "none"}`,
    );
  }

  const { data, error } = await supabase
    .from("maintenance_requests")
    .update({ status: validated.status, updated_at: new Date().toISOString() })
    .eq("id", validated.id)
    .select()
    .single();

  if (error) throw new Error(`update_maintenance_status failed: ${error.message}`);
  return data;
}

registerTool({
  name: "update_maintenance_status",
  description:
    "Update a maintenance request status. Valid transitions: open → in_progress or cancelled; in_progress → completed or cancelled. Other transitions are rejected.",
  schema: updateMaintenanceStatusSchema,
  execute: updateMaintenanceStatus,
});
