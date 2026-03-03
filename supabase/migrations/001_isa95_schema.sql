-- Migration: ISA-95 aligned schema for MESkit
-- Creates all tables for the MES data model: physical, product, process, production, quality, config, agent, device

-- ============================================================
-- 1. Enum types
-- ============================================================

CREATE TYPE machine_status AS ENUM ('idle', 'running', 'down');
CREATE TYPE unit_status AS ENUM ('in_progress', 'completed', 'scrapped');
CREATE TYPE unit_result AS ENUM ('pass', 'fail');
CREATE TYPE defect_severity AS ENUM ('minor', 'major', 'critical');
CREATE TYPE quality_event_type AS ENUM ('inspection', 'rework', 'scrap');

-- ============================================================
-- 2. Tables — Physical Model (ISA-95 Level 0-2)
-- ============================================================

CREATE TABLE lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

CREATE TABLE workstations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  line_id uuid NOT NULL REFERENCES lines(id) ON DELETE CASCADE,
  name text NOT NULL,
  position int NOT NULL,
  operator_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE machines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workstation_id uuid REFERENCES workstations(id) ON DELETE SET NULL,
  name text NOT NULL,
  type text NOT NULL,
  status machine_status NOT NULL DEFAULT 'idle',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. Tables — Product Model
-- ============================================================

CREATE TABLE part_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

CREATE TABLE items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE bom_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_number_id uuid NOT NULL REFERENCES part_numbers(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  quantity int NOT NULL DEFAULT 1,
  position int NOT NULL
);

-- ============================================================
-- 4. Tables — Process Model
-- ============================================================

CREATE TABLE routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  part_number_id uuid NOT NULL REFERENCES part_numbers(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE route_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  workstation_id uuid NOT NULL REFERENCES workstations(id) ON DELETE CASCADE,
  step_number int NOT NULL,
  name text NOT NULL,
  pass_fail_gate boolean NOT NULL DEFAULT true
);

-- ============================================================
-- 5. Tables — Production Model
-- ============================================================

CREATE TABLE units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  serial_number text NOT NULL UNIQUE,
  part_number_id uuid NOT NULL REFERENCES part_numbers(id) ON DELETE CASCADE,
  route_id uuid NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  status unit_status NOT NULL DEFAULT 'in_progress',
  current_step int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE unit_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  route_step_id uuid NOT NULL REFERENCES route_steps(id) ON DELETE CASCADE,
  workstation_id uuid NOT NULL REFERENCES workstations(id) ON DELETE CASCADE,
  result unit_result NOT NULL,
  defect_code_id uuid,
  timestamp timestamptz NOT NULL DEFAULT now(),
  metadata jsonb
);

-- ============================================================
-- 6. Tables — Quality Model
-- ============================================================

CREATE TABLE defect_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL,
  description text NOT NULL,
  severity defect_severity NOT NULL,
  UNIQUE (user_id, code)
);

CREATE TABLE quality_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  workstation_id uuid NOT NULL REFERENCES workstations(id) ON DELETE CASCADE,
  event_type quality_event_type NOT NULL,
  result unit_result NOT NULL,
  defect_code_id uuid REFERENCES defect_codes(id) ON DELETE SET NULL,
  notes text,
  timestamp timestamptz NOT NULL DEFAULT now()
);

-- Add FK for unit_history.defect_code_id (defined after defect_codes table exists)
ALTER TABLE unit_history
  ADD CONSTRAINT unit_history_defect_code_id_fkey
  FOREIGN KEY (defect_code_id) REFERENCES defect_codes(id) ON DELETE SET NULL;

-- ============================================================
-- 7. Tables — Config
-- ============================================================

CREATE TABLE serial_algorithms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_number_id uuid NOT NULL UNIQUE REFERENCES part_numbers(id) ON DELETE CASCADE,
  prefix text NOT NULL,
  current_counter int NOT NULL DEFAULT 0,
  pad_length int NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 8. Tables — Agent Conversations
-- ============================================================

CREATE TABLE agent_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_type text NOT NULL,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  context jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 9. Tables — MQTT Ingestion (M6)
-- ============================================================

CREATE TABLE mqtt_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic text NOT NULL,
  machine_id uuid REFERENCES machines(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed boolean NOT NULL DEFAULT false
);

-- ============================================================
-- 10. Indexes
-- ============================================================

-- Physical model
CREATE INDEX idx_workstations_line_id ON workstations(line_id);
CREATE INDEX idx_workstations_user_id ON workstations(user_id);
CREATE INDEX idx_machines_workstation_id ON machines(workstation_id);
CREATE INDEX idx_machines_status ON machines(status);
CREATE INDEX idx_machines_user_id ON machines(user_id);

-- Product model
CREATE INDEX idx_bom_entries_part_number_id ON bom_entries(part_number_id);
CREATE INDEX idx_bom_entries_item_id ON bom_entries(item_id);

-- Process model
CREATE INDEX idx_routes_part_number_id ON routes(part_number_id);
CREATE INDEX idx_route_steps_route_id ON route_steps(route_id);
CREATE INDEX idx_route_steps_workstation_id ON route_steps(workstation_id);

-- Production model
CREATE INDEX idx_units_part_number_id ON units(part_number_id);
CREATE INDEX idx_units_route_id ON units(route_id);
CREATE INDEX idx_units_status ON units(status);
CREATE INDEX idx_units_user_id ON units(user_id);
CREATE INDEX idx_unit_history_unit_id ON unit_history(unit_id);
CREATE INDEX idx_unit_history_route_step_id ON unit_history(route_step_id);
CREATE INDEX idx_unit_history_workstation_id ON unit_history(workstation_id);

