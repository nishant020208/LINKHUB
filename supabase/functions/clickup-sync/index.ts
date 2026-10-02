/**
 * clickup-sync: syncs assigned ClickUp tasks, full descriptions, comments,
 * and attachment binaries for one ClickUp account via ClickUp REST API v2.
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

const API = 'https://api.clickup.com/api/v2';

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
      Authorization: ctx.accessToken,
      'Content-Type': 'application/json',
    };

    const results: StreamResult[] = [];

    // ---------------------------------------------------------------- TASKS
    results.push(await runStream(ctx, 'tasks', 'clickup', async (): Promise<NormalizedItem[]> => {
      // Get teams
      const teamsRes = await fetchJson(`${API}/team`, authHeaders, { provider: 'clickup', stream: 'teams' });
      if (!teamsRes.ok) throw new Error(teamsRes.error);
      const teams: any[] = teamsRes.data.teams ?? [];

      const items: NormalizedItem[] = [];

      for (const team of teams) {
        const tasksRes = await fetchJson(`${API}/team/${team.id}/task?subtasks=true&include_closed=false&page=0`, authHeaders, { provider: 'clickup', stream: 'tasks' });
        if (!tasksRes.ok) continue;

        const tasks: any[] = tasksRes.data.tasks ?? [];
        for (const t of tasks) {
          const desc = t.text_content || t.description || '';
          const dueDate = t.due_date ? new Date(Number(t.due_date)).toISOString() : null;

          // Fetch comments
          const comments: any[] = [];
          try {
            const cRes = await fetchJson(`${API}/task/${t.id}/comment`, authHeaders, { provider: 'clickup', stream: 'comments' });
            if (cRes.ok && Array.isArray(cRes.data.comments)) {
              for (const c of cRes.data.comments) {
                comments.push({
                  authorName: c.user?.username || 'ClickUp User',
                  authorAvatar: c.user?.profilePicture || null,
                  body: c.comment_text || '',
                  createdAt: c.date ? new Date(Number(c.date)).toISOString() : new Date().toISOString(),
                  sourceId: c.id,
                });
              }
            }
          } catch { /* best effort */ }

          // Fetch attachments
          const attachments: any[] = [];
          for (const att of (t.attachments || []).slice(0, 5)) {
            const size = Number(att.size) || 0;
            if (size <= 10 * 1024 * 1024 && att.url) {
              try {
                const fileRes = await fetch(att.url, { headers: authHeaders });
                if (fileRes.ok) {
                  const buf = await fileRes.arrayBuffer();
                  const bytes = new Uint8Array(buf);
                  let binaryStr = '';
                  const chunk = 8192;
                  for (let i = 0; i < bytes.length; i += chunk) {
                    binaryStr += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
                  }
                  attachments.push({
                    name: att.title || 'clickup-attachment',
                    sizeBytes: size,
                    dataBase64: btoa(binaryStr),
                    externalUrl: att.url,
                  });
                  continue;
                }
              } catch { /* best effort */ }
            }
            attachments.push({
              name: att.title || 'clickup-attachment',
              sizeBytes: size,
              externalUrl: att.url,
            });
          }

          items.push({
            type: dueDate ? 'deadline' : 'task',
            title: t.name || 'ClickUp Task',
            description: desc ? desc.slice(0, 400) : null,
            due_at: dueDate,
            url: t.url || null,
            source_id: `clickup-${t.id}`,
            priority_score: t.priority?.id === '1' ? 90 : t.priority?.id === '2' ? 78 : 55,
            is_done: t.status?.status?.toLowerCase() === 'complete',
            metadata: {
              status: t.status?.status || '',
              team_name: team.name,
              comments_count: comments.length,
            },
            raw: { id: t.id, name: t.name },
            fullContent: {
              bodyText: desc,
              bodyMarkdown: desc,
              comments,
              attachments,
              syncStatus: 'synced',
              structuredContent: {
                status: t.status?.status,
                priority: t.priority?.priority,
              },
            },
          });
        }
      }

      return items;
    }));

    const summary = await finalizeAccount(admin, accountId, results);
    return new Response(JSON.stringify({ success: summary.success, accountId, ...summary }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[clickup-sync] fatal:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
