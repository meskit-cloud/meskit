# Simulator Agent — Agent-Driven Production Simulation

> **Status**: Planned — primary implementation in M4 (Run Mode), evolves through M5, M6, and post-MVP.

---

## 1. Vision

Instead of a separate simulation engine with random timers and dice rolls, MESkit uses an **AI agent as the simulator**. The Simulator Agent role-plays as a factory — generating units, moving WIP, introducing realistic failures, toggling machine statuses — all through the same tool layer that humans and the Operator Assistant use.

The simulation IS the product. It demonstrates what agent-augmented manufacturing looks like, and the transition to real production is seamless: swap the Simulator Agent for real operator input and MQTT sensors, everything else stays the same.

### Why Agent-Driven?

1. **No separate simulation engine to maintain** — the tool layer is the engine
2. **Contextual, realistic behavior** — an AI makes decisions based on shop floor state, not random numbers
3. **Naturally generates data** for OEE, analytics, and dashboards — because it's real data flowing through real tools
4. **Showcases the AI-native identity** — the demo IS the product
5. **Smooth transition to reality** — swap agent for humans + sensors, nothing else changes

---

## 2. Architecture

```
User clicks "▶ Start"
  → API route invokes Simulator Agent
  → Agent reads shop floor state (lines, workstations, machines)
  → Agent reads product config (part numbers, routes, BOMs)
  → Agent enters decision loop:
      ├── Generate units at line head (incoming material)
      ├── Move WIP through route steps (respect capacity)
      ├── Decide quality outcomes at pass/fail gates
      ├── Toggle machine statuses (faults, maintenance, recovery)
      └── Log quality events (inspections, defects, scrap)
  → Every action flows through Tool Layer → Supabase → Realtime
  → UI updates live. Ticker scrolls. Other agents react.
```

### Simulator Agent vs Auto-Run Engine

The roadmap originally described an "auto-run engine" in M4 — a timer-based loop that auto-advances units at a configurable interval with random yield injection. The Simulator Agent replaces this concept entirely:

| Auto-Run Engine (original) | Simulator Agent (replacement) |
|---|---|
| Timer-based interval loop | AI decision loop with configurable tick rate |
| Random yield (95% flat) | Contextual yield — degrades over time, clusters defects |
| No machine state changes | Realistic machine lifecycle (running → fault → repair → idle) |
| Dumb advancement | Capacity-aware — won't pile 50 units at one station |
| Single behavior | Scenario profiles: steady state, quality crisis, breakdown cascade |

### Data Flow

```
Simulator Agent
  │
  ├── calls generate_units() ──→ units table ──→ Realtime ──→ UI + Ticker
  ├── calls move_unit() ──→ unit_history table ──→ Realtime ──→ UI + Ticker
  ├── calls create_quality_event() ──→ quality_events table ──→ Realtime ──→ Quality Analyst
  ├── calls update_machine_status() ──→ machines table ──→ Realtime ──→ UI + Ticker
  └── calls scrap_unit() ──→ units table ──→ Realtime ──→ UI + Ticker
```

Every action is audited via the existing `writeAuditLog()` with `actor: "agent"` and `agent_name: "Simulator"`.

---

## 3. Simulator Agent Configuration

### Agent Identity

```typescript
export const simulatorAgentConfig = {
  name: "Simulator",
  description: "Agent-driven production simulation engine",
  agentType: "simulator" as const,
  triggerType: "system_initiated" as const, // triggered by simulation controls, not chat
};
```

### Tool Subset

The Simulator uses a subset of tools — it reads configuration and writes production data, but never modifies shop floor setup or product definitions:

**Read tools** (to understand what to simulate):
- `list_lines`, `list_workstations`, `list_machines`
- `list_part_numbers`, `list_routes`, `get_bom`
- `get_wip_status`, `search_units`, `get_serial_algorithm`

**Write tools** (to drive the simulation):
- `generate_units` — create units at line head
- `move_unit` — advance WIP through route steps
- `scrap_unit` — remove failed units
- `create_quality_event` — log inspections, rework, scrap
- `update_machine_status` — toggle machine states
- `create_defect_code` — introduce new defect types during simulation

### System Prompt (Core)

The system prompt instructs the agent to behave as a realistic factory simulation:

