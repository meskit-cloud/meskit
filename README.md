# MESkit

Open-source, AI-native Manufacturing Execution System toolkit. Simulation-first, agent-powered, MQTT-ready.

**[meskit.cloud](https://meskit.cloud)**

---

## What is MESkit?

MESkit is a lightweight MES built on the ISA-95 standard. It lets you define a virtual factory — lines, workstations, machines — configure products and routes, then run production simulations with real-time visibility.

What makes it AI-native: every MES operation flows through a **tool layer** that both the UI and AI agents consume. An operator can click a button to move a unit, or type "move SMX-00042 to the next station" in the chat panel — same tool, same result. AI agents aren't bolted on; they're peers to human operators.

All data persists in Supabase (Postgres). Updates push to all clients via Realtime subscriptions.

## Who is it for?

- **Manufacturing engineers** learning MES concepts without enterprise software
- **Small shops** that need a real MES without the price tag
- **Developers** building manufacturing apps who want a reference stack
- **Teams exploring AI in manufacturing** who want agents with real MES tools, not chatbot demos

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
AI Agents (Claude)  →  Tool Layer (Server Actions)  →  Supabase (Postgres)
```

| Layer | Tech |
|-------|------|
| Frontend | Next.js (App Router), Tailwind CSS, Zustand, Recharts |
| Tool Layer | Next.js Server Actions, Zod validation |
| Agent Runtime | Claude API (tool-use), `@anthropic-ai/sdk` |
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

| Milestone | Scope |
|-----------|-------|
| M1 | Project scaffold, Supabase setup, auth, dark theme shell, tool layer, chat panel |
| M2 | Build Mode + Operator Assistant — CRUD via UI and chat |
| M3 | Configure Mode — Part numbers, BOM, routes via UI and chat |
| M4 | Run Mode + Quality Analyst — Production execution with proactive quality monitoring |
| M5 | Monitor Mode + Planner — Dashboard with AI insights and production planning |
| M6 | MQTT interface + Anomaly Monitor — Broker, device gateway, sensor anomaly detection |

## Getting Started

> Coming soon — M1 is in progress.

```bash
git clone https://github.com/your-username/meskit.git
cd meskit
npm install
# Set up your Supabase project and add credentials to .env.local
# Add your Anthropic API key to .env.local
npm run dev
```

## Docs

- [Full PRD](MESKIT_PRD.md) — Architecture, data model, tool layer, agents, milestones
- [Roadmap](ROADMAP.md) — Detailed milestone checklists

## License

MIT
