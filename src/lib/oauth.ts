import { supabase } from '@/lib/supabase';
import { FunctionsHttpError } from '@supabase/supabase-js';
import type { AccountProvider } from '@/types';

/**
 * Kick off the OAuth connect/reconnect flow for a provider.
 * Extracted from ConnectModal so any surface (stream cards, account drawers,
 * settings) can start or re-authorize an account with one call.
 *
 * Redirects the browser to the provider consent screen on success.
 * Throws a user-readable Error on failure.
 */
export async function startProviderOAuth(provider: AccountProvider): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;

  if (!accessToken) {
    throw new Error('You must be signed in to connect accounts. Please sign in first.');
  }

  const { data, error: fnError } = await supabase.functions.invoke('oauth-start', {
    body: { provider },
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (fnError) {
    // The Edge Function replied with a real error body. Read IT — FunctionsHttpError
    // .message is only the generic "non-2xx status code" wrapper, never the reason.
    if (fnError instanceof FunctionsHttpError) {
      const detail = await fnError.context.json().catch(() => null);
      const real = detail?.message || detail?.error;
      if (detail?.error === 'not_configured') {
        throw new Error(
          `${provider} OAuth keys are not configured yet. Add the client ID/secret to Supabase Edge Function secrets.`
        );
      }
      throw new Error(real || `${provider} connection failed on the server.`);
    }
    // No reply from the function at all — network/DNS/env problem.
    throw new Error(
      'Cannot reach the server. Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set, then redeploy.'
    );
  }

  if (!data?.url) {
    if (data?.error === 'not_configured') {
      throw new Error(
        `${provider} OAuth keys are not configured yet. Add the client ID/secret to Supabase Edge Function secrets.`
      );
    }
    throw new Error(data?.error || 'OAuth start function returned no redirect URL');
  }

  // Send the user to the provider consent screen.
  window.location.href = data.url;
}
