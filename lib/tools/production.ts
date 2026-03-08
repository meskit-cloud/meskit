import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { registerTool } from "./registry";

// --- generate_units ---

export const generateUnitsSchema = z.object({
  part_number_id: z.string().uuid(),
  route_id: z.string().uuid(),
  count: z.number().int().min(1).max(1000),
  production_order_id: z.string().uuid().optional(),
});
export type GenerateUnitsInput = z.infer<typeof generateUnitsSchema>;

export async function generateUnits(input: GenerateUnitsInput) {
  const validated = generateUnitsSchema.parse(input);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Get serial algorithm for this part number
  const { data: algo, error: algoError } = await supabase
    .from("serial_algorithms")
    .select("*")
    .eq("part_number_id", validated.part_number_id)
    .single();

  if (algoError || !algo)
    throw new Error(
      "generate_units: no serial algorithm configured for this part number",
    );

  // Atomically increment counter via RPC to avoid race conditions
  const { data: newCounter, error: counterError } = await supabase
    .rpc("increment_serial_counter", {
      algo_id: algo.id,
      increment: validated.count,
    });

  if (counterError || newCounter === null)
    throw new Error(
      `generate_units: counter update failed: ${counterError?.message}`,
    );

  const oldCounter = newCounter - validated.count;

  // Generate serial numbers
  const serials = Array.from({ length: validated.count }, (_, i) =>
    `${algo.prefix}-${String(oldCounter + i + 1).padStart(algo.pad_length, "0")}`,
  );

  // Insert all units
  const unitsToInsert = serials.map((serial) => ({
    user_id: user.id,
    serial_number: serial,
    part_number_id: validated.part_number_id,
    route_id: validated.route_id,
    production_order_id: validated.production_order_id ?? null,
    status: "in_progress" as const,
    current_step: 0,
  }));

  const { data: units, error: insertError } = await supabase
    .from("units")
    .insert(unitsToInsert)
    .select();

  if (insertError)
    throw new Error(`generate_units: insert failed: ${insertError.message}`);

  // Update production order status to running if linked
  if (validated.production_order_id) {
    await supabase
      .from("production_orders")
      .update({ status: "running" })
      .eq("id", validated.production_order_id)
      .eq("status", "new");
  }

  return units;
}

registerTool({
  name: "generate_units",
  description:
    "Generate N units with auto-assigned serial numbers. Requires a serial algorithm to be configured for the part number.",
  schema: generateUnitsSchema,
  execute: generateUnits,
});

// --- move_unit ---

export const moveUnitSchema = z.object({
  unit_id: z.string().uuid(),
});
export type MoveUnitInput = z.infer<typeof moveUnitSchema>;

export async function moveUnit(input: MoveUnitInput) {
  const validated = moveUnitSchema.parse(input);
  const supabase = await createClient();

  // Get unit
  const { data: unit, error: unitError } = await supabase
    .from("units")
    .select("*")
    .eq("id", validated.unit_id)
    .single();

  if (unitError || !unit) throw new Error("move_unit: unit not found");
  if (unit.status !== "in_progress")
    throw new Error(
      `move_unit: unit is not in progress (status: ${unit.status})`,
    );

  // Get route steps ordered by step_number
  const { data: steps, error: stepsError } = await supabase
    .from("route_steps")
    .select("id, step_number, name, workstation_id, pass_fail_gate")
    .eq("route_id", unit.route_id)
    .order("step_number", { ascending: true });

  if (stepsError || !steps || steps.length === 0)
    throw new Error("move_unit: route has no steps");

  const maxStepNumber = steps[steps.length - 1].step_number;
  const currentStepNumber = unit.current_step;
  const nextStepEntry = steps.find((s) => s.step_number > currentStepNumber);
  const nextStepNumber = nextStepEntry?.step_number ?? maxStepNumber + 1;

  // Record unit_history for the step being completed (if unit is on a step)
  if (currentStepNumber > 0) {
    const currentStep = steps.find((s) => s.step_number === currentStepNumber);
    if (currentStep) {
      await supabase.from("unit_history").insert({
        unit_id: validated.unit_id,
        route_step_id: currentStep.id,
        workstation_id: currentStep.workstation_id,
        result: "pass",
      });
    }
  }

  // Check if unit has completed the full route
  if (nextStepNumber > maxStepNumber) {
    const { data: completedUnit, error: completeError } = await supabase
      .from("units")
      .update({ status: "completed", current_step: nextStepNumber })
      .eq("id", validated.unit_id)
      .select()
      .single();

    if (completeError)
      throw new Error(
        `move_unit: failed to complete unit: ${completeError.message}`,
      );

    // Atomically increment quantity_completed via RPC
    if (unit.production_order_id) {
      await supabase.rpc("increment_order_completed", {
        p_order_id: unit.production_order_id,
      });
    }

    return { ...completedUnit, completed: true };
  }

  // Advance to next step
  const { data: movedUnit, error: moveError } = await supabase
    .from("units")
    .update({ current_step: nextStepNumber })
    .eq("id", validated.unit_id)
    .select()
    .single();

  if (moveError)
    throw new Error(`move_unit: failed to advance: ${moveError.message}`);

  const nextStep = steps.find((s) => s.step_number === nextStepNumber);
  return {
    ...movedUnit,
    current_step_name: nextStep?.name,
    current_workstation_id: nextStep?.workstation_id,
    at_gate: nextStep?.pass_fail_gate ?? false,
  };
}

