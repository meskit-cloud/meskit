import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { registerTool } from "./registry";

// --- Analytics Tools ---
// These helpers are required by the Quality Monitor in M4 and are reused by
// Monitor Mode dashboards and the Planner in M5.

const timeRangeEnum = z.enum([
  "today",
  "last_8_hours",
  "last_24_hours",
  "last_7_days",
  "last_30_days",
]);

function getTimeRangeStart(timeRange: string): string {
  const now = new Date();
  let start: Date;
  switch (timeRange) {
    case "today":
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "last_8_hours":
      start = new Date(now.getTime() - 8 * 60 * 60 * 1000);
      break;
    case "last_24_hours":
      start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case "last_7_days":
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "last_30_days":
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      start = new Date(0);
  }
  return start.toISOString();
}

// --- get_throughput ---

export const getThroughputSchema = z.object({
  line_id: z.string().uuid().optional(),
  time_range: timeRangeEnum,
});
export type GetThroughputInput = z.infer<typeof getThroughputSchema>;

export async function getThroughput(input: GetThroughputInput) {
  const validated = getThroughputSchema.parse(input);
  const supabase = await createClient();

  const since = getTimeRangeStart(validated.time_range);

  // Get completed units in the time range
  let query = supabase
    .from("units")
    .select("id, serial_number, part_number_id, route_id, created_at, part_numbers(name)")
    .eq("status", "completed")
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  const { data: units, error } = await query;
  if (error) throw new Error(`get_throughput failed: ${error.message}`);

  // If line_id filter: get workstations for that line, then filter units
  // whose route passes through those workstations
  // For MVP: return all completed units + count; line filter is a best-effort
  let filtered = units ?? [];
  if (validated.line_id && filtered.length > 0) {
    const { data: workstations } = await supabase
      .from("workstations")
      .select("id")
      .eq("line_id", validated.line_id);

    const wsIds = new Set((workstations ?? []).map((w) => w.id));

    const { data: steps } = await supabase
      .from("route_steps")
      .select("route_id")
      .in("workstation_id", [...wsIds]);

    const routeIds = new Set((steps ?? []).map((s) => s.route_id));
    filtered = filtered.filter((u) => routeIds.has(u.route_id));
  }

  return {
    time_range: validated.time_range,
    since,
    total_completed: filtered.length,
    units: filtered,
  };
}

registerTool({
  name: "get_throughput",
  description:
    "Units completed in a time window (today/last_8_hours/last_24_hours/last_7_days/last_30_days). Optionally filtered by line.",
  schema: getThroughputSchema,
  execute: getThroughput,
});

// --- get_yield_report ---

export const getYieldReportSchema = z.object({
  workstation_id: z.string().uuid().optional(),
  time_range: timeRangeEnum.optional(),
});
export type GetYieldReportInput = z.infer<typeof getYieldReportSchema>;

export async function getYieldReport(input: GetYieldReportInput) {
  const validated = getYieldReportSchema.parse(input);
  const supabase = await createClient();

  const since = validated.time_range
    ? getTimeRangeStart(validated.time_range)
    : getTimeRangeStart("last_24_hours");

  // Get quality events in the time range with workstation info
  let query = supabase
    .from("quality_events")
    .select("workstation_id, result, workstations(id, name)")
    .gte("timestamp", since);

  if (validated.workstation_id) {
    query = query.eq("workstation_id", validated.workstation_id);
  }

  const { data: events, error } = await query;
  if (error) throw new Error(`get_yield_report failed: ${error.message}`);

  // Aggregate by workstation
  const byWorkstation = new Map<
    string,
    { workstation_name: string; pass: number; fail: number }
  >();

  for (const ev of events ?? []) {
    const ws = (
      Array.isArray(ev.workstations) ? ev.workstations[0] : ev.workstations
    ) as { id: string; name: string } | null;
    if (!ws) continue;

    if (!byWorkstation.has(ev.workstation_id)) {
      byWorkstation.set(ev.workstation_id, {
        workstation_name: ws.name,
        pass: 0,
        fail: 0,
      });
    }
    const entry = byWorkstation.get(ev.workstation_id)!;
    if (ev.result === "pass") entry.pass++;
    else entry.fail++;
  }

  return Array.from(byWorkstation.entries()).map(([workstation_id, data]) => {
    const total = data.pass + data.fail;
    return {
      workstation_id,
      workstation_name: data.workstation_name,
      total_inspected: total,
      pass_count: data.pass,
      fail_count: data.fail,
      yield_percent: total > 0 ? Math.round((data.pass / total) * 100) : null,
    };
  });
}

