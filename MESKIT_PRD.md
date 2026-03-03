# MESkit — Product Requirements Document

## 1. Project Identity & Vision

**MESkit** is an open-source Manufacturing Execution System toolkit. It provides a complete, buildable MES that starts with simulation and is architecturally ready for real sensor input via MQTT.

MESkit follows the **ISA-95** standard data model — no proprietary API dependencies.

### Target Users

- **Manufacturing engineers** learning MES concepts and ISA-95 patterns
- **Small shops** that need a lightweight, self-hosted MES without enterprise pricing
- **Developers** building manufacturing applications who need a reference implementation

### What MESkit Is NOT

MESkit is not a learning exercise or a demo wrapper around a vendor API. It is a standalone product with its own persistence layer, authentication, and real-time infrastructure.

---

## 2. Architecture — Three-Layer Design

```
┌─────────────────────────────────────────────────────────┐
│  Next.js Frontend (UI)                                  │
│  Tailwind CSS · Zustand (client state) · Recharts       │
├─────────────────────────────────────────────────────────┤
│  Supabase (Backend)                                     │
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
| **Frontend** | UI rendering, local state, user interaction | Next.js (App Router), Tailwind, Zustand, Recharts |
| **Backend** | Persistence, auth, real-time push, serverless logic | Supabase (Postgres, Auth, Realtime, Edge Functions) |
| **Device Layer** | Sensor data ingestion (future) | MQTT broker, Supabase Edge Function as bridge |

### Why Supabase

- **Postgres**: ISA-95 data model maps cleanly to relational tables with foreign keys and constraints
- **Realtime**: Supabase Realtime subscriptions replace polling — units moving through workstations push updates to all connected clients
- **Auth**: Built-in auth with Row Level Security (RLS) means multi-user is free from day one
- **Edge Functions**: Deno-based serverless functions serve as the MQTT → Postgres bridge in M6

### Client State Strategy

Zustand manages **ephemeral UI state only** — selected sidebar mode, open panels, filter selections. All manufacturing data lives in Supabase. The frontend subscribes to Supabase Realtime channels and updates Zustand stores reactively.

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

### 3.7 MQTT Ingestion (Future — M6)

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

## 4. MVP Scope — What's IN

The core loop remains: **define a product → build a route → move a unit through workstations → collect quality/production data → visualize results**.

The difference from a simulation-only approach: all data persists in Supabase Postgres, updates push to all clients via Supabase Realtime, and users authenticate before accessing the system.

### 4.1 Build Mode — Shop Floor Setup

- **Lines**: Create/edit/delete manufacturing lines
- **Workstations**: Add workstations to a line with ordered positions, assign operator names
- **Machines**: Register machines with name, type, status; optionally attach to a workstation

All CRUD operations hit Supabase directly. The UI subscribes to Realtime changes so multiple browser tabs stay in sync.

### 4.2 Configure Mode — Product & Process

- **Part Numbers**: Create part numbers with descriptions
- **Items & BOM**: Define component items, assemble flat single-level BOMs via `bom_entries`
- **Serial Algorithms**: Configure prefix and padding per part number (e.g., `SMX-00001`)
- **Routes**: Design ordered step sequences through workstations; each step has a name and optional pass/fail gate

### 4.3 Run Mode — Production Execution

- **Unit Generation**: Generate N units for a part number; serial numbers auto-assigned via the algorithm; units written to Supabase
- **WIP Movement**: Move units step-by-step through their route
  - **Manual**: User clicks "Move" per unit
  - **Auto-run**: Units auto-advance at a configurable interval (simulated cycle time)
- **Quality Gates**: At each pass/fail step, randomly inject outcomes based on a configurable yield rate (default 95%); failed units are scrapped and logged
- **Live Ticker**: Supabase Realtime subscription renders a scrolling event log of every unit creation, move, and quality event

### 4.4 Monitor Mode — Dashboard

- **WIP Tracker**: Real-time count of units at each workstation (Supabase Realtime subscription)
- **Throughput Chart**: Units completed over time (line chart via Recharts)
- **Yield Summary**: Pass/fail ratio per workstation (bar chart)
- **Unit Lookup**: Search by serial number to view full route history from `unit_history`

---

## 5. Scope: What's OUT

| Feature | Reason deferred |
|---------|----------------|
| World map / plant location picker | UI complexity, no MES value for MVP |
| AI image generation for virtual plants | Novelty feature, not core |
| Full CMMS (maintenance schedules, spare parts) | Depth feature beyond MES scope |
| Workforce shifts, certifications, training | HR system scope |
| Supplier management & multi-level BOM traceability | Requires supplier entity model |
| ERP / PLM integration | MESkit is the MES layer only |
| Label templates & printing | Peripheral feature |
| Work Instructions authoring | Content authoring scope |
| OEE (full Availability × Performance × Quality) | Needs downtime & ideal cycle time model |
| Time control (2x, 5x, 10x simulation speed) | Can be layered on top of auto-run later |
| Global Command-K search | Polish feature for later |

---

## 6. MQTT-Ready Architecture

Implementation is deferred to M6, but the interface contract is defined now so the data model and Edge Function architecture are ready.

### 6.1 Topic Naming Convention

```
meskit/{line_id}/{workstation_id}/{event_type}
```

Examples:
```
meskit/line-01/ws-assembly/cycle_complete
meskit/line-01/ws-test/measurement
meskit/line-01/ws-pack/fault
```

### 6.2 Message Schema

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

### 6.3 Ingestion Path

```
MQTT Broker
  → Supabase Edge Function (subscriber)
    → Validates message against schema
    → Writes to mqtt_messages table
    → Triggers downstream processing (update unit status, log quality event)
