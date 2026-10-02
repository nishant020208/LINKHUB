/**
 * todoist-sync: syncs active tasks (with due dates, priorities, and project
 * names) for one Todoist account via the Todoist REST API.
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

const API = 'https://api.todoist.com/rest/v2';
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

    const results: StreamResult[] = [];

    // ---------------------------------------------------------------- PROJECTS
    results.push(await runStream(ctx, 'projects', 'todoist', async (): Promise<NormalizedItem[]> => {
      const projRes = await fetchJson(`${API}/projects`, auth(ctx.accessToken), { provider: 'todoist', stream: 'projects' });
      if (!projRes.ok) throw new Error(projRes.error);
      const projectMap = new Map<string, string>();
      for (const p of projRes.data ?? []) projectMap.set(p.id, p.name);

      // ---------------------------------------------------------------- TASKS
      const taskRes = await fetchJson(`${API}/tasks?limit=100`, auth(ctx.accessToken), { provider: 'todoist', stream: 'tasks' });
      if (!taskRes.ok) throw new Error(taskRes.error);
      const tasks: any[] = taskRes.data ?? [];

      // Helper to fetch Todoist comments
      const fetchTodoistComments = async (taskId: string) => {
        try {
          const cRes = await fetchJson(`${API}/comments?task_id=${taskId}`, auth(ctx.accessToken), { provider: 'todoist', stream: 'comments' });
          if (!cRes.ok || !Array.isArray(cRes.data)) return { comments: [], attachments: [] };
          const comments: any[] = [];
          const attachments: any[] = [];

          for (const c of cRes.data) {
            comments.push({
              body: c.content || '',
              createdAt: c.posted_at,
              sourceId: c.id,
            });
            if (c.attachment?.file_url) {
              attachments.push({
                name: c.attachment.file_name || 'todoist-attachment',
                mimeType: c.attachment.file_type || 'application/octet-stream',
                externalUrl: c.attachment.file_url,
                sizeBytes: 0,
              });
            }
          }
          return { comments, attachments };
        } catch {
          return { comments: [], attachments: [] };
        }
      };

      const items: NormalizedItem[] = [];
      for (const t of tasks) {
        // Todoist priority is 1 (normal) .. 4 (urgent); map to our 0-100 scale.
        const p = t.priority ?? 1;
        const score = p >= 4 ? 90 : p === 3 ? 80 : p === 2 ? 68 : 55;
        const desc = t.description || '';
        const { comments, attachments } = await fetchTodoistComments(t.id);

        items.push({
          type: 'task' as const,
          title: t.content || 'Untitled Task',
          description: desc ? desc.slice(0, 400) : null,
          due_at: t.due?.date ? new Date(`${t.due.date}T12:00:00Z`).toISOString() : null,
          url: t.url || 'https://app.todoist.com',
          source_id: `todoist-${t.id}`,
          priority_score: score,
          is_done: Boolean(t.is_completed),
          metadata: {
            project: projectMap.get(t.project_id) ?? 'Inbox',
            labels: (t.labels ?? []).slice(0, 5),
            comments_count: comments.length,
          },
          raw: { id: t.id, content: t.content, priority: t.priority },
          fullContent: {
            bodyText: desc,
            bodyMarkdown: desc,
            comments,
            attachments,
            syncStatus: 'synced',
            structuredContent: {
              priority: t.priority,
              section_id: t.section_id,
              parent_id: t.parent_id,
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
    console.error('[todoist-sync] fatal:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