registerTool({
  name: "get_yield_report",
  description:
    "Pass/fail ratio per workstation over a time window. Returns yield_percent for each workstation. Used by Quality Monitor for yield-drop detection.",
  schema: getYieldReportSchema,
  execute: getYieldReport,
});

// --- get_unit_history ---

export const getUnitHistorySchema = z.object({
  unit_id: z.string().uuid(),
});
export type GetUnitHistoryInput = z.infer<typeof getUnitHistorySchema>;

export async function getUnitHistory(input: GetUnitHistoryInput) {
  const validated = getUnitHistorySchema.parse(input);
  const supabase = await createClient();

  // Get the unit
  const { data: unit, error: unitError } = await supabase
    .from("units")
    .select("*, part_numbers(name), routes(name)")
    .eq("id", validated.unit_id)
    .single();

  if (unitError || !unit)
    throw new Error("get_unit_history: unit not found");

  // Get the full history
  const { data: history, error: historyError } = await supabase
    .from("unit_history")
    .select(
      "id, result, timestamp, metadata, route_steps(step_number, name, pass_fail_gate), workstations(name), defect_codes(code, description, severity)",
    )
    .eq("unit_id", validated.unit_id)
    .order("timestamp", { ascending: true });

  if (historyError)
    throw new Error(`get_unit_history failed: ${historyError.message}`);

  return {
    unit: {
      id: unit.id,
      serial_number: unit.serial_number,
      status: unit.status,
      current_step: unit.current_step,
      part_number_name: (unit.part_numbers as { name: string } | null)?.name,
      route_name: (unit.routes as { name: string } | null)?.name,
      created_at: unit.created_at,
    },
    history: history ?? [],
  };
}

registerTool({
  name: "get_unit_history",
  description:
    "Full route history for a unit: every step it passed through, results, defect codes, and timestamps.",
  schema: getUnitHistorySchema,
  execute: getUnitHistory,
});

// --- get_oee ---

export const getOeeSchema = z.object({
  line_id: z.string().uuid().optional(),
  time_range: timeRangeEnum.optional(),
});
export type GetOeeInput = z.infer<typeof getOeeSchema>;

export async function getOee(input: GetOeeInput) {
  const validated = getOeeSchema.parse(input);
  const supabase = await createClient();

  const timeRange = validated.time_range ?? "last_24_hours";
  const since = getTimeRangeStart(timeRange);
  const sinceDate = new Date(since);
  const now = new Date();
  const windowMs = now.getTime() - sinceDate.getTime();

  // --- Availability ---
  // Get machines, optionally scoped to a line
  let machineQuery = supabase
    .from("machines")
    .select("id, status, workstation_id, workstations(line_id)");

  const { data: machines, error: machError } = await machineQuery;
  if (machError) throw new Error(`get_oee failed: ${machError.message}`);

  let scopedMachines = machines ?? [];
  if (validated.line_id) {
    scopedMachines = scopedMachines.filter((m) => {
      const ws = (Array.isArray(m.workstations) ? m.workstations[0] : m.workstations) as { line_id: string } | null;
      return ws?.line_id === validated.line_id;
    });
  }

  const machineIds = scopedMachines.map((m) => m.id);
  let availability = 100;

  if (machineIds.length > 0) {
    // Get machine status change audit entries in time range
    const { data: auditEntries } = await supabase
      .from("audit_log")
      .select("entity_id, metadata, created_at")
      .eq("action", "update_machine_status")
      .in("entity_id", machineIds)
      .gte("created_at", since)
      .order("created_at", { ascending: true });

    if (auditEntries && auditEntries.length > 0) {
      // Group entries by machine
      const byMachine = new Map<string, { status: string; created_at: string }[]>();
      for (const entry of auditEntries) {
        if (!entry.entity_id) continue;
        if (!byMachine.has(entry.entity_id)) byMachine.set(entry.entity_id, []);
        const meta = entry.metadata as { status?: string } | null;
        if (meta?.status) {
          byMachine.get(entry.entity_id)!.push({ status: meta.status, created_at: entry.created_at });
        }
      }

      // For each machine with audit data, compute time in EXECUTE state
      let totalRunTime = 0;
      let totalTrackedTime = 0;
      const productiveStates = new Set(["EXECUTE", "COMPLETE"]);

      for (const [, transitions] of byMachine) {
        for (let i = 0; i < transitions.length; i++) {
          const start = new Date(transitions[i].created_at).getTime();
          const end = i + 1 < transitions.length
            ? new Date(transitions[i + 1].created_at).getTime()
            : now.getTime();
          const duration = end - start;
          totalTrackedTime += duration;
          if (productiveStates.has(transitions[i].status)) {
            totalRunTime += duration;
          }
        }
      }

      if (totalTrackedTime > 0) {
        availability = Math.round((totalRunTime / totalTrackedTime) * 100);
      }
    }
    // If no audit entries, availability stays 100% (no recorded downtime)
  }

  // --- Performance ---
  // Actual throughput vs ideal throughput based on cycle times
  const { data: completedUnits } = await supabase
    .from("units")
    .select("id, route_id")
    .eq("status", "completed")
    .gte("created_at", since);

  const actualCount = completedUnits?.length ?? 0;
  let performance = 100;

  if (actualCount > 0 && windowMs > 0) {
    // Get ideal cycle times for routes used by completed units
    const routeIds = [...new Set(completedUnits!.map((u) => u.route_id))];
    const { data: steps } = await supabase
      .from("route_steps")
      .select("route_id, ideal_cycle_time_seconds")
      .in("route_id", routeIds);

    if (steps && steps.length > 0) {
      // Sum ideal cycle time per route
      const cycleByRoute = new Map<string, number>();
      for (const step of steps) {
        const ct = Number(step.ideal_cycle_time_seconds) || 0;
        cycleByRoute.set(step.route_id, (cycleByRoute.get(step.route_id) ?? 0) + ct);
      }

      // Ideal production time = units × their route's total cycle time
      let idealProductionTimeSec = 0;
      for (const unit of completedUnits!) {
        idealProductionTimeSec += cycleByRoute.get(unit.route_id) ?? 0;
      }

      if (idealProductionTimeSec > 0) {
        const availableTimeSec = (windowMs / 1000) * Math.max(machineIds.length, 1);
        performance = Math.min(100, Math.round((idealProductionTimeSec / availableTimeSec) * 100));
      }
    }
    // If no cycle time data, performance stays 100%
  }

  // --- Quality ---
  const { data: qualityEvents } = await supabase
    .from("quality_events")
    .select("result")
    .gte("timestamp", since);

  let quality = 100;
  if (qualityEvents && qualityEvents.length > 0) {
    const passCount = qualityEvents.filter((e) => e.result === "pass").length;
    quality = Math.round((passCount / qualityEvents.length) * 100);
  }

  const oee = Math.round((availability * performance * quality) / 10000);

  return {
    time_range: timeRange,
    since,
    availability_percent: availability,
    performance_percent: performance,
    quality_percent: quality,
    oee_percent: oee,
  };
}

