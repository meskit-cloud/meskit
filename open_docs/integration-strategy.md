# Integration Strategy — Connecting MESkit to Everything

> How MESkit integrates with ERPs, SCADA systems, PLCs, legacy databases, and modern cloud services — including systems that haven't been updated since the 90s.

## The Reality of Manufacturing Integration

Most factories don't run one system. They run dozens — an ERP from the 2000s, a SCADA system from the 90s, PLCs that speak Modbus, a quality database in Access, spreadsheets emailed between shifts, and maybe a cloud dashboard someone built last year. Any MES that ignores this reality is a toy.

MESkit's integration strategy is built around one principle: **meet systems where they are, not where we wish they were.**

---

## Integration Layers (Already on the Roadmap)

MESkit's roadmap already defines three integration layers. This document extends them with legacy-specific considerations.

| Layer | Milestone | Protocol | Best For |
|-------|-----------|----------|----------|
| REST API | M4 | HTTP/JSON | Modern systems, ERPs with API support, custom integrations |
| Agent-as-API | M5 | HTTP/natural language | Systems that need flexibility, complex queries, AI copilots |
| MCP Server | M6 | Model Context Protocol | External AI agents, autonomous supply chain systems |
| MQTT | M6 | MQTT 3.1.1/5.0 | Shop floor devices, PLCs, sensors, SCADA bridges |

---

## Layer 1: REST API (M4) — The Universal Connector

Every MESkit tool becomes a REST endpoint auto-generated from the tool registry. This is the workhorse integration for most systems.

### Design Principles

- **One tool = one endpoint.** `create_line` → `POST /api/v1/lines`. `list_machines` → `GET /api/v1/machines`. No surprises.
- **OpenAPI spec auto-generated from Zod schemas.** Any system that can read Swagger can generate its own client.
- **API key auth with scopes.** An ERP gets read access to production data + write access to create orders. A dashboard gets read-only. A PLC bridge gets write access to machine status only.
- **Pagination, filtering, sorting** on all list endpoints. Legacy systems often poll — make polling efficient.
- **Webhooks** for event-driven integration. Register a URL, get notified when a unit moves, a quality event occurs, or a machine status changes.

### Legacy System Patterns

#### ERP Integration (SAP, Oracle, Dynamics, etc.)

Most ERPs can make HTTP calls or have middleware that can (SAP PI/PO, Oracle Integration Cloud, Microsoft Power Automate).

**Inbound (ERP → MESkit):**
- Production orders: ERP creates orders via `POST /api/v1/production-orders`
- Part number sync: ERP pushes material master changes via `POST /api/v1/part-numbers`
- BOM sync: ERP pushes BOM structures via `POST /api/v1/bom-entries`

**Outbound (MESkit → ERP):**
- Order completion: Webhook fires when production order status → `complete`
- Quality events: Webhook fires on inspection results — ERP updates quality lot
- Unit traceability: ERP pulls serial history via `GET /api/v1/units/{serial}/history`
- Consumption reporting: Webhook fires when materials are consumed (ISA-95 F7, future)

**For ERPs that can't make HTTP calls:** See "File-Based Exchange" below.

#### SCADA / Historian Integration

SCADA systems (Ignition, WonderWare, FactoryTalk) typically expose OPC-UA or have built-in scripting.

**Pattern: SCADA script → MESkit REST API**
- Ignition: Use Ignition's `system.net.httpPost()` to call MESkit endpoints
- WonderWare: InTouch scripts can make HTTP calls via ActiveX or .NET integration
- FactoryTalk: Use FactoryTalk Gateway or custom .NET service

**Data flow:**
- Machine status changes: SCADA polls PLC → detects state change → calls `POST /api/v1/machines/{id}/status`
- Cycle complete events: SCADA detects cycle end signal → calls `POST /api/v1/units/{id}/move`
- Measurement data: SCADA reads process values → calls `POST /api/v1/quality-events` with measurement payload

---

## Layer 2: Agent-as-API (M5) — Natural Language Integration

The killer feature for complex integrations. Instead of mapping 50+ REST endpoints, send a plain text request:

```json
POST /api/v1/agent
{
  "message": "How many units of Smartphone X were completed today and what was the yield at the Reflow station?",
  "response_format": "json"
}
```

The agent resolves intent, calls the right tools, and returns structured results.

### Why This Matters for Legacy Systems

Legacy systems often have rigid, hard-coded integrations. Changing them is expensive and risky. The Agent-as-API lets them send **what they need in plain text** and get structured data back — no endpoint mapping, no schema versioning headaches.

