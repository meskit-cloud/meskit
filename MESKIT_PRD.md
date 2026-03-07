# MESkit — Product Requirements Document

## 1. Project Identity & Vision

**MESkit** is an open-source Manufacturing Execution System toolkit with built-in analytics, quality alerts, and natural language queries. It provides a complete, buildable MES that starts with simulation, includes smart features powered by an intelligence layer, and is architecturally ready for real sensor input via MQTT.

MESkit follows the **ISA-95** standard data model — no proprietary API dependencies.

### Brand Identity

**Finally, an MES that's as easy to use as asking a question.** Open-source MES with built-in analytics.

MESkit is not a chatbot demo or a thin wrapper. It is a Manufacturing Execution System with smart features — quality alerts, production planning, and natural language queries — that route through the same typed tool layer as UI buttons, removing coordination bottlenecks so operators can focus on decisions instead of chasing data.

### North Star

See problems before they stop your line. MESkit monitors machine health, surfaces quality trends, and helps you plan production — so your team acts on insights instead of chasing data.

The product roadmap builds toward this: the Machine Health Monitor detects degradation signals from sensor data, the Production Planner evaluates constraints and alternatives, and the intelligence layer acts through the tool layer to update schedules and notify operators.

### How MESkit Works

Every MES operation — moving a lot, logging a defect, querying yield — flows through a **tool layer** that both the UI and smart features consume. The same function that powers a button click also powers a natural-language command. Smart features are force multipliers for human operators, not assistants to the UI.

### Target Users

- **Manufacturing engineers** learning MES concepts and ISA-95 patterns
- **Small shops** that need a lightweight, self-hosted MES without enterprise pricing
- **Developers** building manufacturing applications who need a reference implementation
- **Teams exploring smart manufacturing** who want a real MES with built-in analytics, not a chatbot demo

### What MESkit Is NOT

MESkit is not a learning exercise or a demo wrapper around a vendor API. It is a standalone product with its own persistence layer, authentication, real-time infrastructure, and intelligence layer.

---

## 2. Architecture — Four-Layer Design

```
┌─────────────────────────────────────────────────────────┐
│  Next.js Frontend (UI)                                  │
│  Tailwind CSS · Zustand · Recharts · Chat Panel         │
├─────────────────────────────────────────────────────────┤
│  Tool Layer (Server Actions / API Routes)               │
│  Typed MES operations — single source of truth          │
│  UI calls tools · Agents call tools · Same interface    │
├─────────────────────────────────────────────────────────┤
│  Intelligence Layer                                     │
│  Claude API (tool-use) · @anthropic-ai/sdk              │
│  Ask MESkit · Quality Monitor · Planner                 │
├─────────────────────────────────────────────────────────┤
│  Supabase (Persistence + Realtime)                      │
│  Postgres · Auth · Realtime subscriptions · Edge Fns    │
├─────────────────────────────────────────────────────────┤
│  MQTT Broker (future — M6)                              │
│  Mosquitto / HiveMQ Cloud                               │
│  → Device Gateway Edge Function (MQTT → Postgres)       │
└─────────────────────────────────────────────────────────┘
```

### Layer Responsibilities

| Layer | Role | Key Tech |
|-------|------|----------|
| **Frontend** | UI rendering, local state, user interaction, chat panel | Next.js (App Router), Tailwind, Zustand, Recharts |
| **Tool Layer** | Typed MES operations consumed by UI and smart features alike | Next.js Server Actions, Zod validation |
| **Intelligence Layer** | Smart features that observe, reason, and act on the MES | Claude API (tool-use), `@anthropic-ai/sdk` |
| **Backend** | Persistence, auth, real-time push, serverless logic | Supabase (Postgres, Auth, Realtime, Edge Functions) |
| **Device Layer** | Sensor data ingestion (future) | MQTT broker, Supabase Edge Function as bridge |

### Why a Tool Layer

In the original design, the UI called Supabase directly. In the current design, a **tool layer** sits between all consumers and the database:

```
Before:   UI → Supabase
After:    UI ──→ Tool Layer → Supabase
          Smart Features → Tool Layer → Supabase
```

Benefits:
- **Single source of truth**: Business logic lives in one place, not duplicated between UI handlers and agent tools
- **Type safety**: Zod schemas validate inputs regardless of whether a human or smart feature triggered the action
- **Testability**: Tools are pure functions — easy to unit test without UI or smart feature dependencies
- **Auditability**: Every tool invocation can be logged with caller identity (user or smart feature)