-- Quality model
CREATE INDEX idx_quality_events_unit_id ON quality_events(unit_id);
CREATE INDEX idx_quality_events_workstation_id ON quality_events(workstation_id);
CREATE INDEX idx_quality_events_event_type ON quality_events(event_type);

-- Agent
CREATE INDEX idx_agent_conversations_user_id ON agent_conversations(user_id);

-- MQTT
CREATE INDEX idx_mqtt_messages_machine_id ON mqtt_messages(machine_id);
CREATE INDEX idx_mqtt_messages_processed ON mqtt_messages(processed);

-- ============================================================
-- 11. Row Level Security
-- ============================================================

-- Lines
ALTER TABLE lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own lines"
  ON lines FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own lines"
  ON lines FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lines"
  ON lines FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own lines"
  ON lines FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Workstations
ALTER TABLE workstations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own workstations"
  ON workstations FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workstations"
  ON workstations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workstations"
  ON workstations FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own workstations"
  ON workstations FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Machines
ALTER TABLE machines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own machines"
  ON machines FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own machines"
  ON machines FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own machines"
  ON machines FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own machines"
  ON machines FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Part numbers
ALTER TABLE part_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own part_numbers"
  ON part_numbers FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own part_numbers"
  ON part_numbers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own part_numbers"
  ON part_numbers FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own part_numbers"
  ON part_numbers FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Items
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own items"
  ON items FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own items"
  ON items FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own items"
  ON items FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own items"
  ON items FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- BOM entries (access via parent part_number)
ALTER TABLE bom_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read bom_entries via part_number"
  ON bom_entries FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM part_numbers WHERE id = bom_entries.part_number_id AND user_id = auth.uid()));

CREATE POLICY "Users can insert bom_entries via part_number"
  ON bom_entries FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM part_numbers WHERE id = bom_entries.part_number_id AND user_id = auth.uid()));

CREATE POLICY "Users can update bom_entries via part_number"
  ON bom_entries FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM part_numbers WHERE id = bom_entries.part_number_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM part_numbers WHERE id = bom_entries.part_number_id AND user_id = auth.uid()));

CREATE POLICY "Users can delete bom_entries via part_number"
  ON bom_entries FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM part_numbers WHERE id = bom_entries.part_number_id AND user_id = auth.uid()));

-- Routes
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own routes"
  ON routes FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own routes"
  ON routes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own routes"
  ON routes FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own routes"
  ON routes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Route steps (access via parent route)
ALTER TABLE route_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read route_steps via route"
  ON route_steps FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM routes WHERE id = route_steps.route_id AND user_id = auth.uid()));

CREATE POLICY "Users can insert route_steps via route"
  ON route_steps FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM routes WHERE id = route_steps.route_id AND user_id = auth.uid()));

CREATE POLICY "Users can update route_steps via route"
  ON route_steps FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM routes WHERE id = route_steps.route_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM routes WHERE id = route_steps.route_id AND user_id = auth.uid()));

CREATE POLICY "Users can delete route_steps via route"
  ON route_steps FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM routes WHERE id = route_steps.route_id AND user_id = auth.uid()));

-- Units
ALTER TABLE units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own units"
  ON units FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own units"
  ON units FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own units"
  ON units FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own units"
  ON units FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Unit history (access via parent unit)
ALTER TABLE unit_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read unit_history via unit"
  ON unit_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM units WHERE id = unit_history.unit_id AND user_id = auth.uid()));

CREATE POLICY "Users can insert unit_history via unit"
  ON unit_history FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM units WHERE id = unit_history.unit_id AND user_id = auth.uid()));

-- Defect codes
ALTER TABLE defect_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own defect_codes"
  ON defect_codes FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own defect_codes"
  ON defect_codes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own defect_codes"
  ON defect_codes FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own defect_codes"
  ON defect_codes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Quality events (access via parent unit)
ALTER TABLE quality_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read quality_events via unit"
  ON quality_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM units WHERE id = quality_events.unit_id AND user_id = auth.uid()));

CREATE POLICY "Users can insert quality_events via unit"
  ON quality_events FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM units WHERE id = quality_events.unit_id AND user_id = auth.uid()));

-- Serial algorithms (access via parent part_number)
ALTER TABLE serial_algorithms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read serial_algorithms via part_number"
  ON serial_algorithms FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM part_numbers WHERE id = serial_algorithms.part_number_id AND user_id = auth.uid()));

CREATE POLICY "Users can insert serial_algorithms via part_number"
  ON serial_algorithms FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM part_numbers WHERE id = serial_algorithms.part_number_id AND user_id = auth.uid()));

CREATE POLICY "Users can update serial_algorithms via part_number"
  ON serial_algorithms FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM part_numbers WHERE id = serial_algorithms.part_number_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM part_numbers WHERE id = serial_algorithms.part_number_id AND user_id = auth.uid()));

-- Agent conversations
ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own conversations"
  ON agent_conversations FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations"
  ON agent_conversations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
  ON agent_conversations FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations"
  ON agent_conversations FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- MQTT messages (no user_id — ingested by system)
ALTER TABLE mqtt_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read mqtt_messages"
  ON mqtt_messages FOR SELECT TO authenticated
  USING (true);

-- ============================================================
-- 12. Realtime publications
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE lines;
ALTER PUBLICATION supabase_realtime ADD TABLE workstations;
ALTER PUBLICATION supabase_realtime ADD TABLE machines;
ALTER PUBLICATION supabase_realtime ADD TABLE units;
ALTER PUBLICATION supabase_realtime ADD TABLE unit_history;
ALTER PUBLICATION supabase_realtime ADD TABLE quality_events;
