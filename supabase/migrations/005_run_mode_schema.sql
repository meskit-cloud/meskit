-- Migration: M4 — Run Mode schema additions
-- Adds: production_orders table, production_order_id on units,
--       ideal_cycle_time_seconds on route_steps, quality_test_definitions table,
--       version on routes

-- ============================================================
-- 1. New enum types
-- ============================================================

CREATE TYPE production_order_status AS ENUM ('new', 'scheduled', 'running', 'complete', 'closed');

-- ============================================================
-- 2. Production Orders (ISA-95 F1)
-- ============================================================

CREATE TABLE production_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_number text NOT NULL,
  part_number_id uuid NOT NULL REFERENCES part_numbers(id) ON DELETE CASCADE,
  route_id uuid NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  quantity_ordered int NOT NULL CHECK (quantity_ordered > 0),
  quantity_completed int NOT NULL DEFAULT 0 CHECK (quantity_completed >= 0),
  status production_order_status NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, order_number)
);

-- ============================================================
-- 3. Link units to production orders
-- ============================================================

ALTER TABLE units
  ADD COLUMN production_order_id uuid REFERENCES production_orders(id) ON DELETE SET NULL;

-- ============================================================
-- 4. Ideal cycle time on route steps (ISA-95 F3)
-- ============================================================

ALTER TABLE route_steps
  ADD COLUMN ideal_cycle_time_seconds numeric;

-- ============================================================
-- 5. Route versioning (ISA-95 F10)
-- ============================================================

ALTER TABLE routes
  ADD COLUMN version int NOT NULL DEFAULT 1;

-- ============================================================
-- 6. Quality Test Definitions (ISA-95 F4)
-- ============================================================

CREATE TABLE quality_test_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  part_number_id uuid NOT NULL REFERENCES part_numbers(id) ON DELETE CASCADE,
  route_step_id uuid NOT NULL REFERENCES route_steps(id) ON DELETE CASCADE,
  test_name text NOT NULL,
  property text NOT NULL,
  unit_of_measure text NOT NULL,
  lower_limit numeric NOT NULL,
  upper_limit numeric NOT NULL,
  measurement_method text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 7. Indexes
-- ============================================================

-- Production orders
CREATE INDEX idx_production_orders_user_id ON production_orders(user_id);
CREATE INDEX idx_production_orders_status ON production_orders(status);
CREATE INDEX idx_production_orders_part_number_id ON production_orders(part_number_id);

-- Units → order link
CREATE INDEX idx_units_production_order_id ON units(production_order_id);

-- Quality test definitions
CREATE INDEX idx_quality_test_defs_part_number_id ON quality_test_definitions(part_number_id);
CREATE INDEX idx_quality_test_defs_route_step_id ON quality_test_definitions(route_step_id);

-- ============================================================
-- 8. Row Level Security — Production Orders
-- ============================================================

ALTER TABLE production_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own production_orders"
  ON production_orders FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own production_orders"
  ON production_orders FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own production_orders"
  ON production_orders FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own production_orders"
  ON production_orders FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- 9. Row Level Security — Quality Test Definitions
-- ============================================================

ALTER TABLE quality_test_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own quality_test_definitions"
  ON quality_test_definitions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quality_test_definitions"
  ON quality_test_definitions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quality_test_definitions"
  ON quality_test_definitions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own quality_test_definitions"
  ON quality_test_definitions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- 10. Realtime — add production_orders to publication
-- Note: units, unit_history, quality_events already added in 001_isa95_schema.sql
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE production_orders;
