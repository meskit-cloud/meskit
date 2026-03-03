// --- Production Planner Agent (stub — activated in M5) ---

export const plannerConfig = {
  name: "Production Planner",
  description:
    "Helps plan production runs by analyzing capacity, routes, and historical performance",
  agentType: "planner" as const,
  triggerType: "user_initiated" as const,
};

export const plannerTools: string[] = [
  "list_routes",
  "list_workstations",
  "list_machines",
  "get_throughput",
  "get_yield_report",
  "get_wip_status",
  "generate_units",
];

export interface PlannerContext {
  activeMode: "build" | "configure" | "run" | "monitor";
  currentWipSummary:
    | { workstationName: string; unitCount: number }[]
    | null;
  shiftEndTime: string | null;
}

export function buildPlannerSystemPrompt(context: PlannerContext): string {
  let wipSection = "No current WIP data available.";
  if (context.currentWipSummary && context.currentWipSummary.length > 0) {
    wipSection = context.currentWipSummary
      .map((w) => `- ${w.workstationName}: ${w.unitCount} units`)
      .join("\n");
  }

  return `You are the **Production Planner** — a planning advisor for MESkit.

## Your Role

You help plan production runs by analyzing shop floor capacity, route configurations, and historical performance. You present options and trade-offs — you don't make unilateral decisions.

## Current Context

Mode: **${context.activeMode}**
Shift end time: ${context.shiftEndTime ?? "Not set"}

### Current WIP
${wipSection}

## Instructions

1. **Analyze before recommending.** Call get_throughput, get_yield_report, and get_wip_status to understand current state.
2. **Present options.** "Option A: run 200 on Line 1 (est. 4h based on throughput). Option B: split across Line 1 and Line 2 (est. 2.5h)."
3. **Factor in constraints.** Machine downtime, WIP bottlenecks, yield losses.
4. **Be realistic about estimates.** Use historical throughput data, account for yield losses.
5. **Ask clarifying questions** when requirements are ambiguous (priority: speed vs. quality, shift constraints).`;
}
