import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { encryptToken } from '../_shared/crypto.ts';

// Cryptographic HMAC state verification
async function verifyState(signedState: string, secretKey: string): Promise<{ userId: string; provider: string } | null> {
  try {
    const [encodedData, sigHex] = signedState.split('.');
    if (!encodedData || !sigHex) return null;

    const encoder = new TextEncoder();
    const data = atob(encodedData);
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secretKey),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const sigBytes = new Uint8Array(sigHex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
    const isValid = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(data));
    if (!isValid) return null;

    const payload = JSON.parse(data);
    if (!payload.exp || payload.exp < Date.now()) {
      console.warn('OAuth State expired');
      return null;
    }

    return { userId: payload.userId, provider: payload.provider };
  } catch (e) {
    console.error('State verification exception:', e);
    return null;
  }
}

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
      return Response.redirect(`${appUrl}/integrations?status=error&message=${encodeURIComponent(msg)}`, 302);
    }

    if (!code || !stateParam) {
      return Response.redirect(`${appUrl}/integrations?status=error&message=Missing+code+or+state`, 302);
    }

    const encryptionKey = Deno.env.get('TOKEN_ENCRYPTION_KEY') || 'unifyhub-default-secret-key-32b!';
    const verified = await verifyState(stateParam, encryptionKey);
    
    // Fallback: If state is plain userId (backwards compatibility)
    const userId = verified?.userId || stateParam;
    const provider = verified?.provider || url.searchParams.get('provider') || 'google';

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    let tokenEndpoint = '';
    let clientId = '';
    let clientSecret = '';
    const redirectUri = `${supabaseUrl}/functions/v1/oauth-callback?provider=${provider}`;

    let email = `${provider}-user@sync`;
    let refreshToken = '';
    let accessToken = '';

    if (provider === 'google') {
      tokenEndpoint = 'https://oauth2.googleapis.com/token';
      clientId = Deno.env.get('GOOGLE_CLIENT_ID') || '';
      clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET') || '';

      const tokenRes = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      const tokenData = await tokenRes.json();
      if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);
      refreshToken = tokenData.refresh_token || '';
      accessToken = tokenData.access_token || '';

      // Fetch user profile email
      const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (userRes.ok) {
        const u = await userRes.json();
        if (u.email) email = u.email;
      }
    } else if (provider === 'microsoft') {
      tokenEndpoint = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
      clientId = Deno.env.get('MICROSOFT_CLIENT_ID') || '';
      clientSecret = Deno.env.get('MICROSOFT_CLIENT_SECRET') || '';

      const tokenRes = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      const tokenData = await tokenRes.json();
      if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);
      refreshToken = tokenData.refresh_token || '';
      accessToken = tokenData.access_token || '';

      const userRes = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (userRes.ok) {
        const u = await userRes.json();
        email = u.mail || u.userPrincipalName || email;
      }
    } else if (provider === 'github') {
      tokenEndpoint = 'https://github.com/login/oauth/access_token';
      clientId = Deno.env.get('GITHUB_CLIENT_ID') || '';
      clientSecret = Deno.env.get('GITHUB_CLIENT_SECRET') || '';

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
        }),
      });

      const tokenData = await tokenRes.json();
      if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);
      accessToken = tokenData.access_token || '';
      refreshToken = accessToken; // GitHub personal token operates as persistent bearer

      const userRes = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'User-Agent': 'UnifyHub-Sync-App',
        },
      });
      if (userRes.ok) {
        const u = await userRes.json();
        email = u.email || `${u.login}@github.com`;
      }
    } else if (provider === 'notion') {
      tokenEndpoint = 'https://api.notion.com/v1/oauth/token';
      clientId = Deno.env.get('NOTION_CLIENT_ID') || '';
      clientSecret = Deno.env.get('NOTION_CLIENT_SECRET') || '';

      const authHeader = btoa(`${clientId}:${clientSecret}`);
      const tokenRes = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        }),
      });

      const tokenData = await tokenRes.json();
      if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);
      accessToken = tokenData.access_token || '';
      refreshToken = accessToken;
      email = tokenData.workspace_name ? `${tokenData.workspace_name}@notion` : 'workspace@notion';
    } else if (provider === 'todoist') {
      tokenEndpoint = 'https://todoist.com/oauth/access_token';
      clientId = Deno.env.get('TODOIST_CLIENT_ID') || '';
      clientSecret = Deno.env.get('TODOIST_CLIENT_SECRET') || '';

      const tokenRes = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
        }),
      });

      const tokenData = await tokenRes.json();
      if (tokenData.error) throw new Error(tokenData.error);
      accessToken = tokenData.access_token || '';
      refreshToken = accessToken;
      email = 'user@todoist';
    } else if (provider === 'linear') {
      tokenEndpoint = 'https://api.linear.app/oauth/token';
      clientId = Deno.env.get('LINEAR_CLIENT_ID') || '';
      clientSecret = Deno.env.get('LINEAR_CLIENT_SECRET') || '';

      const tokenRes = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      const tokenData = await tokenRes.json();
      if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);
      accessToken = tokenData.access_token || '';
      refreshToken = accessToken;
      email = 'team@linear';
    }

    if (!refreshToken && !accessToken) {
      throw new Error('Failed to obtain token from provider');
    }

    // Encrypt token before persisting
    const tokenToEncrypt = refreshToken || accessToken;
    const encryptedRefreshToken = await encryptToken(tokenToEncrypt);

    // Save to connected_accounts
    const { data: accountRow, error: upsertError } = await supabase
      .from('connected_accounts')
      .upsert({
        user_id: userId,
        provider,
        email,
        label: `${provider.charAt(0).toUpperCase() + provider.slice(1)} (${email})`,
        encrypted_refresh_token: encryptedRefreshToken,
        status: 'connected',
        last_synced_at: new Date().toISOString(),
      }, { onConflict: 'user_id,provider,email' })
      .select('id')
      .single();

    if (upsertError) {
      console.error('Failed to save connected account:', upsertError);
    }

    // Trigger immediate first sync in background
    if (accountRow?.id) {
      try {
        fetch(`${supabaseUrl}/functions/v1/sync-provider`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ accountId: accountRow.id }),
        }).catch((e) => console.warn('Background first sync trigger failed:', e));
      } catch {
        // Continue even if background sync trigger encounters an issue
      }
    }

    return Response.redirect(`${appUrl}/integrations?status=connected&provider=${provider}`, 302);
  } catch (err) {
    console.error('OAuth Callback Error:', err);
    return Response.redirect(`${appUrl}/integrations?status=error&message=${encodeURIComponent((err as Error).message)}`, 302);
  }
});
