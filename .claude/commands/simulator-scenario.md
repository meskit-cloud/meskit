# Simulator Scenario Generator

Scaffold a new simulation scenario for MESkit's Simulator Agent.

## Input

$ARGUMENTS — scenario name + description (e.g., "night_shift -- simulate end-of-shift fatigue with rising scrap rates")

## Instructions

Parse the scenario name and description from the input (split on `--` if present). Generate a scenario file at:

```
lib/simulator/scenarios/{scenario_name}.ts
```

Convert the scenario name to snake_case for the filename and the config key.

Then register the scenario in `lib/agents/simulator.ts`:
- Add the scenario name to the `SimulationScenario` union type
- Add its description to `scenarioDescriptions`
- Add its behavior targets to `getScenarioBehaviorTargets`

### Scenario Implementation Pattern

```typescript
// lib/simulator/scenarios/{scenario-name}.ts

import type { SimulatorContext } from "@/lib/agents/simulator";

// --- Scenario Configuration ---

export const {scenarioName}Scenario = {
  id: "{scenario_name}" as const,
  displayName: "{Human-readable name}",
  description: "{One-line description shown in the UI simulation controls}",
  icon: "{emoji — e.g. ⚡ 🔥 🧪 📈}",
  estimatedDuration: "{Short estimate — e.g. '5–10 min to see full pattern'}",
  targetAgents: ["{list of agents this scenario is designed to exercise}"],
};

// --- Behavioral Parameters ---

export const {scenarioName}Params = {
  yieldTargets: {
    // Per-workstation yield targets (0–1). Null = use global default (0.95).
    // e.g. { "station_1": 0.8, "station_2": null }
    global: 0.95,
    workstationOverrides: {} as Record<string, number>,
  },
  machineHealth: {
    faultProbabilityPerTick: 0.02,  // chance of triggering a fault each tick
    faultOnTick: null as number | null, // force fault at a specific tick (null = random)
    recoveryAfterTicks: 8,           // ticks before machine returns to IDLE
  },
  throughput: {
    unitsPerTickMin: 2,
    unitsPerTickMax: 5,
    rampUpTicks: 0,          // 0 = full speed immediately; N = gradual ramp over N ticks
  },
  defects: {
    clusteringEnabled: false,    // true = same defect code repeats at same station
    clusteringDefectCode: null as string | null, // null = use most severe defect code found
    clusteringThreshold: 3,      // occurrences before clustering is "active"
  },
  multiProduct: {
    enabled: false,
    minActiveOrders: 1,
    maxActiveOrders: 1,
  },
};

// --- System Prompt Modifier ---
// This text is APPENDED to the base Simulator system prompt when this scenario is active.
// Keep it concise — describe the behavioral difference from steady state.

export function get{ScenarioName}PromptModifier(context: SimulatorContext): string {
  return `
## Scenario-specific behavior: ${"{scenarioName}".toUpperCase()}

{Describe exact behavioral targets for this tick. Be specific — yield %, machine fault timing,
defect clustering pattern, ramp behavior, etc. The Simulator must match these targets.}

Current tick: ${context.tickNumber}
${getTickPhaseInstructions(context.tickNumber)}`;
}

function getTickPhaseInstructions(tick: number): string {
  // Return different instructions based on tick number (for phased scenarios)
  if (tick < 10) {
    return "{Phase 1 behavior — describe what happens in ticks 1–10}";
  } else if (tick < 20) {
    return "{Phase 2 behavior — describe what happens in ticks 11–20}";
  }
  return "{Phase 3+ behavior — steady state or resolution phase}";
}
```

### Built-in Scenario Catalog

These six scenarios are defined in `lib/agents/simulator.ts`. Use them as reference when generating similar scenarios:

**steady_state** (baseline)
- Yield: ~95% all stations
- Faults: rare (< 2% per tick)
- Throughput: consistent 60–80% capacity
- Defects: random, no clustering
- Purpose: happy path demo, onboarding

**quality_crisis** (exercises Quality Monitor)
- Yield: ~80% at one targeted workstation
- Same defect code clusters: 3+ times within 30 min
- Other stations: normal 95%
- Purpose: trigger defect_clustering and yield_drop Quality Monitor alerts

**machine_breakdown** (exercises Planner + ticker)
- Tick 10–15: one machine EXECUTE → HELD → ABORTED
- WIP queues behind broken station
- Tick 18–25: ABORTED → STOPPED → IDLE → EXECUTE (repair)
- Purpose: demonstrate WIP queue buildup, recovery, Planner rescheduling

**ramp_up** (exercises ticker + throughput charts)
- Ticks 1–10: 1–2 units/tick, slow
- Ticks 11–20: 3–4 units/tick
- Ticks 21+: full 5 units/tick
- Yield: starts 98%, settles to 95%
- Purpose: realistic shift-start behavior

**mixed_product** (exercises multi-order management)
- 2+ open production orders simultaneously
- Alternate unit generation between orders
- Normal 95% yield
- Purpose: multi-product WIP management

**cascade_failure** (North Star demo — all agents fire)
- Tick 5–8: subtle yield degradation at Station 1 (88%)
- Tick 10: Station 1 full fault
- Tick 12: Station 2 yield drops to 75% from mixed-quality input
- Tick 15: Station 3 enters HELD from material shortage
- Purpose: multi-agent coordination — Quality Monitor + Planner + (future) Anomaly Monitor all respond

### Conventions

- Scenario IDs use `snake_case`
- Behavioral parameters are always configurable — never hardcode values in the prompt modifier
- Tick-based phasing: use `context.tickNumber` to adjust behavior over time
- Scenarios should clearly target at least one MESkit smart feature (Quality Monitor, Carbon Monitor, Planner, Anomaly Monitor)
- The `displayName` and `icon` appear in the simulation controls UI (speed selector area in the top bar)
- The `promptModifier` function is PURE — it only returns a string, never calls tools or mutates state
- After creating the scenario file, always register it in `lib/agents/simulator.ts` — the union type and both lookup objects