### Why Supabase

- **Postgres**: ISA-95 data model maps cleanly to relational tables with foreign keys and constraints
- **Realtime**: Supabase Realtime subscriptions replace polling — lots moving through workstations push updates to all connected clients and to monitoring features
- **Auth**: Built-in auth with Row Level Security (RLS) means multi-user is free from day one
- **Edge Functions**: Deno-based serverless functions serve as the MQTT → Postgres bridge in M6

### Client State Strategy

Zustand manages **ephemeral UI state only** — selected sidebar mode, open panels, filter selections, chat history. All manufacturing data lives in Supabase. The frontend subscribes to Supabase Realtime channels and updates Zustand stores reactively.

---

## 3. Data Model — ISA-95 Aligned

All tables live in Supabase Postgres. The model follows the ISA-95 hierarchy: physical assets → product definitions → process routes → production execution → quality.

### 3.1 Physical Model

```sql
lines
  ├── id (uuid, PK)
  ├── name (text, unique)
  ├── description (text, nullable)
  └── created_at (timestamptz)

workstations
  ├── id (uuid, PK)
  ├── line_id (uuid, FK → lines)
  ├── name (text)
  ├── position (int)           -- order within line
  ├── operator_name (text, nullable)
  └── created_at (timestamptz)

machines
  ├── id (uuid, PK)
  ├── workstation_id (uuid, FK → workstations, nullable)
  ├── name (text)
  ├── type (text)
  ├── status (enum: idle | running | down)
  └── created_at (timestamptz)
```

### 3.2 Product Model

```sql
part_numbers
  ├── id (uuid, PK)
  ├── name (text, unique)
  ├── description (text, nullable)
  └── created_at (timestamptz)

items
  ├── id (uuid, PK)
  ├── name (text)
  ├── description (text, nullable)
  └── created_at (timestamptz)

bom_entries
  ├── id (uuid, PK)
  ├── part_number_id (uuid, FK → part_numbers)
  ├── item_id (uuid, FK → items)
  ├── quantity (int, default 1)
  └── position (int)           -- order in BOM
```

### 3.3 Process Model

```sql
routes
  ├── id (uuid, PK)
  ├── part_number_id (uuid, FK → part_numbers)
  ├── name (text)
  └── created_at (timestamptz)

route_steps
  ├── id (uuid, PK)
  ├── route_id (uuid, FK → routes)
  ├── workstation_id (uuid, FK → workstations)
  ├── step_number (int)
  ├── name (text)
  └── pass_fail_gate (boolean, default true)
```

### 3.4 Production Model

```sql
units
  ├── id (uuid, PK)
  ├── serial_number (text, unique)
  ├── part_number_id (uuid, FK → part_numbers)
  ├── route_id (uuid, FK → routes)
  ├── status (enum: in_progress | completed | scrapped)
  ├── current_step (int)
  └── created_at (timestamptz)

unit_history
  ├── id (uuid, PK)
  ├── unit_id (uuid, FK → units)
  ├── route_step_id (uuid, FK → route_steps)
  ├── workstation_id (uuid, FK → workstations)
  ├── result (enum: pass | fail)
  ├── defect_code_id (uuid, FK → defect_codes, nullable)
  ├── timestamp (timestamptz)
  └── metadata (jsonb, nullable)
```

### 3.5 Quality Model

```sql
defect_codes
  ├── id (uuid, PK)
  ├── code (text, unique)
  ├── description (text)
  └── severity (enum: minor | major | critical)

quality_events
  ├── id (uuid, PK)
  ├── unit_id (uuid, FK → units)
  ├── workstation_id (uuid, FK → workstations)
  ├── event_type (enum: inspection | rework | scrap)
  ├── result (enum: pass | fail)
  ├── defect_code_id (uuid, FK → defect_codes, nullable)
  ├── notes (text, nullable)
  └── timestamp (timestamptz)
```

### 3.6 Serial Algorithm Config

```sql
serial_algorithms
  ├── id (uuid, PK)
  ├── part_number_id (uuid, FK → part_numbers, unique)
  ├── prefix (text)            -- e.g., "SMX-"
  ├── current_counter (int)    -- auto-incremented on unit generation
  ├── pad_length (int, default 5)
  └── created_at (timestamptz)
```