```
You are the **Simulator Agent** — you role-play as a production factory,
driving realistic manufacturing activity through MESkit's tool layer.

## Your Role

You simulate realistic production by:
1. Generating units in batches at the start of production lines
2. Moving units through their route steps at realistic intervals
3. Making quality decisions at pass/fail gates (not random — contextual)
4. Managing machine statuses (introducing faults, repairs, maintenance)
5. Creating quality events that reflect realistic defect patterns

## Simulation Rules

- **Capacity**: Don't pile units at a single workstation. If WIP > 5 at a station, slow intake.
- **Yield**: Base yield ~95%, but degrade over time. After 100+ units, introduce yield drops.
- **Defect clustering**: Occasionally inject 3-5 of the same defect in a row (realistic pattern).
- **Machine faults**: Every ~50-100 units, take a machine down. Repair after 5-10 ticks.
- **Pacing**: Generate 3-8 units per tick. Move ready units forward. Don't rush.

## Current State

{shop_floor_summary}
{product_summary}
{wip_summary}
```

---

## 4. Simulation Controls

The top bar already has placeholders for simulation controls. These map to:

| Control | UI | Behavior |
|---|---|---|
| **Start** | `▶` button | Wake up the Simulator Agent, begin production loop |
| **Pause** | `⏸` button | Agent stops generating events, WIP freezes in place |
| **Speed** | `1x / 2x / 5x / 10x` selector | Controls delay between agent decision cycles |
| **Reset** | `↺` button | Clear all production data (units, history, quality events), keep config |
| **Scenario** | Dropdown (future) | Pre-configured behavior profiles |

### Speed Control

Speed is implemented as the delay between Simulator Agent ticks:

| Speed | Tick Interval | Feel |
|---|---|---|
| 1x | 5 seconds | Watchable, unit-by-unit |
| 2x | 2.5 seconds | Faster pace, still trackable |
| 5x | 1 second | Rapid, data fills up quickly |
| 10x | 500ms | Stress test, bulk data generation |

### Implementation Approach

The simulation loop runs server-side as a recurring API call pattern:

1. Frontend sends `POST /api/simulation/start` with config (speed, scenario)
2. Server starts a loop: invoke Simulator Agent → wait tick interval → repeat
3. Agent reads current state, makes decisions, calls tools
4. Tools write to Supabase → Realtime pushes to all clients
5. `POST /api/simulation/pause` stops the loop
6. State is managed in a Zustand store (`simulationStore`) for UI controls

---

## 5. Milestone Integration

### M4 — Run Mode (Primary Implementation)

The Simulator Agent is the core of M4's production engine. It replaces the originally planned "auto-run engine" with an intelligent, agent-driven alternative.

**What gets built:**
- Simulator Agent config, system prompt, and tool subset
- Simulation API routes (`/api/simulation/start`, `/pause`, `/reset`)
- Simulation controls in the top bar (Start, Pause, Speed)
- Zustand `simulationStore` for simulation state
- Simulator generates units, moves WIP, creates quality events
- Quality Analyst reacts to Simulator-generated data in real-time
- Live ticker shows all simulation events

**Interaction with Quality Analyst:**
The Simulator deliberately introduces patterns the Quality Analyst can detect:
- Defect clusters (3+ same defect in 30 min)
- Yield drops at specific workstations
- Increasing scrap rates

This creates a feedback loop: Simulator generates → Quality Analyst monitors → User responds.

### M5 — Monitor Mode (Data Richness)

The Simulator has been generating production data. Monitor Mode now has rich, realistic data to display:

- **Throughput chart**: Real production curve with ramp-up, steady state, and dips from machine downtime
- **Yield summary**: Per-workstation bars showing the Station 3 outlier that the Simulator created
- **WIP tracker**: Natural bottlenecks visible from capacity-aware simulation
- **Unit lookup**: Every unit has a complete history — created, moved, passed/failed at gates

**Planner Agent uses simulation data:**
- "If Station 3 yield stays at 88%, how many extra units do I need?"
- "How long to build 500 units at current throughput?"

The Planner answers based on real data the Simulator generated.

### M6 — MQTT + Sensor Telemetry

The Simulator Agent gains telemetry generation capabilities:

**New tools added:**
- `publish_measurement` — write sensor readings to `mqtt_messages` table
- `publish_fault` — generate machine fault telemetry

**What the Simulator generates:**
- Cycle time per station (with realistic variance and drift)
- Temperature readings that slowly climb before a machine fault
- Torque measurements that degrade as tooling wears
- Vibration data with gradual amplitude increase

**Anomaly Monitor (Sentinel) reacts:**
- "Solder station temperature trending up 2°C/hr — predict fault in 45 minutes"
- "Cycle time at Test station increased 15% in the last hour"

This completes the North Star: Sentinel detects degradation → Strategist reschedules → Executor acts.

---

## 6. Post-MVP: OEE Dashboard

