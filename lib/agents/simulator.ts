// --- Simulator Agent (stub — activated in M4) ---
//
// The Simulator Agent role-plays as a factory: it generates units, moves WIP,
// introduces realistic quality failures, and toggles machine statuses — all
// through the same tool layer that human operators use.
//
// ISOLATION RULE: The Simulator is a pure consumer of the MES tool layer.
// It lives in lib/agents/simulator.ts (config) and lib/simulator/ (runtime).
// It introduces NO simulation-specific columns or conditionals in MES core code.
// Deleting all Simulator files must leave the MES fully functional.
//
// The Simulator is NOT user_initiated (no chat panel) and NOT event_driven
// (no Realtime trigger). It is SYSTEM_INITIATED — driven by a server-side
// tick loop at a configurable interval.

export const simulatorConfig = {
  name: "Simulator",
  description:
    "Autonomous factory simulation agent — drives production runs, introduces realistic failures, and manages machine lifecycle through the MES tool layer",
  agentType: "simulator" as const,
  triggerType: "system_initiated" as const, // tick-based server loop, not chat or Realtime
};

// --- Tool Subset ---
// Simulators can only use production-facing tools.
// It must NOT access analytics, carbon, or blockchain tools.
// It must NOT use delete tools — the factory doesn't erase its own history.

export const simulatorTools: string[] = [
  // Production execution
  "generate_units",
  "move_unit",
  "scrap_unit",
  "get_wip_status",
  "search_units",
  // Quality events
  "create_quality_event",
  "list_defect_codes",
  // Machine lifecycle (PackML state model)
  "update_machine_status",
  "list_machines",
  // Shop floor awareness (read-only)
  "list_lines",
  "list_workstations",
  // Production orders (ISA-95 F1)
  "create_production_order",
  "update_order_status",
  "list_production_orders",
];

// --- Simulation Context ---

export interface SimulatorContext {
  activeScenario: SimulationScenario;
  tickNumber: number;
  tickIntervalMs: number;         // 1x = 2000ms, 2x = 1000ms, 5x = 400ms, 10x = 200ms
  activeLineId: string | null;
  activeLineName: string | null;
  currentWip: { workstationId: string; workstationName: string; unitCount: number }[];
  openProductionOrders: { id: string; partNumberName: string; remaining: number }[];
  machineStates: { machineId: string; machineName: string; status: string }[];
}

// --- Simulation Scenarios ---
// Each scenario modifies the agent's behavioral parameters.
// A scenario is a named system prompt modifier — not a separate agent.
// New scenarios are scaffolded with /simulator-scenario.

export type SimulationScenario =
  | "steady_state"
  | "quality_crisis"
  | "machine_breakdown"
  | "ramp_up"
  | "mixed_product"
  | "cascade_failure";

const scenarioDescriptions: Record<SimulationScenario, string> = {
  steady_state:
    "95% yield, rare faults, consistent throughput. Baseline demo, happy path.",
  quality_crisis:
    "Yield drops to ~80% at one station, same defect code clustering. Triggers Quality Monitor alerts.",
  machine_breakdown:
    "A machine goes down mid-run, WIP backs up. Tests bottleneck handling and recovery.",
  ramp_up:
    "Start slow, gradually increase throughput. Realistic shift-start pattern.",
  mixed_product:
    "Multiple part numbers running simultaneously. Tests multi-product scheduling.",
  cascade_failure:
    "One fault triggers downstream problems. North Star demo — multi-agent coordination.",
};

// --- PackML State Model (7-state MVP, ISA-88 aligned) ---
// Valid state transitions only. The Simulator must respect this diagram.
//
// STOPPED → IDLE → EXECUTE → COMPLETE
//                 ↓         ↑
//               HELD   →  SUSPENDED
//                 ↓
//              ABORTED

export type PackMLState =
  | "STOPPED"
  | "IDLE"
  | "EXECUTE"
  | "HELD"
  | "SUSPENDED"
  | "COMPLETE"
  | "ABORTED";

export const packMLTransitions: Record<PackMLState, PackMLState[]> = {
  STOPPED:   ["IDLE"],
  IDLE:      ["EXECUTE", "STOPPED"],
  EXECUTE:   ["HELD", "COMPLETE", "ABORTED"],
  HELD:      ["SUSPENDED", "EXECUTE", "ABORTED"],
  SUSPENDED: ["EXECUTE", "ABORTED"],
  COMPLETE:  ["IDLE", "STOPPED"],
  ABORTED:   ["STOPPED"],
};

// --- System Prompt Builder ---