### 3.7 Agent Conversations

```sql
agent_conversations
  ├── id (uuid, PK)
  ├── user_id (uuid, FK → auth.users)
  ├── agent_type (text)        -- 'operator_assistant' | 'quality_analyst' | 'planner'
  ├── messages (jsonb)         -- array of {role, content, tool_calls, tool_results}
  ├── context (jsonb, nullable) -- active mode, selected line, etc.
  └── created_at (timestamptz)
```

### 3.8 MQTT Ingestion (Future — M6)

```sql
mqtt_messages
  ├── id (uuid, PK)
  ├── topic (text)
  ├── machine_id (uuid, FK → machines, nullable)
  ├── event_type (text)
  ├── payload (jsonb)
  ├── received_at (timestamptz, default now())
  └── processed (boolean, default false)
```

---

## 4. Tool Layer — MES Operations

The tool layer is the central nervous system of MESkit. Every MES operation is a typed Server Action that validates inputs, executes the operation against Supabase, and returns a structured result.

Both the UI and smart features consume these tools through the same interface. The UI calls them as Server Actions; the intelligence layer registers them as Claude tool definitions.

### 4.1 Tool Catalog

#### Shop Floor Tools

| Tool | Parameters | Returns | Description |
|------|-----------|---------|-------------|
| `list_lines` | `{}` | `Line[]` | List all manufacturing lines |
| `create_line` | `{ name, description? }` | `Line` | Create a new line |
| `update_line` | `{ id, name?, description? }` | `Line` | Update a line |
| `delete_line` | `{ id }` | `void` | Delete a line and its workstations |
| `list_workstations` | `{ line_id? }` | `Workstation[]` | List workstations, optionally filtered by line |
| `create_workstation` | `{ line_id, name, position, operator_name? }` | `Workstation` | Add a workstation to a line |
| `list_machines` | `{ workstation_id?, status? }` | `Machine[]` | List machines with optional filters |
| `update_machine_status` | `{ id, status }` | `Machine` | Change machine status (idle/running/down) |

#### Product & Process Tools

| Tool | Parameters | Returns | Description |
|------|-----------|---------|-------------|
| `list_part_numbers` | `{}` | `PartNumber[]` | List all part numbers |
| `create_part_number` | `{ name, description? }` | `PartNumber` | Create a part number |
| `get_bom` | `{ part_number_id }` | `BomEntry[]` | Get BOM for a part number |
| `set_bom_entry` | `{ part_number_id, item_id, quantity, position }` | `BomEntry` | Add/update a BOM entry |
| `list_routes` | `{ part_number_id? }` | `Route[]` | List routes |
| `create_route` | `{ part_number_id, name, steps[] }` | `Route` | Create a route with steps |
| `configure_serial_algorithm` | `{ part_number_id, prefix, pad_length }` | `SerialAlgorithm` | Set serial number algorithm |

#### Production Tools

| Tool | Parameters | Returns | Description |
|------|-----------|---------|-------------|
| `generate_units` | `{ part_number_id, route_id, count }` | `Unit[]` | Generate N units with auto-assigned serials |
| `move_unit` | `{ unit_id }` | `UnitHistory` | Advance a unit to its next route step |
| `scrap_unit` | `{ unit_id, defect_code_id, notes? }` | `Unit` | Mark a unit as scrapped |
| `get_wip_status` | `{ line_id?, workstation_id? }` | `WipSummary` | Current units per workstation |
| `search_units` | `{ serial_number?, status?, part_number_id? }` | `Unit[]` | Search units with filters |

#### Quality Tools

| Tool | Parameters | Returns | Description |
|------|-----------|---------|-------------|
| `create_quality_event` | `{ unit_id, workstation_id, event_type, result, defect_code_id?, notes? }` | `QualityEvent` | Log an inspection, rework, or scrap event |
| `list_defect_codes` | `{}` | `DefectCode[]` | List all defect codes |
| `create_defect_code` | `{ code, description, severity }` | `DefectCode` | Create a new defect code |

#### Analytics Tools

