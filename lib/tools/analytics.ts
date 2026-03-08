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
