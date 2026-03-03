# MESkit

Open-source Manufacturing Execution System toolkit. Simulation-first, MQTT-ready.

**[meskit.cloud](https://meskit.cloud)**

---

## What is MESkit?

MESkit is a lightweight MES built on the ISA-95 standard. It lets you define a virtual factory — lines, workstations, machines — configure materials and routes, then run production simulations with real-time visibility.

The data model supports all three ISA-95 production types (discrete, batch, continuous) through a unified **material lot** abstraction. The architecture is designed so that simulated sensor events use the same schema as real MQTT messages, making the jump from simulation to physical hardware a configuration change, not a rewrite.

All data persists in Supabase (Postgres).

## Who is it for?

- **Manufacturing engineers** learning MES concepts without enterprise software — discrete, batch, or process
- **Small shops** that need a real MES without the price tag
- **Developers** building manufacturing apps who want a reference stack

## Core Loop

```
Define material → Build route → Move lots → Collect data → Visualize
```

Four modes drive the UI:

| Mode | What you do |
|------|-------------|
| **Build** | Create lines, workstations, machines |
| **Configure** | Define material definitions, BOMs, routes, identifier algorithms |
| **Run** | Generate material lots, move them through production, inject quality events |
| **Monitor** | Live WIP counts, throughput charts, yield summaries, lot lookup |

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js (App Router), Tailwind CSS, Zustand, Recharts |
| Backend | Supabase (Postgres, Auth, Realtime, Edge Functions) |
| Device (future) | MQTT broker (Mosquitto / HiveMQ Cloud) |

## Data Model

ISA-95 aligned Postgres tables:

```
Physical    lines → workstations → machines
Material    material_definitions → material_components → bom_entries
Process     routes → route_steps (operations segments)
Production  material_lots → lot_history
Quality     quality_events, defect_codes
Ingestion   mqtt_messages (future)
```

Supports all three ISA-95 production types through `material_lots.tracking_type`:

| Type | Tracking | Example |
|------|----------|---------|
| Discrete | Serialized, qty = 1 | `SMX-00042` |
| Batch | Lot number, qty + UOM | `LOT-2026-0301` (500 kg) |
| Continuous | Campaign segment | `CAM-0301-08H` (8 hr) |

## MQTT-Ready

The interface contract is defined now, implemented later:

- **Topics**: `meskit/{line_id}/{workstation_id}/{event_type}`
- **Messages**: `{ timestamp, machine_id, event_type, payload }`
- **Bridge**: Supabase Edge Function subscribes to the broker, validates, writes to Postgres
- **Simulation mode**: A virtual device publishes fake messages using the same schema

## Roadmap

| Milestone | Scope |
|-----------|-------|
| M1 | Project scaffold, Supabase setup, auth, dark theme shell |
| M2 | Build Mode — CRUD for lines, workstations, machines |
| M3 | Configure Mode — Material definitions, BOM, routes, identifier algorithms |
| M4 | Run Mode — Lot generation, WIP movement, quality gates |
| M5 | Monitor Mode — Dashboard with live Supabase Realtime data |
| M6 | MQTT interface — Broker, message schema, device gateway |

## Getting Started

> Coming soon — M1 is in progress.

```bash
git clone https://github.com/your-username/meskit.git
cd meskit
npm install
# Set up your Supabase project and add credentials to .env.local
npm run dev
```

## Docs

- [Full PRD](docs/MESKIT_PRD.md) — Architecture, data model, milestones, MQTT spec

## License

MIT
