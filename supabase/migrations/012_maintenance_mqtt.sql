-- Migration 012: Maintenance Requests & MQTT org-scoping
-- Creates maintenance_requests table for corrective/preventive maintenance tracking.
-- Adds org_id + user_id to mqtt_messages for multi-tenant isolation.
-- Adds RLS policies and Realtime publication for both tables.

-- ============================================================
-- 1. Maintenance Requests table
-- ============================================================

CREATE TABLE maintenance_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id   UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('corrective', 'preventive')),
  priority     TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status       TEXT NOT NULL CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')) DEFAULT 'open',
  description  TEXT,
  user_id      UUID REFERENCES auth.users(id),
  org_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_maintenance_requests_machine_id ON maintenance_requests(machine_id);
CREATE INDEX idx_maintenance_requests_status ON maintenance_requests(status);
CREATE INDEX idx_maintenance_requests_org_id ON maintenance_requests(org_id);

-- ============================================================
-- 2. Add org_id and user_id to mqtt_messages
-- ============================================================

ALTER TABLE mqtt_messages ADD COLUMN user_id UUID REFERENCES auth.users(id);
ALTER TABLE mqtt_messages ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Backfill org_id from machine → workstation → line → org
UPDATE mqtt_messages SET org_id = l.org_id
FROM machines m
JOIN workstations w ON w.id = m.workstation_id
JOIN lines l ON l.id = w.line_id
WHERE mqtt_messages.machine_id = m.id AND mqtt_messages.org_id IS NULL;

CREATE INDEX idx_mqtt_messages_org_id ON mqtt_messages(org_id);

-- ============================================================
-- 3. RLS — maintenance_requests (org-scoped, M6 pattern)
-- ============================================================

ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;

-- SELECT: any org member can read
CREATE POLICY "Org members can read maintenance_requests"
  ON maintenance_requests FOR SELECT TO authenticated
  USING (org_id IN (SELECT user_org_ids()));

-- INSERT: operator+ can create
CREATE POLICY "Operators can insert maintenance_requests"
  ON maintenance_requests FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT user_org_ids()) AND user_org_role(org_id) <> 'viewer');

-- UPDATE: operator+ can update
CREATE POLICY "Operators can update maintenance_requests"
  ON maintenance_requests FOR UPDATE TO authenticated
  USING (org_id IN (SELECT user_org_ids()) AND user_org_role(org_id) <> 'viewer')
  WITH CHECK (org_id IN (SELECT user_org_ids()) AND user_org_role(org_id) <> 'viewer');

-- DELETE: admin+ can delete
CREATE POLICY "Admins can delete maintenance_requests"
  ON maintenance_requests FOR DELETE TO authenticated
  USING (org_id IN (SELECT user_org_ids()) AND user_org_role(org_id) IN ('owner', 'admin'));

-- ============================================================
-- 4. RLS — mqtt_messages (upgrade from permissive to org-scoped)
-- ============================================================

-- Drop old permissive policy
DROP POLICY "Authenticated users can read mqtt_messages" ON mqtt_messages;

-- SELECT: org members can read their org's messages (or messages without org_id for backwards compat)
CREATE POLICY "Org members can read mqtt_messages"
  ON mqtt_messages FOR SELECT TO authenticated
  USING (org_id IS NULL OR org_id IN (SELECT user_org_ids()));

-- INSERT: operator+ can insert (for simulator / edge functions)
CREATE POLICY "Operators can insert mqtt_messages"
  ON mqtt_messages FOR INSERT TO authenticated
  WITH CHECK (org_id IN (SELECT user_org_ids()) AND user_org_role(org_id) <> 'viewer');

-- ============================================================
-- 5. Realtime publication
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE maintenance_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE mqtt_messages;
