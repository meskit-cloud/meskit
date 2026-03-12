-- Migration 011: Multi-Tenancy — Organizations, Teams, Plants
-- Transforms MESkit from single-user (user_id) to multi-tenant (org_id).
-- Creates organizations, org_members, plants tables.
-- Adds org_id to all data tables, plant_id to lines.
-- Rewrites all RLS policies from user_id to org membership.

-- ============================================================
-- 1. New enum types
-- ============================================================

CREATE TYPE org_tier AS ENUM ('starter', 'pro', 'enterprise');
CREATE TYPE org_role AS ENUM ('owner', 'admin', 'operator', 'viewer');

-- ============================================================
-- 2. Core tables — Organizations, Members, Plants
-- ============================================================

CREATE TABLE organizations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,
  tier       org_tier NOT NULL DEFAULT 'starter',
  metadata   JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE org_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       org_role NOT NULL DEFAULT 'operator',
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id)
);

CREATE TABLE plants (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  location   TEXT,
  timezone   TEXT DEFAULT 'UTC',
  metadata   JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, name)
);

-- Indexes
CREATE INDEX idx_org_members_user_id ON org_members(user_id);
CREATE INDEX idx_org_members_org_id ON org_members(org_id);
CREATE INDEX idx_plants_org_id ON plants(org_id);

-- ============================================================
-- 3. Backfill — create org + plant per existing user
-- ============================================================

-- For each distinct user_id in lines (i.e., users with data), create an org and plant.
-- For users without data, they'll get an org on next signup/login via the app.

DO $$
DECLARE
  r RECORD;
  new_org_id UUID;
  new_plant_id UUID;
BEGIN
  -- Get all distinct users who have data in any table
  FOR r IN
    SELECT DISTINCT user_id FROM lines
    UNION
    SELECT DISTINCT user_id FROM part_numbers
    UNION
    SELECT DISTINCT user_id FROM production_orders
    UNION
    SELECT DISTINCT user_id FROM api_keys
    UNION
    SELECT DISTINCT user_id FROM webhook_subscriptions
    UNION
    SELECT DISTINCT user_id FROM agent_conversations
    UNION
    SELECT DISTINCT user_id FROM audit_log
  LOOP
    -- Skip if user already has an org membership
    IF EXISTS (SELECT 1 FROM org_members WHERE user_id = r.user_id) THEN
      CONTINUE;
    END IF;

    -- Create organization
    new_org_id := gen_random_uuid();
    INSERT INTO organizations (id, name, slug)
    VALUES (new_org_id, 'My Organization', 'org-' || replace(r.user_id::text, '-', '') );

    -- Create org membership as owner
    INSERT INTO org_members (org_id, user_id, role)
    VALUES (new_org_id, r.user_id, 'owner');

    -- Create default plant
    new_plant_id := gen_random_uuid();
    INSERT INTO plants (id, org_id, name, location)
    VALUES (new_plant_id, new_org_id, 'Main Plant', 'Default');
  END LOOP;
END $$;

-- ============================================================
-- 4. Add org_id to all data tables (nullable first for backfill)
-- ============================================================

ALTER TABLE lines ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE lines ADD COLUMN plant_id UUID REFERENCES plants(id) ON DELETE CASCADE;
ALTER TABLE workstations ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE machines ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE part_numbers ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE items ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE routes ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE units ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE defect_codes ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE production_orders ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE quality_test_definitions ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE agent_conversations ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE audit_log ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE api_keys ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE webhook_subscriptions ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- ============================================================
-- 5. Backfill org_id and plant_id from user → org membership
-- ============================================================

