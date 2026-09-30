/**
 * notion-sync: syncs pages from Notion databases shared with the integration,
 * normalizing rows into tasks/deadlines based on date properties.
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

const API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';
const auth = (token: string) => ({
  Authorization: `Bearer ${token}`,
  'Notion-Version': NOTION_VERSION,
});

/** Extract a date (and optional title) from a Notion page's properties. */
function parsePage(page: any): { title: string; dateProp: { start: string } | null } {
  const props = page.properties ?? {};
  let title = 'Untitled Notion Page';
  let dateProp: { start: string } | null = null;

  for (const key of Object.keys(props)) {
    const prop = props[key];
    if (prop.type === 'title' && !titleIsSet(title)) {
      const plain = (prop.title ?? []).map((t: any) => t.plain_text).join('').trim();
      if (plain) title = plain;
    }
    if (prop.type === 'date' && prop.date?.start && !dateProp) {
      dateProp = prop.date;
    }
    if (prop.type === 'rich_text' && !titleIsSet(title)) {
      const plain = (prop.rich_text ?? []).map((t: any) => t.plain_text).join('').trim();
      if (plain) title = plain;
    }
  }
  return { title, dateProp };

  function titleIsSet(t: string) {
    return t !== 'Untitled Notion Page';
  }
}

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

    // ---------------------------------------------------------------- DATABASES
    results.push(await runStream(ctx, 'databases', 'notion', async (): Promise<NormalizedItem[]> => {
      // Search for all databases the integration can access (read-only).
      const searchRes = await fetch(`${API}/search`, {
        method: 'POST',
        headers: { ...auth(ctx.accessToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ filter: { property: 'object', value: 'data_source' }, page_size: 20 }),
      });
      if (!searchRes.ok) {
        const body = await searchRes.text();
        throw new Error(`Notion search API returned HTTP ${searchRes.status}: ${body.slice(0, 600)}`);
      }
      const searchData = await searchRes.json();
      const databases: any[] = searchData.results ?? [];

      const items: NormalizedItem[] = [];
      for (const db of databases) {
        // Query rows of this database (data_source id == database id in v1 API shapes).
        const queryRes = await fetch(`${API}/databases/${db.id}/query`, {
          method: 'POST',
          headers: { ...auth(ctx.accessToken), 'Content-Type': 'application/json' },
          body: JSON.stringify({ page_size: 30 }),
        });
        if (!queryRes.ok) continue; // one inaccessible DB must not block the stream
        const queryData = await queryRes.json();

        for (const page of queryData.results ?? []) {
          const { title, dateProp } = parsePage(page);
          const hasDue = Boolean(dateProp?.start);
          items.push({
            type: hasDue ? 'deadline' : 'task',
            title,
            description: null,
            due_at: dateProp?.start ? new Date(dateProp.start).toISOString() : null,
            url: page.url ?? null,
            source_id: `notion-${page.id}`,
            priority_score: hasDue ? 74 : 55,
            metadata: {
              database_title: (db.title ?? []).map((t: any) => t.plain_text).join('') || 'Notion Database',
              last_edited: page.last_edited_time,
            },
            raw: { id: page.id, title },
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
    console.error('[notion-sync] fatal:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
