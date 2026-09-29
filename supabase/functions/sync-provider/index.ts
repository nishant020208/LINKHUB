import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { fetchWithRetry } from '../_shared/rate-limit.ts';

serve(async (req: Request) => {
  try {
    const { accountId } = await req.json();
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: account, error: accError } = await supabase
      .from('connected_accounts')
      .select('*')
      .eq('id', accountId)
      .single();

    if (accError || !account) {
      return new Response(JSON.stringify({ error: 'Account not found' }), { status: 404 });
    }

    // Refresh token via internal edge function
    const refreshRes = await fetch(`${supabaseUrl}/functions/v1/oauth-refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ accountId }),
    });

    const { access_token } = await refreshRes.json();
    if (!access_token) {
      throw new Error('Failed to obtain fresh access token');
    }

    let itemsSynced = 0;

    // Execute provider sync with retry backoff
    if (account.provider === 'google') {
      // Sync Google Calendar Events
      const calRes = await fetchWithRetry(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=25&singleEvents=true&orderBy=startTime',
        { headers: { Authorization: `Bearer ${access_token}` } }
      );
      const calData = await calRes.json();

      if (calData.items) {
        for (const ev of calData.items) {
          await supabase.from('items').upsert(
            {
              user_id: account.user_id,
              account_id: account.id,
              type: 'event',
              title: ev.summary || 'Google Calendar Event',
              description: ev.description || '',
              start_at: ev.start?.dateTime || ev.start?.date,
              end_at: ev.end?.dateTime || ev.end?.date,
              url: ev.htmlLink,
              source_id: ev.id,
              priority_score: 70,
              is_done: false,
              raw: ev,
              metadata: {
                location: ev.location,
              },
            },
            { onConflict: 'account_id,source_id' }
          );
          itemsSynced++;
        }
      }
    }

    // Update account last_synced_at & sync_logs
    await supabase
      .from('connected_accounts')
      .update({
        last_synced_at: new Date().toISOString(),
        status: 'connected',
        error_message: null,
      })
      .eq('id', accountId);

    await supabase.from('sync_logs').insert({
      user_id: account.user_id,
      account_id: account.id,
      status: 'success',
      items_synced: itemsSynced,
    });

    return new Response(JSON.stringify({ success: true, itemsSynced }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Sync Provider Error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
});