-- Backfill org_id on all tables from user_id → org_members.org_id
UPDATE lines SET org_id = om.org_id, plant_id = (SELECT id FROM plants WHERE org_id = om.org_id LIMIT 1) FROM org_members om WHERE lines.user_id = om.user_id AND lines.org_id IS NULL;
UPDATE workstations SET org_id = om.org_id FROM org_members om WHERE workstations.user_id = om.user_id AND workstations.org_id IS NULL;
UPDATE machines SET org_id = om.org_id FROM org_members om WHERE machines.user_id = om.user_id AND machines.org_id IS NULL;
UPDATE part_numbers SET org_id = om.org_id FROM org_members om WHERE part_numbers.user_id = om.user_id AND part_numbers.org_id IS NULL;
UPDATE items SET org_id = om.org_id FROM org_members om WHERE items.user_id = om.user_id AND items.org_id IS NULL;
UPDATE routes SET org_id = om.org_id FROM org_members om WHERE routes.user_id = om.user_id AND routes.org_id IS NULL;
UPDATE units SET org_id = om.org_id FROM org_members om WHERE units.user_id = om.user_id AND units.org_id IS NULL;
UPDATE defect_codes SET org_id = om.org_id FROM org_members om WHERE defect_codes.user_id = om.user_id AND defect_codes.org_id IS NULL;
UPDATE production_orders SET org_id = om.org_id FROM org_members om WHERE production_orders.user_id = om.user_id AND production_orders.org_id IS NULL;
UPDATE quality_test_definitions SET org_id = om.org_id FROM org_members om WHERE quality_test_definitions.user_id = om.user_id AND quality_test_definitions.org_id IS NULL;
UPDATE agent_conversations SET org_id = om.org_id FROM org_members om WHERE agent_conversations.user_id = om.user_id AND agent_conversations.org_id IS NULL;
UPDATE audit_log SET org_id = om.org_id FROM org_members om WHERE audit_log.user_id = om.user_id AND audit_log.org_id IS NULL;
UPDATE api_keys SET org_id = om.org_id FROM org_members om WHERE api_keys.user_id = om.user_id AND api_keys.org_id IS NULL;
UPDATE webhook_subscriptions SET org_id = om.org_id FROM org_members om WHERE webhook_subscriptions.user_id = om.user_id AND webhook_subscriptions.org_id IS NULL;

-- ============================================================
-- 5b. Safety net — remove orphaned rows that still have NULL org_id
-- ============================================================

DELETE FROM api_keys WHERE org_id IS NULL;
DELETE FROM webhook_subscriptions WHERE org_id IS NULL;
DELETE FROM audit_log WHERE org_id IS NULL;
DELETE FROM agent_conversations WHERE org_id IS NULL;

-- ============================================================
-- 6. Make org_id NOT NULL (after backfill)
-- ============================================================

ALTER TABLE lines ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE lines ALTER COLUMN plant_id SET NOT NULL;
ALTER TABLE workstations ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE machines ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE part_numbers ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE items ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE routes ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE units ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE defect_codes ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE production_orders ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE quality_test_definitions ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE agent_conversations ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE api_keys ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE webhook_subscriptions ALTER COLUMN org_id SET NOT NULL;

-- ============================================================
-- 7. Update unique constraints — (user_id, name) → (org_id, name)
-- ============================================================

ALTER TABLE lines DROP CONSTRAINT lines_user_id_name_key;
ALTER TABLE lines ADD CONSTRAINT lines_org_id_name_key UNIQUE (org_id, name);

ALTER TABLE part_numbers DROP CONSTRAINT part_numbers_user_id_name_key;
ALTER TABLE part_numbers ADD CONSTRAINT part_numbers_org_id_name_key UNIQUE (org_id, name);

ALTER TABLE defect_codes DROP CONSTRAINT defect_codes_user_id_code_key;
ALTER TABLE defect_codes ADD CONSTRAINT defect_codes_org_id_code_key UNIQUE (org_id, code);

ALTER TABLE production_orders DROP CONSTRAINT production_orders_user_id_order_number_key;
ALTER TABLE production_orders ADD CONSTRAINT production_orders_org_id_order_number_key UNIQUE (org_id, order_number);

-- Update units serial uniqueness: (user_id, serial_number) → (org_id, serial_number)
ALTER TABLE units DROP CONSTRAINT units_user_id_serial_number_key;
ALTER TABLE units ADD CONSTRAINT units_org_id_serial_number_key UNIQUE (org_id, serial_number);

-- ============================================================
-- 8. Indexes for org_id lookups
-- ============================================================

