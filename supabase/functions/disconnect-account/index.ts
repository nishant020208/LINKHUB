/**
 * disconnect-account: revokes the provider token where the provider supports
 * revocation, deletes the stored encrypted token and the connected_accounts
 * row (DB cascade removes items + sync_logs). Authenticated with the caller's
 * Supabase JWT; the account row must belong to the verified user.
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { decryptToken } from '../_shared/crypto.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const REVOKE_ENDPOINTS: Record<string, { url: string; build: (token: string, clientId: string, clientSecret: string) => RequestInit }> = {
  google: {
    url: 'https://oauth2.googleapis.com/revoke',
    build: (token) => ({
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token }),
    }),
  },
  github: {
    url: 'https://api.github.com/applications/{client_id}/grant',
    build: (token, clientId, clientSecret) => ({
      method: 'DELETE',
      headers: {
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github+json',
        'User-Agent': 'UnifyHub-Sync-App',
      },
      body: JSON.stringify({ access_token: token }),
    }),
  },
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') ?? req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { accountId } = await req.json();
    if (!accountId) {
      return new Response(JSON.stringify({ error: 'accountId is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // Verify the caller's identity via their JWT.
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Load the account and verify ownership.
    const { data: account, error: accError } = await admin
      .from('connected_accounts')
      .select('id, user_id, provider, encrypted_refresh_token')
      .eq('id', accountId)
      .single();

    if (accError || !account) {
      return new Response(JSON.stringify({ error: 'Account not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (account.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden: account belongs to another user' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Best-effort token revocation at the provider.
    let revoked = false;
    const revokeDef = REVOKE_ENDPOINTS[account.provider];
    if (revokeDef && account.encrypted_refresh_token) {
      try {
        const plain = await decryptToken(account.encrypted_refresh_token);
        const clientId =
          account.provider === 'google'
            ? Deno.env.get('GOOGLE_CLIENT_ID') ?? ''
            : Deno.env.get('GITHUB_CLIENT_ID') ?? '';
        const clientSecret =
          account.provider === 'google'
            ? Deno.env.get('GOOGLE_CLIENT_SECRET') ?? ''
            : Deno.env.get('GITHUB_CLIENT_SECRET') ?? '';

        const url = revokeDef.url.replace('{client_id}', clientId);
        const res = await fetch(url, revokeDef.build(plain, clientId, clientSecret));
        revoked = res.ok;
        if (!res.ok) {
          console.warn(`[disconnect-account] revoke for ${account.provider} returned HTTP ${res.status}`);
        }
      } catch (err) {
        console.warn('[disconnect-account] revoke failed:', err);
      }
    }

    // Clean up stored binary files from Supabase Storage for this account
    try {
      const storagePrefix = `${account.user_id}/${account.id}`;
      const { data: fileList } = await admin.storage
        .from('unifyhub-content')
        .list(storagePrefix, { limit: 1000 });

      if (fileList && fileList.length > 0) {
        const pathsToDelete = fileList.map((f: any) => `${storagePrefix}/${f.name}`);
        await admin.storage.from('unifyhub-content').remove(pathsToDelete);
        console.log(`[disconnect-account] deleted ${pathsToDelete.length} storage files for account ${accountId}`);
      }
    } catch (storageErr) {
      console.warn('[disconnect-account] error clearing account storage:', storageErr);
    }

    // Delete the account row; ON DELETE CASCADE clears items, contents, attachments, comments, sync_logs.
    const { error: deleteError } = await admin
      .from('connected_accounts')
      .delete()
      .eq('id', accountId);

    if (deleteError) {
      return new Response(JSON.stringify({ error: `Failed to delete account: ${deleteError.message}` }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Recalculate and update the user's total storage usage in user_settings
    try {
      const { data: remainingAccounts } = await admin
        .from('connected_accounts')
        .select('storage_used_bytes')
        .eq('user_id', user.id);
      const totalUsed = (remainingAccounts ?? []).reduce((acc: number, row: any) => acc + (Number(row.storage_used_bytes) || 0), 0);
      await admin
        .from('user_settings')
        .update({ storage_used_bytes: totalUsed })
        .eq('user_id', user.id);
    } catch (recalcErr) {
      console.warn('[disconnect-account] could not recalculate user storage:', recalcErr);
    }

    return new Response(JSON.stringify({ success: true, revoked, deleted: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[disconnect-account] fatal:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
