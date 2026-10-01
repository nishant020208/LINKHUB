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
  googleSiteVerification: string;
  demoFallbackEnabled: boolean;
  isConfigured: {
    supabase: boolean;
    google: boolean;
    gemini: boolean;
    github: boolean;
    notion: boolean;
    notifications: boolean;
  };
}

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const rawAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const rawAppUrl = import.meta.env.VITE_APP_URL || 'http://localhost:5173';
const rawGoogleSiteVerification = import.meta.env.VITE_GOOGLE_SITE_VERIFICATION || '';

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
  googleSiteVerification: rawGoogleSiteVerification,
  demoFallbackEnabled: false,
  isConfigured: {
    // Server-side OAuth secrets live in Supabase Edge Function secrets, never
    // in the browser bundle. The real per-provider configured state is fetched
    // at runtime from the `provider-status` Edge Function (see useProviderStatus).
    supabase: hasValidSupabase,
    google: false,
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
  return false;
};
