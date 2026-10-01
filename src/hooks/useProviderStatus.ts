import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

export interface ProviderStatusEntry {
  configured: boolean;
  auth: 'oauth' | 'token' | 'credentials';
  missing: string[];
}

/**
 * Fetches which providers have their Supabase secrets set. The Integrations
 * page uses this to show a real "Not configured" state and to disable the
 * Connect button BEFORE any network call, so an unconfigured provider can
 * never fall through to a generic Edge Function error.
 *
 * Returns `undefined` from isConfigured() while loading or if the status
 * function is unreachable — callers should then allow the attempt, and the
 * oauth-start function still answers with a specific `not_configured` message.
 */
export function useProviderStatus() {
  const query = useQuery({
    queryKey: queryKeys.providerStatus,
    queryFn: async (): Promise<Record<string, ProviderStatusEntry>> => {
      const { data, error } = await supabase.functions.invoke('provider-status');
      if (error) throw error;
      return (data?.providers ?? {}) as Record<string, ProviderStatusEntry>;
    },
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const isConfigured = (key: string): boolean | undefined => {
    const entry = query.data?.[key];
    if (!entry) return undefined;
    // User-supplied credential flows never depend on server secrets.
    if (entry.auth === 'token' || entry.auth === 'credentials') return true;
    return entry.configured;
  };

  return {
    statuses: query.data ?? {},
    isLoading: query.isLoading,
    isUnavailable: query.isError,
    isConfigured,
  };
}