CREATE INDEX idx_lines_org_id ON lines(org_id);
CREATE INDEX idx_lines_plant_id ON lines(plant_id);
CREATE INDEX idx_workstations_org_id ON workstations(org_id);
CREATE INDEX idx_machines_org_id ON machines(org_id);
CREATE INDEX idx_part_numbers_org_id ON part_numbers(org_id);
CREATE INDEX idx_items_org_id ON items(org_id);
CREATE INDEX idx_routes_org_id ON routes(org_id);
CREATE INDEX idx_units_org_id ON units(org_id);
CREATE INDEX idx_defect_codes_org_id ON defect_codes(org_id);
CREATE INDEX idx_production_orders_org_id ON production_orders(org_id);
CREATE INDEX idx_quality_test_defs_org_id ON quality_test_definitions(org_id);
CREATE INDEX idx_agent_conversations_org_id ON agent_conversations(org_id);
CREATE INDEX idx_api_keys_org_id ON api_keys(org_id);

-- ============================================================
-- 9. RLS on new tables
-- ============================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE plants ENABLE ROW LEVEL SECURITY;

-- Helper function: check if user is a member of the org
CREATE OR REPLACE FUNCTION user_org_ids()
RETURNS SETOF UUID
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT org_id FROM org_members WHERE user_id = auth.uid();
$$;

-- Helper function: check user's role in an org
CREATE OR REPLACE FUNCTION user_org_role(p_org_id UUID)
RETURNS org_role
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role FROM org_members WHERE user_id = auth.uid() AND org_id = p_org_id LIMIT 1;
$$;

-- Organizations: members can read their orgs; owners/admins can update
CREATE POLICY "Members can read their organizations"
  ON organizations FOR SELECT TO authenticated
  USING (id IN (SELECT user_org_ids()));

CREATE POLICY "Owners can update their organization"
  ON organizations FOR UPDATE TO authenticated
  USING (user_org_role(id) IN ('owner', 'admin'))
  WITH CHECK (user_org_role(id) IN ('owner', 'admin'));

-- Org members: members can see other members in their org
CREATE POLICY "Members can read org members"
  ON org_members FOR SELECT TO authenticated
  USING (org_id IN (SELECT user_org_ids()));

CREATE POLICY "Admins can insert org members"
  ON org_members FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT user_org_ids()) AND user_org_role(org_id) IN ('owner', 'admin'));

CREATE POLICY "Admins can update org members"
  ON org_members FOR UPDATE TO authenticated
  USING (org_id IN (SELECT user_org_ids()) AND user_org_role(org_id) IN ('owner', 'admin'))
  WITH CHECK (org_id IN (SELECT user_org_ids()) AND user_org_role(org_id) IN ('owner', 'admin'));

CREATE POLICY "Admins can delete org members"
  ON org_members FOR DELETE TO authenticated
  USING (org_id IN (SELECT user_org_ids()) AND user_org_role(org_id) IN ('owner', 'admin'));

-- Plants: org members can read; admins can manage
CREATE POLICY "Members can read plants"
  ON plants FOR SELECT TO authenticated
  USING (org_id IN (SELECT user_org_ids()));

CREATE POLICY "Admins can insert plants"
  ON plants FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT user_org_ids()) AND user_org_role(org_id) IN ('owner', 'admin'));

CREATE POLICY "Admins can update plants"
  ON plants FOR UPDATE TO authenticated
  USING (org_id IN (SELECT user_org_ids()) AND user_org_role(org_id) IN ('owner', 'admin'))
  WITH CHECK (org_id IN (SELECT user_org_ids()) AND user_org_role(org_id) IN ('owner', 'admin'));

CREATE POLICY "Admins can delete plants"
  ON plants FOR DELETE TO authenticated
  USING (org_id IN (SELECT user_org_ids()) AND user_org_role(org_id) IN ('owner', 'admin'));

-- ============================================================
-- 10. Rewrite RLS policies — org-based isolation
-- ============================================================

-- ---- Lines ----
DROP POLICY "Users can read own lines" ON lines;
DROP POLICY "Users can insert own lines" ON lines;
DROP POLICY "Users can update own lines" ON lines;
DROP POLICY "Users can delete own lines" ON lines;

CREATE POLICY "Org members can read lines"
  ON lines FOR SELECT TO authenticated
  USING (org_id IN (SELECT user_org_ids()));

CREATE POLICY "Org members can insert lines"
  ON lines FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT user_org_ids()) AND user_org_role(org_id) <> 'viewer');

