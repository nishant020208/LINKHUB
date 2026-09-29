import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

/**
 * Initializes the Supabase client if valid environment variables exist,
 * or provides a dummy client so code does not throw in Demo Mode.
 */
const createSafeSupabaseClient = (): SupabaseClient => {
  const url = env.isConfigured.supabase ? env.supabaseUrl : 'https://dummy.supabase.co';
  const key = env.isConfigured.supabase ? env.supabaseAnonKey : 'dummy-anon-key';

  return createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
};

export const supabase = createSafeSupabaseClient();
