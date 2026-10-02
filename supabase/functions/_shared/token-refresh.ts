/**
 * Shared token-resolution helper used by every sync function.
 *
 * Credentials are stored as an encrypted JSON blob:
 *   { access_token, refresh_token, refreshable, ...extra }
 * Older rows that stored a raw token string still work — the resolver detects
 * a non-JSON payload and treats it as a long-lived bearer token.
 *
 * Providers with short-lived access tokens get a real refresh_token grant
 * against their documented endpoint (Google form body, Jira JSON body,
 * Dropbox/Asana form body). Providers with long-lived bearer tokens are
 * decrypted and reused.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { decryptToken, encryptToken } from './crypto.ts';

export interface TokenResolution {
  ok: boolean;
  accessToken: string;
  error: string | null;
  needsReconnect: boolean;
  /** True when a fresh access token was obtained via refresh */
  refreshed?: boolean;
  /** Present when a refresh token is available (either rotated or preserved) */
  newRefreshToken?: string;
  /** Extra credential fields carried from connect time (e.g. Jira cloud_id). */
  extra?: Record<string, string>;
}

interface AccountRow {
  id: string;
  user_id: string;
  provider: string;
  email: string;
  encrypted_refresh_token: string | null;
}

interface Credential {
  access_token: string;
  refresh_token: string;
  refreshable: boolean;
  extra: Record<string, string>;
}

function parseCredential(plain: string): Credential {
  try {
    const parsed = JSON.parse(plain);
    if (parsed && typeof parsed === 'object' && (parsed.access_token || parsed.refresh_token)) {
      return {
        access_token: String(parsed.access_token ?? ''),
        refresh_token: String(parsed.refresh_token ?? ''),
        refreshable: Boolean(parsed.refreshable),
        extra: Object.fromEntries(
          Object.entries(parsed).filter(([k]) => !['access_token', 'refresh_token', 'refreshable'].includes(k))
        ) as Record<string, string>,
      };
    }
  } catch {
    // Not JSON — legacy raw token.
  }
  return { access_token: plain, refresh_token: plain, refreshable: false, extra: {} };
}

interface RefreshOutcome {
  accessToken: string;
  refreshToken?: string;
}

/**
 * Perform a provider's documented refresh grant. Returns null when the
 * provider is not refreshable or its secrets are missing (caller then falls
 * back to the stored bearer token).
 */
async function refreshAccessToken(provider: string, credential: Credential): Promise<RefreshOutcome | null> {
  const refreshToken = credential.refresh_token;
  if (!refreshToken) return null;

  const form = (endpoint: string, body: Record<string, string>, headers: Record<string, string> = {}) =>
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...headers },
      body: new URLSearchParams(body),
    });

  let res: Response | null = null;
  switch (provider) {
    case 'google': {
      const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
      const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
      if (!clientId || !clientSecret) return null;
      res = await form('https://oauth2.googleapis.com/token', {
        client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token',
      });
      break;
    }
    case 'jira': {
      const clientId = Deno.env.get('JIRA_CLIENT_ID');
      const clientSecret = Deno.env.get('JIRA_CLIENT_SECRET');
      if (!clientId || !clientSecret) return null;
      res = await fetch('https://auth.atlassian.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grant_type: 'refresh_token', client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken }),
      });
      break;
    }
    case 'asana': {
      const clientId = Deno.env.get('ASANA_CLIENT_ID');
      const clientSecret = Deno.env.get('ASANA_CLIENT_SECRET');
      if (!clientId || !clientSecret) return null;
      res = await form('https://app.asana.com/-/oauth_token', {
        grant_type: 'refresh_token', client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken,
      });
      break;
    }
    case 'dropbox': {
      const clientId = Deno.env.get('DROPBOX_CLIENT_ID');
      const clientSecret = Deno.env.get('DROPBOX_CLIENT_SECRET');
      if (!clientId || !clientSecret) return null;
      res = await form('https://api.dropboxapi.com/oauth2/token', {
        grant_type: 'refresh_token', refresh_token: refreshToken, client_id: clientId, client_secret: clientSecret,
      });
      break;
    }
    default:
      return null;
  }

  if (!res) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    const detail = data.error_description || data.error || `HTTP ${res.status}`;
    throw new Error(`Token refresh rejected: ${detail}`);
  }
  if (!data.access_token) throw new Error('Token refresh returned no access_token.');
  return { accessToken: data.access_token, refreshToken: data.refresh_token };
}