registerTool({
  name: "get_oee",
  description:
    "Overall Equipment Effectiveness: Availability × Performance × Quality for a time window. Optionally filtered by line. Availability from machine state history, Performance from throughput vs ideal cycle time, Quality from pass/fail events.",
  schema: getOeeSchema,
  execute: getOee,
});

// --- get_order_summary ---

export const getOrderSummarySchema = z.object({
  production_order_id: z.string().uuid().optional(),
});
export type GetOrderSummaryInput = z.infer<typeof getOrderSummarySchema>;

export async function getOrderSummary(input: GetOrderSummaryInput) {
  const validated = getOrderSummarySchema.parse(input);
  const supabase = await createClient();

  // Get orders
  let query = supabase
    .from("production_orders")
    .select("*, part_numbers(name), routes(name)")
    .order("created_at", { ascending: false });

  if (validated.production_order_id) {
    query = query.eq("id", validated.production_order_id);
  } else {
    // Only active orders when listing all
    query = query.in("status", ["new", "scheduled", "running"]);
  }

  const { data: orders, error } = await query;
  if (error) throw new Error(`get_order_summary failed: ${error.message}`);
  if (!orders || orders.length === 0) {
    if (validated.production_order_id) throw new Error("get_order_summary: order not found");
    return [];
  }

  // Get recent throughput rate for estimates (last 8 hours)
  const eightHoursAgo = getTimeRangeStart("last_8_hours");
  const { data: recentUnits } = await supabase
    .from("units")
    .select("id")
    .eq("status", "completed")
    .gte("created_at", eightHoursAgo);

  const recentCompleted = recentUnits?.length ?? 0;
  const unitsPerHour = recentCompleted / 8;

  return orders.map((order) => {
    const completionPercent = order.quantity_ordered > 0
      ? Math.round((order.quantity_completed / order.quantity_ordered) * 100)
      : 0;
    const unitsRemaining = Math.max(0, order.quantity_ordered - order.quantity_completed);

    let estimatedFinish: string | null = null;
    if (unitsRemaining > 0 && unitsPerHour > 0 && order.status === "running") {
      const hoursToFinish = unitsRemaining / unitsPerHour;
      const finishDate = new Date(Date.now() + hoursToFinish * 60 * 60 * 1000);
      estimatedFinish = finishDate.toISOString();
    }

    return {
      id: order.id,
      order_number: order.order_number,
      part_number_name: (order.part_numbers as { name: string } | null)?.name,
      route_name: (order.routes as { name: string } | null)?.name,
      status: order.status,
      quantity_ordered: order.quantity_ordered,
      quantity_completed: order.quantity_completed,
      completion_percent: completionPercent,
      units_remaining: unitsRemaining,
      estimated_finish: estimatedFinish,
      throughput_rate_per_hour: Math.round(unitsPerHour * 10) / 10,
    };
  });
}

