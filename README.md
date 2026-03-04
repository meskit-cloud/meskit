# MESkit

**The AI-Native MES.** An MES, but an Agent-Augmented one.

Open-source, AI-native Manufacturing Execution System toolkit. Simulation-first, agent-powered, MQTT-ready. Agents handle coordination; operators stay in command.

**[meskit.cloud](https://meskit.cloud)**

![MESkit M1 — Build Mode with Operator Assistant](public/assets/1st_ui.png)

---

## What is MESkit?

MESkit is a complete, buildable Manufacturing Execution System built on the ISA-95 standard. It starts with simulation, uses AI agents as first-class operators, and is architecturally ready for real sensor input via MQTT.

MESkit is not an "AI-enhanced" bolt-on or a chatbot demo. Every MES operation — moving a lot, logging a defect, querying yield — flows through a **tool layer** that both the UI and AI agents consume. The same function that powers a button click also powers a natural-language command. Agents are force multipliers for human operators — they remove the coordination bottleneck so one supervisor can manage twice the throughput.

All data persists in Supabase (Postgres). Updates push to all clients via Realtime subscriptions.

### North Star

> Predict a machine failure and coordinate the shop floor response before it happens — agents handle detection, planning, and execution while operators stay in command.

## Who is it for?

- **Manufacturing engineers** learning MES concepts without enterprise software
- **Small shops** that need a real MES without the price tag
- **Developers** building manufacturing apps who want a reference stack
- **Teams exploring AI in manufacturing** who want agents with real MES tools, not chatbot demos

## Current Status: M2 In Progress

M1 (scaffold) is complete. M2 (Build Mode + Operator Assistant) is in progress — shop floor tools and the agent are functional via chat, Build Mode UI is next.

- **Auth** — Signup, login, logout, protected routes with Supabase Auth
- **ISA-95 Schema** — 15 Postgres tables with RLS, enums, indexes, and Realtime publications
- **Tool Layer** — 26 registered tools (8 shop floor fully implemented, 18 stubs for M3-M5)
- **Agent Runtime** — Gemini tool-use loop with streaming, Operator Assistant active
- **UI Shell** — Sidebar (Build/Configure/Run/Monitor), top bar, collapsible chat panel, live ticker
- **End-to-end verified** — "Create a line called Assembly" in chat calls `create_line`, persists to Supabase, confirmed via `list_lines`

## Core Loop

```
Define product → Build route → Move units → Collect data → Visualize
```

Four modes drive the UI, with a chat panel always available:

| Mode | What you do |
|------|-------------|
| **Build** | Create lines, workstations, machines |
| **Configure** | Define part numbers, BOMs, routes, serial algorithms |
| **Run** | Generate units, move them through production, inject quality events |
| **Monitor** | Live WIP counts, throughput charts, yield summaries, unit lookup |

## AI Agents

MESkit's agents are designed around three complementary layers that, together, deliver the North Star:

| Layer | Role | Agent | Available |
|-------|------|-------|-----------|
| **Executor** | Acts on decisions through the tool layer — updates schedules, notifies operators | Agent Runtime | M1 |
| **Strategist** | Evaluates constraints (backlog, deadlines, capacity), computes alternative schedules | Production Planner | M5 |
| **Sentinel** | Monitors sensor telemetry, detects degradation, outputs failure probability scores | Anomaly Monitor | M6 |

Three specialized agents ship with MESkit:

| Agent | Trigger | Role |
|-------|---------|------|
| **Operator Assistant** | Chat (always available) | Conversational co-pilot — query WIP, move units, log defects via natural language |
| **Quality Analyst** | Event-driven | Monitors yield, detects defect clusters, surfaces proactive alerts |
| **Production Planner** | Chat (on demand) | Capacity analysis, scheduling, route optimization |

Agents call the same tool layer as the UI. No special APIs, no separate data paths.

## Architecture

```
Frontend (Next.js)  →  Tool Layer (Server Actions)  →  Supabase (Postgres)
AI Agents (Gemini)  →  Tool Layer (Server Actions)  →  Supabase (Postgres)
```

| Layer | Tech |
|-------|------|
| Frontend | Next.js (App Router), Tailwind CSS, Zustand, Recharts |
| Tool Layer | Next.js Server Actions, Zod validation |
| Agent Runtime | Gemini API (tool-use), `@google/generative-ai` |
| Backend | Supabase (Postgres, Auth, Realtime, Edge Functions) |
| Device (future) | MQTT broker (Mosquitto / HiveMQ Cloud) |

## Data Model

ISA-95 aligned Postgres tables:

```
Physical    lines → workstations → machines
Product     part_numbers → items → bom_entries
Process     routes → route_steps
Production  units → unit_history
Quality     quality_events, defect_codes
Config      serial_algorithms
Agent       agent_conversations
Ingestion   mqtt_messages (future)
```

## MQTT-Ready

The interface contract is defined now, implemented in M6:

- **Topics**: `meskit/{line_id}/{workstation_id}/{event_type}`
- **Messages**: `{ timestamp, machine_id, event_type, payload }`
- **Bridge**: Supabase Edge Function subscribes to the broker, validates, writes to Postgres
- **Simulation mode**: A virtual device publishes fake messages using the same schema

## Roadmap

| Milestone | Scope | Status |
|-----------|-------|--------|
| **M1** | Project scaffold, Supabase schema, auth, tool layer, agent runtime, UI shell | Done |
| **M2** | Build Mode + Operator Assistant — CRUD via UI and chat | In progress |
| M3 | Configure Mode — Part numbers, BOM, routes via UI and chat | |
| M4 | Run Mode + Quality Analyst — Production execution with proactive quality monitoring | |
| M5 | Monitor Mode + Planner — Dashboard with AI insights and production planning | |
| M6 | MQTT interface + Anomaly Monitor — Broker, device gateway, sensor anomaly detection | |

## What MESkit Is NOT

MESkit is not a learning exercise or a demo wrapper around a vendor API. It is a standalone product with its own persistence layer, authentication, real-time infrastructure, and agent runtime. No proprietary API dependencies — MESkit follows the ISA-95 standard data model.

## Getting Started

```bash
git clone https://github.com/meskit-cloud/meskit.git
cd meskit
npm install
```

Copy the environment template and fill in your credentials:

```bash
cp .env.local.example .env.local
```

You'll need:

- A [Supabase](https://supabase.com) project — run `supabase/migrations/001_isa95_schema.sql` in the SQL editor
- A [Gemini API key](https://ai.google.dev) — for the agent chat

```bash
npm run dev
```

Open [localhost:3000](http://localhost:3000), sign up, and start talking to the Operator Assistant.

## Docs

- [Full PRD](MESKIT_PRD.md) — Architecture, data model, tool layer, agents, milestones
- [Roadmap](ROADMAP.md) — Detailed milestone checklists

## License

MIT
