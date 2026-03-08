-- Migration 008: API Keys and Webhook Subscriptions
-- Enables programmatic access to MESkit via REST API and event webhooks.

-- --- API Keys ---
-- key_hash: SHA-256 of the raw key (raw key shown once at creation, never stored)
-- scopes: array of allowed tool names, or ['*'] for full access

CREATE TABLE IF NOT EXISTS api_keys (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  key_hash     TEXT NOT NULL UNIQUE,
  scopes       TEXT[] NOT NULL DEFAULT ARRAY['*'],
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  last_used_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own API keys"
  ON api_keys FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- --- Webhook Subscriptions ---
-- events: array of event names to subscribe to, or ['*'] for all events
-- Valid event names: unit_moved, quality_event, machine_status_change
-- secret: used for HMAC-SHA256 request signing (X-Webhook-Signature header)

CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  url        TEXT NOT NULL,
  events     TEXT[] NOT NULL DEFAULT ARRAY['*'],
  secret     TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE webhook_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own webhooks"
  ON webhook_subscriptions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for API key lookup by hash (hot path on every REST request)
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys (key_hash) WHERE is_active = TRUE;
-- Index for webhook lookup by user
CREATE INDEX IF NOT EXISTS idx_webhooks_user ON webhook_subscriptions (user_id) WHERE is_active = TRUE;