```

### 6.4 Simulation Mode — Virtual Device

Before a real MQTT broker exists, the auto-run engine in Run Mode generates events using the **exact same JSON schema**. When the broker is introduced in M6, the only change is the transport — the data shape is already correct.

A "virtual device" module publishes fake MQTT messages at configurable intervals:
- `cycle_complete` — unit finishes a workstation step
- `measurement` — a sensor reading (temperature, torque, etc.)
- `fault` — a machine error triggers a quality event

---

## 7. Milestones

| # | Milestone | Deliverable | Key Details |
|---|-----------|-------------|-------------|
| **M1** | Project scaffold | Next.js app, Supabase project, auth, dark theme shell | Tailwind config, Zustand stores, Supabase client, sidebar + top bar + ticker layout, login/signup |
| **M2** | Build Mode | CRUD for lines, workstations, machines | Supabase tables + RLS policies, Realtime subscriptions, form-based UI |
| **M3** | Configure Mode | Part numbers, BOM, routes, serial algorithms | Route step designer, serial algorithm config, BOM assembly UI |
| **M4** | Run Mode | Unit generation, WIP movement, quality gates | Auto-run engine, yield injection, Realtime-powered live ticker |
| **M5** | Monitor Mode | Dashboard with live charts | WIP tracker, throughput line chart, yield bar chart, unit search |
| **M6** | MQTT Interface | Broker setup, message schema, device gateway | Mosquitto/HiveMQ Cloud, Edge Function bridge, virtual device module |

---

## 8. Design System

### 8.1 Brand DNA — MESkit Identity

MESkit has a dark industrial aesthetic — high-tech, data-dense, purpose-built for manufacturing.

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#000000` / `#111111` | App background, page canvas |
| Surface | `#1A1A1A` | Cards, panels, modals |
| Border | `#2A2A2A` | Dividers, card edges |
| Accent (primary) | `#06B6D4` (Cyan 500) | Primary actions, links, active states |
| Accent (hover) | `#0891B2` (Cyan 600) | Hover states for primary actions |
| Text primary | `#FFFFFF` | Headings, body text |
| Text secondary | `#999999` | Labels, hints, disabled text |
| Success | `#22C55E` | Pass results, healthy status |
| Warning | `#F59E0B` | Yield warnings, attention states |
| Error | `#EF4444` | Fail results, faults, scrap |
| Font | `Roboto`, sans-serif | All text |

The cyan accent replaces the previous proprietary red, giving MESkit a tech-forward open-source identity while maintaining the industrial feel.

### 8.2 UI Structure

```
┌──────────────────────────────────────────────────────────┐
│  MESkit  [▶ Start] [⏸ Pause] [⏩ Auto]    user@email ▾  │
├────────┬─────────────────────────────────────────────────┤
│        │                                                 │
│  Mode  │            Main Content Area                    │
│  ------│                                                 │
│  Build │   (changes based on selected mode)              │
│  Config│                                                 │
│  Run   │                                                 │
│  Monitor│                                                │
│        │                                                 │
├────────┴─────────────────────────────────────────────────┤
│  Live Ticker  [unit SMX-00042 moved to Station 3]        │
└──────────────────────────────────────────────────────────┘
```

- **Sidebar**: Mode switcher (Build / Configure / Run / Monitor)
- **Top bar**: MESkit branding, simulation controls (Start, Pause, Auto-run toggle), user menu
- **Main area**: Context-dependent content per selected mode
- **Bottom bar**: Live event ticker — Supabase Realtime subscription renders a scrolling log

---

## 9. Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Frontend framework | Next.js (App Router) | React ecosystem, SSR-capable, Vercel deploy |
| Styling | Tailwind CSS | Utility-first, matches dark industrial aesthetic |
| Client state | Zustand | Lightweight, no boilerplate — UI state only |
| Backend | Supabase | Postgres + Auth + Realtime + Edge Functions in one platform |
| Charts | Recharts | React-native charting, covers bar/line/area charts |
| Auth | Supabase Auth | Built-in, supports email + OAuth, ties into RLS |
| Real-time | Supabase Realtime | Postgres changes broadcast to subscribed clients |
| MQTT broker (M6) | Mosquitto or HiveMQ Cloud | Industry standard, lightweight, free tier available |
| Deployment | Vercel (frontend) + Supabase Cloud (backend) | Zero-config for Next.js, managed Postgres |

---

## 10. ISA-95 Alignment

MESkit's data model maps to the ISA-95 hierarchy:

| ISA-95 Level | MESkit Concept | Tables |
|--------------|----------------|--------|
| **Level 0–2**: Physical equipment | Shop floor assets | `lines`, `workstations`, `machines` |
| **Level 3**: Product definition | What to build and how | `part_numbers`, `items`, `bom_entries` |
| **Level 3**: Process definition | How units flow through production | `routes`, `route_steps` |
| **Level 3**: Production execution | Tracking units through manufacturing | `units`, `unit_history` |
| **Level 3**: Quality operations | Inspections, defects, scrap | `quality_events`, `defect_codes` |
| **Level 1–2** (future): Device integration | Sensor data from the floor | `mqtt_messages` |

This alignment means MESkit speaks the same language as enterprise MES systems, making it useful for learning and as a foundation for real deployments.
