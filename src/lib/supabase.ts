import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

/**
 * Resilient storage adapter that falls back to in-memory store
 * when localStorage is restricted (e.g. mobile private browsing, third-party sandboxes).
 */
const createSafeStorage = () => {
  const memoryStore = new Map<string, string>();
  return {
    getItem: (key: string): string | null => {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
      } catch {
        // Fall back to memoryStore
      }
      return memoryStore.get(key) || null;
    },
    setItem: (key: string, value: string): void => {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
          return;
        }
      } catch {
        // Fall back to memoryStore
      }
      memoryStore.set(key, value);
    },
    removeItem: (key: string): void => {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        }
      } catch {
        // Fall back to memoryStore
      }
      memoryStore.delete(key);
    },
  };
};

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
      storage: createSafeStorage(),
    },
  });
};

export const supabase = createSafeSupabaseClient();
