# MESkit Roadmap

> Status: M3 complete — M1 scaffold, M2 Build Mode, and M3 Configure Mode all done. M4 — Run Mode + Production Simulator + Quality Monitor next.

## Related Docs

- [Documentation Map](docs/DOCUMENTATION_MAP.md) — overview of the core doc system
- [README](README.md) — public-facing summary of current product state
- [Product Principles](PRODUCT_PRINCIPLES.md) — what should constrain roadmap decisions
- [PRD](MESKIT_PRD.md) — product strategy and scope this roadmap executes
- [Licensing and Growth Strategy](LICENSING_AND_GROWTH_STRATEGY.md) — post-v1 business and PLG direction
- [Target Audience](docs/GTM_Target_Audience.md) — GTM focus for post-v1 execution
- [Manufacturing Software Stack](docs/MANUFACTURING_SOFTWARE_STACK.md) — integration priorities referenced in future roadmap sections

---

## M1 — Project Scaffold + Tool Layer

Foundation: app shell, auth, database schema, dark theme, tool layer architecture, chat panel.

### App & Infrastructure

- [x] Initialize Next.js (App Router) project with TypeScript
- [x] Configure Tailwind CSS with MESkit design tokens (dark theme, cyan accent, smart feature violet)
- [x] Set up Supabase project (Postgres, Auth, Realtime)
- [x] Create Supabase client and environment config (`.env.local`)
- [ ] Deploy to Vercel (frontend) + Supabase Cloud (backend)

### Database Schema

- [x] Create all database tables with ISA-95 schema
  - [x] Physical model: `lines`, `workstations`, `machines`
  - [x] Product model: `part_numbers`, `items`, `bom_entries`
  - [x] Process model: `routes`, `route_steps`
  - [x] Production model: `units`, `unit_history`
  - [x] Quality model: `quality_events`, `defect_codes`
  - [x] Config: `serial_algorithms`
  - [x] Chat: `agent_conversations`
  - [x] Future: `mqtt_messages` (table created, unused until M6)
- [x] Set up Row Level Security (RLS) policies

### Auth

- [x] Implement auth flow (login, signup, logout) with Supabase Auth

### Tool Layer

- [x] Set up tool layer architecture (`lib/tools/`)
- [x] Define Zod schemas for all tool inputs
- [x] Implement tool registration pattern (shared between Server Actions and intelligence layer)
- [x] Create initial tool stubs for all categories (shop floor, product, production, quality, analytics)

### UI Shell

- [x] Build app shell layout
  - [x] Sidebar — mode switcher (Build / Configure / Run / Monitor)
  - [x] Top bar — MESkit branding, simulation controls placeholder, user menu
  - [x] Chat panel — collapsible right panel with message input, topic selector
  - [x] Bottom bar — live ticker placeholder
- [x] Set up Zustand stores for UI state (active mode, panel state, chat state)

### Intelligence Layer

- [x] Install `@google/generative-ai` (Gemini 2.0 Flash)
- [x] Create intelligence layer scaffold (`lib/agents/`)
- [x] Define system prompts and tool registrations
- [x] Implement streaming chat API route (`app/api/chat/route.ts`)
- [x] Wire chat panel to intelligence layer with streaming responses

**Done when**: A logged-in user sees the dark-themed shell with sidebar navigation, a functional chat panel that connects to the intelligence layer, and empty content areas. All Supabase tables exist with RLS enabled. The tool layer architecture is in place with stubs.

---

## M2 — Build Mode + Ask MESkit

Shop floor setup: lines, workstations, machines. Natural language interface goes live.

### Tools

- [x] Implement shop floor tools: `list_lines`, `create_line`, `update_line`, `delete_line`
- [x] Implement workstation tools: `list_workstations`, `create_workstation`
- [x] Implement remaining workstation tools: `update_workstation`, `delete_workstation`
- [x] Implement machine tools: `list_machines`, `update_machine_status`
- [x] Implement remaining machine tool: `create_machine`
- [x] Register all shop floor tools in intelligence layer

### UI

