-- UnifyHub Phase 12: Smart Weekly Digest
-- Stores cross-ecosystem AI syntheses generated weekly or on-demand.

CREATE TABLE IF NOT EXISTS public.weekly_digests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  title TEXT NOT NULL,
  summary_markdown TEXT NOT NULL,
  stats JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start_date)
);

-- Enable Row Level Security
ALTER TABLE public.weekly_digests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own weekly digests"
  ON public.weekly_digests
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own weekly digests"
  ON public.weekly_digests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weekly digests"
  ON public.weekly_digests
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own weekly digests"
  ON public.weekly_digests
  FOR DELETE
  USING (auth.uid() = user_id);

-- Performance Index
CREATE INDEX IF NOT EXISTS idx_weekly_digests_user_date
  ON public.weekly_digests (user_id, week_start_date DESC);