CREATE POLICY "Admins can update lines"
  ON lines FOR UPDATE TO authenticated
  USING (org_id IN (SELECT user_org_ids()) AND user_org_role(org_id) IN ('owner', 'admin'))
  WITH CHECK (org_id IN (SELECT user_org_ids()) AND user_org_role(org_id) IN ('owner', 'admin'));

CREATE POLICY "Admins can delete lines"
  ON lines FOR DELETE TO authenticated
  USING (org_id IN (SELECT user_org_ids()) AND user_org_role(org_id) IN ('owner', 'admin'));

-- ---- Workstations ----
DROP POLICY "Users can read own workstations" ON workstations;
DROP POLICY "Users can insert own workstations" ON workstations;
DROP POLICY "Users can update own workstations" ON workstations;
DROP POLICY "Users can delete own workstations" ON workstations;

CREATE POLICY "Org members can read workstations"
  ON workstations FOR SELECT TO authenticated
  USING (org_id IN (SELECT user_org_ids()));

CREATE POLICY "Org members can insert workstations"
  ON workstations FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT user_org_ids()) AND user_org_role(org_id) <> 'viewer');

CREATE POLICY "Admins can update workstations"
  ON workstations FOR UPDATE TO authenticated
  USING (org_id IN (SELECT user_org_ids()) AND user_org_role(org_id) IN ('owner', 'admin'))
  WITH CHECK (org_id IN (SELECT user_org_ids()) AND user_org_role(org_id) IN ('owner', 'admin'));

CREATE POLICY "Admins can delete workstations"
  ON workstations FOR DELETE TO authenticated
  USING (org_id IN (SELECT user_org_ids()) AND user_org_role(org_id) IN ('owner', 'admin'));

-- ---- Machines ----
DROP POLICY "Users can read own machines" ON machines;
DROP POLICY "Users can insert own machines" ON machines;
DROP POLICY "Users can update own machines" ON machines;
DROP POLICY "Users can delete own machines" ON machines;

CREATE POLICY "Org members can read machines"
  ON machines FOR SELECT TO authenticated
  USING (org_id IN (SELECT user_org_ids()));

CREATE POLICY "Org members can insert machines"
  ON machines FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT user_org_ids()) AND user_org_role(org_id) <> 'viewer');

CREATE POLICY "Org members can update machines"
  ON machines FOR UPDATE TO authenticated
  USING (org_id IN (SELECT user_org_ids()) AND user_org_role(org_id) <> 'viewer')
  WITH CHECK (org_id IN (SELECT user_org_ids()) AND user_org_role(org_id) <> 'viewer');

CREATE POLICY "Admins can delete machines"
  ON machines FOR DELETE TO authenticated
  USING (org_id IN (SELECT user_org_ids()) AND user_org_role(org_id) IN ('owner', 'admin'));

-- ---- Part Numbers ----
DROP POLICY "Users can read own part_numbers" ON part_numbers;
DROP POLICY "Users can insert own part_numbers" ON part_numbers;
DROP POLICY "Users can update own part_numbers" ON part_numbers;
DROP POLICY "Users can delete own part_numbers" ON part_numbers;

CREATE POLICY "Org members can read part_numbers"
  ON part_numbers FOR SELECT TO authenticated
  USING (org_id IN (SELECT user_org_ids()));

CREATE POLICY "Org members can insert part_numbers"
  ON part_numbers FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT user_org_ids()) AND user_org_role(org_id) <> 'viewer');

CREATE POLICY "Admins can update part_numbers"
  ON part_numbers FOR UPDATE TO authenticated
  USING (org_id IN (SELECT user_org_ids()) AND user_org_role(org_id) IN ('owner', 'admin'))
  WITH CHECK (org_id IN (SELECT user_org_ids()) AND user_org_role(org_id) IN ('owner', 'admin'));

CREATE POLICY "Admins can delete part_numbers"
  ON part_numbers FOR DELETE TO authenticated
  USING (org_id IN (SELECT user_org_ids()) AND user_org_role(org_id) IN ('owner', 'admin'));

-- ---- Items ----
DROP POLICY "Users can read own items" ON items;
DROP POLICY "Users can insert own items" ON items;
DROP POLICY "Users can update own items" ON items;
DROP POLICY "Users can delete own items" ON items;

CREATE POLICY "Org members can read items"
  ON items FOR SELECT TO authenticated
  USING (org_id IN (SELECT user_org_ids()));