| Tool | Parameters | Returns | Description |
|------|-----------|---------|-------------|
| `get_throughput` | `{ line_id?, time_range }` | `ThroughputData` | Units completed over time |
| `get_yield_report` | `{ workstation_id?, time_range? }` | `YieldData` | Pass/fail ratio by workstation |
| `get_unit_history` | `{ unit_id }` | `UnitHistory[]` | Full route history for a unit |

### 4.2 Tool Implementation Pattern

Each tool follows the same pattern:

```typescript
// lib/tools/production.ts
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const generateUnitsSchema = z.object({
  part_number_id: z.string().uuid(),
  route_id: z.string().uuid(),
  count: z.number().int().min(1).max(1000),
});

export async function generateUnits(
  input: z.infer<typeof generateUnitsSchema>
) {
  const validated = generateUnitsSchema.parse(input);
  const supabase = await createClient();
  // ... business logic
  return units;
}
```

The same function is:
1. Called by the UI via `"use server"` Server Actions
2. Registered as a Claude tool definition in the intelligence layer
3. Directly testable in isolation

---

## 5. Intelligence Layer — Smart Features

MESkit ships with three smart features. Each uses Claude's tool-use capability to call MES tools based on natural-language input or event triggers.

### 5.1 Intelligence Layer Architecture

```
┌──────────────────────────────────────────────┐
│  Intelligence Layer (server-side)            │
│                                              │
│  ┌────────────┐  ┌──────────┐  ┌──────────┐ │
│  │ Ask MESkit │  │ Quality  │  │ Planner  │ │
│  │            │  │ Monitor  │  │          │ │
│  └─────┬──────┘  └────┬─────┘  └────┬─────┘ │
│        │              │              │       │
│        └──────────────┼──────────────┘       │
│                       │                      │
│              ┌────────▼────────┐             │
│              │   Tool Layer    │             │
│              └────────┬────────┘             │
│                       │                      │
│              ┌────────▼────────┐             │
│              │    Supabase     │             │
│              └─────────────────┘             │
└──────────────────────────────────────────────┘
```

### 5.1.1 Three Automation Layers (North Star Architecture)

The smart features are designed around three complementary roles that, together, deliver the North Star: predictive rescheduling.

| Layer | Role | Feature | Milestone |
|-------|------|---------|-----------|
| **Monitor** | Monitors sensor telemetry, detects degradation, outputs failure probability scores | Machine Health Monitor | M6 |
| **Plan** | Evaluates constraints (backlog, deadlines, capacity), computes alternative schedules | Production Planner | M5 |
| **Act** | Acts on decisions through the tool layer — updates schedules, notifies operators | Intelligence Layer | M1+ |

In the MVP, these layers operate independently. Post-MVP, the Monitor triggers the Plan, which triggers the Act — closing the coordination loop.

### 5.2 Ask MESkit (Natural Language Interface)

**Trigger**: User-initiated via chat panel (always available in the UI shell).

**Role**: A natural language interface for shop floor operators. Replaces clicking through menus with plain-English commands and queries.

**System prompt context**: Current mode, selected line/workstation, active production run.

**Example interactions**:

```
User: "What's stuck at assembly?"
MESkit: calls get_wip_status(workstation_id='assembly-ws-id')
→ "3 units at Assembly: SMX-00042, SMX-00043, SMX-00044. All in_progress."

User: "Scrap 00044, solder bridge on U3"
MESkit: calls search_units(serial_number='SMX-00044')
        calls create_quality_event(unit_id=..., event_type='scrap',
              result='fail', defect_code_id=..., notes='Solder bridge on U3')
        calls scrap_unit(unit_id=...)
→ "SMX-00044 scrapped. Defect logged: solder bridge (critical). 2 units remain at Assembly."

User: "How's yield today?"
MESkit: calls get_yield_report(time_range='today')
→ "Overall yield: 94.2%. Station 3 (Test) is the bottleneck at 88% — 7 failures, 5 are 'test fixture contact' defects."
```

**Available tools**: All tools from the catalog.

### 5.3 Quality Monitor

**Trigger**: Event-driven. Activated by Supabase Realtime events when quality thresholds are breached.

**Role**: Monitors production data continuously and surfaces alerts proactively. Detects yield drops, defect pattern clusters, and anomalies.

**Trigger conditions**:
- Yield at any workstation drops below configurable threshold (default: 90%)
- Same defect code appears N times within a time window (default: 3 in 30 min)
- Scrap rate exceeds threshold for a production run

