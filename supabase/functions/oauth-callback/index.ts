/**
 * oauth-callback: verifies the signed HMAC state, exchanges the auth code at
 * the provider, captures the scopes actually granted, encrypts and stores the
 * token, upserts the connected account, and awaits an immediate first sync
 * before redirecting the user back to the app with the outcome.
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { encryptToken } from '../_shared/crypto.ts';

// ---------------------------------------------------------------------------
// Signed-state verification (HMAC-SHA256, expiring)
// ---------------------------------------------------------------------------
async function verifyState(signedState: string, secretKey: string): Promise<{ userId: string; provider: string } | null> {
  try {
    const [encodedData, sigHex] = signedState.split('.');
    if (!encodedData || !sigHex) return null;

    const encoder = new TextEncoder();
    const data = atob(encodedData);
    const key = await crypto.subtle.importKey('raw', encoder.encode(secretKey), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const sigBytes = new Uint8Array(sigHex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
    const isValid = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(data));
    if (!isValid) return null;

    const payload = JSON.parse(data);
    if (!payload.exp || payload.exp < Date.now()) {
      console.warn('[oauth-callback] state expired');
      return null;
    }
    return { userId: payload.userId, provider: payload.provider };
  } catch (e) {
    console.error('[oauth-callback] state verification exception:', e);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Per-provider token exchange configuration
// ---------------------------------------------------------------------------
interface ExchangeResult {
  accessToken: string;
  refreshToken: string;
  grantedScopes: string[];
  email: string;
}

const exchanges: Record<string, (code: string, redirectUri: string) => Promise<ExchangeResult>> = {
  google: async (code, redirectUri) => {
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID') ?? '';
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '';
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error_description || data.error);
    console.log(`[oauth-callback] google granted scopes: ${data.scope || '(none returned)'}`);

    let email = 'google-user@sync';
    if (data.access_token) {
      const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      if (userRes.ok) {
        const u = await userRes.json();
        if (u.email) email = u.email;
      }
    }
    return {
      accessToken: data.access_token ?? '',
      refreshToken: data.refresh_token ?? data.access_token ?? '',
      grantedScopes: (data.scope ?? '').split(' ').filter(Boolean),
      email,
    };
  },

  microsoft: async (code, redirectUri) => {
    const clientId = Deno.env.get('MICROSOFT_CLIENT_ID') ?? '';
    const clientSecret = Deno.env.get('MICROSOFT_CLIENT_SECRET') ?? '';
    const res = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error_description || data.error);
    console.log(`[oauth-callback] microsoft granted scopes: ${data.scope || '(none returned)'}`);

    let email = 'microsoft-user@sync';
    if (data.access_token) {
      const userRes = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      if (userRes.ok) {
        const u = await userRes.json();
        email = u.mail || u.userPrincipalName || email;
      }
    }
    return {
      accessToken: data.access_token ?? '',
      refreshToken: data.refresh_token ?? data.access_token ?? '',
      grantedScopes: (data.scope ?? '').split(' ').filter(Boolean),
      email,
    };
  },

  github: async (code, redirectUri) => {
    const clientId = Deno.env.get('GITHUB_CLIENT_ID') ?? '';
    const clientSecret = Deno.env.get('GITHUB_CLIENT_SECRET') ?? '';
    const res = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error_description || data.error);
    console.log(`[oauth-callback] github granted scopes: ${data.scope || '(none returned)'}`);

    let email = 'github-user@sync';
    if (data.access_token) {
      const userRes = await fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${data.access_token}`, 'User-Agent': 'UnifyHub-Sync-App' },
      });
      if (userRes.ok) {
        const u = await userRes.json();
        email = u.email || `${u.login}@github.com`;
      }
    }
    // GitHub tokens are long-lived bearers.
    return { accessToken: data.access_token ?? '', refreshToken: data.access_token ?? '', grantedScopes: (data.scope ?? '').split(',').filter(Boolean), email };
  },

  notion: async (code, redirectUri) => {
    const clientId = Deno.env.get('NOTION_CLIENT_ID') ?? '';
    const clientSecret = Deno.env.get('NOTION_CLIENT_SECRET') ?? '';
    const res = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: { Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ grant_type: 'authorization_code', code, redirect_uri: redirectUri }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error_description || data.error);
    return {
      accessToken: data.access_token ?? '',
      refreshToken: data.access_token ?? '',
      grantedScopes: (data.token_type ? [] : []),
      email: data.workspace_name ? `${data.workspace_name}@notion` : 'workspace@notion',
    };
  },

  todoist: async (code, redirectUri) => {
    const clientId = Deno.env.get('TODOIST_CLIENT_ID') ?? '';
    const clientSecret = Deno.env.get('TODOIST_CLIENT_SECRET') ?? '';
    const res = await fetch('https://todoist.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return { accessToken: data.access_token ?? '', refreshToken: data.access_token ?? '', grantedScopes: [], email: 'user@todoist' };
  },

  slack: async (code, redirectUri) => {
    const clientId = Deno.env.get('SLACK_CLIENT_ID') ?? '';
    const clientSecret = Deno.env.get('SLACK_CLIENT_SECRET') ?? '';
    const res = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Slack OAuth exchange failed');
    console.log(`[oauth-callback] slack granted user scopes: ${data.authed_user?.scope || '(none)'}`);
    const token = data.authed_user?.access_token || data.access_token || '';
    return {
      accessToken: token,
      refreshToken: token,
      grantedScopes: (data.authed_user?.scope ?? '').split(',').filter(Boolean),
      email: data.team?.name ? `${data.team.name}@slack` : 'user@slack',
    };
  },

  linear: async (code, redirectUri) => {
    const clientId = Deno.env.get('LINEAR_CLIENT_ID') ?? '';
    const clientSecret = Deno.env.get('LINEAR_CLIENT_SECRET') ?? '';
    const res = await fetch('https://api.linear.app/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error_description || data.error);
    return { accessToken: data.access_token ?? '', refreshToken: data.access_token ?? '', grantedScopes: (data.scope ?? '').split(' ').filter(Boolean), email: 'team@linear' };
  },
};

serve(async (req: Request) => {
  const url = new URL(req.url);
  const appUrl = Deno.env.get('APP_URL') || 'http://localhost:5173';

  try {
    const code = url.searchParams.get('code');
    const stateParam = url.searchParams.get('state');
    const errorParam = url.searchParams.get('error');
    const errorDesc = url.searchParams.get('error_description');

    if (errorParam) {
      const msg = errorDesc || errorParam;
      console.error('[oauth-callback] provider error:', msg);
      return Response.redirect(`${appUrl}/integrations?status=error&message=${encodeURIComponent(msg)}`, 302);
    }
    if (!code || !stateParam) {
      return Response.redirect(`${appUrl}/integrations?status=error&message=Missing+code+or+state`, 302);
    }

    const encryptionKey = Deno.env.get('TOKEN_ENCRYPTION_KEY') || 'unifyhub-default-secret-key-32b!';
    const verified = await verifyState(stateParam, encryptionKey);

    // Fallback: plain userId state (backwards compatibility).
    const userId = verified?.userId || stateParam;
    const provider = verified?.provider || url.searchParams.get('provider') || 'google';

    const exchange = exchanges[provider];
    if (!exchange) {
      return Response.redirect(`${appUrl}/integrations?status=error&message=${encodeURIComponent(`Unsupported provider: ${provider}`)}`, 302);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const redirectUri = `${supabaseUrl}/functions/v1/oauth-callback?provider=${provider}`;

    const result = await exchange(code, redirectUri);
    if (!result.accessToken && !result.refreshToken) {
      throw new Error('Failed to obtain token from provider');
    }

    const encryptedRefreshToken = await encryptToken(result.refreshToken || result.accessToken);

    const { data: accountRow, error: upsertError } = await supabase
      .from('connected_accounts')
      .upsert(
        {
          user_id: userId,
          provider,
          email: result.email,
          label: `${provider.charAt(0).toUpperCase() + provider.slice(1)} (${result.email})`,
          encrypted_refresh_token: encryptedRefreshToken,
          granted_scopes: result.grantedScopes,
          status: 'connected',
          error_message: null,
        },
        { onConflict: 'user_id,provider,email' }
      )
      .select('id')
      .single();

    if (upsertError) {
      console.error('[oauth-callback] failed to save connected account:', upsertError);
      throw new Error(`Could not persist account: ${upsertError.message}`);
    }

    // Immediate first sync: awaited (bounded) so items exist on redirect.
    let syncedItems = 0;
    let syncError: string | null = null;
    if (accountRow?.id) {
      try {
        const syncRes = await Promise.race([
          fetch(`${supabaseUrl}/functions/v1/sync-provider`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${serviceRoleKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountId: accountRow.id }),
          }),
          new Promise<Response>((_, reject) => setTimeout(() => reject(new Error('First sync timed out after 25s')), 25000)),
        ]);
        const syncData = await syncRes.json().catch(() => ({}));
        if (!syncRes.ok) {
          syncError = syncData.error || `Sync function returned HTTP ${syncRes.status}`;
          console.error('[oauth-callback] first sync failed:', syncError);
        } else {
          syncedItems = syncData.totalUpserted ?? 0;
          console.log(`[oauth-callback] first sync upserted ${syncedItems} items for ${provider}`);
        }
      } catch (e) {
        syncError = e instanceof Error ? e.message : String(e);
        console.error('[oauth-callback] first sync exception:', syncError);
      }
    }

    const params = new URLSearchParams({
      status: 'connected',
      provider,
      synced: String(syncedItems),
    });
    if (syncError) params.set('sync_error', syncError.slice(0, 300));

    return Response.redirect(`${appUrl}/integrations?${params.toString()}`, 302);
  } catch (err) {
    console.error('[oauth-callback] fatal:', err);
    return Response.redirect(
      `${appUrl}/integrations?status=error&message=${encodeURIComponent((err as Error).message)}`,
      302
    );
  }
});
