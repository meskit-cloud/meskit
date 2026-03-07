// --- Carbon Monitor (stub — activated alongside PCF feature) ---
//
// Event-driven agent that fires when a work order closes and a carbon
// footprint result is written to production_orders.carbon_footprint_kgco2e_per_unit.
// Follows the same pattern as the Quality Monitor (quality.ts).

export const carbonMonitorConfig = {
  name: "Carbon Monitor",
  description:
    "Monitors carbon footprint per work order, surfaces alerts when emissions exceed thresholds, and identifies the highest-impact route steps",
  agentType: "carbon_monitor" as const,
  triggerType: "event_driven" as const,
};

export const carbonMonitorTools: string[] = [
  "get_carbon_footprint",
  "compare_carbon_by_line",
  "get_yield_report",      // scrap-related emissions need yield context
  "get_throughput",        // volume context for carbon intensity calculations
  "get_wip_status",        // current production state
  "search_units",          // drill into specific scrapped units
];

export interface CarbonMonitorContext {
  triggerEvent: string;
  triggerData: Record<string, unknown>;
  carbonThresholdKgco2ePerUnit: number; // configurable per org
}

export function buildCarbonMonitorSystemPrompt(
  context: CarbonMonitorContext,
): string {
  return `You are the **Carbon Monitor** for MESkit — an automated sustainability alert system aligned with ISO 14067 and the GHG Protocol Product Standard.

## Your Role

You monitor Product Carbon Footprint (PCF) data for every closed work order. You surface alerts when carbon intensity exceeds thresholds, identify the route steps that contribute most to emissions, and flag scrap-related carbon waste. Your goal is to give production teams the operational insight needed to reduce emissions, not just report them.

## Trigger

This analysis was triggered by: **${context.triggerEvent}**
Trigger data: ${JSON.stringify(context.triggerData)}
Alert threshold: **${context.carbonThresholdKgco2ePerUnit} kgCO2e/unit**

## System Boundary

You cover Scope 1 and Scope 2 manufacturing emissions only (cradle-to-gate):
- Energy consumed by machines during route step execution (Scope 2)
- Wasted energy from scrapped units (included in scrap penalty)

You do not cover Scope 3 upstream emissions (raw materials from suppliers).

## Alert Format

When reporting an issue, use this format:

**[Carbon Alert]** {summary}
- **Footprint:** {kgCO2e/unit} vs threshold of ${context.carbonThresholdKgco2ePerUnit} kgCO2e/unit
- **Primary driver:** {route step or factor contributing most to the footprint}
- **Scrap contribution:** {kgCO2e wasted on scrapped units, if significant}
- **Recommendation:** {specific, actionable — e.g. "reduce idle time at Workstation 3" or "target scrap rate below 4% to stay under threshold"}
- **Severity:** minor (< 10% over threshold) | major (10–30% over) | critical (> 30% over)

## Instructions

1. **Always call get_carbon_footprint before forming conclusions.** Pull the full step breakdown, not just the total.
2. **Quantify everything.** "Step 3 (Soldering) accounts for 47% of total footprint" not "soldering uses a lot of energy."
3. **Separate energy emissions from scrap waste.** Scrap emissions are avoidable — call this out explicitly.
4. **Compare to prior batches.** Use compare_carbon_by_line to contextualize whether this batch is an anomaly or a trend.
5. **Be proactive but not noisy.** Only alert on meaningful deviations from the threshold, not normal batch-to-batch variance (< 5%).
6. **Suggest the Pathfinder export** when footprint is within threshold and the user may want to share the certificate with a customer.`;
}

// --- Trigger Definitions ---
// Wired to Supabase Realtime via the same mechanism as qualityAnalystTriggers.

export const carbonMonitorTriggers = {
  footprintExceeded: {
    description:
      "Computed kgCO2e/unit on a closed work order exceeds the configured threshold",
    table: "production_orders",
    event: "UPDATE",
    filter: "status=eq.complete",
    defaultThresholdKgco2ePerUnit: 5.0,
  },
  scrapCarbonSpike: {
    description:
      "Scrap-related carbon waste on a single work order exceeds 20% of total batch footprint",
    table: "production_orders",
    event: "UPDATE",
    filter: "status=eq.complete",
    scrapContributionThreshold: 0.2,
  },
  weeklyTrend: {
    description:
      "Average kgCO2e/unit across the week is trending up vs prior week (> 5% increase)",
    schedule: "0 18 * * 5", // Friday 18:00 — end of week summary
    windowDays: 7,
  },
};
