# MESkit Roadmap

> Status: Pre-M1 — architecture and PRD finalized, implementation not started.

---

## M1 — Project Scaffold + Tool Layer

Foundation: app shell, auth, database schema, dark theme, tool layer architecture, chat panel.

### App & Infrastructure
- [ ] Initialize Next.js (App Router) project with TypeScript
- [ ] Configure Tailwind CSS with MESkit design tokens (dark theme, cyan accent, agent violet)
- [ ] Set up Supabase project (Postgres, Auth, Realtime)
- [ ] Create Supabase client and environment config (`.env.local`)
- [ ] Deploy to Vercel (frontend) + Supabase Cloud (backend)

### Database Schema
- [ ] Create all database tables with ISA-95 schema
  - [ ] Physical model: `lines`, `workstations`, `machines`
  - [ ] Product model: `part_numbers`, `items`, `bom_entries`
  - [ ] Process model: `routes`, `route_steps`
  - [ ] Production model: `units`, `unit_history`
  - [ ] Quality model: `quality_events`, `defect_codes`
  - [ ] Config: `serial_algorithms`
  - [ ] Agent: `agent_conversations`
  - [ ] Future: `mqtt_messages` (table created, unused until M6)
- [ ] Set up Row Level Security (RLS) policies

### Auth
- [ ] Implement auth flow (login, signup, logout) with Supabase Auth

### Tool Layer
- [ ] Set up tool layer architecture (`lib/tools/`)
- [ ] Define Zod schemas for all tool inputs
- [ ] Implement tool registration pattern (shared between Server Actions and agent runtime)
- [ ] Create initial tool stubs for all categories (shop floor, product, production, quality, analytics)

### UI Shell
- [ ] Build app shell layout
  - [ ] Sidebar — mode switcher (Build / Configure / Run / Monitor)
  - [ ] Top bar — MESkit branding, simulation controls placeholder, user menu
  - [ ] Chat panel — collapsible right panel with message input, agent selector
  - [ ] Bottom bar — live ticker placeholder
- [ ] Set up Zustand stores for UI state (active mode, panel state, chat state)

### Agent Runtime
- [ ] Install `@anthropic-ai/sdk`
- [ ] Create agent runtime scaffold (`lib/agents/`)
- [ ] Define agent system prompts and tool registrations
- [ ] Implement streaming chat API route (`app/api/chat/route.ts`)
- [ ] Wire chat panel to agent runtime with streaming responses

**Done when**: A logged-in user sees the dark-themed shell with sidebar navigation, a functional chat panel that connects to Claude, and empty content areas. All Supabase tables exist with RLS enabled. The tool layer architecture is in place with stubs.

---

## M2 — Build Mode + Operator Assistant

Shop floor setup: lines, workstations, machines. First agent goes live.

### Tools
- [ ] Implement shop floor tools: `list_lines`, `create_line`, `update_line`, `delete_line`
- [ ] Implement workstation tools: `list_workstations`, `create_workstation`, `update_workstation`, `delete_workstation`
- [ ] Implement machine tools: `list_machines`, `create_machine`, `update_machine_status`
- [ ] Register all shop floor tools in agent runtime

### UI
- [ ] Build Mode page with three-panel layout (lines list, workstation list, machine detail)
- [ ] Lines CRUD — UI calling tool layer (not Supabase directly)
- [ ] Workstations CRUD — add/reorder/remove workstations within a line, assign operator names
- [ ] Machines CRUD — register machines with name, type, status (idle/running/down), attach to workstation
- [ ] Supabase Realtime subscriptions — UI updates live across browser tabs
- [ ] Empty state guidance — prompt user to create their first line

### Agent
- [ ] Operator Assistant fully functional for Build Mode operations
- [ ] Context injection: agent knows current mode and selected line/workstation
- [ ] Agent actions appear in the live ticker alongside UI actions
- [ ] Test: user can build entire shop floor via chat ("Create a line called Assembly", "Add 3 workstations")