registerTool({
  name: "move_unit",
  description:
    "Advance a unit to its next route step. Records unit_history for the completed step. Marks unit as completed and updates production order when the last step is done.",
  schema: moveUnitSchema,
  execute: moveUnit,
});

// --- scrap_unit ---

export const scrapUnitSchema = z.object({
  unit_id: z.string().uuid(),
  defect_code_id: z.string().uuid().optional(),
  notes: z.string().optional(),
});
export type ScrapUnitInput = z.infer<typeof scrapUnitSchema>;

export async function scrapUnit(input: ScrapUnitInput) {
  const validated = scrapUnitSchema.parse(input);
  const supabase = await createClient();

  // Get unit
  const { data: unit, error: unitError } = await supabase
    .from("units")
    .select("*")
    .eq("id", validated.unit_id)
    .single();

  if (unitError || !unit) throw new Error("scrap_unit: unit not found");
  if (unit.status !== "in_progress")
    throw new Error(`scrap_unit: unit is already ${unit.status}`);

  // Get current route step for history
  let currentStep: {
    id: string;
    workstation_id: string;
  } | null = null;

  if (unit.current_step > 0) {
    const { data: step } = await supabase
      .from("route_steps")
      .select("id, workstation_id")
      .eq("route_id", unit.route_id)
      .eq("step_number", unit.current_step)
      .single();

    currentStep = step ?? null;
  }

  // Record unit_history (fail)
  if (currentStep) {
    await supabase.from("unit_history").insert({
      unit_id: validated.unit_id,
      route_step_id: currentStep.id,
      workstation_id: currentStep.workstation_id,
      result: "fail",
      defect_code_id: validated.defect_code_id ?? null,
      metadata: validated.notes ? { notes: validated.notes } : null,
    });
  }

  // Mark unit as scrapped
  const { data, error } = await supabase
    .from("units")
    .update({ status: "scrapped" })
    .eq("id", validated.unit_id)
    .select()
    .single();

  if (error) throw new Error(`scrap_unit failed: ${error.message}`);

  // Create quality event (scrap)
  if (currentStep) {
    await supabase.from("quality_events").insert({
      unit_id: validated.unit_id,
      workstation_id: currentStep.workstation_id,
      event_type: "scrap",
      result: "fail",
      defect_code_id: validated.defect_code_id ?? null,
      notes: validated.notes ?? null,
    });
  }

  // Check if all units for the order are terminal (completed or scrapped)
  if (unit.production_order_id) {
    const { count } = await supabase
      .from("units")
      .select("id", { count: "exact", head: true })
      .eq("production_order_id", unit.production_order_id)
      .eq("status", "in_progress");

    if (count === 0) {
      await supabase
        .from("production_orders")
        .update({ status: "complete" })
        .eq("id", unit.production_order_id)
        .in("status", ["running", "scheduled"]);
    }
  }

  return data;
}

