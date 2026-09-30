/**
 * Shared token-resolution helper used by every sync function.
 *
 * Strategy per provider:
 *  - google / microsoft: true OAuth refresh_token grant against the provider's
 *    token endpoint. Falls back to reusing the stored encrypted token when no
 *    refresh secret is configured (e.g. token saved at connect time).
 *  - github / notion / todoist / linear / slack: long-lived bearer tokens;
 *    decrypt and reuse.
 *  - ical: the stored value is the feed URL, returned as `accessToken`.
 *
 * Never throws into the caller's stream logic: failures return
 * `{ ok: false, error, needsReconnect }` so sync functions can mark the
 * account deterministically.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { decryptToken } from './crypto.ts';

export interface TokenResolution {
  ok: boolean;
  accessToken: string;
  error: string | null;
  needsReconnect: boolean;
}

interface AccountRow {
  id: string;
  user_id: string;
  provider: string;
  email: string;
  encrypted_refresh_token: string | null;
}

const LONG_LIVED_PROVIDERS = new Set([
  'github',
  'notion',
  'todoist',
  'linear',
  'slack',
  'ical',
]);

function providerEnv(provider: string): { endpoint: string; clientId: string; clientSecret: string } {
  switch (provider) {
    case 'google':
      return {
        endpoint: 'https://oauth2.googleapis.com/token',
        clientId: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
        clientSecret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
      };
    case 'microsoft':
      return {
        endpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        clientId: Deno.env.get('MICROSOFT_CLIENT_ID') ?? '',
        clientSecret: Deno.env.get('MICROSOFT_CLIENT_SECRET') ?? '',
      };
    default:
      return { endpoint: '', clientId: '', clientSecret: '' };
  }
}

export async function resolveAccessToken(
  account: AccountRow
): Promise<TokenResolution> {
  const encrypted = account.encrypted_refresh_token ?? '';
  if (!encrypted) {
    return { ok: false, accessToken: '', error: 'No stored credential for this account', needsReconnect: true };
  }

  let plainToken: string;
  try {
    plainToken = await decryptToken(encrypted);
  } catch (err) {
    return {
      ok: false,
      accessToken: '',
      error: `Token decryption failed (${err instanceof Error ? err.message : String(err)})`,
      needsReconnect: true,
    };
  }

  // iCal: stored value is the feed URL itself.
  if (account.provider === 'ical') {
    return { ok: plainToken.startsWith('http'), accessToken: plainToken, error: plainToken.startsWith('http') ? null : 'Stored iCal URL is invalid', needsReconnect: !plainToken.startsWith('http') };
  }

  if (LONG_LIVED_PROVIDERS.has(account.provider)) {
    return { ok: Boolean(plainToken), accessToken: plainToken, error: plainToken ? null : 'Stored token is empty', needsReconnect: !plainToken };
  }

  // True OAuth refresh for google / microsoft.
  const { endpoint, clientId, clientSecret } = providerEnv(account.provider);
  if (!endpoint || !clientId || !clientSecret) {
    // Secrets not configured: reuse whatever token we stored at connect time.
    if (plainToken) {
      console.warn(`[TokenRefresh] ${account.provider} secrets missing; reusing stored token`);
      return { ok: true, accessToken: plainToken, error: null, needsReconnect: false };
    }
    return { ok: false, accessToken: '', error: `Missing OAuth client secrets for ${account.provider}`, needsReconnect: true };
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: plainToken,
        grant_type: 'refresh_token',
      }),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      const detail = data.error_description || data.error || `HTTP ${res.status}`;
      console.error(`[TokenRefresh] ${account.provider} refresh failed: ${detail}`);
      return {
        ok: false,
        accessToken: '',
        error: `Token refresh rejected: ${detail}`,
        needsReconnect: res.status === 400 || res.status === 401,
      };
    }

    return { ok: true, accessToken: data.access_token as string, error: null, needsReconnect: false };
  } catch (err) {
    return {
      ok: false,
      accessToken: '',
      error: `Token refresh network error: ${err instanceof Error ? err.message : String(err)}`,
      needsReconnect: false,
    };
  }
}

/**
 * Convenience wrapper: load the account row with the service-role client and
 * resolve a working access token. On failure, updates the account row
 * (needs_reconnect + error message) before returning.
 */
export async function loadAccountWithToken(
  admin: ReturnType<typeof createClient>,
  accountId: string
): Promise<{ account: AccountRow | null; token: TokenResolution | null; errorResponse?: Record<string, unknown> }> {
  const { data: account, error } = await admin
    .from('connected_accounts')
    .select('id, user_id, provider, email, encrypted_refresh_token, granted_scopes, sync_enabled_types, status')
    .eq('id', accountId)
    .single();

  if (error || !account) {
    return { account: null, token: null, errorResponse: { error: 'Account not found' } };
  }

  const token = await resolveAccessToken(account as AccountRow);
  if (!token.ok) {
    await admin
      .from('connected_accounts')
      .update({
        status: token.needsReconnect ? 'needs_reconnect' : 'error',
        error_message: token.error,
      })
      .eq('id', accountId);
    return { account: account as AccountRow, token, errorResponse: { error: token.error, status: 'needs_reconnect' } };
  }

  return { account: account as AccountRow, token };
}
