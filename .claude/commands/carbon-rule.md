# Carbon Rule Definition

Define a carbon monitoring rule for MESkit's Carbon Monitor agent.

## Input

$ARGUMENTS — rule description (e.g., "footprint exceeded -- alert when kgCO2e/unit > 5.0")

## Instructions

Parse the rule name and condition from the input (split on `--` if present). Generate a rule file at:

```
lib/carbon-rules/{rule_name}.ts
```

Convert the rule name to kebab-case for the filename.

### Rule Implementation Pattern

```typescript
// lib/carbon-rules/{rule-name}.ts
import { getCarbonFootprint } from "@/lib/tools/carbon";
import { getYieldReport } from "@/lib/tools/analytics";
import { getWipStatus } from "@/lib/tools/production";

// --- Rule Configuration ---

export const {ruleName}Config = {
  name: "{rule_name}",
  description: "{Human-readable description}",
  standard: "ISO 14067",           // always ISO 14067 for carbon rules
  severity: "{info | warning | critical}" as const,
  thresholds: {
    // Configurable threshold values — never hardcode
  },
  enabled: true,
};

// --- Evaluation ---

interface {RuleName}Context {
  workOrderId?: string;
  partNumberId?: string;
  lineId?: string;
  // Any additional context needed to evaluate the rule
}

interface {RuleName}Result {
  triggered: boolean;
  severity: "info" | "warning" | "critical";
  data: {
    kgCo2ePerUnit?: number;
    threshold?: number;
    primaryDriver?: string;     // route step or factor contributing most
    scrapContributionKgCo2e?: number;
    // Rule-specific result data
  };
}

export async function evaluate{RuleName}(
  context: {RuleName}Context
): Promise<{RuleName}Result> {
  // 1. Call carbon tool layer to get current PCF data
  // 2. Compare against thresholds
  // 3. Identify primary driver from step breakdown
  // 4. Return result with triggered flag
}

// --- Alert Formatting ---

export function format{RuleName}Alert(result: {RuleName}Result): string {
  if (!result.triggered) return "";

  return `[Carbon Alert] {summary based on result data}
Footprint: {kgCO2e/unit} vs threshold of {threshold} kgCO2e/unit
Primary driver: {route step or factor contributing most}
Scrap contribution: {kgCO2e wasted on scrapped units}
Recommendation: {actionable — e.g. "reduce idle time at Workstation 3"}
Severity: {minor | major | critical}`;
}

// --- Realtime Trigger Filter ---

export const {ruleName}RealtimeFilter = {
  table: "production_orders",
  event: "UPDATE" as const,
  filter: "status=eq.complete",
};
```

### Carbon Monitor Trigger Conditions

These are the built-in trigger conditions. Generate rules matching these when the input corresponds:

**Footprint Exceeded**
- Condition: Computed kgCO2e/unit on a closed work order exceeds configured threshold
- Default threshold: 5.0 kgCO2e/unit
- Severity: warning at > threshold, critical at > 30% over threshold
- Tool calls: `get_carbon_footprint`
- Standard: ISO 14067 (cradle-to-gate, Scope 1 + 2)

```typescript
export const footprintExceededConfig = {
  name: "footprint_exceeded",
  description: "Alert when kgCO2e/unit on a closed work order exceeds threshold",
  standard: "ISO 14067",
  severity: "warning" as const,
  thresholds: {
    warningKgCo2ePerUnit: 5.0,
    criticalMultiplier: 1.3,  // critical when > 30% over threshold
  },
  enabled: true,
};
```

**Scrap Carbon Spike**
- Condition: Scrap-related carbon waste exceeds N% of total batch footprint
- Default: 20% of batch total
- Severity: warning at >20%, critical at >35%
- Tool calls: `get_carbon_footprint` (step breakdown), `get_yield_report`
- Note: scrap emissions = energy consumed by units that were scrapped before completion

