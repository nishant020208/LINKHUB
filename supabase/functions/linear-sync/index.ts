/**
 * linear-sync: syncs assigned open issues (with due dates and project names)
 * for one Linear account via the Linear GraphQL API.
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
  finalizeAccount,
} from '../_shared/sync-helpers.ts';

const API = 'https://api.linear.app/graphql';

async function graphql(
  token: string,
  query: string,
  variables: Record<string, unknown>,
  httpInfo: { stream: string }
): Promise<{ ok: true; data: any } | { ok: false; error: string }> {
  const res = await fetch(API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    const text = await res.text();
    const msg = `Linear ${httpInfo.stream} API returned HTTP ${res.status}: ${text.slice(0, 600)}`;
    console.error(`[linear:${httpInfo.stream}] ${msg}`);
    return { ok: false, error: msg };
  }
  const data = await res.json();
  if (data.errors?.length) {
    const msg = `Linear ${httpInfo.stream} GraphQL error: ${data.errors.map((e: any) => e.message).join('; ')}`;
    console.error(`[linear:${httpInfo.stream}] ${msg}`);
    return { ok: false, error: msg };
  }
  return { ok: true, data: data.data };
}

const ISSUES_QUERY = `
  query AssignedIssues($first: Int!) {
    issues(first: $first, filter: { assignee: { isMe: { eq: true } }, state: { type: { neq: "completed" } } }) {
      nodes {
        id
        identifier
        title
        description
        url
        dueDate
        priority
        project { name }
        state { name }
      }
    }
  }
`;

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

    // ---------------------------------------------------------------- ISSUES
    results.push(await runStream(ctx, 'issues', 'linear', async (): Promise<NormalizedItem[]> => {
      const res = await graphql(ctx.accessToken, ISSUES_QUERY, { first: 50 }, { stream: 'issues' });
      if (!res.ok) throw new Error(res.error);
      const issues: any[] = res.data.issues?.nodes ?? [];

      return issues.map((i) => ({
        type: i.dueDate ? 'deadline' : 'task',
        title: `${i.identifier} ${i.title}`,
        description: i.description ? String(i.description).slice(0, 400) : null,
        due_at: i.dueDate ? new Date(i.dueDate).toISOString() : null,
        url: i.url,
        source_id: `linear-${i.id}`,
        // Linear priority: 0 none, 1 urgent, 2 high, 3 medium, 4 low.
        priority_score: i.priority === 1 ? 92 : i.priority === 2 ? 78 : i.priority === 3 ? 62 : 50,
        metadata: {
          project: i.project?.name ?? '',
          state: i.state?.name ?? '',
        },
        raw: { id: i.id, identifier: i.identifier, title: i.title },
      }));
    }));

    const summary = await finalizeAccount(admin, accountId, results);
    return new Response(JSON.stringify({ success: summary.success, accountId, ...summary }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[linear-sync] fatal:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
