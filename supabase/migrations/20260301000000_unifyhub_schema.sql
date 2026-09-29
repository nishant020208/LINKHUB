-- UnifyHub Database Migration Schema with Strict Row Level Security (RLS)
-- Enables UUID generation and cryptographic extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. CONNECTED ACCOUNTS
-- Stores user-linked third-party integrations (Google, Microsoft, Canvas, etc.)
-- Refresh tokens are stored encrypted using AES-GCM via Edge Functions
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.connected_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    email TEXT NOT NULL,
    label TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#38bdf8',
    encrypted_refresh_token TEXT,
    status TEXT NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'needs_reconnect', 'syncing', 'error', 'paused')),
    error_message TEXT,
    sync_enabled_types TEXT[] DEFAULT ARRAY['email', 'event', 'deadline', 'task', 'file'],
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, provider, email)
);

ALTER TABLE public.connected_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own connected accounts"
    ON public.connected_accounts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own connected accounts"
    ON public.connected_accounts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own connected accounts"
    ON public.connected_accounts FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own connected accounts"
    ON public.connected_accounts FOR DELETE
    USING (auth.uid() = user_id);


-- ============================================================================
-- 2. INTEGRATIONS CATALOG
-- Global registry of supported integration adapters and their permission scopes
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    auth_type TEXT NOT NULL CHECK (auth_type IN ('oauth', 'token', 'url', 'credentials')),
    scopes TEXT[] DEFAULT ARRAY[]::TEXT[],
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

-- Integrations catalog is readable by authenticated users
CREATE POLICY "Public read access for enabled integrations catalog"
    ON public.integrations FOR SELECT
    TO authenticated
    USING (enabled = true);


-- ============================================================================
-- 3. ITEMS (The Unified Canonical Record)
-- Normalized representation of mail, events, deadlines, tasks, and cloud files
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.connected_accounts(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('email', 'event', 'deadline', 'task', 'file')),
    title TEXT NOT NULL,
    description TEXT,
    due_at TIMESTAMPTZ,
    start_at TIMESTAMPTZ,
    end_at TIMESTAMPTZ,
    url TEXT,
    source_id TEXT NOT NULL,
    priority_score INTEGER NOT NULL DEFAULT 50 CHECK (priority_score >= 0 AND priority_score <= 100),
    is_done BOOLEAN NOT NULL DEFAULT FALSE,
    snoozed_until TIMESTAMPTZ,
    raw JSONB DEFAULT '{}'::JSONB,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(account_id, source_id)
);

ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own items"
    ON public.items FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own items"
    ON public.items FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own items"
    ON public.items FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own items"
    ON public.items FOR DELETE
    USING (auth.uid() = user_id);

-- Performance indexes for dashboard filtering and deadline ordering
CREATE INDEX IF NOT EXISTS idx_items_user_due ON public.items(user_id, due_at ASC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_items_user_start ON public.items(user_id, start_at ASC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_items_user_type_done ON public.items(user_id, type, is_done);
CREATE INDEX IF NOT EXISTS idx_items_account ON public.items(account_id);


-- ============================================================================
-- 4. PINNED ITEMS
-- Shortcuts for quick-access files, course syllabi, and active notes
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.pinned_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, item_id)
);

ALTER TABLE public.pinned_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their pinned items"
    ON public.pinned_items FOR ALL
    USING (auth.uid() = user_id);


-- ============================================================================
-- 5. WORKSPACES
-- User-defined views (College, Work, Personal, etc.) filtering accounts and types
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT 'Layers',
    account_ids UUID[] DEFAULT ARRAY[]::UUID[],
    included_types TEXT[] DEFAULT ARRAY['email', 'event', 'deadline', 'task', 'file'],
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, slug)
);

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their workspaces"
    ON public.workspaces FOR ALL
    USING (auth.uid() = user_id);


-- ============================================================================
-- 6. USER SETTINGS
-- Dashboard personalization, quiet hours, and AI briefing preferences
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    theme TEXT NOT NULL DEFAULT 'dark' CHECK (theme IN ('dark', 'light', 'system')),
    default_view TEXT NOT NULL DEFAULT 'today' CHECK (default_view IN ('today', 'deadlines', 'calendar', 'files')),
    quiet_hours_start TIME DEFAULT '22:00:00',
    quiet_hours_end TIME DEFAULT '08:00:00',
    email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    push_notifications BOOLEAN NOT NULL DEFAULT FALSE,
    weekly_digest_day INTEGER DEFAULT 1 CHECK (weekly_digest_day BETWEEN 0 AND 6),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their settings"
    ON public.user_settings FOR ALL
    USING (auth.uid() = user_id);


-- ============================================================================
-- 7. REMINDERS
-- Smart scheduled alerts (24h, 3h, 30m prior to due dates)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
    remind_at TIMESTAMPTZ NOT NULL,
    channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'web_push', 'telegram', 'sms', 'whatsapp')),
    sent BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their reminders"
    ON public.reminders FOR ALL
    USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_reminders_pending ON public.reminders(remind_at) WHERE sent = FALSE;


-- ============================================================================
-- 8. NOTIFICATION CHANNELS
-- Configured webhook destinations and tokens for push, telegram, SMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notification_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    channel TEXT NOT NULL CHECK (channel IN ('email', 'web_push', 'telegram', 'sms', 'whatsapp')),
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    target_address TEXT,
    config JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, channel)
);

ALTER TABLE public.notification_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their notification channels"
    ON public.notification_channels FOR ALL
    USING (auth.uid() = user_id);


-- ============================================================================
-- 9. SYNC LOGS & 10. AUDIT LOG
-- Operational logging for sync intervals and security auditing
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.connected_accounts(id) ON DELETE SET NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'partial_error', 'failed')),
    items_synced INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their sync logs"
    ON public.sync_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}'::JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their audit log"
    ON public.audit_log FOR SELECT
    USING (auth.uid() = user_id);


-- ============================================================================
-- AUTOMATED USER ONBOARDING TRIGGER
-- Provisions default workspaces and settings when a new user registers
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user_setup()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Create Default Settings
    INSERT INTO public.user_settings (user_id, theme, default_view)
    VALUES (NEW.id, 'dark', 'today')
    ON CONFLICT (user_id) DO NOTHING;

    -- 2. Create Default Workspaces
    INSERT INTO public.workspaces (user_id, name, slug, icon, is_default, included_types)
    VALUES
        (NEW.id, 'All Combined', 'all', 'Layers', TRUE, ARRAY['email', 'event', 'deadline', 'task', 'file']),
        (NEW.id, 'College & Courses', 'college', 'GraduationCap', FALSE, ARRAY['deadline', 'event', 'file', 'task']),
        (NEW.id, 'Tech Work', 'work', 'Briefcase', FALSE, ARRAY['email', 'event', 'deadline', 'task', 'file']),
        (NEW.id, 'Personal Life', 'personal', 'User', FALSE, ARRAY['email', 'event', 'deadline', 'file'])
    ON CONFLICT (user_id, slug) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_setup();
