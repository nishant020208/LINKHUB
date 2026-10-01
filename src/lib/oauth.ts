import { supabase } from '@/lib/supabase';
import { FunctionsHttpError } from '@supabase/supabase-js';
import type { AccountProvider } from '@/types';

/**
 * Read a real error message out of a failed `functions.invoke` call.
 *
 * supabase-js collapses any non-2xx into `FunctionsHttpError.message ===
 * "Edge Function returned a non-2xx status code"`, which tells the user
 * nothing. The Edge Functions always return a JSON body with `message`/
 * `error`, so we read THAT instead — for every provider, configured or not.
 */
export async function describeFunctionError(
  error: unknown,
  fallback: string
): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    const detail = await error.context.json().catch(() => null);
    if (detail?.message) return String(detail.message);
    if (detail?.error) return String(detail.error);
    return fallback;
  }
  if (error instanceof Error && error.message) {
    // Network/DNS/undeployed function: surface something actionable.
    return `${fallback} (${error.message})`;
  }
  return fallback;
}

/**
 * Kick off the OAuth connect/reconnect flow for a provider.
 * Redirects the browser to the provider consent screen on success.
 * Throws a user-readable Error on failure — never the generic wrapper text.
 */
export async function startProviderOAuth(provider: AccountProvider): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;

  if (!accessToken) {
    throw new Error('You must be signed in to connect accounts. Please sign in first.');
  }

  const { data, error: fnError } = await supabase.functions.invoke('oauth-start', {
    body: { provider },
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (fnError) {
    throw new Error(
      await describeFunctionError(
        fnError,
        `Couldn't start the ${provider} connection. Check the Supabase Edge Function logs.`
      )
    );
  }

  if (!data?.url) {
    throw new Error(data?.message || data?.error || `${provider} authorization returned no redirect URL.`);
  }

  window.location.href = data.url;
}

/**
 * Save credentials for the non-OAuth providers (Moodle token, Custom IMAP).
 * Returns normally on success; throws a specific Error otherwise.
 */
export async function connectWithCredentials(
  provider: 'moodle' | 'imap' | 'trello',
  credentials: Record<string, string>
): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;

  if (!accessToken) {
    throw new Error('You must be signed in to connect accounts. Please sign in first.');
  }

  const { data, error: fnError } = await supabase.functions.invoke('connect-credentials', {
    body: { provider, credentials },
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (fnError) {
    throw new Error(
      await describeFunctionError(
        fnError,
        `Couldn't save the ${provider} connection. Check your details and try again.`
      )
    );
  }
  if (data?.error) {
    throw new Error(String(data.message || data.error));
  }
}
