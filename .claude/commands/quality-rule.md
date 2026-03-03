# Quality Rule Definition

Define a quality monitoring rule for MESkit's Quality Analyst agent.

## Input

$ARGUMENTS — rule description (e.g., "yield drop -- alert when workstation yield < 90%")

## Instructions

Parse the rule name and condition from the input (split on `--` if present). Generate a rule file at:

```
lib/quality-rules/{rule_name}.ts
```

Convert the rule name to kebab-case for the filename.

### Rule Implementation Pattern

```typescript
// lib/quality-rules/{rule-name}.ts
import { getYieldReport } from "@/lib/tools/analytics";
import { searchUnits } from "@/lib/tools/production";
import { listDefectCodes } from "@/lib/tools/quality";

// --- Rule Configuration ---

export const {ruleName}Config = {
  name: "{rule_name}",
  description: "{Human-readable description}",
  severity: "{info | warning | critical}" as const,
  thresholds: {
    // Configurable threshold values
  },
  enabled: true,
};

// --- Evaluation ---

interface {RuleName}Context {
  // Data needed to evaluate the rule
}

interface {RuleName}Result {
  triggered: boolean;
  severity: "info" | "warning" | "critical";
  data: {
    // Rule-specific result data
  };
}

export async function evaluate{RuleName}(
  context: {RuleName}Context
): Promise<{RuleName}Result> {
  // 1. Call tool layer to get current data
  // 2. Compare against thresholds
  // 3. Return result with triggered flag
}

// --- Alert Formatting ---

export function format{RuleName}Alert(result: {RuleName}Result): string {
  if (!result.triggered) return "";

  return `[Quality Alert] {summary based on result data}
Root cause analysis: {analysis from result data}
Recommendation: {actionable recommendation}`;
}

// --- Realtime Trigger Filter ---

export const {ruleName}RealtimeFilter = {
  table: "{table_name}",
  event: "INSERT" as const,
  filter: "{column}=eq.{value}", // optional Realtime filter
};
```

### Quality Analyst Trigger Conditions (PRD Section 5.3)

These are the built-in trigger conditions. Generate rules matching these when the input corresponds:

**Yield Drop**
- Condition: Yield at any workstation drops below configurable threshold
- Default threshold: 90% (0.9)
- Window: Last 50 units at the workstation
- Severity: warning at <90%, critical at <80%
- Tool calls: `get_yield_report`, `search_units`

```typescript
export const yieldDropConfig = {
  name: "yield_drop",
  description: "Alert when workstation yield drops below threshold",
  severity: "warning" as const,
  thresholds: {
    warning: 0.9,
    critical: 0.8,
    windowSize: 50,
  },
  enabled: true,
};
```

**Defect Clustering**
- Condition: Same defect code appears N times within a time window
- Default: 3 occurrences within 30 minutes
- Severity: warning at 3+, critical at 5+
- Tool calls: `list_defect_codes`, `search_units`, `get_unit_history`

```typescript
export const defectClusteringConfig = {
  name: "defect_clustering",
  description: "Alert when same defect code appears repeatedly in short window",
  severity: "warning" as const,
  thresholds: {
    warningCount: 3,
    criticalCount: 5,
    windowMinutes: 30,
  },
  enabled: true,
};
```

**Scrap Rate Exceeded**
- Condition: Scrap rate exceeds threshold for a production run
- Default threshold: 10% (0.1)
- Severity: warning at >10%, critical at >20%
- Tool calls: `search_units`, `get_wip_status`

```typescript
export const scrapRateConfig = {
  name: "scrap_rate_exceeded",
  description: "Alert when scrap rate exceeds threshold for a production run",
  severity: "warning" as const,
  thresholds: {
    warning: 0.1,
    critical: 0.2,
  },
  enabled: true,
};
```

### Alert Template Format

Quality alerts follow a consistent natural-language format:

```
[Quality Alert] {one-line summary of what was detected}
Root cause analysis: {data-driven analysis — cite specific numbers}
Recommendation: {actionable next step for the operator}
```

Example:
```
[Quality Alert] Station 3 yield dropped to 86% (last 50 units).
Root cause analysis: 6 of 7 failures are defect code SOL-003 (solder bridge).
This defect was rare before 14:00 — 0 occurrences in the first 120 units.
Recommendation: Check solder paste viscosity and stencil alignment at Station 3.
```

### Conventions

- Rule names use `snake_case`
- Thresholds are always configurable — never hardcode
- The `evaluate` function always calls the tool layer — never queries Supabase directly
- The `formatAlert` function returns empty string when not triggered
- Rules include a Realtime filter for event-driven activation
- Severity escalation: info -> warning -> critical based on threshold brackets
