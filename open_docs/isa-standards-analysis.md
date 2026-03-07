# ISA Standards Analysis — MESkit Coverage & Gaps

> **Last updated**: March 2026
> **Sources**: ISA-95 Parts 2–8, ISA-88 Parts 1–4, TR88.00.02

---

## Executive Summary

Analysis of 15+ ISA standard documents (ISA-95 Parts 2–8, ISA-88 Parts 1–4, TR88.00.02) identified **10 actionable findings** with gaps in MESkit's current architecture. MESkit currently covers approximately **6 of 32** Manufacturing Operations Management (MOM) activities defined in ISA-95 Part 3. The findings below provide a path to ~18 activities by M6 and full coverage post-MVP.

### Findings at a Glance

| # | Finding | Standard | Priority | Target |
|---|---------|----------|----------|--------|
| F1 | Production Orders | ISA-95 Parts 2+4 | Tier 1 | M4 |
| F2 | PackML Machine States | ISA-88 TR88.00.02 | Tier 1 | M4 |
| F3 | Process Segment Enrichment | ISA-95 Part 2 | Tier 1/2 | M4 (partial), M5–M6 (full) |
| F4 | Quality Test Definitions | ISA-95 Part 3 | Tier 1 | M4 |
| F5 | MOM Category Coverage | ISA-95 Part 3 | Tier 3 | Future |
| F6 | Operations Capability | ISA-95 Part 2 | Tier 2 | M5 |
| F7 | Material & Inventory Model | ISA-95 Part 2 | Tier 3 | Future |
| F8 | Personnel Model | ISA-95 Part 2 | Tier 3 | Future |
| F9 | Maintenance Requests | ISA-95 Part 3 | Tier 2 | M6 |
| F10 | Route Versioning | ISA-95 Part 2 | Tier 1 | M4 |

---

## Coverage Matrix — ISA-95 Part 3 MOM Activities

ISA-95 Part 3 defines 32 activities across four MOM categories, each with 8 generic activities. The table below shows MESkit's current and planned coverage.

### Legend

- **Covered** — Implemented or actively in-progress
- **Planned (Mx)** — Mapped to a specific milestone
- **Gap** — Not yet planned

### Production Operations Management

| Activity | MESkit Status | Milestone | Notes |
|----------|--------------|-----------|-------|
| Production resource management | Covered | M2 | Lines, workstations, machines |
| Production definition management | Covered | M3 | Routes, route steps, part numbers |
| Production dispatching | Gap → Planned | M4 (F1) | Production orders + job orders |
| Production execution management | Covered | M4 | Unit generation, WIP movement |
| Production data collection | Covered | M4 | unit_history, quality_events |
| Production tracking | Partial | M4–M5 | Units tracked; order tracking via F1 |
| Production performance analysis | Gap → Planned | M5 | get_throughput, get_oee (F3) |
| Production detailed scheduling | Gap → Planned | M5 (F6) | Planner Agent + capability model |

### Quality Operations Management

| Activity | MESkit Status | Milestone | Notes |
|----------|--------------|-----------|-------|
| Quality resource management | Partial | M2 | Machines with status; no dedicated quality resources |
| Quality definition management | Gap → Planned | M4 (F4) | quality_test_definitions table |
| Quality dispatching | Gap → Planned | M4 (F4) | Test definitions linked to route steps |
| Quality execution management | Covered | M4 | Quality events, pass/fail gates |
| Quality data collection | Covered | M4 | quality_events table |
| Quality tracking | Partial | M4 | Events tracked; no SPC trending yet |
| Quality performance analysis | Gap → Planned | M5 | Yield reports, Quality Analyst insights |
| Quality detailed scheduling | Gap | Future | Inspection scheduling not planned |

### Maintenance Operations Management

| Activity | MESkit Status | Milestone | Notes |
|----------|--------------|-----------|-------|
| Maintenance resource management | Gap | Future | No dedicated maintenance resources |
| Maintenance definition management | Gap | Future | No maintenance procedures defined |
| Maintenance dispatching | Gap → Planned | M6 (F9) | Maintenance requests from Anomaly Monitor |
| Maintenance execution management | Gap → Planned | M6 (F9) | maintenance_requests table |
| Maintenance data collection | Partial | M4 | Machine status changes logged |
| Maintenance tracking | Gap → Planned | M6 (F9) | Request status lifecycle |
| Maintenance performance analysis | Gap | Future | MTBF/MTTR analytics not planned |
| Maintenance detailed scheduling | Gap | Future | Planned maintenance windows not scoped |

### Inventory Operations Management

| Activity | MESkit Status | Milestone | Notes |
|----------|--------------|-----------|-------|
| Inventory resource management | Gap | Future (F7) | No material lot tracking |
| Inventory definition management | Partial | M3 | BOMs define material requirements |
| Inventory dispatching | Gap | Future (F7) | No material allocation |
| Inventory execution management | Gap | Future (F7) | No consumption tracking |
| Inventory data collection | Gap | Future (F7) | No inventory transactions |
| Inventory tracking | Gap | Future (F7) | No lot traceability |
| Inventory performance analysis | Gap | Future | No inventory KPIs |
| Inventory detailed scheduling | Gap | Future | No material planning |