- [x] Build Mode page with three-panel layout (lines list, workstation list, machine detail)
- [x] Lines CRUD — UI calling tool layer (not Supabase directly)
- [x] Workstations CRUD — add/reorder/remove workstations within a line, assign operator names
- [x] Machines CRUD — register machines with name, type, status (idle/running/down), attach to workstation
- [x] Supabase Realtime subscriptions — UI updates live across browser tabs
- [x] Empty state guidance — prompt user to create their first line

### Ask MESkit (Natural Language)

- [x] Ask MESkit fully functional for Build Mode operations
- [x] Context injection: MESkit knows current mode and selected line/workstation
- [x] MESkit actions appear in the live ticker alongside UI actions
- [x] Test: user can build entire shop floor via chat ("Create a line called Assembly", "Add 3 workstations")

**Done when**: A user can build a complete shop floor (line with ordered workstations and attached machines) using either the UI or the chat panel, and see changes reflected instantly in another tab.

---

## M3 — Configure Mode

Product and process definition: part numbers, BOMs, routes, serial algorithms.

### Tools

- [x] Implement product tools: `list_part_numbers`, `create_part_number`, `update_part_number`, `delete_part_number`, `get_bom`, `set_bom_entry`, `delete_bom_entry`
- [x] Implement item tools: `list_items`, `create_item`
- [x] Implement route tools: `list_routes`, `create_route`, `update_route`, `delete_route`
- [x] Implement serial algorithm tools: `configure_serial_algorithm`, `get_serial_algorithm`
- [x] Register all product/process tools in agent runtime

### UI
- [x] Part Numbers CRUD — name, description
- [x] Items & BOM assembly UI — add components to a part number with quantities
- [x] Serial Algorithm config — prefix, padding per part number (e.g., `SMX-00001`)
- [x] Route designer — create a route for a part number
- [x] Route step editor — add/reorder steps, assign workstations, toggle pass/fail gates
- [x] Validation: route steps must reference workstations that exist in Build Mode
- [x] Supabase Realtime subscriptions — live cross-tab updates for all Configure Mode entities

### Agent
- [x] Operator Assistant handles all Configure Mode operations via chat
- [x] Context injection: agent sees current part number and route being edited
- [x] Test: user can define a complete product via chat ("Create part number Smartphone X", "Add route with 5 steps through my assembly line")


**Done** ✓ (2026-03-07): A user can define a product (e.g., "Smartphone X"), attach a BOM, configure a serial number algorithm, and design a multi-step route — through the UI or chat. Full test suite passed; 3 bugs found and fixed during testing.

---

## M4 — Run Mode + Production Simulator + Quality Monitor

Production execution: unit generation, WIP movement, quality gates. Built-in simulator replaces traditional auto-run. Quality monitoring goes live. See [`docs/simulator.md`](docs/simulator.md) for the full Production Simulator design.

**M4 core MVP deliverable**: Run Mode + Production Simulator + Quality Monitor. The simulator is part of MVP, not optional polish. PackML, REST API, onboarding, demo retention, and user docs can land in parallel, but they do not block the core simulator-enabled Run Mode sign-off.

### Tools

- [ ] Implement production tools: `generate_units`, `move_unit`, `scrap_unit`, `get_wip_status`, `search_units`
- [ ] Implement quality tools: `create_quality_event`, `list_defect_codes`, `create_defect_code`
- [ ] Implement monitor analytics helpers: `get_throughput`, `get_yield_report`, `get_unit_history` — required by Quality Monitor in M4 and reused by Monitor Mode in M5
- [ ] Register all production and quality tools in intelligence layer
- [ ] Create `production_orders` table (ISA-95 F1) — migration with order_number, part_number_id, quantity_ordered, quantity_completed, status enum (new/scheduled/running/complete/closed)
- [ ] Implement production order tools: `create_production_order`, `update_order_status`, `list_production_orders` (ISA-95 F1)
- [ ] Add `ideal_cycle_time_seconds` column to `route_steps` (ISA-95 F3) — migration
- [ ] Create `quality_test_definitions` table (ISA-95 F4) — test_name, part_number_id, route_step_id, property, unit_of_measure, lower_limit, upper_limit, measurement_method
- [ ] Implement quality test tools: `create_test_definition`, `list_test_definitions`, `record_test_result` (ISA-95 F4)
- [ ] Add route versioning — `version` column on `routes`, new version on structural changes (ISA-95 F10)