OEE (Overall Equipment Effectiveness) = Availability × Performance × Quality.

The Simulator naturally produces all three OEE components because it generates real production data through the tool layer.

### Data Requirements

| OEE Factor | Formula | Data Source | What Simulator Generates |
|---|---|---|---|
| **Availability** | Run Time / Planned Time | Machine status changes over time | Toggles machines `running → down → idle`, creates planned/unplanned downtime windows |
| **Performance** | (Ideal Cycle Time × Units) / Run Time | Actual vs ideal cycle time | Varies cycle times realistically. Ideal cycle time stored per route step |
| **Quality** | Good Units / Total Units | Pass/fail at quality gates | Introduces defects contextually. Good units = total - scrapped - reworked |

### Schema Additions Needed

```sql
-- Add ideal cycle time to route steps
ALTER TABLE route_steps ADD COLUMN ideal_cycle_time_seconds numeric;

-- Machine events table for downtime tracking
CREATE TABLE machine_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id uuid REFERENCES machines(id),
  event_type text NOT NULL,        -- 'fault', 'maintenance', 'changeover', 'recovery'
  started_at timestamptz NOT NULL,
  ended_at timestamptz,            -- NULL = ongoing
  reason text,
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Analytics tool
-- get_oee(line_id, time_range) → { availability, performance, quality, oee }
```

### OEE Dashboard Mockup

```
[Monitor Mode — OEE Dashboard]

Line: Assembly          Time window: Last 8 hours
───────────────────────────────────────────────
Availability:  87.3%   (42 min unplanned downtime at Station 3)
Performance:   91.6%   (avg cycle 4.9s vs ideal 4.5s)
Quality:       94.2%   (29 defective / 500 produced)
───────────────────────────────────────────────
OEE:           75.3%   (World-class target: 85%)

Bottleneck: Station 3 — solder machine SK-200
  → 3 fault events, 18 min total downtime
  → 22 of 29 defects originated here
```

The Simulator Agent is the key enabler for OEE — without it, there's no downtime data, no cycle time variance, and no realistic quality patterns. With it, OEE is a natural analytics view on top of existing data.

---

## 7. Simulation Scenarios (Future)

Pre-configured behavior profiles that modify the Simulator Agent's system prompt:

| Scenario | Behavior | Purpose |
|---|---|---|
| **Steady State** | 95% yield, rare faults, consistent throughput | Baseline demo, happy path |
| **Quality Crisis** | Yield drops to 80% at one station, defect clustering | Showcase Quality Analyst alerts |
| **Machine Breakdown** | A machine goes down mid-run, WIP backs up | Test bottleneck handling and recovery |
| **Ramp-Up** | Start slow, gradually increase throughput | Realistic shift start pattern |
| **Mixed Product** | Multiple part numbers running simultaneously | Test multi-product scheduling |
| **Cascade Failure** | One fault triggers downstream problems | North Star demo — multi-agent coordination |

These scenarios don't require code changes — they're different system prompt instructions to the same Simulator Agent.

---

## 8. Isolation — Simulator Is Not the MES

**Critical architectural rule**: The Simulator is a pure consumer of the MES. The MES must work identically whether the Simulator exists or not. Deleting every Simulator file must leave the MES fully functional.

### Boundary Diagram

```
┌─────────────────────────────────────────────────┐
│  Input Sources (interchangeable, independent)   │
│                                                 │
│  ┌───────────┐ ┌──────────┐ ┌───────────────┐  │
│  │ Simulator │ │ Human UI │ │ MQTT / Sensors│  │
│  │   Agent   │ │ + Chat   │ │ (M6 future)  │  │
│  └─────┬─────┘ └────┬─────┘ └──────┬────────┘  │
│        │             │              │           │
└────────┼─────────────┼──────────────┼───────────┘
         │             │              │
    ┌────▼─────────────▼──────────────▼────┐
    │         Tool Layer (MES core)        │
    │   No knowledge of who is calling     │
    └──────────────┬───────────────────────┘
                   │
    ┌──────────────▼───────────────────────┐
    │         Supabase (data model)        │
    │   No simulation-specific tables      │
    └──────────────────────────────────────┘
```

### Isolation Rules