CREATE POLICY "Org members can insert items"
  ON items FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT user_org_ids()) AND user_org_role(org_id) <> 'viewer');

CREATE POLICY "Admins can update items"
  ON items FOR UPDATE TO authenticated
  USING (org_id IN (SELECT user_org_ids()) AND user_org_role(org_id) IN ('owner', 'admin'))
  WITH CHECK (org_id IN (SELECT user_org_ids()) AND user_org_role(org_id) IN ('owner', 'admin'));

CREATE POLICY "Admins can delete items"
  ON items FOR DELETE TO authenticated
  USING (org_id IN (SELECT user_org_ids()) AND user_org_role(org_id) IN ('owner', 'admin'));

-- ---- BOM Entries ---- (access via parent part_number org_id)
DROP POLICY "Users can read bom_entries via part_number" ON bom_entries;
DROP POLICY "Users can insert bom_entries via part_number" ON bom_entries;
DROP POLICY "Users can update bom_entries via part_number" ON bom_entries;
DROP POLICY "Users can delete bom_entries via part_number" ON bom_entries;

CREATE POLICY "Org members can read bom_entries"
  ON bom_entries FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM part_numbers WHERE id = bom_entries.part_number_id AND org_id IN (SELECT user_org_ids())));

CREATE POLICY "Org members can insert bom_entries"
  ON bom_entries FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM part_numbers WHERE id = bom_entries.part_number_id AND org_id IN (SELECT user_org_ids())));

CREATE POLICY "Org members can update bom_entries"
  ON bom_entries FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM part_numbers WHERE id = bom_entries.part_number_id AND org_id IN (SELECT user_org_ids())))
  WITH CHECK (EXISTS (SELECT 1 FROM part_numbers WHERE id = bom_entries.part_number_id AND org_id IN (SELECT user_org_ids())));

CREATE POLICY "Org members can delete bom_entries"
  ON bom_entries FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM part_numbers WHERE id = bom_entries.part_number_id AND org_id IN (SELECT user_org_ids())));

-- ---- Routes ----
DROP POLICY "Users can read own routes" ON routes;
DROP POLICY "Users can insert own routes" ON routes;
DROP POLICY "Users can update own routes" ON routes;
DROP POLICY "Users can delete own routes" ON routes;

CREATE POLICY "Org members can read routes"
  ON routes FOR SELECT TO authenticated
  USING (org_id IN (SELECT user_org_ids()));

CREATE POLICY "Org members can insert routes"
  ON routes FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT user_org_ids()) AND user_org_role(org_id) <> 'viewer');

CREATE POLICY "Admins can update routes"
  ON routes FOR UPDATE TO authenticated
  USING (org_id IN (SELECT user_org_ids()) AND user_org_role(org_id) IN ('owner', 'admin'))
  WITH CHECK (org_id IN (SELECT user_org_ids()) AND user_org_role(org_id) IN ('owner', 'admin'));

CREATE POLICY "Admins can delete routes"
  ON routes FOR DELETE TO authenticated
  USING (org_id IN (SELECT user_org_ids()) AND user_org_role(org_id) IN ('owner', 'admin'));

-- ---- Route Steps ---- (access via parent route)
DROP POLICY "Users can read route_steps via route" ON route_steps;
DROP POLICY "Users can insert route_steps via route" ON route_steps;
DROP POLICY "Users can update route_steps via route" ON route_steps;
DROP POLICY "Users can delete route_steps via route" ON route_steps;

CREATE POLICY "Org members can read route_steps"
  ON route_steps FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM routes WHERE id = route_steps.route_id AND org_id IN (SELECT user_org_ids())));

CREATE POLICY "Org members can insert route_steps"
  ON route_steps FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM routes WHERE id = route_steps.route_id AND org_id IN (SELECT user_org_ids())));

CREATE POLICY "Org members can update route_steps"
  ON route_steps FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM routes WHERE id = route_steps.route_id AND org_id IN (SELECT user_org_ids())))
  WITH CHECK (EXISTS (SELECT 1 FROM routes WHERE id = route_steps.route_id AND org_id IN (SELECT user_org_ids())));

CREATE POLICY "Org members can delete route_steps"
  ON route_steps FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM routes WHERE id = route_steps.route_id AND org_id IN (SELECT user_org_ids())));

