-- Migration: Audit log table for tracking user and agent actions
-- Captures every tool invocation with caller identity and context

-- ============================================================
-- 1. Enum type
-- ============================================================

CREATE TYPE actor_type AS ENUM ('user', 'agent');

-- ============================================================
-- 2. Table
-- ============================================================

CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor actor_type NOT NULL DEFAULT 'user',
  agent_name text,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. Indexes
-- ============================================================

CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX idx_audit_log_actor ON audit_log(actor);

-- ============================================================
-- 4. Row Level Security
-- ============================================================

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own audit_log"
  ON audit_log FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own audit_log"
  ON audit_log FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Audit log entries are immutable — no update or delete policies

-- ============================================================
-- 5. Realtime (for live ticker)
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE audit_log;