| Rule | What it means |
|---|---|
| **No simulation columns in MES tables** | No `is_simulated` flag on `units`, no `source` column. The data model doesn't know or care. |
| **No simulation conditionals in core code** | The tool layer, agent runtime, Realtime subscriptions, and UI never check `if (simulation)`. |
| **Simulator lives in its own directory** | `lib/simulator/` — contains agent config, loop, and reset. Deleting the folder breaks nothing. |
| **Simulator uses only public tool APIs** | It calls `executeTool()` from the registry like any other caller. No internal shortcuts. |
| **Simulation controls are UI-only** | The Start/Pause/Speed/Reset buttons control the Simulator's loop. They don't modify MES behavior. |
| **Reset = standard data deletion** | "Reset simulation" is just deleting rows from `units`, `unit_history`, `quality_events` — standard tool operations, not a special simulation wipe. |
| **OEE and analytics are MES features** | `machine_events`, `ideal_cycle_time`, `get_oee` belong to the MES, not the Simulator. They work with manual data too. |

### File Organization

```
lib/
├── tools/           ← MES core (no simulation awareness)
├── agents/
│   ├── runtime.ts   ← MES core
│   ├── operator.ts  ← MES core
│   ├── quality.ts   ← MES core
│   └── planner.ts   ← MES core
├── simulator/       ← ISOLATED — all simulation code here
│   ├── agent.ts     ← Simulator agent config + system prompt
│   ├── loop.ts      ← Server-side tick loop (start/pause/speed)
│   └── reset.ts     ← Data cleanup (calls standard tools)
├── stores/
│   └── simulation-store.ts  ← UI state for controls only

app/api/
├── chat/            ← MES core
├── simulation/      ← ISOLATED — simulation API routes
│   ├── start/
│   ├── pause/
│   └── reset/
```

### Litmus Test

Before any change, ask:

1. **If I delete `lib/simulator/` and `app/api/simulation/`, does the MES still compile and run?** Must be yes.
2. **Does this new column/table serve manual production too?** If not, it doesn't belong in the MES schema.
3. **Does this code path check whether a simulation is running?** If yes, refactor — the MES shouldn't know.

---

## 9. Key Design Decisions

### Why not a deterministic engine?

A deterministic simulation (scripted events, random seeds) would be predictable and reproducible, but it would feel mechanical. The AI-driven approach produces organic, surprising behavior that better demonstrates MESkit's value. If reproducibility is needed later, we can add scenario recording/replay.

### Why a separate agent, not the Operator Assistant?

The Operator Assistant is the user's conversational co-pilot. The Simulator is a background process that generates events autonomously. Mixing them would create confusing UX — is the agent talking to me or running a simulation? Keeping them separate means:
- Operator Assistant stays in the chat panel, responds to user input
- Simulator runs silently in the background, controlled by UI buttons
- Both call the same tool layer, both show up in the ticker

### Why server-side loop, not client-side?

The simulation must be authoritative (single source of truth in Supabase) and work across multiple browser tabs. A client-side loop would create conflicts when two tabs are open. The server-side loop writes to Supabase once, and Realtime pushes to all connected clients.

---

## 10. ISA-Informed Simulation Behavior

The Simulator Agent's behavior is aligned with ISA-95 and ISA-88 standards to produce realistic, standards-compliant manufacturing data. This section describes how each ISA finding (see [`docs/isa-standards-analysis.md`](isa-standards-analysis.md)) shapes the Simulator's behavior.

### 10.1 Order-Driven Simulation

**Standard**: ISA-95 Part 4 (Production Orders)

The Simulator creates production orders before generating units. Each simulation run starts with an order context:

1. **Order creation** — Simulator creates a production order (quantity, part number, priority) before any units exist
2. **Unit linkage** — Every generated unit is linked to its production order via `production_order_id`
3. **Order lifecycle** — Order status progresses automatically:
   - `new` → order created, no production started
   - `scheduled` → order assigned to a line and route
   - `running` → first unit generated
   - `complete` → quantity_completed ≥ quantity_ordered
   - `closed` → post-production review done (future)
4. **Completion tracking** — Simulator tracks `quantity_completed` and stops generating units for an order when the target quantity is met
5. **Multi-order simulation** — At higher speeds, the Simulator may run 2–3 overlapping orders to demonstrate multi-product scheduling

This replaces the previous model where the Simulator generated unbounded units. Orders give the simulation a goal and a natural endpoint.

### 10.2 PackML State Transitions

**Standard**: ISA-88 TR88.00.02 (PackML)

Machine states follow the 7-state PackML model instead of the simple idle/running/down enum. The Simulator transitions machines through realistic sequences:

**Normal production cycle:**
```
STOPPED → IDLE → EXECUTE → COMPLETE → IDLE → EXECUTE → ...
```

**Fault scenario:**
```
EXECUTE → ABORTED → (maintenance) → STOPPED → IDLE → EXECUTE
```

**Operator hold:**
```
EXECUTE → HELD → (issue resolved) → EXECUTE
```