registerTool({
  name: "scrap_unit",
  description:
    "Mark a unit as scrapped at its current step. Records a fail in unit_history and creates a scrap quality event.",
  schema: scrapUnitSchema,
  execute: scrapUnit,
});

// --- get_wip_status ---

export const getWipStatusSchema = z.object({
  line_id: z.string().uuid().optional(),
  workstation_id: z.string().uuid().optional(),
});
export type GetWipStatusInput = z.infer<typeof getWipStatusSchema>;

export async function getWipStatus(input: GetWipStatusInput) {
  const validated = getWipStatusSchema.parse(input);
  const supabase = await createClient();

  // Get all in-progress units that have entered a step
  const { data: units, error } = await supabase
    .from("units")
    .select("id, serial_number, current_step, route_id, part_number_id, production_order_id")
    .eq("status", "in_progress")
    .gt("current_step", 0);

  if (error) throw new Error(`get_wip_status failed: ${error.message}`);
  if (!units || units.length === 0) return [];

  // Get route steps for all routes in play
  const routeIds = [...new Set(units.map((u) => u.route_id))];
  const { data: steps, error: stepsError } = await supabase
    .from("route_steps")
    .select("id, route_id, step_number, workstation_id, workstations(id, name, line_id)")
    .in("route_id", routeIds);

  if (stepsError)
    throw new Error(`get_wip_status: steps query failed: ${stepsError.message}`);

  // Aggregate units by workstation
  const wipByWorkstation = new Map<
    string,
    {
      workstation_id: string;
      workstation_name: string;
      line_id: string | null;
      unit_count: number;
      units: typeof units;
    }
  >();

  for (const unit of units) {
    const step = steps?.find(
      (s) => s.route_id === unit.route_id && s.step_number === unit.current_step,
    );
    if (!step) continue;

    const ws = (
      Array.isArray(step.workstations) ? step.workstations[0] : step.workstations
    ) as { id: string; name: string; line_id: string } | null;
    if (!ws) continue;

    // Apply optional filters
    if (validated.workstation_id && ws.id !== validated.workstation_id) continue;
    if (validated.line_id && ws.line_id !== validated.line_id) continue;

    if (!wipByWorkstation.has(ws.id)) {
      wipByWorkstation.set(ws.id, {
        workstation_id: ws.id,
        workstation_name: ws.name,
        line_id: ws.line_id,
        unit_count: 0,
        units: [],
      });
    }
    const entry = wipByWorkstation.get(ws.id)!;
    entry.unit_count++;
    entry.units.push(unit);
  }

  return Array.from(wipByWorkstation.values());
}

registerTool({
  name: "get_wip_status",
  description:
    "Get current work-in-progress: unit count per workstation. Optionally filter by line or workstation.",
  schema: getWipStatusSchema,
  execute: getWipStatus,
});

// --- search_units ---

export const searchUnitsSchema = z.object({
  serial_number: z.string().optional(),
  status: z.enum(["in_progress", "completed", "scrapped"]).optional(),
  part_number_id: z.string().uuid().optional(),
  production_order_id: z.string().uuid().optional(),
});
export type SearchUnitsInput = z.infer<typeof searchUnitsSchema>;

export async function searchUnits(input: SearchUnitsInput) {
  const validated = searchUnitsSchema.parse(input);
  const supabase = await createClient();

  let query = supabase
    .from("units")
    .select("*, part_numbers(name)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (validated.serial_number) {
    query = query.ilike("serial_number", `%${validated.serial_number}%`);
  }
  if (validated.status) {
    query = query.eq("status", validated.status);
  }
  if (validated.part_number_id) {
    query = query.eq("part_number_id", validated.part_number_id);
  }
  if (validated.production_order_id) {
    query = query.eq("production_order_id", validated.production_order_id);
  }

  const { data, error } = await query;
  if (error) throw new Error(`search_units failed: ${error.message}`);
  return data;
}

registerTool({
  name: "search_units",
  description:
    "Search units by serial number (partial match), status, part number, or production order.",
  schema: searchUnitsSchema,
  execute: searchUnits,
});

