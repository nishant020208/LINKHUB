/**
 * asana-sync: syncs assigned Asana tasks, full notes, comments/stories,
 * and attachment binaries for one Asana account via Asana REST API.
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

const API = 'https://app.asana.com/api/1.0';

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

    const authHeaders = {
      Authorization: `Bearer ${ctx.accessToken}`,
      Accept: 'application/json',
    };

    const results: StreamResult[] = [];

    // ---------------------------------------------------------------- TASKS
    results.push(await runStream(ctx, 'tasks', 'asana', async (): Promise<NormalizedItem[]> => {
      const url = `${API}/tasks?assignee=me&completed_since=now&limit=50&opt_fields=name,notes,due_on,due_at,permalink_url,projects.name,completed`;
      const res = await fetchJson(url, authHeaders, { provider: 'asana', stream: 'tasks' });
      if (!res.ok) throw new Error(res.error);

      const tasks: any[] = res.data.data ?? [];
      const items: NormalizedItem[] = [];

      for (const t of tasks) {
        const notes = t.notes || '';
        const dueDate = t.due_at || (t.due_on ? new Date(`${t.due_on}T12:00:00Z`).toISOString() : null);

        // Fetch comments/stories
        const comments: any[] = [];
        try {
          const sRes = await fetchJson(`${API}/tasks/${t.gid}/stories?opt_fields=text,created_at,created_by.name,type`, authHeaders, { provider: 'asana', stream: 'stories' });
          if (sRes.ok && Array.isArray(sRes.data.data)) {
            for (const s of sRes.data.data) {
              if (s.type === 'comment' && s.text) {
                comments.push({
                  authorName: s.created_by?.name || 'Asana User',
                  body: s.text,
                  createdAt: s.created_at,
                  sourceId: s.gid,
                });
              }
            }
          }
        } catch { /* best effort */ }

        // Fetch attachments
        const attachments: any[] = [];
        try {
          const aRes = await fetchJson(`${API}/tasks/${t.gid}/attachments?opt_fields=name,download_url,size,view_url`, authHeaders, { provider: 'asana', stream: 'attachments' });
          if (aRes.ok && Array.isArray(aRes.data.data)) {
            for (const att of aRes.data.data.slice(0, 5)) {
              const size = Number(att.size) || 0;
              if (size <= 10 * 1024 * 1024 && att.download_url) {
                try {
                  const fileRes = await fetch(att.download_url, { headers: authHeaders });
                  if (fileRes.ok) {
                    const buf = await fileRes.arrayBuffer();
                    const bytes = new Uint8Array(buf);
                    let binaryStr = '';
                    const chunk = 8192;
                    for (let i = 0; i < bytes.length; i += chunk) {
                      binaryStr += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
                    }
                    attachments.push({
                      name: att.name || 'asana-attachment',
                      sizeBytes: size,
                      dataBase64: btoa(binaryStr),
                      externalUrl: att.view_url || att.download_url,
                    });
                    continue;
                  }
                } catch { /* best effort */ }
              }
              attachments.push({
                name: att.name || 'asana-attachment',
                sizeBytes: size,
                externalUrl: att.view_url || att.download_url,
              });
            }
          }
        } catch { /* best effort */ }

        items.push({
          type: dueDate ? 'deadline' : 'task',
          title: t.name || 'Asana Task',
          description: notes ? notes.slice(0, 400) : null,
          due_at: dueDate,
          url: t.permalink_url || null,
          source_id: `asana-${t.gid}`,
          priority_score: dueDate ? 78 : 55,
          is_done: Boolean(t.completed),
          metadata: {
            projects: (t.projects || []).map((p: any) => p.name).filter(Boolean),
            comments_count: comments.length,
          },
          raw: { gid: t.gid, name: t.name },
          fullContent: {
            bodyText: notes,
            bodyMarkdown: notes,
            comments,
            attachments,
            syncStatus: 'synced',
            structuredContent: {
              completed: t.completed,
              projects: t.projects,
            },
          },
        });
      }

      return items;
    }));

    const summary = await finalizeAccount(admin, accountId, results);
    return new Response(JSON.stringify({ success: summary.success, accountId, ...summary }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[asana-sync] fatal:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
