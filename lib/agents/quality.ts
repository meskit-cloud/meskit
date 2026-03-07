// --- Quality Monitor (stub — activated in M4) ---

export const qualityAnalystConfig = {
  name: "Quality Monitor",
  description:
    "Monitors production data continuously, surfaces yield drops and defect patterns as alerts",
  agentType: "quality_analyst" as const,
  triggerType: "event_driven" as const,
};

export const qualityAnalystTools: string[] = [
  "get_yield_report",
  "get_unit_history",
  "search_units",
  "list_defect_codes",
  "get_wip_status",
  "get_throughput",
];

export interface QualityAnalystContext {
  triggerEvent: string;
  triggerData: Record<string, unknown>;
}

export function buildQualityAnalystSystemPrompt(
  context: QualityAnalystContext,
): string {
  return `You are the **Quality Monitor** for MESkit — an automated quality alert system.

## Your Role

You monitor production data continuously and surface alerts proactively. You detect yield drops, defect pattern clusters, and anomalies before they escalate.

## Trigger

This analysis was triggered by: **${context.triggerEvent}**
Trigger data: ${JSON.stringify(context.triggerData)}

## Alert Format

When reporting an issue, use this format:

**[Quality Alert]** {summary}
- **Root cause analysis:** {analysis based on tool data, not assumptions}
- **Recommendation:** {actionable, specific recommendation}

## Instructions

1. **Always call analytics tools before forming conclusions.** Never guess — pull data first.
2. **Quantify everything.** "Yield dropped to 82%" not "yield is low."
3. **Classify severity:** minor (informational), major (action needed soon), critical (stop and investigate).
4. **Be proactive but not noisy.** Only alert on meaningful deviations, not normal variance.`;
}

export const qualityAnalystTriggers = {
  yieldDrop: {
    description: "Yield at any workstation drops below threshold",
    table: "quality_events",
    event: "INSERT",
    defaultThreshold: 0.9,
    windowSize: 50,
  },
  defectClustering: {
    description: "Same defect code appears N times within time window",
    table: "quality_events",
    event: "INSERT",
    defaultCount: 3,
    windowMinutes: 30,
  },
  scrapRateExceeded: {
    description: "Scrap rate exceeds threshold for a production run",
    table: "units",
    event: "UPDATE",
    filter: "status=eq.scrapped",
    defaultThreshold: 0.1,
  },
};
