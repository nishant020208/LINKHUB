/**
 * github-sync: syncs assigned issues, review-requested pull requests, and
 * recently assigned PRs for one GitHub account. Uses the stored token as a
 * long-lived bearer; each stream is isolated with full HTTP error surfacing.
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

const API = 'https://api.github.com';
const auth = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'User-Agent': 'UnifyHub-Sync-App',
});

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

    // Resolve the GitHub login for search scoping.
    const meRes = await fetchJson(`${API}/user`, auth(ctx.accessToken), { provider: 'github', stream: 'user' });
    if (!meRes.ok) throw new Error(meRes.error);
    const login: string = meRes.data.login;
    const results: StreamResult[] = [];

    // ---------------------------------------------------------------- ISSUES
    results.push(await runStream(ctx, 'issues', 'github', async (): Promise<NormalizedItem[]> => {
      const q = encodeURIComponent(`assignee:${login} is:open is:issue`);
      const res = await fetchJson(`${API}/search/issues?q=${q}&per_page=30&sort=updated`, auth(ctx.accessToken), { provider: 'github', stream: 'issues' });
      if (!res.ok) throw new Error(res.error);
      const issues: any[] = res.data.items ?? [];
      return issues.map((i) => ({
        type: 'task' as const,
        title: i.title || 'GitHub Issue',
        description: i.body ? String(i.body).slice(0, 400) : null,
        due_at: null,
        url: i.html_url,
        source_id: `gh-issue-${i.id}`,
        priority_score: i.comments > 5 ? 72 : 60,
        metadata: {
          repository: i.repository_url?.split('/').slice(-1)[0] ?? '',
          state: i.state,
          labels: (i.labels ?? []).map((l: any) => l.name).slice(0, 5),
        },
        raw: { id: i.id, number: i.number, title: i.title },
      }));
    }));

    // ------------------------------------------------- REVIEW-REQUESTED PRs
    results.push(await runStream(ctx, 'pull_requests', 'github', async (): Promise<NormalizedItem[]> => {
      const q = encodeURIComponent(`review-requested:${login} is:open is:pr`);
      const res = await fetchJson(`${API}/search/issues?q=${q}&per_page=30&sort=updated`, auth(ctx.accessToken), { provider: 'github', stream: 'pull-requests' });
      if (!res.ok) throw new Error(res.error);
      const prs: any[] = res.data.items ?? [];
      return prs.map((p) => ({
        type: 'deadline' as const,
        title: p.title || 'Review Request',
        description: p.body ? String(p.body).slice(0, 400) : null,
        url: p.html_url,
        source_id: `gh-pr-${p.id}`,
        priority_score: 78,
        metadata: {
          repository: p.repository_url?.split('/').slice(-1)[0] ?? '',
          kind: 'review_requested',
        },
        raw: { id: p.id, number: p.number, title: p.title },
      }));
    }));

    // ----------------------------------------------------- ASSIGNED PRs
    results.push(await runStream(ctx, 'assigned_prs', 'github', async (): Promise<NormalizedItem[]> => {
      const q = encodeURIComponent(`assignee:${login} is:open is:pr`);
      const res = await fetchJson(`${API}/search/issues?q=${q}&per_page=30&sort=updated`, auth(ctx.accessToken), { provider: 'github', stream: 'assigned-prs' });
      if (!res.ok) throw new Error(res.error);
      const prs: any[] = res.data.items ?? [];
      return prs.map((p) => ({
        type: 'task' as const,
        title: p.title || 'Assigned PR',
        description: p.body ? String(p.body).slice(0, 400) : null,
        url: p.html_url,
        source_id: `gh-apr-${p.id}`,
        priority_score: 70,
        metadata: {
          repository: p.repository_url?.split('/').slice(-1)[0] ?? '',
          kind: 'assigned',
        },
        raw: { id: p.id, number: p.number, title: p.title },
      }));
    }));

    const summary = await finalizeAccount(admin, accountId, results);
    return new Response(JSON.stringify({ success: summary.success, accountId, ...summary }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[github-sync] fatal:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