**Done when**: A user can build a complete shop floor (line with ordered workstations and attached machines) using either the UI or the chat panel, and see changes reflected instantly in another tab.

---

## M3 — Configure Mode

Product and process definition: part numbers, BOMs, routes, serial algorithms.

### Tools
- [ ] Implement product tools: `list_part_numbers`, `create_part_number`, `get_bom`, `set_bom_entry`
- [ ] Implement item tools: `list_items`, `create_item`
- [ ] Implement route tools: `list_routes`, `create_route`, `update_route`
- [ ] Implement serial algorithm tools: `configure_serial_algorithm`
- [ ] Register all product/process tools in agent runtime

### UI
- [ ] Part Numbers CRUD — name, description
- [ ] Items & BOM assembly UI — add components to a part number with quantities
- [ ] Serial Algorithm config — prefix, padding per part number (e.g., `SMX-00001`)
- [ ] Route designer — create a route for a part number
- [ ] Route step editor — add/reorder steps, assign workstations, toggle pass/fail gates
- [ ] Validation: route steps must reference workstations that exist in Build Mode

### Agent
- [ ] Operator Assistant handles all Configure Mode operations via chat
- [ ] Context injection: agent sees current part number and route being edited
- [ ] Test: user can define a complete product via chat ("Create part number Smartphone X", "Add route with 5 steps through my assembly line")

**Done when**: A user can define a product (e.g., "Smartphone X"), attach a BOM, configure a serial number algorithm, and design a multi-step route — through the UI or chat.

---

## M4 — Run Mode + Quality Analyst

Production execution: unit generation, WIP movement, quality gates. Quality monitoring agent goes live.

### Tools
- [ ] Implement production tools: `generate_units`, `move_unit`, `scrap_unit`, `get_wip_status`, `search_units`
- [ ] Implement quality tools: `create_quality_event`, `list_defect_codes`, `create_defect_code`
- [ ] Register all production and quality tools in agent runtime

### Production Engine
- [ ] Unit generation — create N units for a part number; serials auto-assigned via algorithm
- [ ] Manual WIP movement — user clicks "Move" or tells assistant "move SMX-00042"
- [ ] Auto-run engine — units auto-advance at configurable interval (simulated cycle time)
- [ ] Quality gate logic — at pass/fail steps, inject outcomes based on configurable yield rate (default 95%)
- [ ] Scrap handling — failed units marked as scrapped, removed from route progression
- [ ] `unit_history` recording — every move and quality event written via tool layer
- [ ] Live ticker — Supabase Realtime subscription renders scrolling event log
- [ ] Simulation controls in top bar — Start, Pause, Auto-run toggle with speed config

### Quality Analyst Agent
- [ ] Implement event-driven trigger system (Supabase Realtime → agent invocation)
- [ ] Yield threshold monitoring — alert when workstation yield drops below 90%
- [ ] Defect clustering detection — alert when same defect code appears 3+ times in 30 min
- [ ] Natural-language quality alerts displayed in the live ticker and chat panel
- [ ] Configurable alert thresholds

### Agent
- [ ] Operator Assistant handles all Run Mode operations ("generate 100 units of Smartphone X", "scrap SMX-00044")
- [ ] Quality Analyst runs alongside production, surfacing alerts proactively

**Done when**: A user can start a production run, watch units flow through workstations (manually, via chat, or auto), see quality events fire, receive proactive quality alerts from the analyst, and follow everything in the live ticker.

---

## M5 — Monitor Mode + Production Planner

Dashboard: live charts, lot traceability, AI-generated insights, production planning.

### Tools
- [ ] Implement analytics tools: `get_throughput`, `get_yield_report`, `get_unit_history`
- [ ] Register analytics tools in agent runtime

