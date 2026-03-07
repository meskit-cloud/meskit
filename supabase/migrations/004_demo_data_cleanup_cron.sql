-- Migration: Demo environment — auto-delete user data after 7 days
-- Requires pg_cron extension (enabled on Supabase Pro+ plans, or manually on self-hosted)
--
-- Strategy:
--   1. Delete from root tables where the owning user signed up > 7 days ago
--   2. ON DELETE CASCADE handles all child tables automatically
--   3. Runs daily at 03:00 UTC
--
-- Root tables (have user_id, parent-level — cascades clean children):
--   lines        → workstations, machines
--   part_numbers  → bom_entries, routes → route_steps, serial_algorithms, units → unit_history, quality_events
--   items         (standalone)
--   defect_codes  (standalone)
--   agent_conversations (standalone)
--   audit_log     (standalone)

-- Enable pg_cron if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Grant usage so the cron job can execute
GRANT USAGE ON SCHEMA cron TO postgres;

-- Create the cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_expired_demo_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cutoff timestamptz := now() - interval '7 days';
  expired_users uuid[];
BEGIN
  -- Find users whose accounts are older than 7 days
  SELECT array_agg(id) INTO expired_users
  FROM auth.users
  WHERE created_at < cutoff;

  -- Nothing to clean
  IF expired_users IS NULL OR array_length(expired_users, 1) IS NULL THEN
    RETURN;
  END IF;

  -- Delete from root tables — cascades handle children
  DELETE FROM lines WHERE user_id = ANY(expired_users);
  DELETE FROM part_numbers WHERE user_id = ANY(expired_users);
  DELETE FROM items WHERE user_id = ANY(expired_users);
  DELETE FROM defect_codes WHERE user_id = ANY(expired_users);
  DELETE FROM agent_conversations WHERE user_id = ANY(expired_users);
  DELETE FROM audit_log WHERE user_id = ANY(expired_users);

  -- Delete machines not attached to a workstation (ON DELETE SET NULL case)
  DELETE FROM machines WHERE user_id = ANY(expired_users);

  RAISE LOG 'demo cleanup: purged data for % expired users (cutoff: %)',
    array_length(expired_users, 1), cutoff;
END;
$$;

-- Schedule: run daily at 03:00 UTC
SELECT cron.schedule(
  'demo-data-cleanup',
  '0 3 * * *',
  'SELECT public.cleanup_expired_demo_data()'
);
