# Supabase Migration Generator

Generate a Supabase migration SQL file for MESkit's ISA-95 data model.

## Input

$ARGUMENTS — table description (e.g., "quality_events table for logging inspections")

## Instructions

Parse the table name and purpose from the input. Generate a migration file at:

```
supabase/migrations/{YYYYMMDDHHMMSS}_{table_name}.sql
```

Use the current timestamp for the filename prefix.

### SQL Requirements

Every migration MUST follow these conventions:

1. **UUIDs as primary keys** — use `gen_random_uuid()` default
2. **Timestamps** — use `timestamptz` with `default now()` for `created_at`
3. **Foreign keys** — reference parent tables with `ON DELETE CASCADE` where child records are meaningless without the parent, `ON DELETE SET NULL` for optional associations
4. **Enum types** — create as Postgres enums before the table. Use snake_case names prefixed with the table context
5. **Row Level Security** — enable RLS and create policies for authenticated users (SELECT, INSERT, UPDATE)
6. **Realtime** — add `ALTER PUBLICATION supabase_realtime ADD TABLE {table_name};`
7. **Indexes** — create indexes on all foreign key columns and status/enum columns

### ISA-95 Data Model Reference

Follow the ISA-95 hierarchy when determining table relationships:

**Physical Model (Level 0-2):**
- `lines` (id uuid PK, name text UNIQUE, description text?, created_at timestamptz)
- `workstations` (id uuid PK, line_id uuid FK→lines, name text, position int, operator_name text?, created_at timestamptz)
- `machines` (id uuid PK, workstation_id uuid? FK→workstations, name text, type text, status machine_status_enum, created_at timestamptz)

**Product Model:**
- `part_numbers` (id uuid PK, name text UNIQUE, description text?, created_at timestamptz)
- `items` (id uuid PK, name text, description text?, created_at timestamptz)
- `bom_entries` (id uuid PK, part_number_id uuid FK→part_numbers, item_id uuid FK→items, quantity int DEFAULT 1, position int)

**Process Model:**
- `routes` (id uuid PK, part_number_id uuid FK→part_numbers, name text, created_at timestamptz)
- `route_steps` (id uuid PK, route_id uuid FK→routes, workstation_id uuid FK→workstations, step_number int, name text, pass_fail_gate boolean DEFAULT true)

**Production Model:**
- `units` (id uuid PK, serial_number text UNIQUE, part_number_id uuid FK→part_numbers, route_id uuid FK→routes, status unit_status_enum, current_step int, created_at timestamptz)
- `unit_history` (id uuid PK, unit_id uuid FK→units, route_step_id uuid FK→route_steps, workstation_id uuid FK→workstations, result unit_result_enum, defect_code_id uuid? FK→defect_codes, timestamp timestamptz, metadata jsonb?)

**Quality Model:**
- `defect_codes` (id uuid PK, code text UNIQUE, description text, severity defect_severity_enum)
- `quality_events` (id uuid PK, unit_id uuid FK→units, workstation_id uuid FK→workstations, event_type quality_event_type_enum, result unit_result_enum, defect_code_id uuid? FK→defect_codes, notes text?, timestamp timestamptz)

**Config:**
- `serial_algorithms` (id uuid PK, part_number_id uuid UNIQUE FK→part_numbers, prefix text, current_counter int, pad_length int DEFAULT 5, created_at timestamptz)

**Agent:**
- `agent_conversations` (id uuid PK, user_id uuid FK→auth.users, agent_type text, messages jsonb, context jsonb?, created_at timestamptz)

**MQTT (M6):**
- `mqtt_messages` (id uuid PK, topic text, machine_id uuid? FK→machines, event_type text, payload jsonb, received_at timestamptz DEFAULT now(), processed boolean DEFAULT false)

### Enum Definitions

```sql
-- Machine status
CREATE TYPE machine_status AS ENUM ('idle', 'running', 'down');

-- Unit tracking
CREATE TYPE unit_status AS ENUM ('in_progress', 'completed', 'scrapped');
CREATE TYPE unit_result AS ENUM ('pass', 'fail');

-- Quality
CREATE TYPE defect_severity AS ENUM ('minor', 'major', 'critical');
CREATE TYPE quality_event_type AS ENUM ('inspection', 'rework', 'scrap');
```

### RLS Policy Pattern

```sql
ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read {table_name}"
  ON {table_name} FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert {table_name}"
  ON {table_name} FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update {table_name}"
  ON {table_name} FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
```

### Output Template

```sql
-- Migration: {description}
-- ISA-95 Level: {Physical | Product | Process | Production | Quality | Config | Agent | Device}

-- 1. Enum types (if needed)
CREATE TYPE {enum_name} AS ENUM ('value1', 'value2');

-- 2. Table
CREATE TABLE {table_name} (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- columns...
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Indexes
CREATE INDEX idx_{table_name}_{fk_column} ON {table_name} ({fk_column});

-- 4. RLS
ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read {table_name}"
  ON {table_name} FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert {table_name}"
  ON {table_name} FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update {table_name}"
  ON {table_name} FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 5. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE {table_name};
```

If the table already exists in the ISA-95 reference above, match that schema exactly. If it's a new table, follow the same conventions and explain how it fits into the hierarchy.
