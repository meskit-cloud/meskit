# MESkit Roadmap

> Status: Pre-M1 — architecture and PRD finalized, implementation not started.

---

## M1 — Project Scaffold

Foundation: app shell, auth, database schema, dark theme.

- [ ] Initialize Next.js (App Router) project with TypeScript
- [ ] Configure Tailwind CSS with MESkit design tokens (dark theme, cyan accent)
- [ ] Set up Supabase project (Postgres, Auth, Realtime)
- [ ] Create Supabase client and environment config (`.env.local`)
- [ ] Create all database tables with ISA-95 schema
  - [ ] Physical model: `lines`, `workstations`, `machines`
  - [ ] Material model: `material_definitions`, `material_components`, `bom_entries`
  - [ ] Process model: `routes`, `route_steps`
  - [ ] Production model: `material_lots`, `lot_history`
  - [ ] Quality model: `quality_events`, `defect_codes`
  - [ ] Config: `identifier_algorithms`
  - [ ] Future: `mqtt_messages` (table created, unused until M6)
- [ ] Set up Row Level Security (RLS) policies
- [ ] Implement auth flow (login, signup, logout) with Supabase Auth
- [ ] Build app shell layout
  - [ ] Sidebar — mode switcher (Build / Configure / Run / Monitor)
  - [ ] Top bar — MESkit branding, simulation controls placeholder, user menu
  - [ ] Bottom bar — live ticker placeholder
- [ ] Set up Zustand stores for UI state (active mode, panel state)
- [ ] Deploy to Vercel (frontend) + Supabase Cloud (backend)

**Done when**: A logged-in user sees the dark-themed shell with sidebar navigation and empty content areas. All Supabase tables exist with RLS enabled.

---

## M2 — Build Mode

Shop floor setup: lines, workstations, machines.

- [ ] Build Mode page with three-panel layout (lines list, workstation list, machine detail)
- [ ] Lines CRUD — create, rename, delete manufacturing lines
- [ ] Workstations CRUD — add/reorder/remove workstations within a line, assign operator names
- [ ] Machines CRUD — register machines with name, type, status (idle/running/down), attach to workstation
- [ ] Supabase Realtime subscriptions — UI updates live across browser tabs
- [ ] Empty state guidance — prompt user to create their first line
- [ ] Form validation and error handling

**Done when**: A user can build a complete shop floor (line with ordered workstations and attached machines) and see changes reflected instantly in another tab.

---

## M3 — Configure Mode

Product and process definition: materials, BOMs, routes, identifiers.

- [ ] Material Definitions CRUD — name, description, production type (defaults to discrete), UOM
- [ ] Material Components CRUD — define components that go into a BOM
- [ ] BOM assembly UI — add components to a material definition with quantities and UOM
- [ ] Identifier Algorithm config — prefix, padding, algorithm type (serial/lot/campaign)
- [ ] Route designer — create a route for a material definition
- [ ] Operations segment editor — add/reorder route steps, assign workstations, toggle pass/fail gates, set expected duration
- [ ] Validation: route steps must reference workstations that exist in Build Mode

**Done when**: A user can define a material (e.g., "Smartphone X"), attach a BOM, configure a serial number algorithm, and design a multi-step route through their shop floor.

---

## M4 — Run Mode

Production execution: lot generation, WIP movement, quality gates.

- [ ] Lot generation — create N material lots for a material definition; identifiers auto-assigned via the algorithm
- [ ] Manual WIP movement — user clicks "Move" to advance a lot to the next route step
- [ ] Auto-run engine — lots auto-advance at a configurable interval (simulated cycle time)
- [ ] Quality gate logic — at pass/fail steps, randomly inject outcomes based on configurable yield rate (default 95%)
- [ ] Scrap handling — failed lots marked as scrapped, removed from route progression
- [ ] `lot_history` recording — every move and quality event written to Supabase
- [ ] Live ticker — Supabase Realtime subscription renders scrolling event log (lot created, lot moved, defect recorded)
- [ ] Simulation controls in top bar — Start, Pause, Auto-run toggle with speed config

**Done when**: A user can start a production run, watch lots flow through workstations (manually or auto), see quality events fire, and follow everything in the live ticker.

---

## M5 — Monitor Mode

Dashboard: live charts and lot traceability.

- [ ] WIP tracker — real-time count of lots at each workstation (Supabase Realtime)
- [ ] Throughput chart — lots completed over time (Recharts line chart)
- [ ] Yield summary — pass/fail ratio per workstation (Recharts bar chart)
- [ ] Lot lookup — search by identifier, view full route history from `lot_history`
- [ ] Auto-refresh — all charts update as new data flows in from Run Mode

**Done when**: A user running a simulation in one tab can open Monitor Mode in another and see live WIP, throughput, yield, and drill into any lot's history.

---

## M6 — MQTT Interface

Device layer: broker, message schema, gateway edge function.

- [ ] Set up MQTT broker (Mosquitto local or HiveMQ Cloud)
- [ ] Implement Supabase Edge Function as MQTT → Postgres bridge
  - [ ] Subscribe to `meskit/{line_id}/{workstation_id}/{event_type}` topics
  - [ ] Validate incoming messages against schema
  - [ ] Write to `mqtt_messages` table
  - [ ] Trigger downstream processing (update lot status, create quality events)
- [ ] Virtual device module — publishes simulated MQTT messages using the production schema
  - [ ] `cycle_complete` events
  - [ ] `measurement` events (temperature, torque, etc.)
  - [ ] `fault` events
- [ ] MQTT message viewer in Monitor Mode — raw message log from `mqtt_messages` table
- [ ] Toggle between simulation engine (M4) and MQTT-driven execution

**Done when**: The virtual device publishes MQTT messages that flow through the broker, get ingested by the Edge Function, and show up as lot movements and quality events in the UI — same result as the M4 simulation engine, different transport.

---

## Future — Beyond MVP

Not scoped, not scheduled. Ideas for after M6 is solid.

| Feature | Notes |
|---------|-------|
| Batch manufacturing UI | Schema is ready (`tracking_type: batch`); needs quantity-aware UX for lot splitting, yield loss, recipe phases |
| Continuous manufacturing UI | Schema is ready (`tracking_type: continuous`); needs time-window tracking, campaign management |
| OEE dashboard | Requires downtime model and ideal cycle time per operations segment |
| Time control (2x, 5x, 10x) | Layer on top of auto-run engine |
| Multi-level BOM | Recursive BOM with sub-assemblies |
| Supplier traceability | Incoming material lots linked to vendor, PO, certificate of analysis |
| Work Instructions viewer | Attach documents/images to route steps |
| Shift management | Operator schedules, workstation assignments by shift |
| Global Command-K search | Search lots, machines, material definitions from anywhere |
| Mobile operator view | Responsive UI for tablet-based shop floor interaction |
