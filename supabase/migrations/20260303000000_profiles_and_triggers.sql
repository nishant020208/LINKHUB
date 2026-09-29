-- UnifyHub Profiles and User Setup Migration
-- Creates public.profiles with Row Level Security and binds user creation trigger

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'student' CHECK (role IN ('student', 'pro', 'hybrid')),
    is_onboarded BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS Policies
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Enhanced Trigger on auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user_setup()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Create Profile Row
    INSERT INTO public.profiles (id, email, full_name, avatar_url, role, is_onboarded)
    VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', ''),
        'student',
        FALSE
    )
    ON CONFLICT (id) DO NOTHING;

    -- 2. Create Default User Settings
    INSERT INTO public.user_settings (user_id, theme, default_view)
    VALUES (NEW.id, 'dark', 'today')
    ON CONFLICT (user_id) DO NOTHING;

    -- 3. Create Default Workspaces
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

-- Re-attach trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_setup();
