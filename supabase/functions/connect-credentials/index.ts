/**
 * connect-credentials: persists non-code-exchange connections.
 *
 *  - Moodle LMS  → portal base URL + personal web-service token
 *  - Custom IMAP → host, port, username, app password (encrypted at rest)
 *
 * These are NOT oauth-start/oauth-callback flows: there is no code exchange and
 * no provider redirect URI. The credential is encrypted with the same
 * TOKEN_ENCRYPTION_KEY used for OAuth tokens and stored on connected_accounts,
 * then made available to the sync layer via the shared token resolver.
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { encryptToken } from '../_shared/crypto.ts';
import { providerName } from '../_shared/providers.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ALLOWED = new Set(['moodle', 'imap']);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function hostOf(value: string): string {
  try {
    return new URL(value.startsWith('http') ? value : `https://${value}`).host;
  } catch {
    return 'unknown';
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    if (!authHeader) return json({ error: 'unauthorized', message: 'You must be signed in to connect accounts.' }, 401);

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return json({ error: 'unauthorized', message: 'Your session is invalid or expired. Sign in again.' }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const provider = String(body.provider || '');
    const credentials = (body.credentials ?? {}) as Record<string, string>;

    if (!ALLOWED.has(provider)) {
      return json({ error: 'unsupported_provider', message: `${providerName(provider)} does not use the credentials flow.` }, 400);
    }

    let email = '';
    let label = '';
    let credential: Record<string, unknown> = { refreshable: false };

    if (provider === 'moodle') {
      const baseUrl = String(credentials.baseUrl || '').trim();
      const token = String(credentials.token || '').trim();
      if (!baseUrl || !token) {
        return json({ error: 'missing_credentials', message: 'Moodle needs both a portal URL (https://moodle.school.edu) and a personal web-service token.' }, 400);
      }
      const host = hostOf(baseUrl);
      email = host;
      label = `Moodle LMS (${host})`;
      credential = { ...credential, access_token: token, refresh_token: token, base_url: baseUrl };
    } else if (provider === 'imap') {
      const host = String(credentials.host || '').trim();
      const port = String(credentials.port || '993').trim();
      const imapUser = String(credentials.user || '').trim();
      const password = String(credentials.password || '');
      if (!host || !imapUser || !password) {
        return json({ error: 'missing_credentials', message: 'IMAP needs a server host, username, and app password.' }, 400);
      }
      email = imapUser;
      label = `IMAP (${imapUser})`;
      credential = { ...credential, access_token: password, refresh_token: password, imap_host: host, imap_port: port, imap_user: imapUser };
    }

    const encryptedRefreshToken = await encryptToken(JSON.stringify(credential));
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: accountRow, error: upsertError } = await admin
      .from('connected_accounts')
      .upsert(
        {
          user_id: user.id,
          provider,
          email,
          label,
          encrypted_refresh_token: encryptedRefreshToken,
          granted_scopes: [],
          status: 'connected',
          error_message: null,
        },
        { onConflict: 'user_id,provider,email' }
      )
      .select('id')
      .single();

    if (upsertError) {
      return json({ error: 'persist_failed', message: `Could not save the ${providerName(provider)} account: ${upsertError.message}` }, 500);
    }

    return json({ status: 'connected', provider, accountId: accountRow?.id ?? null });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[connect-credentials] fatal:', message);
    return json({ error: 'connect_failed', message: `Could not save credentials: ${message}` }, 500);
  }
});
