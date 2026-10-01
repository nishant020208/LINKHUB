/**
 * oauth-start: authenticates the caller, verifies the provider is configured,
 * and returns the provider's real authorization URL with the signed, expiring
 * state token attached.
 *
 * Every OAuth provider here shares ONE redirect URI with no query string:
 *   https://<project-id>.supabase.co/functions/v1/oauth-callback
 * The provider is carried inside the signed state, not the URL.
 *
 * A provider whose secrets are missing fails immediately with a specific
 * `not_configured` message — it never reaches the provider and never produces
 * a generic "non-2xx status code".
 *
 * Trello is the documented exception: it issues its token in the URL fragment
 * (no code exchange), so its authorize URL returns to the app itself and the
 * fragment token is saved client-side via the `connect-credentials` function.
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { signState } from '../_shared/state.ts';
import { PROVIDER_SPECS, missingEnv, providerName, sharedCallbackUrl } from '../_shared/providers.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    if (!authHeader) {
      return json({ error: 'unauthorized', message: 'You must be signed in to connect accounts.' }, 401);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return json({ error: 'unauthorized', message: 'Your session is invalid or expired. Sign in again.' }, 401);
    }

    let provider = '';
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      provider = String(body.provider || '');
    } else {
      provider = new URL(req.url).searchParams.get('provider') || '';
    }

    const spec = PROVIDER_SPECS[provider];
    if (!spec) {
      return json({ error: 'unsupported_provider', message: `Unknown provider "${provider || '(none)'}".` }, 400);
    }
    if (spec.auth !== 'oauth') {
      return json(
        {
          error: 'wrong_flow',
          message: `${providerName(provider)} does not use OAuth. Submit its token/credentials form instead.`,
        },
        400
      );
    }

    // Fail fast with a specific message BEFORE touching the provider.
    const missing = missingEnv(provider);
    if (missing.length > 0) {
      return json(
        {
          error: 'not_configured',
          message: `${providerName(provider)} isn't configured yet. Add the Supabase secret${missing.length > 1 ? 's' : ''} ${missing.join(', ')} under Project Settings → Edge Functions → Secrets, then try again.`,
        },
        412
      );
    }

    const redirectUri = sharedCallbackUrl();
    const signedState = await signState({
      userId: user.id,
      provider,
      exp: Date.now() + 15 * 60 * 1000,
    });

    const paramsFor = (entries: Record<string, string>) => new URLSearchParams(entries).toString();

    let authUrl = '';
    switch (provider) {
      case 'google':
        authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${paramsFor({
          client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
          redirect_uri: redirectUri,
          response_type: 'code',
          scope: [
            'https://www.googleapis.com/auth/calendar.readonly',
            'https://www.googleapis.com/auth/classroom.courses.readonly',
            'https://www.googleapis.com/auth/classroom.coursework.me.readonly',
            'https://www.googleapis.com/auth/classroom.student-submissions.me.readonly',
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/drive.readonly',
            'https://www.googleapis.com/auth/tasks.readonly',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
          ].join(' '),
          access_type: 'offline',
          prompt: 'consent',
          state: signedState,
        })}`;
        break;

      case 'github':
        authUrl = `https://github.com/login/oauth/authorize?${paramsFor({
          client_id: Deno.env.get('GITHUB_CLIENT_ID')!,
          redirect_uri: redirectUri,
          scope: 'read:user user:email repo notifications',
          state: signedState,
        })}`;
        break;

      case 'notion':
        authUrl = `https://api.notion.com/v1/oauth/authorize?${paramsFor({
          client_id: Deno.env.get('NOTION_CLIENT_ID')!,
          response_type: 'code',
          owner: 'user',
          redirect_uri: redirectUri,
          state: signedState,
        })}`;
        break;

      case 'todoist':
        authUrl = `https://todoist.com/oauth/authorize?${paramsFor({
          client_id: Deno.env.get('TODOIST_CLIENT_ID')!,
          scope: 'data:read',
          redirect_uri: redirectUri,
          state: signedState,
        })}`;
        break;

      case 'slack':
        authUrl = `https://slack.com/oauth/v2/authorize?${paramsFor({
          client_id: Deno.env.get('SLACK_CLIENT_ID')!,
          user_scope: 'users:read,channels:history,im:history,search:read',
          redirect_uri: redirectUri,
          state: signedState,
        })}`;
        break;

      case 'linear':
        authUrl = `https://linear.app/oauth/authorize?${paramsFor({
          client_id: Deno.env.get('LINEAR_CLIENT_ID')!,
          redirect_uri: redirectUri,
          response_type: 'code',
          scope: 'read',
          state: signedState,
        })}`;
        break;

      case 'jira':
        // Atlassian 3LO requires audience=api.atlassian.com and offline_access.
        authUrl = `https://auth.atlassian.com/authorize?${paramsFor({
          audience: 'api.atlassian.com',
          client_id: Deno.env.get('JIRA_CLIENT_ID')!,
          scope: 'read:jira-work read:jira-user offline_access',
          redirect_uri: redirectUri,
          state: signedState,
          response_type: 'code',
          prompt: 'consent',
        })}`;
        break;

      case 'trello': {
        // Trello returns its token in the URL fragment; the app captures it.
        const appUrl = Deno.env.get('APP_URL') || 'http://localhost:5173';
        authUrl = `https://trello.com/1/authorize?${paramsFor({
          key: Deno.env.get('TRELLO_API_KEY')!,
          name: 'UnifyHub',
          scope: 'read',
          response_type: 'token',
          expiration: 'never',
          callback_method: 'fragment',
          return_url: `${appUrl}/integrations`,
        })}`;
        break;
      }

      case 'asana':
        authUrl = `https://app.asana.com/-/oauth_authorize?${paramsFor({
          client_id: Deno.env.get('ASANA_CLIENT_ID')!,
          redirect_uri: redirectUri,
          response_type: 'code',
          state: signedState,
        })}`;
        break;

      case 'clickup':
        authUrl = `https://app.clickup.com/api?${paramsFor({
          client_id: Deno.env.get('CLICKUP_CLIENT_ID')!,
          redirect_uri: redirectUri,
          state: signedState,
        })}`;
        break;

      case 'dropbox':
        // token_access_type=offline is required to receive a refresh token.
        authUrl = `https://www.dropbox.com/oauth2/authorize?${paramsFor({
          client_id: Deno.env.get('DROPBOX_CLIENT_ID')!,
          response_type: 'code',
          redirect_uri: redirectUri,
          token_access_type: 'offline',
          state: signedState,
        })}`;
        break;

      case 'box':
        authUrl = `https://account.box.com/api/oauth2/authorize?${paramsFor({
          client_id: Deno.env.get('BOX_CLIENT_ID')!,
          response_type: 'code',
          redirect_uri: redirectUri,
          state: signedState,
        })}`;
        break;

      case 'zoom':
        authUrl = `https://zoom.us/oauth/authorize?${paramsFor({
          response_type: 'code',
          client_id: Deno.env.get('ZOOM_CLIENT_ID')!,
          redirect_uri: redirectUri,
          state: signedState,
        })}`;
        break;

      case 'gitlab':
        authUrl = `https://gitlab.com/oauth/authorize?${paramsFor({
          client_id: Deno.env.get('GITLAB_CLIENT_ID')!,
          redirect_uri: redirectUri,
          response_type: 'code',
          scope: 'read_api read_user',
          state: signedState,
        })}`;
        break;

      case 'bitbucket':
        // Bitbucket ignores redirect_uri here — the callback is set on the app.
        authUrl = `https://bitbucket.org/site/oauth2/authorize?${paramsFor({
          client_id: Deno.env.get('BITBUCKET_CLIENT_ID')!,
          response_type: 'code',
          state: signedState,
        })}`;
        break;

      default:
        return json({ error: 'unsupported_provider', message: `Unsupported provider: ${provider}` }, 400);
    }

    return json({ url: authUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[oauth-start] fatal:', message);
    return json({ error: 'oauth_start_failed', message: `Could not start authorization: ${message}` }, 500);
  }
});