export async function resolveAccessToken(account: AccountRow): Promise<TokenResolution> {
  const encrypted = account.encrypted_refresh_token ?? '';
  if (!encrypted) {
    return { ok: false, accessToken: '', error: 'No stored credential for this account', needsReconnect: true };
  }

  let credential: Credential;
  try {
    credential = parseCredential(await decryptToken(encrypted));
  } catch (err) {
    return {
      ok: false,
      accessToken: '',
      error: `Token decryption failed (${err instanceof Error ? err.message : String(err)})`,
      needsReconnect: true,
    };
  }

  const bearer = credential.access_token || credential.refresh_token;

  if (!credential.refreshable) {
    return {
      ok: Boolean(bearer),
      accessToken: bearer,
      error: bearer ? null : 'Stored token is empty',
      needsReconnect: !bearer,
      extra: credential.extra,
    };
  }

  try {
    const outcome = await refreshAccessToken(account.provider, credential);
    if (!outcome) {
      // Missing client secrets or unsupported provider:
      const clientId = account.provider === 'google' ? Deno.env.get('GOOGLE_CLIENT_ID') : true;
      const clientSecret = account.provider === 'google' ? Deno.env.get('GOOGLE_CLIENT_SECRET') : true;

      if (!clientId || !clientSecret) {
        return {
          ok: false,
          accessToken: '',
          error: `Google OAuth secrets (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET) are missing in Supabase Edge Functions. Reconnect after configuring secrets.`,
          needsReconnect: true,
        };
      }

      return {
        ok: false,
        accessToken: '',
        error: `Stored credentials for ${account.provider} have expired and require reconnection.`,
        needsReconnect: true,
      };
    }
    return {
      ok: true,
      accessToken: outcome.accessToken,
      error: null,
      needsReconnect: false,
      refreshed: true,
      newRefreshToken: outcome.refreshToken || credential.refresh_token,
      extra: credential.extra,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      accessToken: '',
      error: message,
      // Explicit rejections mean the grant is dead; network blips do not.
      needsReconnect: /rejected|invalid|revoked|expired|invalid_grant/i.test(message),
    };
  }
}

/**
 * Convenience wrapper: load the account row with the service-role client and
 * resolve a working access token. On failure, updates the account row
 * (needs_reconnect + error message) before returning. On a successful refresh,
 * persists the new access token and refresh token back to the database.
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

  // Persist the refreshed access token and refresh token so the database retains the latest working credential
  if (token.refreshed && token.accessToken) {
    try {
      const encrypted = await encryptToken(
        JSON.stringify({
          access_token: token.accessToken,
          refresh_token: token.newRefreshToken || '',
          refreshable: true,
          ...(token.extra ?? {}),
        })
      );
      await admin
        .from('connected_accounts')
        .update({
          encrypted_refresh_token: encrypted,
          status: 'connected',
          error_message: null,
        })
        .eq('id', accountId);
    } catch (err) {
      console.error('[TokenRefresh] failed to persist refreshed token:', err);
    }
  } else if (token.ok && (account as any).status !== 'connected') {
    // Self-heal account status if credentials are confirmed working
    try {
      await admin
        .from('connected_accounts')
        .update({ status: 'connected', error_message: null })
        .eq('id', accountId);
    } catch (err) {
      console.error('[TokenRefresh] failed to reset account status:', err);
    }
  }

  return { account: account as AccountRow, token };
}