**Upstream starvation:**
```
EXECUTE → SUSPENDED → (material arrives) → EXECUTE
```

**Valid state transitions:**

| From | Allowed To |
|------|-----------|
| STOPPED | IDLE |
| IDLE | EXECUTE, STOPPED |
| EXECUTE | HELD, SUSPENDED, COMPLETE, ABORTED |
| HELD | EXECUTE, ABORTED |
| SUSPENDED | EXECUTE, ABORTED |
| COMPLETE | IDLE, STOPPED |
| ABORTED | STOPPED |

The Simulator enforces these transitions — it never attempts an invalid transition (e.g., STOPPED → COMPLETE). Machine faults use the ABORTED state, operator pauses use HELD, and upstream bottlenecks use SUSPENDED, giving the Quality Analyst and Anomaly Monitor richer state data to reason about.

### 10.3 Quality Test Definitions

**Standard**: ISA-95 Part 3 (Quality Operations)

Instead of binary pass/fail, the Simulator evaluates against `quality_test_definitions`. For each gated route step with a test definition:

1. **Measurement generation** — The Simulator generates a realistic measured value within a distribution centered on the nominal (midpoint of lower_limit and upper_limit)
   - Example: Solder temperature test with limits [230°C, 240°C] → Simulator generates values around 235°C ± standard deviation

2. **Near-limit decisions** — Values near tolerance limits produce marginal pass/fail:
   - 95% of values fall within ±1σ of nominal (clear pass)
   - 4% fall between 1σ and the limit (marginal pass)
   - 1% exceed limits (fail)

3. **Defect clustering via tool wear** — The Simulator models gradual drift:
   - After N units, measurement mean shifts toward one limit (simulating tool wear)
   - This produces realistic defect clusters — 3–5 consecutive failures when the drift crosses the limit
   - After a HELD state (maintenance), measurements reset to nominal

4. **Test result recording** — Each quality event includes the actual measurement, the test definition reference, and whether it passed — enabling SPC charts and tolerance analysis in Monitor Mode

### 10.4 Process Parameter Simulation

**Standard**: ISA-95 Part 2 (Process Segment)

The Simulator uses `ideal_cycle_time_seconds` from route steps to pace unit movement and generates realistic cycle time variation:

1. **Baseline pacing** — Each route step takes approximately `ideal_cycle_time_seconds` to complete
2. **Realistic variance** — Actual cycle times vary ±10–20% around the ideal:
   - Normal distribution centered on `ideal_cycle_time_seconds`
   - σ = 10% of ideal for well-tuned machines, 20% for degraded machines
3. **Degradation modeling** — Machine cycle times drift upward over time:
   - Fresh machine: actual ≈ ideal × 1.0
   - After 100 units: actual ≈ ideal × 1.05 (5% slower)
   - After 200 units: actual ≈ ideal × 1.10 (10% slower)
   - After maintenance (HELD → EXECUTE): cycle time resets to nominal
4. **Bottleneck emergence** — Steps with longer cycle times naturally create WIP accumulation at upstream stations, producing organic bottleneck patterns without explicit bottleneck logic

When `process_parameters` JSONB is available (M5–M6), the Simulator also generates parameter telemetry (temperature, torque, vibration) that drifts toward out-of-spec values before machine faults — giving the Anomaly Monitor realistic pre-fault signals.

### 10.5 Ideal Cycle Time Pacing

**Standard**: ISA-95 Part 2 (Performance tracking)

Speed control interacts with ideal cycle times to preserve relative timing at all simulation speeds:

| Speed | Real Tick Interval | Cycle Time Compression | Effect |
|-------|-------------------|----------------------|--------|
| 1x | 5 seconds | None — real-time pacing | Unit moves when its cycle time elapses. A 30s step takes 30s. Watchable, unit-by-unit. |
| 2x | 2.5 seconds | 2× compression | A 30s step takes 15s. Faster pace, still trackable. |
| 5x | 1 second | 5× compression | A 30s step takes 6s. Rapid data generation. |
| 10x | 500ms | 10× compression | A 30s step takes 3s. Stress test, bulk data. |

**Key invariant**: A step that takes 2× longer than another step still takes 2× longer at any speed. The ratio between step durations is always preserved, ensuring that bottleneck patterns, WIP distribution, and OEE calculations remain realistic regardless of simulation speed.

At 1x speed, the Simulator respects ideal cycle times faithfully — a route step with `ideal_cycle_time_seconds: 45` holds the unit at that workstation for ~45 seconds (± variance). At 10x, the same step completes in ~4.5 seconds, but its proportion relative to other steps remains identical.