### Coverage Summary

| Category | Covered Now | Planned by M6 | Remaining Gaps |
|----------|------------|---------------|----------------|
| Production (8) | 4 | 8 | 0 |
| Quality (8) | 2 | 6 | 2 |
| Maintenance (8) | 0 | 3 | 5 |
| Inventory (8) | 1 | 1 | 7 |
| **Total (32)** | **~6** | **~18** | **~14** |

---

## Finding Details

### F1: Production Orders (ISA-95 Parts 2+4)

**Gap**: MESkit generates units without an order context. ISA-95 Part 4 defines the production order → job order → work order hierarchy that drives manufacturing execution.

**What's needed**:
- `production_orders` table — order_number, part_number_id, quantity_ordered, quantity_completed, status enum (new/scheduled/running/complete/closed), priority, due_date
- `job_orders` table — production_order_id, line_id, route_id, quantity, status, scheduled_start, scheduled_end
- Order-driven unit generation — units linked to a production order, order tracks completion progress
- Order status lifecycle — automatic status transitions as production progresses
- Tools: `create_production_order`, `update_order_status`, `list_production_orders`

**Impact**: Largest gap. Production orders are the bridge between planning (what to build) and execution (building it). Without them, MESkit can't answer "how much of Order #1234 is complete?" — a fundamental MES question.

**Target**: M4

---

### F2: PackML Machine States (ISA-88 TR88.00.02)

**Gap**: MESkit uses a 3-state machine enum (`idle`/`running`/`down`). TR88.00.02 defines the 17-state PackML model that is the industry standard for machine state management.

**What's needed** (MVP 7-state subset):
- STOPPED — Machine is powered but not producing
- IDLE — Machine is ready, waiting for material
- EXECUTE — Machine is actively producing
- HELD — Paused due to operator/quality hold (can resume)
- SUSPENDED — Paused due to upstream/downstream conditions
- COMPLETE — Current job finished
- ABORTED — Emergency stop or critical fault

**State transitions**: Only valid transitions are allowed (e.g., EXECUTE → HELD is valid, STOPPED → COMPLETE is not). A state transition validation function enforces the PackML state diagram.

**Impact**: Enables accurate OEE Availability calculation, realistic machine lifecycle simulation, and standardized machine-to-MES communication for future MQTT integration.

**Target**: M4 (7-state MVP), Future (full 17-state model)

---

### F3: Process Segment Enrichment (ISA-95 Part 2)

**Gap**: Route steps define sequence and workstation assignment but lack process parameters. ISA-95 Part 2's Process Segment model includes timing, parameters, and personnel requirements.

**What's needed**:
- `ideal_cycle_time_seconds` column on `route_steps` — enables OEE Performance calculation and simulation pacing
- `process_parameters` JSONB column on `route_steps` — key-value pairs for process settings (temperature, pressure, torque, etc.)
- Optional `personnel_requirement` text on `route_steps` — required qualification for the step

**Phasing**:
- M4 (partial): `ideal_cycle_time_seconds` only — needed for Simulator pacing and OEE
- M5–M6 (full): `process_parameters` JSONB, `personnel_requirement`

**Impact**: Cycle time data enables OEE Performance factor. Process parameters enable Simulator to generate realistic telemetry in M6. Personnel requirements support operator qualification checks.

**Target**: M4 (partial), M5–M6 (full)

---

### F4: Quality Test Definitions (ISA-95 Part 3)

**Gap**: MESkit's quality model is binary pass/fail. ISA-95 Part 3 defines quality test specifications with measurement types, units, tolerances, and methods.

