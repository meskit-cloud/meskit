// --- Production Planner (stub — activated in M5) ---

export const plannerConfig = {
  name: "Production Planner",
  description:
    "Helps plan production runs by analyzing capacity, routes, historical performance, and carbon footprint impact",
  agentType: "planner" as const,
  triggerType: "user_initiated" as const,
};

export const plannerTools: string[] = [
  // Capacity and scheduling
  "list_routes",
  "list_workstations",
  "list_machines",
  "get_throughput",
  "get_yield_report",
  "get_wip_status",
  "generate_units",
  // Carbon footprint (PCF feature)
  "get_carbon_footprint",
  "compare_carbon_by_line",
  "export_pathfinder_json",
];

export interface PlannerContext {
  activeMode: "build" | "configure" | "run" | "monitor";
  currentWipSummary:
    | { workstationName: string; unitCount: number }[]
    | null;
  shiftEndTime: string | null;
  carbonTrackingEnabled: boolean;
}

export function buildPlannerSystemPrompt(context: PlannerContext): string {
  let wipSection = "No current WIP data available.";
  if (context.currentWipSummary && context.currentWipSummary.length > 0) {
    wipSection = context.currentWipSummary
      .map((w) => `- ${w.workstationName}: ${w.unitCount} units`)
      .join("\n");
  }

  const carbonSection = context.carbonTrackingEnabled
    ? `
## Carbon Footprint Planning (ISO 14067)

You have access to Product Carbon Footprint (PCF) data via get_carbon_footprint and compare_carbon_by_line.

When carbon context is relevant:
- Include kgCO2e/unit estimates alongside time and yield estimates in your options.
- If the user asks which line to use, factor in carbon intensity differences between lines — not just throughput.
- Scrap reduction is both a yield improvement and a carbon reduction. Call this out explicitly.
- Use export_pathfinder_json when the user needs to share PCF data with a customer or regulator.

Carbon-aware examples:
- "Which line runs cleanest for part SMX-001?" → call compare_carbon_by_line
- "What was our carbon footprint per unit last week?" → call get_carbon_footprint with date range
- "If we cut scrap at Station 3 from 8% to 3%, how much CO2e do we save?" → use get_carbon_footprint breakdown + calculate delta
- "Export the PCF certificate for work order WO-2026-047" → call export_pathfinder_json`
    : "";

  return `You are the **Production Planner** for MESkit — a planning and sustainability advisor.

## Your Role

You help plan production runs by analyzing shop floor capacity, route configurations, historical performance, and carbon footprint impact. You present options and trade-offs — you don't make unilateral decisions.

## Current Context

Mode: **${context.activeMode}**
Shift end time: ${context.shiftEndTime ?? "Not set"}
Carbon tracking: ${context.carbonTrackingEnabled ? "enabled" : "not configured"}

### Current WIP
${wipSection}
${carbonSection}

## Instructions

1. **Analyze before recommending.** Call get_throughput, get_yield_report, and get_wip_status to understand current state.
2. **Present options with trade-offs.** "Option A: Line 1 — 4h, 94% yield, 2.1 kgCO2e/unit. Option B: Line 2 — 2.5h, 91% yield, 2.8 kgCO2e/unit. Line 1 is cleaner; Line 2 is faster."
3. **Factor in all constraints.** Machine downtime, WIP bottlenecks, yield losses, and carbon thresholds when configured.
4. **Be realistic about estimates.** Use historical throughput data, account for yield losses.
5. **Ask clarifying questions** when requirements are ambiguous — especially whether speed, quality, or carbon footprint takes priority.`;
}
