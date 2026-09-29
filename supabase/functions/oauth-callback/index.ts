import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { encryptToken } from '../_shared/crypto.ts';

serve(async (req: Request) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const provider = url.searchParams.get('provider') || 'google';
    const state = url.searchParams.get('state'); // Contains user_id

    if (!code) {
      return new Response(JSON.stringify({ error: 'Missing OAuth authorization code' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    let tokenEndpoint = '';
    let clientId = '';
    let clientSecret = '';
    let redirectUri = `${supabaseUrl}/functions/v1/oauth-callback?provider=${provider}`;

    if (provider === 'google') {
      tokenEndpoint = 'https://oauth2.googleapis.com/token';
      clientId = Deno.env.get('GOOGLE_CLIENT_ID') || '';
      clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET') || '';
    } else if (provider === 'microsoft') {
      tokenEndpoint = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
      clientId = Deno.env.get('MICROSOFT_CLIENT_ID') || '';
      clientSecret = Deno.env.get('MICROSOFT_CLIENT_SECRET') || '';
    } else if (provider === 'github') {
      tokenEndpoint = 'https://github.com/login/oauth/access_token';
      clientId = Deno.env.get('GITHUB_CLIENT_ID') || '';
      clientSecret = Deno.env.get('GITHUB_CLIENT_SECRET') || '';
    }

    // Exchange auth code for tokens
    const tokenRes = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();
    if (tokenData.error) {
      throw new Error(`Token exchange failed: ${tokenData.error_description || tokenData.error}`);
    }

    const refreshToken = tokenData.refresh_token || tokenData.access_token;
    const encryptedRefreshToken = await encryptToken(refreshToken);

    // Save to connected_accounts
    const userId = state || 'demo-user-1';
    const email = tokenData.email || `${provider}-user@sync`;

    await supabase.from('connected_accounts').upsert({
      user_id: userId,
      provider,
      email,
      label: `${provider.charAt(0).toUpperCase() + provider.slice(1)} Account`,
      encrypted_refresh_token: encryptedRefreshToken,
      status: 'connected',
      last_synced_at: new Date().toISOString(),
    });

    // Redirect to app
    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:5173';
    return Response.redirect(`${appUrl}/integrations?status=connected&provider=${provider}`, 302);
  } catch (err) {
    console.error('OAuth Callback Error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