export function buildSimulatorSystemPrompt(context: SimulatorContext): string {
  const scenario = context.activeScenario;
  const scenarioDesc = scenarioDescriptions[scenario];

  const wipLines = context.currentWip.length > 0
    ? context.currentWip
        .map((w) => `- ${w.workstationName}: ${w.unitCount} units in WIP`)
        .join("\n")
    : "  No units currently in WIP.";

  const orderLines = context.openProductionOrders.length > 0
    ? context.openProductionOrders
        .map((o) => `- Order ${o.id}: ${o.partNumberName}, ${o.remaining} units remaining`)
        .join("\n")
    : "  No open production orders.";

  const machineLines = context.machineStates.length > 0
    ? context.machineStates
        .map((m) => `- ${m.machineName}: ${m.status}`)
        .join("\n")
    : "  No machines registered.";

  return `You are the **Simulator** — an AI that role-plays as a real manufacturing factory.

## Your Role

You drive production autonomously by calling MES tools exactly as a real factory would. You generate units, move WIP through routes, introduce realistic quality failures, and manage machine lifecycle states. You do NOT explain what you are doing — you just do it, tool call by tool call, like a factory running.

## CRITICAL: Isolation Rules

You are a CONSUMER of the MES, not part of its core. You must:
- Use ONLY the tools in your allowed tool list.
- NEVER reference simulation state in tool arguments — tools must work the same whether called by you or a human operator.
- NEVER generate unrealistic data. Every defect code, yield rate, and machine fault must be plausible for a real shop floor.

## Active Scenario: ${scenario.toUpperCase()}

${scenarioDesc}

Behavior targets for this scenario:
${getScenarioBehaviorTargets(scenario)}

## Current Tick: ${context.tickNumber}

Tick interval: ${context.tickIntervalMs}ms (simulation speed)

## Current Factory State

### WIP
${wipLines}

### Open Production Orders
${orderLines}

### Machine States (PackML)
${machineLines}

## Decision Logic (execute in order each tick)

1. **Check open orders.** If no open production orders exist, create one via create_production_order before generating any units.
2. **Move existing WIP.** Call move_unit for units that are ready to advance. Respect workstation capacity — don't pile more units than the station can handle.
3. **Log quality events.** At pass/fail gate steps, apply yield rate from the active scenario. When failing a unit, choose a defect code from list_defect_codes that is realistic for the step.
4. **Manage machine lifecycle.** Apply PackML state transitions based on scenario behavior targets. Only valid PackML transitions are allowed.
5. **Generate new units.** If WIP is below the target fill level and open orders have remaining quantity, generate a small batch (2–5 units) via generate_units.
6. **Update order status.** When all units for an order are complete or scrapped, call update_order_status to close it.

## PackML State Machine

You manage machine states using the 7-state PackML subset. Only these transitions are valid:
- STOPPED → IDLE
- IDLE → EXECUTE | STOPPED
- EXECUTE → HELD | COMPLETE | ABORTED
- HELD → SUSPENDED | EXECUTE | ABORTED
- SUSPENDED → EXECUTE | ABORTED
- COMPLETE → IDLE | STOPPED
- ABORTED → STOPPED

When introducing a fault: EXECUTE → HELD (fault detected) → ABORTED (unrecoverable) → STOPPED → IDLE (after repair).

## Realism Rules

- Never produce 100% yield. Even steady_state targets 95%.
- Defects should cluster realistically — the same defect code appearing repeatedly at the same step is realistic.
- Faults should be preceded by early signals in the cascade_failure scenario.
- Cycle times should vary ± 10–15% around the route step's expected_duration_s.`;
}

function getScenarioBehaviorTargets(scenario: SimulationScenario): string {
  const targets: Record<SimulationScenario, string> = {
    steady_state: `- Yield: ~95% across all workstations
- Machine faults: rare (< 2% of ticks)
- Throughput: consistent — aim to keep all workstations at 60–80% capacity
- Defects: random distribution across defect codes, no clustering`,

    quality_crisis: `- Yield: ~80% at ONE specific workstation (the worst performer this shift)
- Same defect code must repeat 3+ times within 30 minutes — triggers Quality Monitor alert
- Other workstations: normal 95% yield
- Machine faults: normal rate
- Goal: make the Quality Monitor fire a defect_clustering alert`,

    machine_breakdown: `- At tick 10–15: transition one machine from EXECUTE → HELD → ABORTED
- WIP will back up behind the broken workstation — do not move units to it
- After 8–12 ticks: transition ABORTED → STOPPED → IDLE → EXECUTE (repair complete)
- Yield: normal 95% at all other stations
- Goal: demonstrate WIP queue buildup and recovery`,

    ramp_up: `- Ticks 1–10: generate only 1–2 units per tick, move slowly
- Ticks 11–20: increase to 3–4 units per tick
- Ticks 21+: full throughput, 5 units per tick, all stations active
- Yield: starts at 98% (operators fresh), gradually settles to 95%
- Goal: realistic shift-start behavior`,

    mixed_product: `- Maintain at least 2 open production orders for different part numbers simultaneously
- Alternate unit generation between orders each tick
- Yield: normal 95% per workstation regardless of product
- Goal: demonstrate multi-product WIP management`,

    cascade_failure: `- Ticks 5–8: introduce subtle quality degradation at Station 1 (yield 88%)
- Tick 10: full fault at Station 1 (EXECUTE → HELD → ABORTED) — WIP backs up
- Tick 12: yield at Station 2 drops to 75% because Station 1 WIP is mixed quality
- Tick 15: Station 3 shows HELD state due to material shortage from upstream failure
- Goal: multi-agent coordination showcase — Quality Monitor + Planner must respond`,
  };
  return targets[scenario];
}

// --- Trigger Definition ---
// The simulator is driven by a server-side tick loop in app/api/simulation/.
// It is NOT triggered by Supabase Realtime.

export const simulatorTickConfig = {
  description: "Server-side recurring invocation at configurable interval",
  endpoint: "/api/simulation/tick",
  speeds: {
    "1x":  2000,
    "2x":  1000,
    "5x":   400,
    "10x":  200,
  },
  maxStepsPerTick: 5, // max tool calls per agent invocation
};
