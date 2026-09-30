/**
 * microsoft-sync: syncs Outlook Mail, Calendar, To Do tasks, and OneDrive
 * files for one Microsoft account via Microsoft Graph. Each stream is fully
 * isolated with its own sync_logs row and precise HTTP error surfacing.
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { loadAccountWithToken } from '../_shared/token-refresh.ts';
import {
  CORS_HEADERS,
  StreamContext,
  StreamResult,
  NormalizedItem,
  runStream,
  fetchJson,
  finalizeAccount,
} from '../_shared/sync-helpers.ts';

const GRAPH = 'https://graph.microsoft.com/v1.0';
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  try {
    const { accountId } = await req.json();
    if (!accountId) {
      return new Response(JSON.stringify({ error: 'accountId is required' }), {
        status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { account, token, errorResponse } = await loadAccountWithToken(admin, accountId);
    if (errorResponse || !account || !token) {
      return new Response(JSON.stringify(errorResponse ?? { error: 'Account load failed' }), {
        status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const ctx: StreamContext = {
      admin,
      accountId: account.id,
      userId: account.user_id,
      accessToken: token.accessToken,
      grantedScopes: (account as any).granted_scopes ?? [],
    };

    const now = new Date();
    const past7 = new Date(now.getTime() - 7 * 86400000).toISOString();
    const future30 = new Date(now.getTime() + 30 * 86400000).toISOString();
    const results: StreamResult[] = [];

    // ---------------------------------------------------------------- MAIL
    results.push(await runStream(ctx, 'outlook_mail', 'microsoft', async (): Promise<NormalizedItem[]> => {
      const url = `${GRAPH}/me/messages?$top=30&$select=subject,bodyPreview,from,receivedDateTime,webLink,importance&$orderby=receivedDateTime desc`;
      const res = await fetchJson(url, auth(ctx.accessToken), { provider: 'microsoft', stream: 'mail' });
      if (!res.ok) throw new Error(res.error);
      const messages: any[] = res.data.value ?? [];
      return messages.map((m) => {
        const text = `${m.subject ?? ''} ${m.bodyPreview ?? ''}`.toLowerCase();
        const hasAction = /action required|urgent|deadline|due by/.test(text);
        const hasBill = /invoice|receipt|bill|payment due|subscription/.test(text);
        return {
          type: hasAction ? 'deadline' : 'email',
          title: m.subject || '(No Subject)',
          description: m.bodyPreview || null,
          url: m.webLink || null,
          source_id: `outlook-${m.id}`,
          priority_score: hasAction ? 85 : hasBill ? 75 : m.importance === 'high' ? 80 : 55,
          metadata: {
            sender: m.from?.emailAddress?.address ?? 'Unknown Sender',
            received_at: m.receivedDateTime,
          },
          raw: m,
        };
      });
    }));

    // ---------------------------------------------------------------- CALENDAR
    results.push(await runStream(ctx, 'calendar', 'microsoft', async (): Promise<NormalizedItem[]> => {
      const url = `${GRAPH}/me/calendarview?startDateTime=${encodeURIComponent(past7)}&endDateTime=${encodeURIComponent(future30)}&$top=100&$select=subject,bodyPreview,start,end,location,webLink,isOnlineMeeting,onlineMeetingUrl&$orderby=start/dateTime`;
      const res = await fetchJson(url, auth(ctx.accessToken), { provider: 'microsoft', stream: 'calendar' });
      if (!res.ok) throw new Error(res.error);
      const events: any[] = res.data.value ?? [];
      return events.map((ev) => ({
        type: 'event' as const,
        title: ev.subject || 'Scheduled Event',
        description: ev.bodyPreview || null,
        start_at: ev.start?.dateTime ? new Date(`${ev.start.dateTime}Z`).toISOString() : null,
        end_at: ev.end?.dateTime ? new Date(`${ev.end.dateTime}Z`).toISOString() : null,
        url: ev.webLink || ev.onlineMeetingUrl || null,
        source_id: `outlook-cal-${ev.id}`,
        priority_score: 55,
        metadata: {
          location: ev.location?.displayName ?? '',
          hangout_link: ev.onlineMeetingUrl ?? null,
        },
        raw: ev,
      }));
    }));

    // ---------------------------------------------------------------- TO DO
    results.push(await runStream(ctx, 'tasks', 'microsoft', async (): Promise<NormalizedItem[]> => {
      const listsRes = await fetchJson(`${GRAPH}/me/todo/lists?$top=10`, auth(ctx.accessToken), { provider: 'microsoft', stream: 'todo-lists' });
      if (!listsRes.ok) throw new Error(listsRes.error);
      const lists: any[] = listsRes.data.value ?? [];

      const items: NormalizedItem[] = [];
      for (const list of lists) {
        const tRes = await fetchJson(
          `${GRAPH}/me/todo/lists/${list.id}/tasks?$top=50&$select=title,body,dueDateTime,status,webUrl`,
          auth(ctx.accessToken),
          { provider: 'microsoft', stream: 'todo-items' }
        );
        if (!tRes.ok) continue;
        for (const t of tRes.data.value ?? []) {
          items.push({
            type: 'task',
            title: t.title || 'Untitled Task',
            description: t.body?.content || null,
            due_at: t.dueDateTime?.dateTime ? new Date(`${t.dueDateTime.dateTime}Z`).toISOString() : null,
            url: t.webUrl || 'https://to-do.office.com',
            source_id: `mtodo-${t.id}`,
            priority_score: 68,
            is_done: t.status === 'completed',
            metadata: { task_list_title: list.displayName },
            raw: t,
          });
        }
      }
      return items;
    }));

    // ---------------------------------------------------------------- ONEDRIVE
    results.push(await runStream(ctx, 'drive', 'microsoft', async (): Promise<NormalizedItem[]> => {
      const res = await fetchJson(
        `${GRAPH}/me/drive/recent?$top=30&$select=name,webUrl,lastModifiedDateTime,file,size`,
        auth(ctx.accessToken),
        { provider: 'microsoft', stream: 'onedrive' }
      );
      if (!res.ok) throw new Error(res.error);
      const files: any[] = res.data.value ?? [];
      return files
        .filter((f) => f.file)
        .map((f) => ({
          type: 'file' as const,
          title: f.name || 'Cloud File',
          url: f.webUrl || null,
          source_id: `onedrive-${f.id}`,
          priority_score: 48,
          metadata: {
            file_type: (f.name?.split('.').pop() ?? 'FILE').toUpperCase(),
            file_size_formatted: f.size ? `${Math.round(Number(f.size) / 1024)} KB` : 'Cloud doc',
            pinned: true,
          },
          raw: f,
        }));
    }));

    const summary = await finalizeAccount(admin, accountId, results);
    return new Response(JSON.stringify({ success: summary.success, accountId, ...summary }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[microsoft-sync] fatal:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
