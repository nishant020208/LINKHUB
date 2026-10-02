/**
 * trello-sync: syncs assigned Trello cards, full descriptions, comments,
 * and attachment binaries for one Trello account via the Trello REST API.
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

    const trelloKey = Deno.env.get('TRELLO_API_KEY') || 'f1a92e47bf1b2c453531b7473a2ceea7';
    const ctx: StreamContext = {
      admin,
      accountId: account.id,
      userId: account.user_id,
      accessToken: token.accessToken,
      grantedScopes: (account as any).granted_scopes ?? [],
    };

    const results: StreamResult[] = [];

    // ---------------------------------------------------------------- CARDS
    results.push(await runStream(ctx, 'cards', 'trello', async (): Promise<NormalizedItem[]> => {
      const url = `https://api.trello.com/1/members/me/cards?fields=name,desc,due,dueComplete,url,idBoard,idList,labels&attachments=true&actions=commentCard&key=${trelloKey}&token=${ctx.accessToken}`;
      const res = await fetchJson(url, {}, { provider: 'trello', stream: 'cards' });
      if (!res.ok) throw new Error(res.error);

      const cards: any[] = res.data ?? [];
      const items: NormalizedItem[] = [];

      for (const card of cards) {
        const desc = card.desc || '';
        const dueDate = card.due ? new Date(card.due).toISOString() : null;

        // Parse comments
        const comments: any[] = [];
        for (const act of card.actions || []) {
          if (act.type === 'commentCard' && act.data?.text) {
            comments.push({
              authorName: act.memberCreator?.fullName || 'Trello Member',
              authorAvatar: act.memberCreator?.avatarUrl ? `${act.memberCreator.avatarUrl}/50.png` : null,
              body: act.data.text,
              createdAt: act.date,
              sourceId: act.id,
            });
          }
        }

        // Parse attachments
        const attachments: any[] = [];
        for (const att of (card.attachments || []).slice(0, 5)) {
          const size = Number(att.bytes) || 0;
          if (size > 0 && size <= 10 * 1024 * 1024 && att.url) {
            try {
              const fileRes = await fetch(att.url, {
                headers: { Authorization: `OAuth oauth_consumer_key="${trelloKey}", oauth_token="${ctx.accessToken}"` },
              });
              if (fileRes.ok) {
                const buf = await fileRes.arrayBuffer();
                const bytes = new Uint8Array(buf);
                let binaryStr = '';
                const chunk = 8192;
                for (let i = 0; i < bytes.length; i += chunk) {
                  binaryStr += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
                }
                attachments.push({
                  name: att.name || 'trello-attachment',
                  mimeType: att.mimeType || 'application/octet-stream',
                  sizeBytes: size,
                  dataBase64: btoa(binaryStr),
                  externalUrl: att.url,
                });
                continue;
              }
            } catch { /* best effort */ }
          }
          attachments.push({
            name: att.name || 'trello-attachment',
            mimeType: att.mimeType || 'application/octet-stream',
            sizeBytes: size,
            externalUrl: att.url,
          });
        }

        items.push({
          type: dueDate ? 'deadline' : 'task',
          title: card.name || 'Trello Card',
          description: desc ? desc.slice(0, 400) : null,
          due_at: dueDate,
          url: card.url || null,
          source_id: `trello-${card.id}`,
          priority_score: dueDate ? 75 : 55,
          is_done: Boolean(card.dueComplete),
          metadata: {
            board_id: card.idBoard,
            list_id: card.idList,
            labels: (card.labels || []).map((l: any) => l.name || l.color).filter(Boolean),
            comments_count: comments.length,
          },
          raw: { id: card.id, name: card.name },
          fullContent: {
            bodyText: desc,
            bodyMarkdown: desc,
            comments,
            attachments,
            syncStatus: 'synced',
            structuredContent: {
              labels: card.labels,
              dueComplete: card.dueComplete,
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
    console.error('[trello-sync] fatal:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