// --- create_production_order ---

export const createProductionOrderSchema = z.object({
  part_number_id: z.string().uuid(),
  route_id: z.string().uuid(),
  quantity_ordered: z.number().int().min(1),
});
export type CreateProductionOrderInput = z.infer<
  typeof createProductionOrderSchema
>;

export async function createProductionOrder(
  input: CreateProductionOrderInput,
) {
  const validated = createProductionOrderSchema.parse(input);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Auto-generate order number from MAX existing to avoid collisions on delete
  const { data: maxOrder } = await supabase
    .from("production_orders")
    .select("order_number")
    .eq("user_id", user.id)
    .order("order_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  let nextNum = 1;
  if (maxOrder?.order_number) {
    const match = maxOrder.order_number.match(/PO-(\d+)/);
    if (match) nextNum = parseInt(match[1], 10) + 1;
  }
  const orderNumber = `PO-${String(nextNum).padStart(4, "0")}`;

  const { data, error } = await supabase
    .from("production_orders")
    .insert({ ...validated, user_id: user.id, order_number: orderNumber })
    .select("*, part_numbers(name), routes(name)")
    .single();

  if (error)
    throw new Error(`create_production_order failed: ${error.message}`);
  return data;
}

registerTool({
  name: "create_production_order",
  description:
    "Create a production order for a part number and route. Auto-assigns an order number (PO-0001, PO-0002, ...).",
  schema: createProductionOrderSchema,
  execute: createProductionOrder,
});

// --- update_order_status ---

const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  new: ["scheduled", "running", "closed"],
  scheduled: ["running", "closed"],
  running: ["complete", "closed"],
  complete: ["closed"],
  closed: [],
};

export const updateOrderStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["new", "scheduled", "running", "complete", "closed"]),
});
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

export async function updateOrderStatus(input: UpdateOrderStatusInput) {
  const validated = updateOrderStatusSchema.parse(input);
  const supabase = await createClient();

  // Validate transition
  const { data: order, error: fetchError } = await supabase
    .from("production_orders")
    .select("status")
    .eq("id", validated.id)
    .single();

  if (fetchError || !order)
    throw new Error("update_order_status: order not found");

  const allowed = ORDER_STATUS_TRANSITIONS[order.status] ?? [];
  if (!allowed.includes(validated.status)) {
    throw new Error(
      `update_order_status: invalid transition ${order.status} → ${validated.status}. Allowed: ${allowed.join(", ") || "none"}`,
    );
  }

  const { data, error } = await supabase
    .from("production_orders")
    .update({ status: validated.status })
    .eq("id", validated.id)
    .select("*, part_numbers(name), routes(name)")
    .single();

  if (error)
    throw new Error(`update_order_status failed: ${error.message}`);
  return data;
}

registerTool({
  name: "update_order_status",
  description:
    "Update production order status. Valid transitions: new→scheduled/running/closed, scheduled→running/closed, running→complete/closed, complete→closed.",
  schema: updateOrderStatusSchema,
  execute: updateOrderStatus,
});

// --- list_production_orders ---

export const listProductionOrdersSchema = z.object({
  status: z
    .enum(["new", "scheduled", "running", "complete", "closed"])
    .optional(),
  part_number_id: z.string().uuid().optional(),
});
export type ListProductionOrdersInput = z.infer<
  typeof listProductionOrdersSchema
>;

export async function listProductionOrders(input: ListProductionOrdersInput) {
  const validated = listProductionOrdersSchema.parse(input);
  const supabase = await createClient();

  let query = supabase
    .from("production_orders")
    .select("*, part_numbers(name), routes(name)")
    .order("created_at", { ascending: false });

  if (validated.status) {
    query = query.eq("status", validated.status);
  }
  if (validated.part_number_id) {
    query = query.eq("part_number_id", validated.part_number_id);
  }

  const { data, error } = await query;
  if (error)
    throw new Error(`list_production_orders failed: ${error.message}`);
  return data;
}

registerTool({
  name: "list_production_orders",
  description:
    "List production orders with part number and route names. Optionally filter by status or part number.",
  schema: listProductionOrdersSchema,
  execute: listProductionOrders,
});
