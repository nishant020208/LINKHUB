/**
 * sync-provider: thin dispatcher that routes one connected account to its
 * per-provider sync function. Keeping this dispatch separate means each
 * provider's streams stay isolated and independently deployable.
 *
 * Supports both POST (client + oauth-callback) invocation.
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SYNC_FUNCTIONS: Record<string, string> = {
  google: 'google-sync',
  github: 'github-sync',
  notion: 'notion-sync',
  todoist: 'todoist-sync',
  slack: 'slack-sync',
  linear: 'linear-sync',
  jira: 'jira-sync',
  asana: 'asana-sync',
  clickup: 'clickup-sync',
  dropbox: 'dropbox-sync',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { accountId, provider } = await req.json();
    if (!accountId) {
      return new Response(JSON.stringify({ error: 'accountId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // Resolve the provider from the account row when not supplied.
    let resolvedProvider = provider as string | undefined;
    if (!resolvedProvider) {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/connected_accounts?id=eq.${accountId}&select=provider`,
        {
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
          },
        }
      );
      if (!res.ok) {
        const body = await res.text();
        return new Response(JSON.stringify({ error: `Account lookup failed: HTTP ${res.status} ${body.slice(0, 300)}` }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const rows = await res.json();
      if (!rows?.length) {
        return new Response(JSON.stringify({ error: 'Account not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      resolvedProvider = rows[0].provider;
    }

    const targetFn = SYNC_FUNCTIONS[resolvedProvider];
    if (!targetFn) {
      // Connected but not yet syncable: report success with zero items and a
      // specific warning. Returning a non-2xx here would surface as the generic
      // supabase-js "Edge Function returned a non-2xx status code" message.
      console.log(`[sync-provider] no sync implementation for provider "${resolvedProvider}"`);
      return new Response(
        JSON.stringify({
          success: true,
          totalUpserted: 0,
          streams: [],
          warning: `Sync for "${resolvedProvider}" is not implemented yet. The account is connected; no items were fetched.`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[sync-provider] dispatching account ${accountId} (${resolvedProvider}) -> ${targetFn}`);

    const fnRes = await fetch(`${supabaseUrl}/functions/v1/${targetFn}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ accountId }),
    });

    const payload = await fnRes.json().catch(() => ({ error: 'Unreadable sync function response' }));
    if (!fnRes.ok) {
      console.error(`[sync-provider] ${targetFn} returned HTTP ${fnRes.status}:`, payload);
    }

    return new Response(JSON.stringify(payload), {
      status: fnRes.ok ? 200 : fnRes.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[sync-provider] fatal:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
