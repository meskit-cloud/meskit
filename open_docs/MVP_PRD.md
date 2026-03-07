# MESkit MVP — Product Requirements Document

## 1. MVP Goal

Validate the core MES loop end-to-end: **define a product → build a route → move a unit through workstations → collect quality/production data → visualize results**.

Everything else (world map, image generation, full ERP/PLM/SCADA simulation) is deferred. The MVP proves that a user can configure and run a simplified virtual factory against ISA-95 patterns within a single web application.

---

## 2. Success Criteria

| Metric | Target |
|--------|--------|
| A user can create a line with workstations | Yes |
| A user can define a part number and a simple BOM | Yes |
| A user can design a production route | Yes |
| A unit can be moved through the route (manual or auto) | Yes |
| Quality events (pass/fail/defect) are recorded per unit | Yes |
| A dashboard shows live WIP counts and basic OEE | Yes |

---

## 3. Scope: What's IN

### 3.1 Shop Floor Setup (Build Mode — simplified)

- **Lines & Workstations:** Create a manufacturing line and assign 3–5 workstations in sequence. No drag-and-drop layout editor — use a list/form-based UI.
- **Machines:** Register a machine per workstation (name, type, status). No maintenance schedules or CMMS depth yet.
- **Operators:** Assign a named operator to a workstation. No shift management, no certifications.

### 3.2 Product & Route Configuration (Configure Mode)

- **Part Number + Items:** Create a Part Number (e.g., "Smartphone X") and associate child items (screen, battery, board) — flat BOM, single level.
- **Serial Algorithm:** One algorithm: sequential prefix + incrementing number (e.g., `SMX-00001`).
- **Route Designer:** Define an ordered sequence of workstations a unit must visit. Each step has a name and a pass/fail gate.

### 3.3 Simulation Execution (Run Mode)

- **Unit Generation:** Click "Start" to generate N units with serial numbers per the algorithm.
- **WIP Move:** Move a unit from one workstation to the next. Support both:
  - **Manual:** User clicks "Move" on each unit.
  - **Auto-run:** Units auto-advance at a configurable interval (simulating cycle time).
- **Quality Events:** At each workstation, randomly inject pass/fail outcomes based on a configurable yield rate (default 95%). Failed units are flagged and removed from the route.
- **Live Ticker:** A scrolling log of every event (unit created, unit moved, defect recorded).

### 3.4 Dashboard (Monitor Mode — minimal)

- **WIP Tracker:** Count of units at each workstation in real time.
- **Throughput Chart:** Units completed over time (line chart).
- **Yield Summary:** Pass/fail ratio per workstation (bar chart).
- **Unit Lookup:** Search by serial number to see its full route history.

---

## 4. Scope: What's OUT (Phase 2+)

| Feature | Reason deferred |
|---------|----------------|
| World map / plant location picker | UI complexity, no MES value |
| AI image generation for virtual plants | Novelty feature, not core |
| Full CMMS (maintenance schedules, spare parts) | Depth feature, not breadth |
| Workforce shifts, certifications, training | HR system scope |
| Supplier & traceability beyond flat BOM | Requires supplier entity model |
| IIoT / Greengrass telemetry simulation | Needs device twin infrastructure |
| Label templates & printing | Peripheral feature |
| Time control (2x, 5x, 10x) | Can be added on top of auto-run |
| State persistence (save/load) | Requires serialization design |
| Work Instructions viewer | Content authoring scope |
| OEE (Availability, Performance, Quality) | Needs downtime & ideal cycle time model |
| Real MES API integration | MVP uses local simulation; API layer comes after core UX is proven |
| Global Command-K search | Polish feature |

---

## 5. Data Model (MVP entities)

```
Line
  ├── id, name
  └── workstations[]

Workstation
  ├── id, name, position (order), lineId
  ├── machineId (optional)
  └── operatorName (optional)

Machine
  ├── id, name, type, status (idle | running | down)

PartNumber
  ├── id, name, description
  └── items[] (child components — name only)

Route
  ├── id, partNumberId
  └── steps[] → ordered list of workstationIds

SerialAlgorithm
  ├── prefix, currentCounter

Unit
  ├── id, serialNumber, partNumberId, routeId
  ├── status (in_progress | completed | scrapped)
  ├── currentStepIndex
  └── history[] → { workstationId, timestamp, result (pass | fail), defectCode? }
```

---

## 6. Technical Approach

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Frontend framework | Next.js (App Router) | React ecosystem, SSR optional, fast iteration |
| Styling | Tailwind CSS | Matches dark industrial aesthetic, utility-first |
| State management | Zustand | Lightweight, no boilerplate, good for simulation state |
| Data persistence (MVP) | In-memory (Zustand store) | No backend needed for MVP; localStorage for optional save |
| Charts | Recharts | Simple, React-native, covers bar/line charts |
| Deployment | Vercel or local dev | Zero-config for Next.js |

---

## 7. UI Structure (MVP)

```
┌──────────────────────────────────────────────────┐
│  MESkit Simulation Bar  [▶ Start] [⏸ Pause] [⏩]  │
├────────┬─────────────────────────────────────────┤
│        │                                         │
│  Mode  │          Main Content Area              │
│  ------│                                         │
│  Build │   (changes based on selected mode)      │
│  Config│                                         │
│  Run   │                                         │
│  Monitor│                                        │
│        │                                         │
├────────┴─────────────────────────────────────────┤
│  Live Ticker  [unit SMX-00042 moved to Station3] │
└──────────────────────────────────────────────────┘
```

- **Sidebar:** Mode switcher (Build / Configure / Run / Monitor).
- **Top bar:** Simulation controls (Start, Pause, speed indicator).
- **Bottom bar:** Live event ticker (scrolling log).
- **Main area:** Context-dependent content per mode.

---

## 8. MVP Milestones

| # | Milestone | Deliverable |
|---|-----------|-------------|
| M1 | Project scaffold | Next.js app, Tailwind, Zustand, dark theme shell with sidebar + top bar + ticker |
| M2 | Build Mode | CRUD for Lines, Workstations, Machines |
| M3 | Configure Mode | CRUD for Part Numbers (with items), Route designer, Serial algorithm config |
| M4 | Run Mode | Unit generation, manual WIP move through route, quality event injection |
| M5 | Monitor Mode | WIP tracker, throughput chart, yield chart, unit lookup |
| M6 | Auto-run | Configurable auto-advance with random yield, full simulation loop |

---

## 9. Design Tokens (from PRD)

| Token | Value |
|-------|-------|
| Background | `#000000` / `#111111` |
| Accent (primary actions, alerts) | `#E4002B` |
| Font | `Roboto`, sans-serif |
| Surface cards | `#1A1A1A` |
| Text primary | `#FFFFFF` |
| Text secondary | `#999999` |
| Success | `#22C55E` |
| Warning | `#F59E0B` |
| Border | `#2A2A2A` |
