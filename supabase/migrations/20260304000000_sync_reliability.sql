-- UnifyHub Phase 10: Sync reliability + layout persistence
-- 1) Record which OAuth scopes the provider actually granted so the UI can
--    pinpoint "missing scope" failures per data stream.
ALTER TABLE public.connected_accounts
  ADD COLUMN IF NOT EXISTS granted_scopes TEXT[] DEFAULT ARRAY[]::TEXT[];

-- 2) Persist dashboard widget ordering per user (drag-to-reorder).
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS widget_order JSONB DEFAULT '{}'::JSONB;

-- Index to make the status panel's "latest log per stream" lookup fast.
CREATE INDEX IF NOT EXISTS idx_sync_logs_data_type
  ON public.sync_logs (account_id, data_type, created_at DESC);
