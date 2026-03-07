# Agent System Prompt Builder

Generate an agent configuration and system prompt for MESkit's Intelligence Layer.

## Input

$ARGUMENTS — agent type (e.g., "quality_analyst")

## Instructions

Parse the agent type from the input. Generate an agent config file at:

```
lib/agents/{agent_type}.ts
```

Convert the agent type to kebab-case for the filename (e.g., `operator-assistant.ts`).

### Agent Config Pattern

```typescript
// lib/agents/{agent-type}.ts
import type { Tool } from "@anthropic-ai/sdk/resources/messages";

// --- Agent Configuration ---

export const {agentType}Config = {
  name: "{Agent Display Name}",
  description: "{One-line description}",
  agentType: "{agent_type}" as const,
  triggerType: "{user_initiated | event_driven}" as const,
};

// --- Tool Subset ---

export const {agentType}Tools: string[] = [
  // Tool names this agent can use (snake_case)
];

// --- System Prompt Builder ---

interface {AgentType}Context {
  // Context fields injected at runtime
}

export function build{AgentType}SystemPrompt(context: {AgentType}Context): string {
  return `{system prompt with context interpolation}`;
}

// --- Trigger Conditions (for event-driven agents) ---

export const {agentType}Triggers = {
  // Trigger definitions
};
```

### Agent Definitions

Generate agents matching these definitions from the PRD:

**Ask MESkit** (`operator_assistant`)
- **Trigger**: User-initiated via chat panel (always available)
- **Role**: Conversational co-pilot for shop floor operators. Replaces clicking through menus with natural-language commands and queries.
- **Tools**: ALL tools from the catalog
- **Context**: Current mode, selected line/workstation, active production run

```typescript
interface OperatorAssistantContext {
  activeMode: "build" | "configure" | "run" | "monitor";
  selectedLineId: string | null;
  selectedLineName: string | null;
  selectedWorkstationId: string | null;
  selectedWorkstationName: string | null;
  activeProductionRun: { partNumberName: string; unitCount: number } | null;
}
```

System prompt should include:
- Role as an MES operator co-pilot
- Current UI context (mode, selections)
- ISA-95 terminology guidance (lines, workstations, units, routes)
- Instruction to prefer tool calls over generic advice
- Examples: "What's stuck at assembly?", "Scrap 00044, solder bridge on U3", "How's yield today?"

**Quality Monitor** (`quality_analyst`)
- **Trigger**: Event-driven (Supabase Realtime on `quality_events` and `unit_history`)
- **Role**: Monitors production data continuously, surfaces insights proactively. Detects yield drops, defect pattern clusters, and anomalies.
- **Tools**: `get_yield_report`, `get_unit_history`, `search_units`, `list_defect_codes`, `get_wip_status`, `get_throughput`

Trigger conditions:
```typescript
export const qualityAnalystTriggers = {
  yieldDrop: {
    description: "Yield at any workstation drops below threshold",
    table: "quality_events",
    event: "INSERT",
    defaultThreshold: 0.9,
    windowSize: 50, // last N units
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
```

System prompt should include:
- Role as a proactive quality monitor
- Alert format template:
  ```
  [Quality Alert] {summary}
  Root cause analysis: {analysis}
  Recommendation: {actionable recommendation}
  ```
- Instruction to always call analytics tools before forming conclusions
- Defect severity levels (minor, major, critical)

**Production Planner** (`planner`)
- **Trigger**: User-initiated via chat panel
- **Role**: Helps plan production runs by analyzing shop floor capacity, route configurations, and historical performance.
- **Tools**: `list_routes`, `list_workstations`, `list_machines`, `get_throughput`, `get_yield_report`, `get_wip_status`, `generate_units`

```typescript
interface PlannerContext {
  activeMode: "build" | "configure" | "run" | "monitor";
  currentWipSummary: { workstationName: string; unitCount: number }[] | null;
  shiftEndTime: string | null;
}
```

System prompt should include:
- Role as a production planning advisor
- Capacity analysis approach (throughput history + current WIP)
- Instruction to present options, not make unilateral decisions
- Examples: "I need to build 500 units of Smartphone X by end of shift"

**Machine Health Monitor** (`anomaly_monitor`)
- **Trigger**: Event-driven via MQTT message ingestion (M6)
- **Role**: Monitors sensor data from the MQTT stream for out-of-range values, unusual patterns, and equipment degradation signals.
- **Tools**: Analytics tools + MQTT-specific query tools (defined in M6)

Trigger conditions:
```typescript
export const anomalyMonitorTriggers = {
  outOfRange: {
    description: "Sensor value outside configured min/max range",
    table: "mqtt_messages",
    event: "INSERT",
  },
  degradationTrend: {
    description: "Progressive shift in measurement values over time",
    table: "mqtt_messages",
    event: "INSERT",
    windowSize: 100,
  },
  fault: {
    description: "Machine fault event received",
    table: "mqtt_messages",
    event: "INSERT",
    filter: "event_type=eq.fault",
  },
};
```

System prompt should include:
- Role as a predictive maintenance monitor
- North Star context: detect degradation before failure, trigger rescheduling
- MQTT topic convention: `meskit/{line_id}/{workstation_id}/{event_type}`
- Instruction to escalate to Production Planner when rescheduling may be needed

### Three AI Layers (North Star Architecture)

| Layer | Role | Feature |
|-------|------|---------|
| **Monitor** | Monitor sensor telemetry, detect degradation | Machine Health Monitor |
| **Plan** | Evaluate constraints, compute alternative schedules | Production Planner |
| **Act** | Act through the tool layer, update schedules, notify | Intelligence Layer (all features) |

### Conventions

- System prompts should be concise but complete — include all context the agent needs
- Use `${context.field}` interpolation for dynamic context
- Event-driven agents include trigger conditions with configurable thresholds
- Tool names in the tools array use `snake_case` matching the tool layer
- Agent types use `snake_case` matching the `agent_conversations.agent_type` column
