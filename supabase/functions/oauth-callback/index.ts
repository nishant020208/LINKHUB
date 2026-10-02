/**
 * oauth-callback: the single shared redirect URI for every OAuth provider
 * (no query string — the provider is recovered from the signed state).
 *
 * It verifies the signed state, runs the provider's REAL documented token
 * exchange, captures the scopes actually granted, encrypts and stores the
 * credential, upserts the connected account, and awaits a bounded first sync
 * before redirecting back to the app.
 *
 * Every failure path produces a specific message that reaches the app banner —
 * never a bare "non-2xx status code".
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { decryptToken, encryptToken } from '../_shared/crypto.ts';
import { verifyState } from '../_shared/state.ts';
import { providerName, sharedCallbackUrl } from '../_shared/providers.ts';

// Providers that have a real sync function deployed today.
const SYNC_IMPLEMENTED = new Set([
  'google',
  'github',
  'notion',
  'todoist',
  'slack',
  'linear',
  'jira',
  'asana',
  'clickup',
  'dropbox',
]);

interface ExchangeResult {
  accessToken: string;
  refreshToken: string;
  grantedScopes: string[];
  email: string;
  /** True when the provider issues short-lived tokens + a refresh token. */
  refreshable: boolean;
  /** Extra credential fields persisted alongside the tokens (e.g. Jira cloudId). */
  extra?: Record<string, string>;
}

function basicAuth(id: string, secret: string): string {
  return `Basic ${btoa(`${id}:${secret}`)}`;
}

async function readJson(res: Response): Promise<Record<string, any>> {
  return await res.json().catch(() => ({}));
}