registerTool({
  name: "get_order_summary",
  description:
    "Production order progress: completion %, units remaining, and estimated finish time based on recent throughput. Returns all active orders if no ID specified.",
  schema: getOrderSummarySchema,
  execute: getOrderSummary,
});

// --- get_capability_snapshot ---

export const getCapabilitySnapshotSchema = z.object({
  line_id: z.string().uuid().optional(),
});
export type GetCapabilitySnapshotInput = z.infer<typeof getCapabilitySnapshotSchema>;

export async function getCapabilitySnapshot(input: GetCapabilitySnapshotInput) {
  const validated = getCapabilitySnapshotSchema.parse(input);
  const supabase = await createClient();

  // Get workstations, optionally filtered by line
  let wsQuery = supabase
    .from("workstations")
    .select("id, name, line_id, position")
    .order("position", { ascending: true });

  if (validated.line_id) {
    wsQuery = wsQuery.eq("line_id", validated.line_id);
  }

  const { data: workstations, error: wsError } = await wsQuery;
  if (wsError) throw new Error(`get_capability_snapshot failed: ${wsError.message}`);
  if (!workstations || workstations.length === 0) return [];

  const wsIds = workstations.map((ws) => ws.id);

  // Get machines for these workstations
  const { data: machines, error: machError } = await supabase
    .from("machines")
    .select("id, name, status, workstation_id")
    .in("workstation_id", wsIds);

  if (machError) throw new Error(`get_capability_snapshot failed: ${machError.message}`);

  // Get WIP counts per workstation
  const { data: wipUnits } = await supabase
    .from("units")
    .select("id, current_step, route_id")
    .eq("status", "in_progress")
    .gt("current_step", 0);

  // Map route steps to workstation IDs
  let stepsByRouteAndNumber = new Map<string, string>(); // "route_id:step_number" → workstation_id
  if (wipUnits && wipUnits.length > 0) {
    const routeIds = [...new Set(wipUnits.map((u) => u.route_id))];
    const { data: steps } = await supabase
      .from("route_steps")
      .select("route_id, step_number, workstation_id")
      .in("route_id", routeIds);

    if (steps) {
      for (const step of steps) {
        stepsByRouteAndNumber.set(`${step.route_id}:${step.step_number}`, step.workstation_id);
      }
    }
  }

  // Count WIP per workstation
  const wipByWs = new Map<string, number>();
  for (const unit of wipUnits ?? []) {
    const wsId = stepsByRouteAndNumber.get(`${unit.route_id}:${unit.current_step}`);
    if (wsId && wsIds.includes(wsId)) {
      wipByWs.set(wsId, (wipByWs.get(wsId) ?? 0) + 1);
    }
  }

  // Build snapshot per workstation
  const unavailableStates = new Set(["HELD", "ABORTED", "STOPPED"]);
  const productiveStates = new Set(["EXECUTE", "COMPLETE"]);

  return workstations.map((ws) => {
    const wsMachines = (machines ?? []).filter((m) => m.workstation_id === ws.id);
    const wipCount = wipByWs.get(ws.id) ?? 0;

    let status: "available" | "committed" | "unattainable";
    if (wsMachines.length === 0) {
      // No machines — available if no WIP, committed if WIP
      status = wipCount > 0 ? "committed" : "available";
    } else if (wsMachines.every((m) => unavailableStates.has(m.status))) {
      status = "unattainable";
    } else if (wsMachines.some((m) => productiveStates.has(m.status)) || wipCount > 0) {
      status = "committed";
    } else {
      status = "available";
    }

    return {
      workstation_id: ws.id,
      workstation_name: ws.name,
      line_id: ws.line_id,
      status,
      wip_count: wipCount,
      machines: wsMachines.map((m) => ({ id: m.id, name: m.name, status: m.status })),
    };
  });
}

registerTool({
  name: "get_capability_snapshot",
  description:
    "Per-workstation status snapshot: available (idle, no WIP), committed (active, has WIP), or unattainable (all machines down). Includes WIP count and machine states. Optionally filtered by line.",
  schema: getCapabilitySnapshotSchema,
  execute: getCapabilitySnapshot,
});