### Production Simulator (replaces auto-run engine)

The Production Simulator role-plays as a factory — generating units, moving WIP, introducing realistic failures, and toggling machine statuses through the same tool layer that humans use. No separate simulation engine needed. It is the core MVP activation path for first-run and demo use.

**Isolation rule**: The Simulator is a pure consumer of the MES — it lives in `lib/simulator/` and `app/api/simulation/`, uses only public tool APIs, and introduces no simulation-specific columns or conditionals in MES core code. Deleting all Simulator files must leave the MES fully functional. See [`docs/simulator.md` §8](docs/simulator.md) for full isolation rules.

- [ ] Production Simulator config, system prompt, and tool subset (`lib/agents/simulator.ts`)
- [ ] Simulation API routes (`/api/simulation/start`, `/pause`, `/reset`)
- [ ] Simulation tick execution — server-side `/api/simulation/tick` invoked by a client-held clock in MVP, with configurable tick interval
- [ ] Capacity-aware WIP movement — respects workstation capacity, won't pile units
- [ ] Contextual quality decisions — base yield ~95%, degrades over time, clusters defects realistically
- [ ] Machine lifecycle — toggles machine statuses (running → fault → repair → idle)
- [ ] Zustand `simulationStore` for simulation state (running, paused, speed)
- [ ] Simulation controls in top bar — Start (`▶`), Pause (`⏸`), Speed selector (1x/2x/5x/10x), Reset (`↺`)
- [ ] Simulator creates production orders before generating units (ISA-95 F1) — order-driven simulation
- [ ] Simulator uses PackML 7-state model for machine lifecycle (ISA-95/ISA-88 F2): STOPPED → IDLE → EXECUTE → HELD/SUSPENDED → COMPLETE/ABORTED
- [ ] Simulator paces unit movement using `ideal_cycle_time_seconds` from route steps (ISA-95 F3)
- [ ] Simulator generates realistic quality test results against test definitions (ISA-95 F4)

### Manual Production (non-simulation)

- [ ] Unit generation — create N units for a part number; serials auto-assigned via algorithm
- [ ] Manual WIP movement — user clicks "Move" or tells assistant "move SMX-00042"
- [ ] Quality gate logic — at pass/fail steps, record outcomes via tool layer
- [ ] Scrap handling — failed units marked as scrapped, removed from route progression
- [ ] `unit_history` recording — every move and quality event written via tool layer
- [ ] Live ticker — Supabase Realtime subscription renders scrolling event log
- [ ] Order-driven unit generation — units linked to a production order, order tracks completion (ISA-95 F1)

### Quality Alerts / Quality Monitor

- [ ] Implement event-driven trigger system (Supabase Realtime → monitor invocation)
- [ ] Yield threshold monitoring — alert when workstation yield drops below 90%
- [ ] Defect clustering detection — alert when same defect code appears 3+ times in 30 min
- [ ] Natural-language quality alerts displayed in the live ticker and chat panel
- [ ] Configurable alert thresholds
- [ ] Reacts to Simulator-generated patterns (defect clusters, yield drops) in real-time
- [ ] Quality Monitor references test definitions when evaluating pass/fail (ISA-95 F4) — alerts include tolerance context

### Machine State Model (ISA-88 PackML aligned)

- [ ] Replace 3-state machine enum (`idle`/`running`/`down`) with 7-state PackML subset (ISA-88 F2)
- [ ] Implement state transition validation — only allowed transitions per PackML state diagram (ISA-88 F2)
- [ ] Update `update_machine_status` tool to enforce valid transitions (ISA-88 F2)
- [ ] Update Build Mode UI to display PackML states with color coding (ISA-88 F2)

### REST API (integration layer 1 of 3)

Auto-generate REST endpoints from the tool registry — every registered tool becomes an endpoint with OpenAPI documentation. Enables `curl`-based testing and machine-to-machine integration.