-- ---- Units ----
DROP POLICY "Users can read own units" ON units;
DROP POLICY "Users can insert own units" ON units;
DROP POLICY "Users can update own units" ON units;
DROP POLICY "Users can delete own units" ON units;

CREATE POLICY "Org members can read units"
  ON units FOR SELECT TO authenticated
  USING (org_id IN (SELECT user_org_ids()));

CREATE POLICY "Operators can insert units"
  ON units FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT user_org_ids()) AND user_org_role(org_id) <> 'viewer');

CREATE POLICY "Operators can update units"
  ON units FOR UPDATE TO authenticated
  USING (org_id IN (SELECT user_org_ids()) AND user_org_role(org_id) <> 'viewer')
  WITH CHECK (org_id IN (SELECT user_org_ids()) AND user_org_role(org_id) <> 'viewer');

CREATE POLICY "Admins can delete units"
  ON units FOR DELETE TO authenticated
  USING (org_id IN (SELECT user_org_ids()) AND user_org_role(org_id) IN ('owner', 'admin'));

-- ---- Unit History ---- (access via parent unit)
DROP POLICY "Users can read unit_history via unit" ON unit_history;
DROP POLICY "Users can insert unit_history via unit" ON unit_history;

CREATE POLICY "Org members can read unit_history"
  ON unit_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM units WHERE id = unit_history.unit_id AND org_id IN (SELECT user_org_ids())));

CREATE POLICY "Operators can insert unit_history"
  ON unit_history FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM units WHERE id = unit_history.unit_id AND org_id IN (SELECT user_org_ids())));

-- ---- Defect Codes ----
DROP POLICY "Users can read own defect_codes" ON defect_codes;
DROP POLICY "Users can insert own defect_codes" ON defect_codes;
DROP POLICY "Users can update own defect_codes" ON defect_codes;
DROP POLICY "Users can delete own defect_codes" ON defect_codes;

CREATE POLICY "Org members can read defect_codes"
  ON defect_codes FOR SELECT TO authenticated
  USING (org_id IN (SELECT user_org_ids()));

CREATE POLICY "Org members can insert defect_codes"
  ON defect_codes FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT user_org_ids()) AND user_org_role(org_id) <> 'viewer');

CREATE POLICY "Admins can update defect_codes"
  ON defect_codes FOR UPDATE TO authenticated
  USING (org_id IN (SELECT user_org_ids()) AND user_org_role(org_id) IN ('owner', 'admin'))
  WITH CHECK (org_id IN (SELECT user_org_ids()) AND user_org_role(org_id) IN ('owner', 'admin'));

CREATE POLICY "Admins can delete defect_codes"
  ON defect_codes FOR DELETE TO authenticated
  USING (org_id IN (SELECT user_org_ids()) AND user_org_role(org_id) IN ('owner', 'admin'));

-- ---- Quality Events ---- (access via parent unit)
DROP POLICY "Users can read quality_events via unit" ON quality_events;
DROP POLICY "Users can insert quality_events via unit" ON quality_events;

CREATE POLICY "Org members can read quality_events"
  ON quality_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM units WHERE id = quality_events.unit_id AND org_id IN (SELECT user_org_ids())));

CREATE POLICY "Operators can insert quality_events"
  ON quality_events FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM units WHERE id = quality_events.unit_id AND org_id IN (SELECT user_org_ids())));

-- ---- Serial Algorithms ---- (access via parent part_number)
DROP POLICY "Users can read serial_algorithms via part_number" ON serial_algorithms;
DROP POLICY "Users can insert serial_algorithms via part_number" ON serial_algorithms;
DROP POLICY "Users can update serial_algorithms via part_number" ON serial_algorithms;

CREATE POLICY "Org members can read serial_algorithms"
  ON serial_algorithms FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM part_numbers WHERE id = serial_algorithms.part_number_id AND org_id IN (SELECT user_org_ids())));

CREATE POLICY "Org members can insert serial_algorithms"
  ON serial_algorithms FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM part_numbers WHERE id = serial_algorithms.part_number_id AND org_id IN (SELECT user_org_ids())));

