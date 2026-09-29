import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { decryptToken } from '../_shared/crypto.ts';

serve(async (req: Request) => {
  try {
    const { accountId } = await req.json();
    if (!accountId) {
      return new Response(JSON.stringify({ error: 'Missing accountId' }), { status: 400 });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: account, error } = await supabase
      .from('connected_accounts')
      .select('*')
      .eq('id', accountId)
      .single();

    if (error || !account) {
      return new Response(JSON.stringify({ error: 'Account not found' }), { status: 404 });
    }

    const plainRefreshToken = await decryptToken(account.encrypted_refresh_token);

    let tokenEndpoint = '';
    let clientId = '';
    let clientSecret = '';

    if (account.provider === 'google') {
      tokenEndpoint = 'https://oauth2.googleapis.com/token';
      clientId = Deno.env.get('GOOGLE_CLIENT_ID') || '';
      clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET') || '';
    } else if (account.provider === 'microsoft') {
      tokenEndpoint = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
      clientId = Deno.env.get('MICROSOFT_CLIENT_ID') || '';
      clientSecret = Deno.env.get('MICROSOFT_CLIENT_SECRET') || '';
    }

    const res = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: plainRefreshToken,
        grant_type: 'refresh_token',
      }),
    });

    const refreshed = await res.json();
    if (refreshed.error) {
      // Mark account as needs reconnect
      await supabase
        .from('connected_accounts')
        .update({
          status: 'needs_reconnect',
          error_message: refreshed.error_description || 'Refresh token expired or revoked',
        })
        .eq('id', accountId);

      return new Response(JSON.stringify({ error: 'Token refresh failed' }), { status: 401 });
    }

    return new Response(JSON.stringify({ access_token: refreshed.access_token }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
});