**Example output**:

```
[Quality Alert] Station 3 yield dropped to 86% (last 50 units).
Root cause analysis: 6 of 7 failures are defect code SOL-003 (solder bridge).
This defect was rare before 14:00 — 0 occurrences in the first 120 units.
Recommendation: Check solder paste viscosity and stencil alignment at Station 3.
```

**Available tools**: `get_yield_report`, `get_unit_history`, `search_units`, `list_defect_codes`, `get_wip_status`, `get_throughput`.

### 5.4 Production Planner

**Trigger**: User-initiated via chat panel.

**Role**: Helps plan production runs by analyzing shop floor capacity, route configurations, and historical performance.

**Example interactions**:

```
User: "I need to build 500 units of Smartphone X by end of shift. What's my plan?"
MESkit: calls list_routes(part_number_id=...)
        calls list_workstations(line_id=...)
        calls get_throughput(line_id=..., time_range='last_8_hours')
→ "Route 'SMX-Standard' has 5 steps. Based on today's throughput (62 units/hr),
   500 units will take ~8.1 hours. You're 6.5 hours from end of shift.
   Options:
   1. Start now, carry over 100 units to next shift
   2. Run both Line 1 and Line 2 in parallel — estimated 4.2 hours"
```

**Available tools**: `list_routes`, `list_workstations`, `list_machines`, `get_throughput`, `get_yield_report`, `get_wip_status`, `generate_units`.

### 5.5 Machine Health Monitor (Future — M6)

**Trigger**: Event-driven via MQTT message ingestion.

**Role**: Monitors sensor data from the MQTT stream for out-of-range values, unusual patterns, and equipment degradation signals. Surfaces predictive maintenance alerts before failures happen.

**Available tools**: Analytics tools + MQTT-specific query tools (added in M6).

---

## 6. MVP Scope — What's IN

The core loop remains: **define a product → build a route → move a unit through workstations → collect quality/production data → visualize results**.

The natural language difference: users can execute the entire core loop through conversation. The UI and the chat panel are parallel interfaces to the same tool layer.

### 6.1 Build Mode — Shop Floor Setup

- **Lines**: Create/edit/delete manufacturing lines
- **Workstations**: Add workstations to a line with ordered positions, assign operator names
- **Machines**: Register machines with name, type, status; optionally attach to a workstation

All operations flow through the tool layer. The UI subscribes to Realtime changes so multiple browser tabs stay in sync. Ask MESkit can also perform all Build Mode operations via chat.

### 6.2 Configure Mode — Product & Process

- **Part Numbers**: Create part numbers with descriptions
- **Items & BOM**: Define component items, assemble flat single-level BOMs via `bom_entries`
- **Serial Algorithms**: Configure prefix and padding per part number (e.g., `SMX-00001`)
- **Routes**: Design ordered step sequences through workstations; each step has a name and optional pass/fail gate

### 6.3 Run Mode — Production Execution

- **Unit Generation**: Generate N units for a part number; serial numbers auto-assigned via the algorithm; units written to Supabase
- **WIP Movement**: Move units step-by-step through their route
  - **Manual**: User clicks "Move" per unit, or tells MESkit "move SMX-00042"
  - **Auto-run**: Units auto-advance at a configurable interval (simulated cycle time)
- **Quality Gates**: At each pass/fail step, randomly inject outcomes based on a configurable yield rate (default 95%); failed units are scrapped and logged
- **Live Ticker**: Supabase Realtime subscription renders a scrolling event log of every unit creation, move, and quality event

### 6.4 Monitor Mode — Dashboard

- **WIP Tracker**: Real-time count of units at each workstation (Supabase Realtime subscription)
- **Throughput Chart**: Units completed over time (line chart via Recharts)
- **Yield Summary**: Pass/fail ratio per workstation (bar chart)
- **Unit Lookup**: Search by serial number to view full route history from `unit_history`
- **Quality Insights**: Quality Monitor surfaces natural-language insights alongside charts

### 6.5 Chat Panel — Always Available

- Persistent chat panel in the UI shell (collapsible, right side or bottom)
- Context-aware: knows which mode is active, which line/workstation is selected
- Defaults to Ask MESkit (Production); user can switch to Planning topic
- Conversation history persisted in `agent_conversations` table
- Streaming responses via Claude API

---

## 7. Scope: What's OUT