CREATE POLICY "Org members can update serial_algorithms"
  ON serial_algorithms FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM part_numbers WHERE id = serial_algorithms.part_number_id AND org_id IN (SELECT user_org_ids())))
  WITH CHECK (EXISTS (SELECT 1 FROM part_numbers WHERE id = serial_algorithms.part_number_id AND org_id IN (SELECT user_org_ids())));

-- ---- Production Orders ----
DROP POLICY "Users can read own production_orders" ON production_orders;
DROP POLICY "Users can insert own production_orders" ON production_orders;
DROP POLICY "Users can update own production_orders" ON production_orders;
DROP POLICY "Users can delete own production_orders" ON production_orders;

CREATE POLICY "Org members can read production_orders"
  ON production_orders FOR SELECT TO authenticated
  USING (org_id IN (SELECT user_org_ids()));

CREATE POLICY "Operators can insert production_orders"
  ON production_orders FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT user_org_ids()) AND user_org_role(org_id) <> 'viewer');

CREATE POLICY "Operators can update production_orders"
  ON production_orders FOR UPDATE TO authenticated
  USING (org_id IN (SELECT user_org_ids()) AND user_org_role(org_id) <> 'viewer')
  WITH CHECK (org_id IN (SELECT user_org_ids()) AND user_org_role(org_id) <> 'viewer');

CREATE POLICY "Admins can delete production_orders"
  ON production_orders FOR DELETE TO authenticated
  USING (org_id IN (SELECT user_org_ids()) AND user_org_role(org_id) IN ('owner', 'admin'));

-- ---- Quality Test Definitions ----
DROP POLICY "Users can read own quality_test_definitions" ON quality_test_definitions;
DROP POLICY "Users can insert own quality_test_definitions" ON quality_test_definitions;
DROP POLICY "Users can update own quality_test_definitions" ON quality_test_definitions;
DROP POLICY "Users can delete own quality_test_definitions" ON quality_test_definitions;

CREATE POLICY "Org members can read quality_test_definitions"
  ON quality_test_definitions FOR SELECT TO authenticated
  USING (org_id IN (SELECT user_org_ids()));

CREATE POLICY "Org members can insert quality_test_definitions"
  ON quality_test_definitions FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT user_org_ids()) AND user_org_role(org_id) <> 'viewer');

CREATE POLICY "Admins can update quality_test_definitions"
  ON quality_test_definitions FOR UPDATE TO authenticated
  USING (org_id IN (SELECT user_org_ids()) AND user_org_role(org_id) IN ('owner', 'admin'))
  WITH CHECK (org_id IN (SELECT user_org_ids()) AND user_org_role(org_id) IN ('owner', 'admin'));

CREATE POLICY "Admins can delete quality_test_definitions"
  ON quality_test_definitions FOR DELETE TO authenticated
  USING (org_id IN (SELECT user_org_ids()) AND user_org_role(org_id) IN ('owner', 'admin'));

-- ---- Agent Conversations ----
DROP POLICY "Users can read own conversations" ON agent_conversations;
DROP POLICY "Users can insert own conversations" ON agent_conversations;
DROP POLICY "Users can update own conversations" ON agent_conversations;
DROP POLICY "Users can delete own conversations" ON agent_conversations;

CREATE POLICY "Org members can read conversations"
  ON agent_conversations FOR SELECT TO authenticated
  USING (org_id IN (SELECT user_org_ids()));

CREATE POLICY "Org members can insert conversations"
  ON agent_conversations FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT user_org_ids()));

CREATE POLICY "Org members can update conversations"
  ON agent_conversations FOR UPDATE TO authenticated
  USING (org_id IN (SELECT user_org_ids()))
  WITH CHECK (org_id IN (SELECT user_org_ids()));

CREATE POLICY "Org members can delete conversations"
  ON agent_conversations FOR DELETE TO authenticated
  USING (org_id IN (SELECT user_org_ids()));

-- ---- API Keys ----
DROP POLICY "Users manage their own API keys" ON api_keys;

CREATE POLICY "Admins can manage API keys"
  ON api_keys FOR ALL TO authenticated
  USING (org_id IN (SELECT user_org_ids()) AND user_org_role(org_id) IN ('owner', 'admin'))
  WITH CHECK (org_id IN (SELECT user_org_ids()) AND user_org_role(org_id) IN ('owner', 'admin'));