- [ ] Auto-generate REST endpoints from tool registry (one endpoint per tool)
- [ ] OpenAPI/Swagger spec auto-generated from Zod schemas
- [ ] API key authentication with scoped permissions
- [ ] Pagination, filtering, and sorting for list endpoints
- [ ] Webhooks for real-time event notifications (unit moved, quality event, machine status change)

### Intelligence Layer

- [ ] Ask MESkit handles all Run Mode operations ("generate 100 units of Smartphone X", "scrap SMX-00044")
- [ ] Production Simulator drives automated production when simulation is running
- [ ] Quality Monitor runs alongside production (manual or simulated), surfacing alerts proactively

### Onboarding — First-Run Experience

Guided onboarding for new users. See [`docs/onboarding-plan.md`](docs/onboarding-plan.md) for full design.

- [ ] Detect empty shop floor on first login (zero lines)
- [ ] Auto-open chat panel with MESkit welcome message
- [ ] Offer one-click demo shop floor (creates sample line, workstations, machines via tool layer)
- [ ] Guided step-by-step option (MESkit walks through Build → Configure → Run)
- [ ] Cross-mode progress checklist (optional)

### Demo Environment — 7-Day Data Retention

- [ ] pg_cron job to delete user data after 7 days (migration: `004_demo_data_cleanup_cron.sql`)
- [ ] Signup page notice: "Demo environment — data deleted after 7 days"
- [ ] Top bar banner with days-remaining countdown (amber → red)
- [ ] MESkit welcome message mentions the 7-day limit

### User Documentation

End-user documentation pages published to the marketing website (`website/`). Generated with the `/doc-writer` skill.

- [ ] Getting Started — sign up, onboarding flow, first demo shop floor
- [ ] Build Mode — create lines, workstations, and machines
- [ ] Configure Mode — define part numbers, BOMs, serial algorithms, and routes
- [ ] Run Mode — generate units, move WIP, log quality events, scrap units
- [ ] Production Simulator — start/pause/reset, speed controls, what the simulator does
- [ ] Ask MESkit — natural language interface, example prompts per mode
- [ ] Quality Monitor — how alerts are triggered, what they mean, configuring thresholds
- [ ] REST API — authentication, endpoint structure, OpenAPI spec

**M4 core done when**: A user can start a simulation, watch units flow through workstations driven by the Production Simulator, see realistic quality events and machine faults, receive proactive quality alerts from the Quality Monitor, and follow everything in the live ticker. Manual production via UI and chat also works independently of the simulation.

**Parallel completion items**: REST API foundation, onboarding, demo retention, and user documentation can land during M4 or immediately after without blocking the simulator-enabled MVP.

---

## M5 — Monitor Mode + Production Planner

Dashboard: live charts, lot traceability, automated insights, production planning.

### Tools

- [ ] Complete Monitor Mode integration for `get_throughput`, `get_yield_report`, `get_unit_history` (implemented in M4 for Quality Monitor, surfaced in dashboards and planner in M5)
- [ ] Register analytics tools in intelligence layer
- [ ] Implement `get_oee` tool — computes Availability × Performance × Quality over a time window (ISA-95, requires F2 + F3 from M4)
- [ ] Implement `get_order_summary` tool — order completion %, units remaining, estimated time (ISA-95 F1)
- [ ] Implement `get_capability_snapshot` tool — workstation availability/committed/unattainable status (ISA-95 F6)

### Dashboard UI

- [ ] WIP tracker — real-time count of units at each workstation (Supabase Realtime)
- [ ] Throughput chart — units completed over time (Recharts line chart)
- [ ] Yield summary — pass/fail ratio per workstation (Recharts bar chart)
- [ ] Unit lookup — search by serial number, view full route history from `unit_history`
- [ ] Alerts & Insights panel — natural-language summaries from Quality Monitor rendered alongside charts
- [ ] Auto-refresh — all charts update as new data flows in from Run Mode
- [ ] Production order tracker — order progress bar, completion %, estimated finish (ISA-95 F1)
- [ ] OEE gauge — Availability × Performance × Quality with factor breakdown (ISA-95, requires `get_oee` tool)

### Production Planner