| Feature | Reason deferred |
|---------|----------------|
| World map / plant location picker | UI complexity, no MES value for MVP |
| Full CMMS (maintenance schedules, spare parts) | Depth feature beyond MES scope |
| Workforce shifts, certifications, training | HR system scope |
| Supplier management & multi-level BOM traceability | Requires supplier entity model |
| ERP / PLM integration | MESkit is the MES layer only |
| Label templates & printing | Peripheral feature |
| Work Instructions authoring | Content authoring scope |
| OEE (full Availability x Performance x Quality) | Needs downtime & ideal cycle time model |
| Time control (2x, 5x, 10x simulation speed) | Can be layered on top of auto-run later |
| Multi-feature orchestration | Smart features work independently in MVP; coordination comes later |
| Voice input for operators | Chat-first; voice is a future input modality |
| Cross-session memory | Conversations persist, but no long-term learning in MVP |

---

## 8. MQTT-Ready Architecture

Implementation is deferred to M6, but the interface contract is defined now so the data model and Edge Function architecture are ready.

### 8.1 Topic Naming Convention

```
meskit/{line_id}/{workstation_id}/{event_type}
```

Examples:
```
meskit/line-01/ws-assembly/cycle_complete
meskit/line-01/ws-test/measurement
meskit/line-01/ws-pack/fault
```

### 8.2 Message Schema

Every MQTT message is a JSON payload:

```json
{
  "timestamp": "2026-03-03T14:22:01.000Z",
  "machine_id": "uuid-of-machine",
  "event_type": "cycle_complete",
  "payload": {
    "unit_serial": "SMX-00042",
    "cycle_time_ms": 4500,
    "result": "pass"
  }
}
```

### 8.3 Ingestion Path

```
MQTT Broker
  → Supabase Edge Function (subscriber)
    → Validates message against schema
    → Writes to mqtt_messages table
    → Calls tool layer (move_unit, create_quality_event)
    → Machine Health Monitor evaluates sensor data
```

### 8.4 Simulation Mode — Virtual Device

Before a real MQTT broker exists, the auto-run engine in Run Mode generates events using the **exact same JSON schema**. When the broker is introduced in M6, the only change is the transport — the data shape is already correct.

A "virtual device" module publishes fake MQTT messages at configurable intervals:
- `cycle_complete` — unit finishes a workstation step
- `measurement` — a sensor reading (temperature, torque, etc.)
- `fault` — a machine error triggers a quality event

---

## 9. Milestones

| # | Milestone | Deliverable | Key Details |
|---|-----------|-------------|-------------|
| **M1** | Project scaffold + Tool Layer | Next.js app, Supabase project, auth, professional light-first shell, tool layer scaffold, chat panel | Design tokens, Zustand stores, Supabase client, sidebar + top bar + ticker + chat panel layout, login/signup, tool layer architecture with Zod schemas |
| **M2** | Build Mode + Ask MESkit | CRUD for lines, workstations, machines via UI and chat | Shop floor tools implemented, Ask MESkit wired to Claude tool-use, Realtime subscriptions |
| **M3** | Configure Mode | Part numbers, BOM, routes, serial algorithms via UI and chat | Product & process tools, route step designer, BOM assembly UI, all operations available via natural language |
| **M4** | Run Mode + Quality Monitor | Unit generation, WIP movement, quality gates, proactive quality alerts | Production tools, auto-run engine, yield injection, Quality Monitor with event-driven triggers |
| **M5** | Monitor Mode + Planner | Dashboard with live charts, natural-language insights, production planning | Analytics tools, Recharts dashboards, Quality Monitor insights in UI, Production Planner |
| **M6** | MQTT Interface + Machine Health Monitor | Broker setup, message schema, device gateway, sensor anomaly detection | Mosquitto/HiveMQ Cloud, Edge Function bridge, virtual device module, Machine Health Monitor |

---

## 10. Design System

### 10.1 Brand DNA — MESkit Identity

