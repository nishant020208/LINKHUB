-- Enhancement migration to support granular per-data-type sync tracking and status reporting
ALTER TABLE public.sync_logs
  ADD COLUMN IF NOT EXISTS data_type TEXT,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS items_fetched INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS items_upserted INTEGER DEFAULT 0;

-- Ensure users can read and insert into sync_logs for their own account
CREATE POLICY "Users can insert their own sync logs"
    ON public.sync_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Add index for fast querying of recent sync logs per account
CREATE INDEX IF NOT EXISTS idx_sync_logs_account_created
    ON public.sync_logs (account_id, created_at DESC);