### Dashboard UI
- [ ] WIP tracker — real-time count of units at each workstation (Supabase Realtime)
- [ ] Throughput chart — units completed over time (Recharts line chart)
- [ ] Yield summary — pass/fail ratio per workstation (Recharts bar chart)
- [ ] Unit lookup — search by serial number, view full route history from `unit_history`
- [ ] Quality insights panel — natural-language summaries from Quality Analyst rendered alongside charts
- [ ] Auto-refresh — all charts update as new data flows in from Run Mode

### Production Planner Agent
- [ ] Planner agent with access to analytics + shop floor tools
- [ ] Capacity analysis: estimate completion time based on historical throughput
- [ ] Route comparison: suggest optimal line/route for a production order
- [ ] Chat-based planning: "I need to build 500 units by end of shift"
- [ ] Agent selector in chat panel — switch between Operator Assistant and Planner

**Done when**: A user running a simulation in one tab can open Monitor Mode in another and see live WIP, throughput, yield, AI-generated insights, and drill into any unit's history. The Planner agent can answer capacity and scheduling questions.

---

## M6 — MQTT Interface + Anomaly Monitor

Device layer: broker, message schema, gateway edge function, sensor anomaly detection.

### MQTT Infrastructure
- [ ] Set up MQTT broker (Mosquitto local or HiveMQ Cloud)
- [ ] Implement Supabase Edge Function as MQTT → Postgres bridge
  - [ ] Subscribe to `meskit/{line_id}/{workstation_id}/{event_type}` topics
  - [ ] Validate incoming messages against schema
  - [ ] Write to `mqtt_messages` table
  - [ ] Call tool layer to trigger downstream processing (move_unit, create_quality_event)

### Virtual Device
- [ ] Virtual device module — publishes simulated MQTT messages using the production schema
  - [ ] `cycle_complete` events
  - [ ] `measurement` events (temperature, torque, etc.)
  - [ ] `fault` events
- [ ] Toggle between simulation engine (M4) and MQTT-driven execution

### Anomaly Monitor Agent
- [ ] Anomaly Monitor agent activated by MQTT message ingestion
- [ ] Out-of-range sensor value detection (configurable thresholds)
- [ ] Pattern detection: degradation trends in measurement data
- [ ] Alerts surfaced in chat panel and live ticker
- [ ] MQTT message viewer in Monitor Mode — raw message log from `mqtt_messages` table

**Done when**: The virtual device publishes MQTT messages that flow through the broker, get ingested by the Edge Function, and show up as unit movements and quality events in the UI. The Anomaly Monitor agent flags unusual sensor readings. Same result as the M4 simulation engine, different transport.

---

## Future — Beyond MVP

Not scoped, not scheduled. Ideas for after M6 is solid.

| Feature | Notes |
|---------|-------|
| Multi-agent orchestration | Agents coordinate: Quality Analyst triggers Planner to reschedule when yield drops |
| Agent memory / learning | Agents learn from historical patterns and operator feedback |
| Voice input for operators | Speech-to-text input for the chat panel — hands-free shop floor |
| Batch manufacturing UI | Schema is ready (`tracking_type: batch`); needs quantity-aware UX |
| Continuous manufacturing UI | Schema is ready (`tracking_type: continuous`); needs time-window tracking |
| OEE dashboard | Requires downtime model and ideal cycle time per operations segment |
| Time control (2x, 5x, 10x) | Layer on top of auto-run engine |
| Multi-level BOM | Recursive BOM with sub-assemblies |
| Supplier traceability | Incoming material lots linked to vendor, PO, certificate of analysis |
| Work Instructions viewer | Attach documents/images to route steps |
| Shift management | Operator schedules, workstation assignments by shift |
| Global Command-K search | Search units, machines, part numbers from anywhere |
| Mobile operator view | Responsive UI for tablet-based shop floor interaction |
| Custom agent creation | Users define domain-specific agents with custom system prompts and tool subsets |