MESkit uses a professional, engineering-first visual identity: clean information hierarchy, light-first surfaces, and enterprise-grade clarity. The interface should feel production-ready, not experimental.

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#F3F7FC` / `#EAF1F8` | App canvas and secondary sections |
| Surface | `#FFFFFF` | Cards, panels, modals, chat panel |
| Border | `#D6E0EA` | Dividers, card edges |
| Accent (primary) | `#0F6FF2` (Blue 600) | Primary actions, links, active states |
| Accent (hover) | `#0A58C7` (Blue 700) | Hover states for primary actions |
| Text primary | `#0F172A` | Headings, body text |
| Text secondary | `#334155` | Labels and secondary copy |
| Success | `#15803D` | Pass results and healthy status |
| Warning | `#B45309` | Attention states and warnings |
| Error | `#B91C1C` | Fail results and faults |
| Smart feature | `#7C3AED` (Violet 600) | Smart-feature-originated accents and tags |
| Font | `Manrope` + `IBM Plex Mono` | UI/content + technical data text |

### 10.2 UI Structure

```
┌──────────────────────────────────────────────────────────────────┐
│  MESkit  [▶ Start] [⏸ Pause] [⏩ Auto]              user@email ▾│
├────────┬───────────────────────────────────────┬─────────────────┤
│        │                                       │                 │
│  Mode  │         Main Content Area             │   Chat Panel    │
│  ------│                                       │   ───────────   │
│  Build │  (changes based on selected mode)     │   Ask MESkit    │
│  Config│                                       │                 │
│  Run   │                                       │                 │
│  Monitor│                                      │   [message...]  │
│        │                                       │   [> type here] │
├────────┴───────────────────────────────────────┴─────────────────┤
│  Live Ticker  [unit SMX-00042 moved to Station 3]                │
└──────────────────────────────────────────────────────────────────┘
```

- **Sidebar**: Mode switcher (Build / Configure / Run / Monitor)
- **Top bar**: MESkit branding, simulation controls (Start, Pause, Auto-run toggle), user menu
- **Main area**: Context-dependent content per selected mode
- **Chat panel**: Persistent, collapsible natural language interface (right side). Context-aware — sees current mode and selections
- **Bottom bar**: Live event ticker — Supabase Realtime subscription renders a scrolling log (includes both human and MESkit actions)
- **Surface style**: White cards on neutral background with subtle border and elevation; avoid neon/glow treatments

---

## 11. Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Frontend framework | Next.js (App Router) | React ecosystem, SSR-capable, Server Actions for tool layer, Vercel deploy |
| Styling | Tailwind CSS | Utility-first system that supports a professional, enterprise-grade visual language |
| Client state | Zustand | Lightweight, no boilerplate — UI state + chat state |
| Backend | Supabase | Postgres + Auth + Realtime + Edge Functions in one platform |
| Tool layer | Next.js Server Actions + Zod | Typed operations, single source of truth for UI and agents |
| Intelligence layer | Claude API (tool-use) via `@anthropic-ai/sdk` | Best-in-class tool-use, streaming, structured outputs |
| Charts | Recharts | React-native charting, covers bar/line/area charts |
| Auth | Supabase Auth | Built-in, supports email + OAuth, ties into RLS |
| Real-time | Supabase Realtime | Postgres changes broadcast to subscribed clients and agent triggers |
| MQTT broker (M6) | Mosquitto or HiveMQ Cloud | Industry standard, lightweight, free tier available |
| Deployment | Vercel (frontend) + Supabase Cloud (backend) | Zero-config for Next.js, managed Postgres |

---

## 12. ISA-95 Alignment

MESkit's data model maps to the ISA-95 hierarchy:

| ISA-95 Level | MESkit Concept | Tables |
|--------------|----------------|--------|
| **Level 0-2**: Physical equipment | Shop floor assets | `lines`, `workstations`, `machines` |
| **Level 3**: Product definition | What to build and how | `part_numbers`, `items`, `bom_entries` |
| **Level 3**: Process definition | How units flow through production | `routes`, `route_steps` |
| **Level 3**: Production execution | Tracking units through manufacturing | `units`, `unit_history` |
| **Level 3**: Quality operations | Inspections, defects, scrap | `quality_events`, `defect_codes` |
| **Level 1-2** (future): Device integration | Sensor data from the floor | `mqtt_messages` |

MESkit's smart features operate at Level 3 — the same level as human operators and supervisors. They don't replace the ISA-95 model; they consume it through the tool layer, just as a human operator would through the UI.

This alignment means MESkit speaks the same language as enterprise MES systems, making it useful for learning and as a foundation for real deployments — with built-in analytics, quality alerts, and natural language queries from day one.