- [ ] Planner with access to analytics + shop floor tools
- [ ] Capacity analysis: estimate completion time based on historical throughput
- [ ] Route comparison: suggest optimal line/route for a production order
- [ ] Chat-based planning: "I need to build 500 units by end of shift"
- [ ] Topic selector in chat panel — switch between Production, Quality, and Planning
- [ ] Planner uses capability model to check resource availability before scheduling (ISA-95 F6)
- [ ] Planner references production orders for demand-aware planning (ISA-95 F1)
- [ ] Planner estimates order completion using ideal cycle times and current throughput (ISA-95 F3)

### MESkit API — Natural Language Endpoint (integration layer 2 of 3)

Public natural language endpoint with API key auth — external systems send plain English requests instead of mapping to 50+ REST endpoints. MESkit resolves intent, calls tools, and returns structured results.

- [ ] Public natural language endpoint with API key auth (no browser session required)
- [ ] Structured response mode — returns JSON alongside natural language
- [ ] Webhook callbacks for async operations (e.g., "notify me when production order completes")
- [ ] Multi-turn conversation support for complex queries

**Done when**: A user running a simulation in one tab can open Monitor Mode in another and see live WIP, throughput, yield, automated insights, and drill into any unit's history. The Planner can answer capacity and scheduling questions based on real simulation data. External systems can query the MES via natural language through the MESkit API endpoint.

---

## M6 — MQTT Interface + Machine Health Monitor

Device layer: broker, message schema, gateway edge function, predictive maintenance.

### MQTT Infrastructure

- [ ] Set up MQTT broker (Mosquitto local or HiveMQ Cloud)
- [ ] Implement Supabase Edge Function as MQTT → Postgres bridge
  - [ ] Subscribe to `meskit/{line_id}/{workstation_id}/{event_type}` topics
  - [ ] Validate incoming messages against schema
  - [ ] Write to `mqtt_messages` table
  - [ ] Call tool layer to trigger downstream processing (move_unit, create_quality_event)

### Production Simulator — Telemetry Extension

The Production Simulator (introduced in M4) gains telemetry generation capabilities, producing sensor data alongside production events:

- [ ] Production Simulator generates `cycle_complete` MQTT messages via tool layer
- [ ] Production Simulator generates `measurement` events (temperature, torque, vibration) with realistic drift
- [ ] Production Simulator generates `fault` events with pre-fault degradation signals (e.g., temperature climb before failure)
- [ ] Toggle between simulated and real MQTT-driven execution
- [ ] Production Simulator generates ISA-95 aligned measurement payloads with property/unit/value/timestamp structure (ISA-95 F3)

### Machine Health Monitor / Predictive Maintenance

- [ ] Machine Health Monitor activated by MQTT message ingestion
- [ ] Out-of-range sensor value detection (configurable thresholds)
- [ ] Pattern detection: degradation trends in measurement data
- [ ] Alerts surfaced in chat panel and live ticker
- [ ] MQTT message viewer in Monitor Mode — raw message log from `mqtt_messages` table
- [ ] Machine Health Monitor generates maintenance requests when fault patterns detected (ISA-95 F9) — creates maintenance work order linked to machine
- [ ] `maintenance_requests` table — machine_id, request_type (corrective/preventive), priority, status, description (ISA-95 F9)
- [ ] Implement maintenance tools: `create_maintenance_request`, `list_maintenance_requests`, `update_maintenance_status` (ISA-95 F9)

### MCP Server (integration layer 3 of 3)

Expose the full tool layer as an MCP (Model Context Protocol) server. External systems — ERP assistants, supply chain planners, customer copilots — can discover and call MESkit tools natively.

- [ ] MCP server exposing all registered tools with JSON Schema descriptions (developer/integration audience)
- [ ] Auth layer — API keys or OAuth tokens scoped per customer/integration
- [ ] Tool-level permissions — restrict which tools an external integration can call
- [ ] Rate limiting and usage tracking per integration

**Done when**: The Production Simulator generates MQTT-format telemetry that flows through the broker, gets ingested by the Edge Function, and shows up as unit movements and quality events in the UI. The Machine Health Monitor flags unusual sensor readings and alerts before failures happen. Same Simulator from M4, now with telemetry capabilities — same tool layer, different data types. The MCP server exposes the complete MES tool suite for external integration.