**Example: An old Perl script that used to query a SQL Server directly**
- Before: 200 lines of SQL joins, breaks when schema changes
- After: One HTTP POST with "give me shift production summary for Line A" → structured JSON response

### Structured Response Mode

The agent returns both natural language and structured JSON:

```json
{
  "message": "Today, 342 units of Smartphone X were completed. Yield at Reflow was 96.2% (11 fails out of 289 inspections).",
  "data": {
    "part_number": "Smartphone X",
    "completed_today": 342,
    "reflow_yield": 0.962,
    "reflow_inspections": 289,
    "reflow_fails": 11
  }
}
```

---

## Layer 3: MQTT (M6) — The Shop Floor Protocol

MQTT is the lingua franca of industrial IoT. MESkit speaks it natively via the Edge Function bridge.

### Topic Schema

```
meskit/{line_id}/{workstation_id}/{event_type}
```

Event types: `cycle_complete`, `measurement`, `fault`, `status_change`

### PLC and Sensor Integration Patterns

#### Direct MQTT (modern PLCs)

Some PLCs speak MQTT natively (Siemens S7-1500 with MQTT publisher, Allen-Bradley with Kepware):
- Configure PLC to publish to MESkit topic schema
- Edge Function validates and ingests

#### OPC-UA → MQTT Bridge

For PLCs that speak OPC-UA (most modern industrial equipment):
- Deploy an OPC-UA to MQTT bridge (e.g., Kepware, Sparkplug B, or open-source like `node-opcua` + `mqtt.js`)
- Bridge maps OPC-UA tags to MQTT topics
- MESkit ingests via standard MQTT path

#### Modbus → MQTT Bridge

For older PLCs (Modbus RTU/TCP is everywhere in legacy factories):
- Deploy a Modbus-to-MQTT gateway (e.g., `modbus2mqtt`, or a Raspberry Pi running a Python bridge)
- Gateway polls Modbus registers → publishes to MQTT topics
- Cheap, reliable, works with 20-year-old equipment

#### Analog/Digital I/O → MQTT

For the oldest equipment (relay-based, no digital interface):
- Arduino/ESP32 with I/O breakout reads analog signals (4-20mA, 0-10V) or digital contacts
- Publishes to MQTT — total hardware cost under $20 per machine
- This is how you connect a 1980s punch press to a cloud MES

---

## Layer 4: File-Based Exchange — The Legacy Lifeline

Some systems can't make HTTP calls, can't speak MQTT, and can't be modified. They can write files. This is more common than anyone wants to admit.

### CSV/XML Drop Folder

A watched folder where legacy systems drop files for MESkit to ingest:

```
/integrations/inbox/
  production_orders_20260306.csv
  quality_results_shift2.xml
  material_receipts.csv
```

**Implementation: Supabase Edge Function + Supabase Storage (or S3)**
- Legacy system writes CSV/XML to a shared folder (FTP, SMB, NFS)
- A sync agent (cron or file watcher) uploads to Supabase Storage
- Edge Function triggers on upload → parses file → calls tool layer
- Processed files move to `/integrations/processed/`

### Supported Formats

| Format | Use Case | Parser |
|--------|----------|--------|
| CSV | Production orders, BOM imports, quality results | Built-in |
| XML | ISA-95 B2MML messages, ERP exports | Built-in |
| JSON | Modern system exports | Built-in |
| Fixed-width text | Very old ERP exports (SAP IDocs, AS/400) | Configurable field maps |
| Excel (.xlsx) | The universal manufacturing data format | Library-based |

### B2MML — ISA-95's Own XML Format

ISA-95 defines B2MML (Business to Manufacturing Markup Language) as the standard XML schema for MES-ERP communication. MESkit should support B2MML import/export for:
- Production orders (B2MML ProductionSchedule)
- Production results (B2MML ProductionPerformance)
- Material definitions (B2MML MaterialDefinition)
- Equipment model (B2MML Equipment)

This gives MESkit out-of-the-box compatibility with any system that speaks ISA-95/B2MML — including SAP ME, Siemens Opcenter, and AVEVA MES.

---

## Layer 5: Database-Level Integration — Direct Access

Some legacy systems need to read MES data directly from the database. This is common with:
- Reporting tools (Crystal Reports, SSRS, Power BI)
- Data warehouses (ETL from MES to data lake)
- Custom scripts that already know SQL

### Read-Only Database Replica

