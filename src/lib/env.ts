/**
 * Central Environment Configuration Module
 * 
 * Safely validates client-side environment variables and provides
 * flags indicating which third-party integrations are actively configured.
 */

interface EnvConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  appUrl: string;
  demoFallbackEnabled: boolean;
  isConfigured: {
    supabase: boolean;
    google: boolean;
    microsoft: boolean;
    gemini: boolean;
    github: boolean;
    notion: boolean;
    notifications: boolean;
  };
}

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const rawAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const rawAppUrl = import.meta.env.VITE_APP_URL || 'http://localhost:5173';
const rawDemoFallback = import.meta.env.VITE_ENABLE_DEMO_FALLBACK !== 'false';

// Validates whether Supabase credentials look real vs placeholders
const hasValidSupabase = Boolean(
  rawSupabaseUrl &&
  rawAnonKey &&
  !rawSupabaseUrl.includes('your-project-id') &&
  !rawAnonKey.includes('your-anon-key')
);

export const env: EnvConfig = {
  supabaseUrl: rawSupabaseUrl,
  supabaseAnonKey: rawAnonKey,
  appUrl: rawAppUrl,
  demoFallbackEnabled: rawDemoFallback,
  isConfigured: {
    supabase: hasValidSupabase,
    google: false, // Edge Functions handle server-side keys
    microsoft: false,
    gemini: false,
    github: false,
    notion: false,
    notifications: false,
  },
};

/**
 * Helper to determine if the application is currently running in Demo Mode
 */
export const isDemoMode = (): boolean => {
  return !env.isConfigured.supabase || env.demoFallbackEnabled;
};
