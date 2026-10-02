-- Migration: 20260306000000_full_content_deep_sync.sql
-- Description: Foundation schema for full-content deep synchronization across all providers.
-- Adds item_contents, item_attachments, item_comments, storage bucket with strict RLS,
-- per-user & per-account storage tracking, and data retention settings.

-- 1. Storage bucket for binary attachments, images, and downloaded files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('unifyhub-content', 'unifyhub-content', false, 52428800, null)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies: Users can only read, insert, update, delete objects in their own {user_id}/ folder
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users can access their own unifyhub content'
    ) THEN
        CREATE POLICY "Users can access their own unifyhub content"
            ON storage.objects FOR ALL
            TO authenticated
            USING (bucket_id = 'unifyhub-content' AND auth.uid()::text = (storage.foldername(name))[1])
            WITH CHECK (bucket_id = 'unifyhub-content' AND auth.uid()::text = (storage.foldername(name))[1]);
    END IF;
END $$;

-- 2. ITEM CONTENTS (Full bodies: Plain text, sanitized HTML, Markdown, and structured JSON)
CREATE TABLE IF NOT EXISTS public.item_contents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.connected_accounts(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE UNIQUE,
    body_text TEXT,
    body_html TEXT,
    body_markdown TEXT,
    structured_content JSONB DEFAULT '{}'::JSONB,
    sync_status TEXT NOT NULL DEFAULT 'synced' CHECK (sync_status IN ('synced', 'partial', 'skipped', 'too_large', 'error')),
    skip_reason TEXT,
    content_size_bytes BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.item_contents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own item contents"
    ON public.item_contents FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own item contents"
    ON public.item_contents FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own item contents"
    ON public.item_contents FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own item contents"
    ON public.item_contents FOR DELETE
    USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_item_contents_item_id ON public.item_contents(item_id);
CREATE INDEX IF NOT EXISTS idx_item_contents_user_id ON public.item_contents(user_id);
CREATE INDEX IF NOT EXISTS idx_item_contents_account_id ON public.item_contents(account_id);
CREATE INDEX IF NOT EXISTS idx_item_contents_search ON public.item_contents USING gin(to_tsvector('english', coalesce(body_text, '')));

-- 3. ITEM ATTACHMENTS (Files, documents, images)
CREATE TABLE IF NOT EXISTS public.item_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.connected_accounts(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    mime_type TEXT,
    size_bytes BIGINT NOT NULL DEFAULT 0,
    storage_path TEXT,
    external_url TEXT,
    is_inline BOOLEAN NOT NULL DEFAULT FALSE,
    content_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.item_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own item attachments"
    ON public.item_attachments FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own item attachments"
    ON public.item_attachments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own item attachments"
    ON public.item_attachments FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own item attachments"
    ON public.item_attachments FOR DELETE
    USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_item_attachments_item_id ON public.item_attachments(item_id);
CREATE INDEX IF NOT EXISTS idx_item_attachments_user_id ON public.item_attachments(user_id);

-- 4. ITEM COMMENTS (Issue discussions, task notes, pull request reviews, Slack thread replies)
CREATE TABLE IF NOT EXISTS public.item_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.connected_accounts(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
    author_name TEXT,
    author_avatar TEXT,
    body TEXT NOT NULL,
    body_html TEXT,
    source_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.item_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own item comments"
    ON public.item_comments FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own item comments"
    ON public.item_comments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own item comments"
    ON public.item_comments FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own item comments"
    ON public.item_comments FOR DELETE
    USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_item_comments_item_id ON public.item_comments(item_id);
CREATE INDEX IF NOT EXISTS idx_item_comments_user_id ON public.item_comments(user_id);

-- 5. STORAGE & SYNC METRICS IN CONNECTED ACCOUNTS
ALTER TABLE public.connected_accounts ADD COLUMN IF NOT EXISTS storage_used_bytes BIGINT NOT NULL DEFAULT 0;
ALTER TABLE public.connected_accounts ADD COLUMN IF NOT EXISTS items_total_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.connected_accounts ADD COLUMN IF NOT EXISTS items_full_synced_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.connected_accounts ADD COLUMN IF NOT EXISTS items_skipped_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.connected_accounts ADD COLUMN IF NOT EXISTS skip_reasons JSONB DEFAULT '{}'::JSONB;

-- 6. STORAGE QUOTA & RETENTION IN USER SETTINGS
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS storage_used_bytes BIGINT NOT NULL DEFAULT 0;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS storage_limit_bytes BIGINT NOT NULL DEFAULT 1073741824;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS data_retention_days INTEGER NOT NULL DEFAULT 0;