- Supabase provides connection pooling via PgBouncer
- Create a read-only Postgres role with access to specific tables/views
- Reporting tools connect via standard Postgres driver (JDBC, ODBC, psycopg2)
- No risk to production data — read-only role enforced at database level

### Materialized Views for Reporting

Pre-computed views for common reporting queries:
- `v_production_summary` — daily/shift production counts by line, part number
- `v_quality_summary` — yield, defect Pareto by workstation
- `v_wip_status` — current WIP count and age at each station
- `v_unit_genealogy` — full unit history flattened for traceability

These views are what reporting tools query — they don't need to understand the normalized schema.

### ODBC Bridge for Legacy Tools

For Windows-based reporting tools that only speak ODBC:
- PostgreSQL ODBC driver (psqlODBC) is free and mature
- Configure DSN pointing to Supabase connection string
- Crystal Reports, Excel, Access, and even VBA macros can query MESkit data

---

## Layer 6: MCP Server (M6) — AI-to-AI Integration

The Model Context Protocol server lets external AI agents discover and call MESkit tools natively. This is the forward-looking integration for the AI era.

**Use cases:**
- A customer's ERP copilot asks MESkit: "What's the current WIP for order PO-2026-0301?"
- A supply chain planning agent queries production capacity before placing an order
- A maintenance AI checks machine status and history before scheduling repairs

The MCP server exposes the full tool registry with JSON Schema descriptions. External agents discover available tools, understand their inputs/outputs, and call them — no custom integration code needed.

---

## Integration Priorities by System Age

| System Era | Typical Systems | Best MESkit Integration |
|------------|----------------|------------------------|
| **2020s** | Cloud ERPs, modern SCADA, IIoT platforms | REST API, MCP Server, MQTT |
| **2010s** | On-prem ERPs with API, Ignition, Kepware | REST API, Webhooks, MQTT via OPC-UA bridge |
| **2000s** | SAP R/3, Oracle E-Business, WonderWare | REST API via middleware, File-based (CSV/XML/B2MML) |
| **1990s** | AS/400, Foxpro, Modbus PLCs, custom Access DBs | File-based (CSV/fixed-width), ODBC, Modbus→MQTT bridge |
| **1980s** | Relay logic, analog I/O, paper-based | Arduino/ESP32→MQTT ($20/machine), manual data entry via chat |

---

## The Agent Advantage for Integration

Traditional MES integrations are brittle: change a field name and the integration breaks. MESkit's Agent-as-API absorbs this brittleness.

**Scenario: A legacy system sends slightly malformed data**

Traditional API: Returns 400 Bad Request. Integration engineer gets paged. Takes 2 days to fix.

Agent-as-API: The agent understands the intent ("this looks like a production order for 500 units of Part X"), calls the right tools with corrected parameters, and logs what it fixed. The integration keeps working.

**Scenario: Schema evolution**

Traditional API: Every integration needs to update when the API version changes.

Agent-as-API: The agent adapts. It knows the new schema, maps old field names to new ones, and returns data in whatever format the caller expects.

This doesn't replace structured APIs — it complements them. Use REST for high-volume, well-defined integrations. Use Agent-as-API for everything messy, legacy, or evolving.

---

## Implementation Roadmap

| Phase | Milestone | What Ships |
|-------|-----------|-----------|
| **Phase 1** | M4 | REST API auto-generated from tool registry, OpenAPI spec, API key auth, webhooks |
| **Phase 2** | M5 | Agent-as-API endpoint, structured response mode |
| **Phase 3** | M6 | MQTT ingestion, MCP Server |
| **Phase 4** | Post-M6 | File-based exchange (CSV/XML/B2MML), ODBC read-only access, reporting views |

Phase 4 is post-MVP but low-effort — it's mostly a Supabase Edge Function that parses files and calls the existing tool layer. The hard work (the tool layer) is already done by M4.

---

## Design Rules for Integration Code

1. **All integrations go through the tool layer.** No direct database writes from integration code. The tool layer handles validation, audit logging, and realtime events.
2. **Integration code lives in `lib/integrations/` and `app/api/integrations/`.** Same isolation rule as the Simulator — deleting all integration files must leave the MES fully functional.
3. **Every inbound integration validates against Zod schemas.** The same schemas that power the UI and agents power integrations. One source of truth for data validation.
4. **Outbound integrations use webhooks, not polling.** Legacy systems that must poll use the REST API with efficient pagination. But push is always preferred.
5. **File-based integrations are async.** Files are queued, not processed synchronously. Failed files go to an error folder with a log entry — never silently dropped.
