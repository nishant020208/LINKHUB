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

    // Helper to fetch comments for an issue or PR
    const fetchGhComments = async (commentsUrl: string) => {
      if (!commentsUrl) return [];
      try {
        const cRes = await fetchJson(`${commentsUrl}?per_page=30`, auth(ctx.accessToken), { provider: 'github', stream: 'comments' });
        if (!cRes.ok || !Array.isArray(cRes.data)) return [];
        return cRes.data.map((c: any) => ({
          authorName: c.user?.login || 'GitHub User',
          authorAvatar: c.user?.avatar_url || null,
          body: c.body || '',
          createdAt: c.created_at,
          sourceId: String(c.id),
        }));
      } catch {
        return [];
      }
    };

    // Helper to extract repo owner and name from repository_url
    const parseRepo = (repoUrl: string) => {
      const parts = (repoUrl || '').split('/');
      return { owner: parts[parts.length - 2] || '', name: parts[parts.length - 1] || '' };
    };

    // ---------------------------------------------------------------- ISSUES
    results.push(await runStream(ctx, 'issues', 'github', async (): Promise<NormalizedItem[]> => {
      const q = encodeURIComponent(`assignee:${login} is:open is:issue`);
      const res = await fetchJson(`${API}/search/issues?q=${q}&per_page=30&sort=updated`, auth(ctx.accessToken), { provider: 'github', stream: 'issues' });
      if (!res.ok) throw new Error(res.error);
      const issues: any[] = res.data.items ?? [];

      const items: NormalizedItem[] = [];
      for (const i of issues) {
        const fullBody = i.body || '';
        const comments = i.comments > 0 ? await fetchGhComments(i.comments_url) : [];
        const repo = parseRepo(i.repository_url).name;

        // Extract image attachment URLs if embedded in issue body
        const imgMatches = fullBody.matchAll(/!\[(.*?)\]\((https:\/\/[^\s\)]+)\)/g);
        const attachments = [];
        for (const m of imgMatches) {
          attachments.push({
            name: m[1] || 'Embedded GitHub Asset',
            externalUrl: m[2],
            sizeBytes: 0,
            isInline: true,
          });
        }

        items.push({
          type: 'task' as const,
          title: i.title || 'GitHub Issue',
          description: fullBody ? fullBody.slice(0, 400) : null,
          due_at: null,
          url: i.html_url,
          source_id: `gh-issue-${i.id}`,
          priority_score: i.comments > 5 ? 72 : 60,
          metadata: {
            repository: repo,
            state: i.state,
            labels: (i.labels ?? []).map((l: any) => l.name).slice(0, 5),
            comments_count: i.comments || 0,
          },
          raw: { id: i.id, number: i.number, title: i.title },
          fullContent: {
            bodyText: fullBody,
            bodyMarkdown: fullBody,
            comments,
            attachments,
            syncStatus: 'synced',
            structuredContent: {
              number: i.number,
              state: i.state,
              author: i.user?.login || null,
              labels: (i.labels ?? []).map((l: any) => l.name),
            },
          },
        });
      }
      return items;
    }));

    // ------------------------------------------------- REVIEW-REQUESTED PRs
    results.push(await runStream(ctx, 'pull_requests', 'github', async (): Promise<NormalizedItem[]> => {
      const q = encodeURIComponent(`review-requested:${login} is:open is:pr`);
      const res = await fetchJson(`${API}/search/issues?q=${q}&per_page=30&sort=updated`, auth(ctx.accessToken), { provider: 'github', stream: 'pull-requests' });
      if (!res.ok) throw new Error(res.error);
      const prs: any[] = res.data.items ?? [];

      const items: NormalizedItem[] = [];
      for (const p of prs) {
        const fullBody = p.body || '';
        const comments = p.comments > 0 ? await fetchGhComments(p.comments_url) : [];
        const { owner, name: repo } = parseRepo(p.repository_url);

        // Fetch PR changed files diff summary
        let filesChanged: any[] = [];
        if (owner && repo && p.number) {
          try {
            const filesRes = await fetchJson(`${API}/repos/${owner}/${repo}/pulls/${p.number}/files?per_page=20`, auth(ctx.accessToken), { provider: 'github', stream: 'pr-files' });
            if (filesRes.ok && Array.isArray(filesRes.data)) {
              filesChanged = filesRes.data.map((f: any) => ({
                filename: f.filename,
                status: f.status,
                additions: f.additions,
                deletions: f.deletions,
                patchSnippet: f.patch ? f.patch.slice(0, 600) : null,
              }));
            }
          } catch { /* best-effort files fetch */ }
        }

        items.push({
          type: 'deadline' as const,
          title: p.title || 'Review Request',
          description: fullBody ? fullBody.slice(0, 400) : null,
          url: p.html_url,
          source_id: `gh-pr-${p.id}`,
          priority_score: 78,
          metadata: {
            repository: repo,
            kind: 'review_requested',
            comments_count: p.comments || 0,
          },
          raw: { id: p.id, number: p.number, title: p.title },
          fullContent: {
            bodyText: fullBody,
            bodyMarkdown: fullBody,
            comments,
            syncStatus: 'synced',
            structuredContent: {
              number: p.number,
              state: p.state,
              author: p.user?.login || null,
              filesChanged,
            },
          },
        });
      }
      return items;
    }));

    // ----------------------------------------------------- ASSIGNED PRs
    results.push(await runStream(ctx, 'assigned_prs', 'github', async (): Promise<NormalizedItem[]> => {
      const q = encodeURIComponent(`assignee:${login} is:open is:pr`);
      const res = await fetchJson(`${API}/search/issues?q=${q}&per_page=30&sort=updated`, auth(ctx.accessToken), { provider: 'github', stream: 'assigned-prs' });
      if (!res.ok) throw new Error(res.error);
      const prs: any[] = res.data.items ?? [];

      const items: NormalizedItem[] = [];
      for (const p of prs) {
        const fullBody = p.body || '';
        const comments = p.comments > 0 ? await fetchGhComments(p.comments_url) : [];
        const repo = parseRepo(p.repository_url).name;

        items.push({
          type: 'task' as const,
          title: p.title || 'Assigned PR',
          description: fullBody ? fullBody.slice(0, 400) : null,
          url: p.html_url,
          source_id: `gh-apr-${p.id}`,
          priority_score: 70,
          metadata: {
            repository: repo,
            kind: 'assigned',
            comments_count: p.comments || 0,
          },
          raw: { id: p.id, number: p.number, title: p.title },
          fullContent: {
            bodyText: fullBody,
            bodyMarkdown: fullBody,
            comments,
            syncStatus: 'synced',
            structuredContent: {
              number: p.number,
              state: p.state,
              author: p.user?.login || null,
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
    console.error('[github-sync] fatal:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
