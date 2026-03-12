-- Migration 013: Disable demo data cleanup cron job
-- The automatic 7-day data deletion is no longer needed.

SELECT cron.unschedule('demo-data-cleanup');
