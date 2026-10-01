import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

// Cryptographic HMAC helper for expiring CSRF state
async function signState(payload: Record<string, unknown>, secretKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = JSON.stringify(payload);
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secretKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  const sigHex = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const encodedData = btoa(data);
  return `${encodedData}.${sigHex}`;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const encryptionKey = Deno.env.get('TOKEN_ENCRYPTION_KEY') || 'unifyhub-default-secret-key-32b!';
    
    // Authenticate user via JWT in Authorization header
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized: invalid session' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    let provider = 'google';
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      provider = body.provider || 'google';
    } else {
      const url = new URL(req.url);
      provider = url.searchParams.get('provider') || 'google';
    }

    // Standard redirect URI for the Edge Function callback
    const redirectUri = `${supabaseUrl}/functions/v1/oauth-callback?provider=${provider}`;

    // Generate signed, expiring CSRF state (valid for 15 minutes)
    const statePayload = {
      userId: user.id,
      provider,
      exp: Date.now() + 15 * 60 * 1000,
    };
    const signedState = await signState(statePayload, encryptionKey);

    let authUrl = '';

    switch (provider) {
      case 'google': {
        const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
        if (!clientId) {
          return new Response(JSON.stringify({ error: 'not_configured', message: 'Google Client ID not set' }), {
            status: 400,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          });
        }
        const scopes = [
          'https://www.googleapis.com/auth/calendar.readonly',
          'https://www.googleapis.com/auth/classroom.courses.readonly',
          'https://www.googleapis.com/auth/classroom.coursework.me.readonly',
          'https://www.googleapis.com/auth/classroom.student-submissions.me.readonly',
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/drive.readonly',
          'https://www.googleapis.com/auth/tasks.readonly',
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/userinfo.profile',
        ].join(' ');

        const params = new URLSearchParams({
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: 'code',
          scope: scopes,
          access_type: 'offline',
          prompt: 'consent',
          state: signedState,
        });
        authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
        break;
      }

      case 'microsoft': {
        const clientId = Deno.env.get('MICROSOFT_CLIENT_ID');
        if (!clientId) {
          return new Response(JSON.stringify({ error: 'not_configured', message: 'Microsoft Client ID not set' }), {
            status: 400,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          });
        }
        const scopes = 'offline_access User.Read Calendars.Read Mail.Read Tasks.Read Files.Read';
        const params = new URLSearchParams({
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: 'code',
          scope: scopes,
          response_mode: 'query',
          prompt: 'select_account',
          state: signedState,
        });
        authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
        break;
      }

      case 'github': {
        const clientId = Deno.env.get('GITHUB_CLIENT_ID');
        if (!clientId) {
          return new Response(JSON.stringify({ error: 'not_configured', message: 'GitHub Client ID not set' }), {
            status: 400,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          });
        }
        const params = new URLSearchParams({
          client_id: clientId,
          redirect_uri: redirectUri,
          scope: 'read:user user:email repo notifications',
          state: signedState,
        });
        authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
        break;
      }

      case 'notion': {
        const clientId = Deno.env.get('NOTION_CLIENT_ID');
        if (!clientId) {
          return new Response(JSON.stringify({ error: 'not_configured', message: 'Notion Client ID not set' }), {
            status: 400,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          });
        }
        const params = new URLSearchParams({
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: 'code',
          owner: 'user',
          state: signedState,
        });
        authUrl = `https://api.notion.com/v1/oauth/authorize?${params.toString()}`;
        break;
      }

      case 'todoist': {
        const clientId = Deno.env.get('TODOIST_CLIENT_ID');
        if (!clientId) {
          return new Response(JSON.stringify({ error: 'not_configured', message: 'Todoist Client ID not set' }), {
            status: 400,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          });
        }
        const params = new URLSearchParams({
          client_id: clientId,
          scope: 'data:read',
          redirect_uri: redirectUri,
          state: signedState,
        });
        authUrl = `https://todoist.com/oauth/authorize?${params.toString()}`;
        break;
      }

      case 'slack': {
        const clientId = Deno.env.get('SLACK_CLIENT_ID');
        if (!clientId) {
          return new Response(JSON.stringify({ error: 'not_configured', message: 'Slack Client ID not set' }), {
            status: 400,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          });
        }
        const params = new URLSearchParams({
          client_id: clientId,
          user_scope: 'users:read,channels:history,im:history,search:read',
          redirect_uri: redirectUri,
          state: signedState,
        });
        authUrl = `https://slack.com/oauth/v2/authorize?${params.toString()}`;
        break;
      }

      case 'linear': {
        const clientId = Deno.env.get('LINEAR_CLIENT_ID');
        if (!clientId) {
          return new Response(JSON.stringify({ error: 'not_configured', message: 'Linear Client ID not set' }), {
            status: 400,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          });
        }
        const params = new URLSearchParams({
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: 'code',
          scope: 'read',
          state: signedState,
        });
        authUrl = `https://linear.app/oauth/authorize?${params.toString()}`;
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unsupported provider: ${provider}` }), {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify({ url: authUrl }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