**What's needed**:
- `quality_test_definitions` table — test_name, part_number_id, route_step_id, property (what's measured), unit_of_measure, lower_limit, upper_limit, measurement_method, is_active
- Test results record actual measurements, not just pass/fail
- Quality Analyst references definitions when evaluating — alerts include tolerance context (e.g., "solder temp 242°C exceeded upper limit of 240°C")
- Tools: `create_test_definition`, `list_test_definitions`, `record_test_result`

**Impact**: Transforms quality from binary to measurement-based. Enables SPC trending, tolerance analysis, and realistic quality simulation. The Simulator generates measurements against definitions instead of coin flips.

**Target**: M4

---

### F5: MOM Category Coverage (ISA-95 Part 3)

**Gap**: ISA-95 Part 3 defines 32 activities across 4 MOM categories. MESkit currently covers ~6, concentrated in Production Operations.

**Path forward**: See Coverage Matrix above. The findings in this document collectively push coverage from ~6 to ~18 by M6. Full coverage (all 32) requires the Tier 3 items (inventory, personnel, full maintenance).

**Target**: Ongoing — tracked via other findings

---

### F6: Operations Capability (ISA-95 Part 2)

**Gap**: MESkit knows machine status (idle/running/down) but lacks a formal capability model. ISA-95 Part 2 defines operations capability as resource states (committed, available, unattainable) per time window.

**What's needed**:
- Capability snapshot function — for each workstation/machine, compute: committed (assigned to active orders), available (ready for new work), unattainable (down, maintenance, unqualified)
- Time-window support — capability status for a future period (next shift, next 8 hours)
- Tool: `get_capability_snapshot`
- Planner Agent uses capability data for scheduling decisions

**Impact**: Enables demand-aware planning. The Planner can answer "Can I start a 500-unit order on Line 2 tomorrow?" by checking capability.

**Target**: M5

---

### F7: Material & Inventory Model (ISA-95 Part 2)

**Gap**: MESkit defines BOMs (material requirements) but doesn't track material lots, consumption, or inventory levels. ISA-95 Part 2 defines a full material model.

**What's needed**:
- `material_lots` table — lot_number, item_id, quantity_on_hand, location, status (available/reserved/consumed)
- `material_consumed` table — unit_id, material_lot_id, quantity_consumed, route_step_id
- BOM-driven consumption — auto-deduct materials as units progress through route
- Tools: `receive_material`, `consume_material`, `get_inventory_status`

**Impact**: Material traceability (which lot went into which unit) and inventory management. Required for regulated industries (pharma, medical devices, aerospace).

**Target**: Future (post-MVP)

---

### F8: Personnel Model (ISA-95 Part 2)

**Gap**: MESkit assigns operator names to workstations but doesn't model qualifications, certifications, or personnel scheduling. ISA-95 Part 2 defines a personnel model with capabilities and availability.

**What's needed**:
- `operator_qualifications` table — user_id, qualification_name, certified_date, expiry_date
- Route step personnel requirements — required qualifications per step
- Workstation assignment validation — only qualified operators can be assigned
- Tools: `add_qualification`, `check_operator_eligibility`

**Impact**: Compliance for regulated industries. Prevents unqualified operators from working on critical steps.

**Target**: Future (post-MVP)

---

### F9: Maintenance Requests (ISA-95 Part 3)

**Gap**: MESkit tracks machine status changes but doesn't generate or track maintenance work orders. ISA-95 Part 3's Maintenance Operations include dispatching maintenance requests.

**What's needed**:
- `maintenance_requests` table — machine_id, request_type (corrective/preventive), priority, status (open/in_progress/complete), description, requested_at, completed_at
- Anomaly Monitor triggers maintenance requests when fault patterns detected
- Planned maintenance windows — scheduled downtime for machines
- Tools: `create_maintenance_request`, `list_maintenance_requests`, `update_maintenance_status`

**Impact**: Closes the loop between fault detection and maintenance action. Anomaly Monitor detects degradation → creates maintenance request → maintenance performed → machine returns to service.

**Target**: M6

---

### F10: Route Versioning (ISA-95 Part 2)

**Gap**: Route changes are destructive — editing a route retroactively changes the process definition for all past and future units. ISA-95 Part 2 requires versioned process segments for traceability.

**What's needed**:
- `version` integer column on `routes` (default 1)
- Structural changes (add/remove/reorder steps) increment the version
- Units record the route version they were produced under
- Historical queries can reconstruct exactly which route version was used

**Impact**: Production traceability. Required for regulated industries where you must prove "Unit X was built using Route v3, which had these exact steps."

**Target**: M4

---

## Dependency Map

```
F1 (Production Orders)
 ├── F6 depends on F1 (capability model needs order demand)
 ├── OEE depends on F1 (performance per order)
 └── Planner Agent (M5) depends on F1

F2 (PackML States)
 ├── OEE Availability depends on F2 (state-based uptime)
 ├── F9 depends on F2 (maintenance triggered by fault states)
 └── Simulator realism depends on F2

F3 (Process Segments)
 ├── OEE Performance depends on F3 (ideal_cycle_time)
 ├── Simulator pacing depends on F3
 └── M6 Telemetry depends on F3 (process_parameters)

F4 (Quality Test Defs)
 ├── Quality Analyst enrichment depends on F4
 └── Simulator quality realism depends on F4

F10 (Route Versioning)
 └── Independent — can be implemented standalone
```

---

## Priority Classification

### Tier 1 — M4 (Run Mode)

Must-haves for production execution to be ISA-aligned:

- **F1**: Production Orders — the operational backbone
- **F2**: PackML Machine States — 7-state MVP subset
- **F3 (partial)**: `ideal_cycle_time_seconds` on route_steps
- **F4**: Quality Test Definitions — measurement-based quality
- **F10**: Route Versioning — production traceability

### Tier 2 — M5–M6

Enhance analytics, planning, and maintenance:

- **F3 (full)**: Process parameters JSONB, personnel requirement
- **F6**: Operations Capability model for Planner Agent (M5)
- **F9**: Maintenance Requests from Anomaly Monitor (M6)

### Tier 3 — Future (post-MVP)

Full ISA compliance for regulated industries:

- **F5**: Complete MOM category coverage (32/32 activities)
- **F7**: Material & Inventory Model
- **F8**: Personnel Model