const exchanges: Record<string, (code: string, redirectUri: string) => Promise<ExchangeResult>> = {
  google: async (code, redirectUri) => {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
        client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const data = await readJson(res);
    if (!res.ok || data.error) throw new Error(data.error_description || data.error || `Google token endpoint returned HTTP ${res.status}`);
    if (!data.access_token) throw new Error('Google returned no access_token.');

    let email = 'google-user@sync';
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    if (userRes.ok) {
      const u = await readJson(userRes);
      if (u.email) email = u.email;
    }
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? '',
      grantedScopes: String(data.scope ?? '').split(' ').filter(Boolean),
      email,
      refreshable: true,
    };
  },

  github: async (code, redirectUri) => {
    const res = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({
        client_id: Deno.env.get('GITHUB_CLIENT_ID') ?? '',
        client_secret: Deno.env.get('GITHUB_CLIENT_SECRET') ?? '',
        code,
        redirect_uri: redirectUri,
      }),
    });
    const data = await readJson(res);
    if (!res.ok || data.error) throw new Error(data.error_description || data.error || `GitHub token endpoint returned HTTP ${res.status}`);
    if (!data.access_token) throw new Error('GitHub returned no access_token.');

    let email = 'github-user@sync';
    const userRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${data.access_token}`, 'User-Agent': 'UnifyHub-Sync-App' },
    });
    if (userRes.ok) {
      const u = await readJson(userRes);
      email = u.email || `${u.login}@github.com`;
    }
    // GitHub OAuth tokens are long-lived bearer tokens.
    return {
      accessToken: data.access_token,
      refreshToken: data.access_token,
      grantedScopes: String(data.scope ?? '').split(',').filter(Boolean),
      email,
      refreshable: false,
    };
  },

  notion: async (code, redirectUri) => {
    // Notion exchange uses HTTP Basic auth (client id : secret) + JSON body.
    const res = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        Authorization: basicAuth(Deno.env.get('NOTION_CLIENT_ID') ?? '', Deno.env.get('NOTION_CLIENT_SECRET') ?? ''),
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({ grant_type: 'authorization_code', code, redirect_uri: redirectUri }),
    });
    const data = await readJson(res);
    if (!res.ok || data.error) throw new Error(data.error_description || data.error || `Notion token endpoint returned HTTP ${res.status}`);
    if (!data.access_token) throw new Error('Notion returned no access_token.');
    // Notion returns the workspace, not a user email, and no scope list.
    return {
      accessToken: data.access_token,
      refreshToken: data.access_token,
      grantedScopes: [],
      email: data.workspace_name ? `${data.workspace_name}@notion` : 'workspace@notion',
      refreshable: false,
    };
  },

  todoist: async (code, redirectUri) => {
    const res = await fetch('https://todoist.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: Deno.env.get('TODOIST_CLIENT_ID') ?? '',
        client_secret: Deno.env.get('TODOIST_CLIENT_SECRET') ?? '',
        code,
        redirect_uri: redirectUri,
      }),
    });
    const data = await readJson(res);
    if (!res.ok || data.error) throw new Error(data.error || `Todoist token endpoint returned HTTP ${res.status}`);
    if (!data.access_token) throw new Error('Todoist returned no access_token.');
    return {
      accessToken: data.access_token,
      refreshToken: data.access_token,
      grantedScopes: [],
      email: 'user@todoist',
      refreshable: false,
    };
  },

  slack: async (code, redirectUri) => {
    const res = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: Deno.env.get('SLACK_CLIENT_ID') ?? '',
        client_secret: Deno.env.get('SLACK_CLIENT_SECRET') ?? '',
        code,
        redirect_uri: redirectUri,
      }),
    });
    const data = await readJson(res);
    if (!res.ok || !data.ok) {
      throw new Error(data.error || `Slack OAuth exchange failed (HTTP ${res.status})`);
    }
    // With user_scope, the user token lives at authed_user.access_token.
    const token = data.authed_user?.access_token || '';
    if (!token) throw new Error('Slack returned no user access token. Ensure user_scope is requested.');
    return {
      accessToken: token,
      refreshToken: token,
      grantedScopes: String(data.authed_user?.scope ?? '').split(',').filter(Boolean),
      email: data.team?.name ? `${data.team.name}@slack` : 'user@slack',
      refreshable: false,
    };
  },

  linear: async (code, redirectUri) => {
    const res = await fetch('https://api.linear.app/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: Deno.env.get('LINEAR_CLIENT_ID') ?? '',
        client_secret: Deno.env.get('LINEAR_CLIENT_SECRET') ?? '',
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const data = await readJson(res);
    if (!res.ok || data.error) throw new Error(data.error_description || data.error || `Linear token endpoint returned HTTP ${res.status}`);
    if (!data.access_token) throw new Error('Linear returned no access_token.');
    return {
      accessToken: data.access_token,
      refreshToken: data.access_token,
      grantedScopes: String(data.scope ?? '').split(' ').filter(Boolean),
      email: 'team@linear',
      refreshable: false,
    };
  },

  jira: async (code, redirectUri) => {
    const res = await fetch('https://auth.atlassian.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: Deno.env.get('JIRA_CLIENT_ID') ?? '',
        client_secret: Deno.env.get('JIRA_CLIENT_SECRET') ?? '',
        code,
        redirect_uri: redirectUri,
      }),
    });
    const data = await readJson(res);
    if (!res.ok || data.error) throw new Error(data.error_description || data.error || `Jira token endpoint returned HTTP ${res.status}`);
    if (!data.access_token) throw new Error('Jira returned no access_token.');

    // Jira 3LO: resolve the cloudId of the first accessible site.
    let cloudId = '';
    let email = 'jira-user@sync';
    const resourcesRes = await fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
      headers: { Authorization: `Bearer ${data.access_token}`, Accept: 'application/json' },
    });
    if (resourcesRes.ok) {
      const resources = await readJson(resourcesRes);
      if (Array.isArray(resources) && resources.length > 0) {
        cloudId = String(resources[0].id || '');
        email = String(resources[0].url || '').replace(/^https?:\/\//, '') || email;
      }
    }
    if (!cloudId) {
      throw new Error('Jira authorized but no accessible Atlassian site was returned. Grant access to at least one Jira site.');
    }
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? '',
      grantedScopes: String(data.scope ?? '').split(' ').filter(Boolean),
      email,
      refreshable: true,
      extra: { cloud_id: cloudId },
    };
  },

  asana: async (code, redirectUri) => {
    const res = await fetch('https://app.asana.com/-/oauth_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: Deno.env.get('ASANA_CLIENT_ID') ?? '',
        client_secret: Deno.env.get('ASANA_CLIENT_SECRET') ?? '',
        redirect_uri: redirectUri,
        code,
      }),
    });
    const data = await readJson(res);
    if (!res.ok || data.error) throw new Error(data.error_description || data.error || `Asana token endpoint returned HTTP ${res.status}`);
    if (!data.access_token) throw new Error('Asana returned no access_token.');

    let email = 'user@asana';
    const meRes = await fetch('https://app.asana.com/api/1.0/users/me', {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    if (meRes.ok) {
      const me = await readJson(meRes);
      if (me.data?.email) email = me.data.email;
    }
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? '',
      grantedScopes: [],
      email,
      refreshable: Boolean(data.refresh_token),
    };
  },

  clickup: async (code, redirectUri) => {
    const res = await fetch(`https://api.clickup.com/api/v2/oauth/token?${new URLSearchParams({
      client_id: Deno.env.get('CLICKUP_CLIENT_ID') ?? '',
      client_secret: Deno.env.get('CLICKUP_CLIENT_SECRET') ?? '',
      code,
      redirect_uri: redirectUri,
    })}`, { method: 'POST' });
    const data = await readJson(res);
    if (!res.ok || data.err) throw new Error(data.err || `ClickUp token endpoint returned HTTP ${res.status}`);
    if (!data.access_token) throw new Error('ClickUp returned no access_token.');
    return {
      accessToken: data.access_token,
      refreshToken: data.access_token,
      grantedScopes: [],
      email: 'user@clickup',
      refreshable: false,
    };
  },

  dropbox: async (code, redirectUri) => {
    const res = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        client_id: Deno.env.get('DROPBOX_CLIENT_ID') ?? '',
        client_secret: Deno.env.get('DROPBOX_CLIENT_SECRET') ?? '',
      }),
    });
    const data = await readJson(res);
    if (!res.ok || data.error) throw new Error(data.error_description || data.error || `Dropbox token endpoint returned HTTP ${res.status}`);
    if (!data.access_token) throw new Error('Dropbox returned no access_token.');
    if (!data.refresh_token) {
      throw new Error('Dropbox returned no refresh_token. Ensure token_access_type=offline is set on the authorize URL.');
    }

    let email = 'user@dropbox';
    const meRes = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
      method: 'POST',
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    if (meRes.ok) {
      const me = await readJson(meRes);
      if (me.email) email = me.email;
    }
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      grantedScopes: [],
      email,
      refreshable: true,
    };
  },
};

serve(async (req: Request) => {
  const url = new URL(req.url);
  // Strip a trailing slash so redirects never become `https://app//integrations`.
  const appUrl = (Deno.env.get('APP_URL') || 'http://localhost:5173').replace(/\/+$/, '');
  const fail = (message: string, provider?: string) => {
    console.error(`[oauth-callback] ${provider ?? ''} error: ${message}`);
    const params = new URLSearchParams({ status: 'error', message });
    if (provider) params.set('provider', provider);
    return Response.redirect(`${appUrl}/integrations?${params.toString()}`, 302);
  };

  try {
    const code = url.searchParams.get('code');
    const stateParam = url.searchParams.get('state');
    const errorParam = url.searchParams.get('error');
    const errorDesc = url.searchParams.get('error_description');

    const verified = stateParam ? await verifyState(stateParam) : null;
    const provider = verified?.provider ?? '';
    const providerLabel = provider ? providerName(provider) : 'This provider';

    if (errorParam) {
      return fail(`${providerLabel} authorization was declined: ${errorDesc || errorParam}`, provider || undefined);
    }
    if (!stateParam || !verified) {
      return fail('Invalid or expired authorization state. Start the connection again from the Integrations page.');
    }
    if (!code) {
      return fail(`No authorization code was returned by ${providerLabel}.`, provider);
    }

    const exchange = exchanges[provider];
    if (!exchange) {
      return fail(`${providerLabel} is not a supported OAuth provider.`, provider);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!supabaseUrl || !serviceRoleKey) {
      return fail('Server is missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY, so credentials cannot be saved.', provider);
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    let result: ExchangeResult;
    try {
      result = await exchange(code, sharedCallbackUrl());
    } catch (err) {
      return fail(err instanceof Error ? err.message : String(err), provider);
    }

    if (!result.accessToken && !result.refreshToken) {
      return fail(`${providerLabel} returned no usable token.`, provider);
    }

    // Preserve existing refresh token if provider (e.g. Google) did not return a new one on re-auth.
    let finalRefreshToken = result.refreshToken;
    if (!finalRefreshToken && result.refreshable) {
      try {
        const { data: existingAcc } = await supabase
          .from('connected_accounts')
          .select('encrypted_refresh_token')
          .eq('user_id', verified.userId)
          .eq('provider', provider)
          .eq('email', result.email)
          .maybeSingle();

        if (existingAcc?.encrypted_refresh_token) {
          const plain = await decryptToken(existingAcc.encrypted_refresh_token);
          const parsed = JSON.parse(plain);
          if (parsed && typeof parsed === 'object' && parsed.refresh_token && parsed.refresh_token !== parsed.access_token) {
            finalRefreshToken = parsed.refresh_token;
            console.log(`[OAuthCallback] preserved existing refresh_token for ${provider} (${result.email})`);
          }
        }
      } catch (err) {
        console.warn('[OAuthCallback] could not inspect existing token for refresh preservation:', err);
      }
    }

    if (!finalRefreshToken) {
      finalRefreshToken = result.refreshToken || result.accessToken;
    }

    // Store a JSON credential so refresh tokens, bearer tokens, and extra
    // fields (Jira cloud_id) all travel together. Older raw-token rows keep
    // working — the token resolver handles both shapes.
    const credential = JSON.stringify({
      access_token: result.accessToken,
      refresh_token: finalRefreshToken,
      refreshable: result.refreshable,
      ...(result.extra ?? {}),
    });
    const encryptedRefreshToken = await encryptToken(credential);

    const { data: accountRow, error: upsertError } = await supabase
      .from('connected_accounts')
      .upsert(
        {
          user_id: verified.userId,
          provider,
          email: result.email,
          label: `${providerLabel} (${result.email})`,
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
      return fail(`Could not save the ${providerLabel} account: ${upsertError.message}`, provider);
    }

    let syncedItems = 0;
    let syncError: string | null = null;
    if (accountRow?.id && SYNC_IMPLEMENTED.has(provider)) {
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
          syncError = syncData.error || `Sync returned HTTP ${syncRes.status}`;
          console.error(`[oauth-callback] first sync failed: ${syncError}`);
        } else {
          syncedItems = syncData.totalUpserted ?? 0;
        }
      } catch (e) {
        syncError = e instanceof Error ? e.message : String(e);
        console.error('[oauth-callback] first sync exception:', syncError);
      }
    }

    const params = new URLSearchParams({ status: 'connected', provider, synced: String(syncedItems) });
    if (syncError) params.set('sync_error', syncError.slice(0, 300));
    return Response.redirect(`${appUrl}/integrations?${params.toString()}`, 302);
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err));
  }
});