```typescript
export const scrapCarbonSpikeConfig = {
  name: "scrap_carbon_spike",
  description: "Alert when scrapped units account for a disproportionate share of batch carbon",
  standard: "ISO 14067",
  severity: "warning" as const,
  thresholds: {
    warningContribution: 0.2,   // 20% of batch footprint from scrap
    criticalContribution: 0.35,
  },
  enabled: true,
};
```

**Weekly Trend Up**
- Condition: Average kgCO2e/unit for the week is trending up vs prior week
- Default: >5% increase triggers info, >10% triggers warning
- Severity: info at 5–10%, warning at >10%
- Tool calls: `get_carbon_footprint` with date range, `compare_carbon_by_line`
- Schedule: Friday 18:00 — end of week summary

```typescript
export const weeklyTrendConfig = {
  name: "weekly_carbon_trend",
  description: "Weekly summary: flag if average kgCO2e/unit is trending up vs prior week",
  standard: "ISO 14067",
  severity: "info" as const,
  thresholds: {
    infoIncreasePercent: 5,
    warningIncreasePercent: 10,
  },
  schedule: "0 18 * * 5",  // Friday 18:00 local time
  enabled: true,
};
```

**Carbon-Quality Cross-Rule**
- Condition: A workstation with a yield drop (< 90%) is also the top carbon contributor
- This is a compound rule that combines quality and carbon data
- Severity: critical — both yield and carbon impact are happening at the same station
- Tool calls: `get_carbon_footprint` (step breakdown), `get_yield_report`
- Insight: "Fixing the yield problem at Station X would also reduce carbon by Y kgCO2e/unit"

```typescript
export const carbonQualityCrossConfig = {
  name: "carbon_quality_cross",
  description: "Alert when the highest carbon-intensity step also has a yield problem",
  standard: "ISO 14067 + GHG Protocol",
  severity: "critical" as const,
  thresholds: {
    yieldWarningThreshold: 0.9,
    topContributorShare: 0.3,  // step must account for >30% of total footprint
  },
  enabled: true,
};
```

### Alert Template Format

Carbon alerts follow a consistent natural-language format aligned with Carbon Monitor output:

```
[Carbon Alert] {one-line summary of what was detected}
Footprint: {kgCO2e/unit} vs threshold of {threshold} kgCO2e/unit
Primary driver: {route step name} — {% of total footprint}
Scrap contribution: {kgCO2e} wasted ({scrap_units} units scrapped before completion)
Recommendation: {specific, actionable — cite the step, the delta, and what to change}
Severity: {minor | major | critical}
```

Example:
```
[Carbon Alert] Work order WO-2026-047 exceeded footprint threshold: 6.8 kgCO2e/unit (threshold: 5.0).
Footprint: 6.8 kgCO2e/unit vs threshold of 5.0 kgCO2e/unit
Primary driver: Step 3 (Soldering) — 58% of total footprint. Machine WS3-A ran at full draw during 22 min of idle time between batches.
Scrap contribution: 0.9 kgCO2e wasted (8 units scrapped at Step 4 before completion).
Recommendation: Configure WS3-A to enter standby mode after 5 min idle. Reducing scrap at Step 4 from 8% to 3% would save 0.5 kgCO2e/unit.
Severity: major
```

### Conventions

- Rule names use `snake_case`
- Always reference the applicable standard (`ISO 14067`, `GHG Protocol`, or both)
- Thresholds are always configurable — never hardcode
- The `evaluate` function always calls the carbon tool layer — never queries Supabase directly
- The `formatAlert` function returns empty string when not triggered
- Scrap emissions must always be reported separately from energy emissions
- Severity escalation: info -> warning -> critical based on threshold brackets
- Cross-rules (combining carbon + quality data) are valid and encouraged — they surface the highest-value insights
- All carbon figures must specify the unit: always `kgCO2e/unit` or `kgCO2e` (total batch)
