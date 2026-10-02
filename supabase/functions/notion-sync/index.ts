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

    // Helper to fetch rich text as string
    const richTextToString = (arr: any[]): string => (arr || []).map((t: any) => t.plain_text || '').join('');

    // Recursive helper to fetch block children and format into Markdown
    const fetchBlockChildren = async (
      blockId: string,
      depth = 0,
      maxDepth = 3
    ): Promise<{ markdown: string; attachments: any[] }> => {
      if (depth > maxDepth) return { markdown: '', attachments: [] };

      try {
        const res = await fetch(`${API}/blocks/${blockId}/children?page_size=50`, {
          headers: auth(ctx.accessToken),
        });
        if (!res.ok) return { markdown: '', attachments: [] };
        const data = await res.json();
        const blocks: any[] = data.results || [];
        const lines: string[] = [];
        const attachments: any[] = [];
        const indent = '  '.repeat(depth);

        for (const b of blocks) {
          const type = b.type;
          let text = '';

          switch (type) {
            case 'paragraph':
              text = richTextToString(b.paragraph?.rich_text);
              if (text) lines.push(`${indent}${text}`);
              break;
            case 'heading_1':
              lines.push(`\n# ${richTextToString(b.heading_1?.rich_text)}\n`);
              break;
            case 'heading_2':
              lines.push(`\n## ${richTextToString(b.heading_2?.rich_text)}\n`);
              break;
            case 'heading_3':
              lines.push(`\n### ${richTextToString(b.heading_3?.rich_text)}\n`);
              break;
            case 'bulleted_list_item':
              lines.push(`${indent}* ${richTextToString(b.bulleted_list_item?.rich_text)}`);
              break;
            case 'numbered_list_item':
              lines.push(`${indent}1. ${richTextToString(b.numbered_list_item?.rich_text)}`);
              break;
            case 'to_do': {
              const checked = b.to_do?.checked ? '[x]' : '[ ]';
              lines.push(`${indent}- ${checked} ${richTextToString(b.to_do?.rich_text)}`);
              break;
            }
            case 'toggle':
              lines.push(`${indent}> ${richTextToString(b.toggle?.rich_text)}`);
              break;
            case 'code': {
              const lang = b.code?.language || '';
              lines.push(`\`\`\`${lang}\n${richTextToString(b.code?.rich_text)}\n\`\`\``);
              break;
            }
            case 'quote':
              lines.push(`${indent}> ${richTextToString(b.quote?.rich_text)}`);
              break;
            case 'callout':
              lines.push(`${indent}> 💡 ${richTextToString(b.callout?.rich_text)}`);
              break;
            case 'image':
            case 'file':
            case 'pdf': {
              const fileObj = b[type]?.file || b[type]?.external;
              const fileUrl = fileObj?.url;
              const fileName = b[type]?.caption?.length ? richTextToString(b[type].caption) : `notion-${type}`;
              if (fileUrl) {
                attachments.push({
                  name: fileName,
                  externalUrl: fileUrl,
                  mimeType: type === 'image' ? 'image/png' : type === 'pdf' ? 'application/pdf' : 'application/octet-stream',
                  sizeBytes: 0,
                  isInline: type === 'image',
                });
                lines.push(`${indent}![${fileName}](${fileUrl})`);
              }
              break;
            }
            case 'divider':
              lines.push('\n---\n');
              break;
          }

          if (b.has_children) {
            const childResult = await fetchBlockChildren(b.id, depth + 1, maxDepth);
            if (childResult.markdown) lines.push(childResult.markdown);
            attachments.push(...childResult.attachments);
          }
        }

        return { markdown: lines.join('\n'), attachments };
      } catch {
        return { markdown: '', attachments: [] };
      }
    };

    // ---------------------------------------------------------------- DATABASES & PAGES
    results.push(await runStream(ctx, 'databases', 'notion', async (): Promise<NormalizedItem[]> => {
      // Search for databases & pages the integration can access (read-only).
      const searchRes = await fetch(`${API}/search`, {
        method: 'POST',
        headers: { ...auth(ctx.accessToken), 'Content-Type': 'application/json' },
        body: JSON.stringify({ page_size: 25 }),
      });
      if (!searchRes.ok) {
        const body = await searchRes.text();
        throw new Error(`Notion search API returned HTTP ${searchRes.status}: ${body.slice(0, 600)}`);
      }
      const searchData = await searchRes.json();
      const resultsList: any[] = searchData.results ?? [];

      const items: NormalizedItem[] = [];

      for (const entity of resultsList) {
        if (entity.object === 'database') {
          const dbTitle = (entity.title ?? []).map((t: any) => t.plain_text).join('') || 'Notion Database';
          const queryRes = await fetch(`${API}/databases/${entity.id}/query`, {
            method: 'POST',
            headers: { ...auth(ctx.accessToken), 'Content-Type': 'application/json' },
            body: JSON.stringify({ page_size: 20 }),
          });
          if (!queryRes.ok) continue;
          const queryData = await queryRes.json();

          for (const page of queryData.results ?? []) {
            const { title, dateProp } = parsePage(page);
            const hasDue = Boolean(dateProp?.start);
            const { markdown, attachments } = await fetchBlockChildren(page.id);

            items.push({
              type: hasDue ? 'deadline' : 'task',
              title,
              description: markdown ? markdown.slice(0, 400) : null,
              due_at: dateProp?.start ? new Date(dateProp.start).toISOString() : null,
              url: page.url ?? null,
              source_id: `notion-${page.id}`,
              priority_score: hasDue ? 74 : 55,
              metadata: {
                database_title: dbTitle,
                last_edited: page.last_edited_time,
              },
              raw: { id: page.id, title },
              fullContent: {
                bodyText: markdown,
                bodyMarkdown: markdown,
                attachments,
                syncStatus: 'synced',
                structuredContent: {
                  database_title: dbTitle,
                  page_id: page.id,
                  properties: page.properties,
                },
              },
            });
          }
        } else if (entity.object === 'page') {
          const { title, dateProp } = parsePage(entity);
          const hasDue = Boolean(dateProp?.start);
          const { markdown, attachments } = await fetchBlockChildren(entity.id);

          items.push({
            type: hasDue ? 'deadline' : 'task',
            title,
            description: markdown ? markdown.slice(0, 400) : null,
            due_at: dateProp?.start ? new Date(dateProp.start).toISOString() : null,
            url: entity.url ?? null,
            source_id: `notion-${entity.id}`,
            priority_score: hasDue ? 74 : 55,
            metadata: {
              kind: 'page',
              last_edited: entity.last_edited_time,
            },
            raw: { id: entity.id, title },
            fullContent: {
              bodyText: markdown,
              bodyMarkdown: markdown,
              attachments,
              syncStatus: 'synced',
              structuredContent: {
                page_id: entity.id,
                properties: entity.properties,
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
    console.error('[notion-sync] fatal:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