-- ---- Webhook Subscriptions ----
DROP POLICY "Users manage their own webhooks" ON webhook_subscriptions;

CREATE POLICY "Admins can manage webhooks"
  ON webhook_subscriptions FOR ALL TO authenticated
  USING (org_id IN (SELECT user_org_ids()) AND user_org_role(org_id) IN ('owner', 'admin'))
  WITH CHECK (org_id IN (SELECT user_org_ids()) AND user_org_role(org_id) IN ('owner', 'admin'));

-- ---- MQTT Messages ---- (org-scoped via machine → workstation → line → org)
-- Keep the permissive read for now — MQTT messages are system-ingested
-- Future: add org_id to mqtt_messages

-- ---- Audit Log ---- (keep user_id-based for now — audit entries belong to the acting user)
-- audit_log already has user_id RLS; org_id is informational for cross-org audit queries

-- ============================================================
-- 11. Update SECURITY DEFINER functions for org context
-- ============================================================

-- increment_serial_counter: validate that the calling user's org owns the serial algorithm
CREATE OR REPLACE FUNCTION increment_serial_counter(algo_id UUID, increment INT)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_counter INT;
BEGIN
  -- Validate org ownership via part_number
  IF NOT EXISTS (
    SELECT 1 FROM serial_algorithms sa
    JOIN part_numbers pn ON pn.id = sa.part_number_id
    JOIN org_members om ON om.org_id = pn.org_id AND om.user_id = auth.uid()
    WHERE sa.id = algo_id
  ) THEN
    RAISE EXCEPTION 'Access denied: serial algorithm does not belong to your organization';
  END IF;

  UPDATE serial_algorithms
  SET current_counter = current_counter + increment
  WHERE id = algo_id
  RETURNING current_counter INTO new_counter;
  RETURN new_counter;
END;
$$;

-- increment_order_completed: validate org ownership
CREATE OR REPLACE FUNCTION increment_order_completed(p_order_id UUID)
RETURNS TABLE(new_completed INT, ordered INT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Validate org ownership
  IF NOT EXISTS (
    SELECT 1 FROM production_orders po
    JOIN org_members om ON om.org_id = po.org_id AND om.user_id = auth.uid()
    WHERE po.id = p_order_id
  ) THEN
    RAISE EXCEPTION 'Access denied: production order does not belong to your organization';
  END IF;

  RETURN QUERY
  UPDATE production_orders
  SET quantity_completed = production_orders.quantity_completed + 1,
      status = CASE
        WHEN production_orders.quantity_completed + 1 >= production_orders.quantity_ordered
        THEN 'complete'::production_order_status
        ELSE production_orders.status
      END
  WHERE id = p_order_id
  RETURNING production_orders.quantity_completed, production_orders.quantity_ordered;
END;
$$;

-- ============================================================
-- 12. Helper function — create org on signup (called by app)
-- ============================================================

CREATE OR REPLACE FUNCTION create_org_for_user(
  p_user_id UUID,
  p_org_name TEXT DEFAULT 'My Organization'
)
RETURNS TABLE(org_id UUID, plant_id UUID)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_org_id UUID;
  v_plant_id UUID;
  v_slug TEXT;
BEGIN
  -- Generate slug from user_id
  v_slug := 'org-' || replace(p_user_id::text, '-', '');

  -- Create organization
  v_org_id := gen_random_uuid();
  INSERT INTO organizations (id, name, slug)
  VALUES (v_org_id, p_org_name, v_slug);

  -- Create owner membership
  INSERT INTO org_members (org_id, user_id, role)
  VALUES (v_org_id, p_user_id, 'owner');

  -- Create default plant
  v_plant_id := gen_random_uuid();
  INSERT INTO plants (id, org_id, name)
  VALUES (v_plant_id, v_org_id, 'Main Plant');

  RETURN QUERY SELECT v_org_id, v_plant_id;
END;
$$;

-- ============================================================
-- 13. Update demo cleanup to org-based
-- ============================================================

-- The existing pg_cron job deletes by user created_at.
-- Update to also cascade-delete the org when the owner's account expires.
-- Since org → lines → workstations etc. all cascade, deleting the org cleans everything.
-- The existing cron job can stay as-is since CASCADE from auth.users → org_members will
-- trigger, and we can add a separate cleanup for orphaned orgs.