---

## M7 — WebMCP: Browser Automation Integration

Make MESkit pages directly accessible to browser-based automation via the [WebMCP standard](https://developer.chrome.com/blog/webmcp-epp). Completes the integration story from server-side (MCP Server, M6) to client-side. See [`docs/webmcp-integration.md`](docs/webmcp-integration.md) for full design.

### Prerequisites

- [ ] Sign up for WebMCP Early Preview Program
- [ ] Review full API documentation when access is granted
- [ ] Prototype declarative API on one Configure Mode form

### Declarative API — Form Annotations

Annotate existing forms so browser-based automation can discover and interact with them natively:

- [ ] Configure Mode: Part Number CRUD forms
- [ ] Configure Mode: BOM assembly forms
- [ ] Configure Mode: Serial algorithm config forms
- [ ] Configure Mode: Route designer and step editor forms
- [ ] Build Mode: Line, workstation, machine forms
- [ ] Run Mode: Production order and unit filter forms
- [ ] Monitor Mode: Dashboard filter forms

### Imperative API — Tool Registry Adapter

Expose the tool registry as structured JavaScript actions for complex workflows:

- [ ] WebMCP adapter module (`lib/webmcp/`) wrapping the tool registry
- [ ] Auto-generate action catalog from tool metadata (names, descriptions, Zod schemas)
- [ ] Reuse Zod-to-JSON-Schema conversion from `registry.ts`
- [ ] Build Mode tools: create/update/delete lines, workstations, machines
- [ ] Configure Mode tools: part numbers, BOMs, routes, serial algorithms
- [ ] Run Mode tools: generate units, move units, log quality events, scrap units
- [ ] Monitor Mode tools: analytics queries, unit lookup, report generation

### Security and UX

- [ ] Confirmation dialogs for destructive operations (delete, scrap) — automation must not bypass
- [ ] Auth boundary — WebMCP actions respect user session and RLS policies
- [ ] Scope control — restrict available actions per page context
- [ ] Rate limiting for automation-initiated actions

### Testing

- [ ] Test with Chrome's built-in automation
- [ ] Test with third-party browser automation tools
- [ ] Validate Supabase Realtime propagation from WebMCP-triggered actions
- [ ] Performance benchmarks — no latency impact on normal UI usage

**Done when**: Any browser-based automation can discover and execute MESkit actions on any page — creating shop floors, configuring products, running production, and querying dashboards — through the WebMCP standard, with the same auth and safety guarantees as the native UI.

---

## Architecture Note — One Repo, All Manufacturing Types

MESkit will **not** fork into separate repos for discrete, process, and batch manufacturing. The three types share ~80% of the codebase (auth, shop floor, configure, quality, intelligence layer, realtime) and differ mainly in how units are tracked. Forking would triple the maintenance surface before product-market fit.

**Strategy:**

- Ship discrete manufacturing first (serial-tracked units) through M6.
- Add batch and process as **tracking modes**, not forks — a `tracking_type` field on `part_numbers` controls behavior while the route/step engine, intelligence layer, and tool layer stay shared.
- The ISA-95 schema already supports this: the abstraction boundary is the unit/lot/batch tracking layer (~10-15% of code). Everything above (intelligence layer, chat, quality rules, analytics) and below (Supabase, auth, realtime) remains common.

A separate repo would only make sense if process manufacturing required a fundamentally different UX metaphor (e.g., continuous flow diagrams instead of discrete route steps). Even then, that's a new mode page — not a new codebase.

---

## Future — Beyond MVP

Not scoped, not scheduled. Ideas for after M7 is solid.

### OEE Dashboard

OEE (Overall Equipment Effectiveness) = Availability × Performance × Quality. The Production Simulator naturally produces all three OEE components. Requires:

- `ideal_cycle_time_seconds` field on `route_steps`
- `machine_events` table for downtime tracking (fault, maintenance, changeover, recovery)
- `get_oee` analytics tool that computes the three factors over a time window
- Production Simulator enhanced to model planned maintenance windows and changeover times
- Dashboard UI in Monitor Mode with OEE gauge, factor breakdown, and bottleneck identification

### Simulation Scenarios

Pre-configured behavior profiles that modify the Production Simulator's system prompt:

| Scenario | Behavior | Purpose |
|---|---|---|
| Steady State | 95% yield, rare faults, consistent throughput | Baseline demo, happy path |
| Quality Crisis | Yield drops to 80% at one station, defect clustering | Showcase Quality Monitor alerts |
| Machine Breakdown | A machine goes down mid-run, WIP backs up | Test bottleneck handling and recovery |
| Ramp-Up | Start slow, gradually increase throughput | Realistic shift start pattern |
| Mixed Product | Multiple part numbers running simultaneously | Test multi-product scheduling |
| Cascade Failure | One fault triggers downstream problems | North Star demo — automated coordination |

### Full PackML State Model (ISA-88)

- [ ] Expand from 7-state MVP to full 17-state PackML model (ISA-88)
- [ ] Add unit/machine mode support (Production, Maintenance, Manual) (ISA-88)
- [ ] State transition audit logging with timestamps and reasons (ISA-88)
- [ ] PackML OPC-UA tag mapping for real device integration (ISA-88)

### Inventory & Material Tracking (ISA-95)

- [ ] `material_lots` table — lot_number, item_id, quantity_on_hand, location, status (ISA-95 F7)
- [ ] `material_consumed` table — unit_id, material_lot_id, quantity_consumed, route_step_id (ISA-95 F7)
- [ ] BOM-driven consumption — auto-deduct materials as units progress through route (ISA-95 F7)
- [ ] Inventory tools: `receive_material`, `consume_material`, `get_inventory_status` (ISA-95 F7)

### Personnel Model (ISA-95)

- [ ] `operator_qualifications` table — user_id, qualification_name, certified_date, expiry_date (ISA-95 F8)
- [ ] Route step personnel requirements — required qualifications per step (ISA-95 F8)
- [ ] Workstation assignment validation — only qualified operators assigned (ISA-95 F8)
- [ ] Personnel tools: `add_qualification`, `check_operator_eligibility` (ISA-95 F8)

### Process Segment Dependencies (ISA-95)

- [ ] Route step dependency graph — steps can depend on non-adjacent steps (ISA-95)
- [ ] Parallel step execution support — branch and merge in routes (ISA-95)
- [ ] Process parameter inheritance — parent segments pass parameters to children (ISA-95)

### Product Carbon Footprint per Work Order

Automatically compute kgCO2e per unit for every closed work order by combining MESkit's existing operational data (time at each route step, machines used, scrap rate) with emission factors configured per machine and site. Surfaces carbon intensity in Monitor Mode, enables AI-driven carbon optimization in the Production Planner, and exports Pathfinder Framework 2.0 JSON for direct B2B data exchange with customers. Aligned with ISO 14067, GHG Protocol, EU CSRD, and the EU Digital Product Passport. See [`docs/carbon-footprint-per-work-order.md`](docs/carbon-footprint-per-work-order.md) for the full feature spec and implementation guide.

- [ ] Migration: `power_consumption_kw` on `machines`, `emission_factors` config table, `carbon_footprint_kgco2e_per_unit` and `carbon_breakdown_json` on `production_orders`
- [ ] Supabase Edge Function triggered on work order `complete` — computes PCF, writes result and step breakdown
- [ ] Carbon tools: `get_carbon_footprint`, `compare_carbon_by_line`, `export_pathfinder_json`
- [ ] Register carbon tools in Production Planner — enables natural language carbon analysis in chat
- [ ] `<CarbonBadge>` and `<CarbonBreakdownChart>` components in Monitor Mode
- [ ] Carbon dashboard tab with trends, top emitting steps, and Pathfinder export button
- [ ] Carbon Monitor alert: flag batches exceeding configurable kgCO2e/unit threshold in live ticker
- [ ] Ship reference table of IEA 2024 national grid emission factors for quick setup

### Blockchain Production Batch Anchoring

Anchor a cryptographic hash of every completed work order to a public blockchain (Polygon PoS). Gives regulated manufacturers — pharma, medical devices, aerospace, food — an independently verifiable, tamper-proof production record without exposing any production data on-chain. See [`docs/blockchain-batch-anchoring.md`](docs/blockchain-batch-anchoring.md) for the full feature spec and implementation guide.

- [ ] Deploy `MeskitAnchor.sol` contract to Polygon Amoy testnet
- [ ] Supabase Edge Function triggered on work order `complete` — hashes batch certificate and writes to chain
- [ ] Store `blockchain_anchor_tx` on `production_orders` row
- [ ] `<BlockchainBadge>` UI component in Monitor Mode — explorer link + verification status
- [ ] Public verification endpoint — anyone can re-hash and compare without system access
- [ ] Migrate from Amoy testnet to Polygon PoS mainnet for production deployments

### Post-v1 Onboarding Integrations

Once the core MESkit loop is stable in production, prioritize integrations that reduce adoption friction for the actual target buyer: small manufacturers upgrading from spreadsheets and lightweight software. These are onboarding accelerators, not enterprise checkbox integrations. See [`docs/MANUFACTURING_SOFTWARE_STACK.md`](docs/MANUFACTURING_SOFTWARE_STACK.md) for the full prioritization and solution map.

- [ ] Tier 1: Spreadsheet import/export (`CSV`, Excel, Google Sheets) for core MES entities
- [ ] Tier 1: Barcode scanner and label-printing workflows (Zebra, Brother, keyboard-wedge scanners)
- [ ] Tier 1: Email alerts, webhooks, and no-code automation recipes (Zapier, Make)
- [ ] Tier 1: QuickBooks/Xero coexistence for item, order, and completion handoff
- [ ] Tier 2: Slack/Teams alerts and document-link attachments (Drive, SharePoint, Dropbox)
- [ ] Tier 2: Light ERP/MRP coexistence (Odoo, Fishbowl, MRPeasy, Katana, Cin7 Core, Unleashed)
- [ ] Tier 3: Vertical onboarding modules for CNC, PCB assembly, 3D print farms, and food batch traceability
- [ ] Publish a "manufacturing software stack" content and integration page to support product-led onboarding and SEO

### Post-v1 Target Audience and GTM Execution

Once MESkit has a stable product loop and onboarding foundation, operationalize the target audience and acquisition strategy defined in [`docs/GTM_Target_Audience.md`](docs/GTM_Target_Audience.md). This work should guide content, templates, partner motion, and future onboarding decisions.

- [ ] Turn the target audience doc into a concrete ICP playbook by vertical: CNC, PCB assembly, 3D print farms, food and beverage
- [ ] Build content and landing pages around the highest-intent pain queries from the doc
- [ ] Align demo templates and onboarding flows with the four prioritized target segments
- [ ] Create partner and outreach materials for operations managers, production leads, plant managers, and owner-operators
- [ ] Validate which target segment converts best through the simulator and onboarding funnel

### Other Ideas

| Feature | Notes |
|---------|-------|
| Smart feature coordination | Quality Monitor triggers Planner to reschedule when yield drops |
| Context learning | System learns from historical patterns and operator feedback |
| Voice input for operators | Speech-to-text input for the chat panel — hands-free shop floor |
| Batch manufacturing UI | Schema is ready (`tracking_type: batch`); needs quantity-aware UX |
| Continuous manufacturing UI | Schema is ready (`tracking_type: continuous`); needs time-window tracking |
| Multi-level BOM | Recursive BOM with sub-assemblies |
| Supplier traceability | Incoming material lots linked to vendor, PO, certificate of analysis |
| Work Instructions viewer | Attach documents/images to route steps |
| Shift management | Operator schedules, workstation assignments by shift |
| Global Command-K search | Search units, machines, part numbers from anywhere |
| Mobile operator view | Responsive UI for tablet-based shop floor interaction |
| Custom monitors | Users define domain-specific monitors with custom rules and tool subsets |
| ISA-95 Operations Performance | Track actual vs planned performance per order with KPIs (ISA-95) |
| ISA-95 Operations Response | Formal response messages when orders complete — supports ERP integration (ISA-95) |
