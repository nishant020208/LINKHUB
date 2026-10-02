/**
 * slack-sync: syncs saved items (starred messages), reminders, and unread
 * mentions for one Slack account via the Slack Web API (user token).
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

const API = 'https://slack.com/api';

/** Slack Web API POST with JSON body; surfaces `ok:false` payloads as errors. */
async function slackPost(
  token: string,
  method: string,
  body: Record<string, unknown> = {},
  httpInfo: { stream: string }
): Promise<{ ok: true; data: any } | { ok: false; error: string }> {
  const res = await fetch(`${API}/${method}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    const msg = `Slack ${httpInfo.stream} API returned HTTP ${res.status}: ${text.slice(0, 600)}`;
    console.error(`[slack:${httpInfo.stream}] ${msg}`);
    return { ok: false, error: msg };
  }
  const data = await res.json();
  if (!data.ok) {
    const msg = `Slack ${httpInfo.stream} API error: ${data.error}`;
    console.error(`[slack:${httpInfo.stream}] ${msg}`);
    return { ok: false, error: msg };
  }
  return { ok: true, data };
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

    // Helper to download Slack file attachment if < 10MB
    const downloadSlackFile = async (f: any) => {
      const size = Number(f.size) || 0;
      const downloadUrl = f.url_private_download || f.url_private;
      if (!downloadUrl) return null;

      if (size <= 10 * 1024 * 1024) {
        try {
          const res = await fetch(downloadUrl, { headers: { Authorization: `Bearer ${ctx.accessToken}` } });
          if (res.ok) {
            const buf = await res.arrayBuffer();
            const bytes = new Uint8Array(buf);
            let binaryStr = '';
            const chunk = 8192;
            for (let i = 0; i < bytes.length; i += chunk) {
              binaryStr += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
            }
            return {
              name: f.name || 'slack-file',
              mimeType: f.mimetype || 'application/octet-stream',
              sizeBytes: size,
              dataBase64: btoa(binaryStr),
              externalUrl: f.permalink || null,
            };
          }
        } catch (dErr) {
          console.warn('[Slack] File download failed:', dErr);
        }
      }
      return {
        name: f.name || 'slack-file',
        mimeType: f.mimetype || 'application/octet-stream',
        sizeBytes: size,
        externalUrl: f.permalink || downloadUrl,
      };
    };

    // Helper to fetch Slack thread replies
    const fetchSlackThread = async (channelId: string, threadTs: string) => {
      try {
        const res = await slackPost(ctx.accessToken, 'conversations.replies', { channel: channelId, ts: threadTs, limit: 30 }, { stream: 'thread' });
        if (res.ok && Array.isArray(res.data.messages)) {
          // Exclude the parent message itself (first item)
          return res.data.messages.slice(1).map((m: any) => ({
            authorName: m.user || 'Slack User',
            body: m.text || '',
            createdAt: m.ts ? new Date(Number(m.ts.split('.')[0]) * 1000).toISOString() : new Date().toISOString(),
            sourceId: m.ts,
          }));
        }
      } catch { /* best effort */ }
      return [];
    };

    // ------------------------------------------------------- SAVED / STARRED
    results.push(await runStream(ctx, 'saved_items', 'slack', async (): Promise<NormalizedItem[]> => {
      const items: NormalizedItem[] = [];

      // Slack exposes "saved for later" via stars.list for user tokens.
      const starsRes = await slackPost(ctx.accessToken, 'stars.list', { count: 50 }, { stream: 'stars' });
      if (starsRes.ok) {
        for (const item of starsRes.data.items ?? []) {
          const msg = item.message ?? {};
          const text: string = msg.text || '(attachment)';
          const channelId = msg.channel?.id ?? item.channel ?? '';

          // Fetch attachments
          const attachments = [];
          if (Array.isArray(msg.files)) {
            for (const f of msg.files) {
              const att = await downloadSlackFile(f);
              if (att) attachments.push(att);
            }
          }

          // Fetch thread replies if thread exists
          let comments: any[] = [];
          if (msg.reply_count > 0 && msg.thread_ts && channelId) {
            comments = await fetchSlackThread(channelId, msg.thread_ts);
          }

          items.push({
            type: 'task',
            title: text.slice(0, 120) || 'Saved Slack Message',
            description: text ? text.slice(0, 400) : null,
            url: msg.permalink ?? null,
            source_id: `slack-star-${msg.ts ?? item.created ?? Math.random()}`,
            priority_score: 58,
            metadata: {
              channel: msg.channel?.name ?? item.channel_id ?? channelId,
              kind: 'saved_for_later',
              reply_count: msg.reply_count || 0,
            },
            raw: { ts: msg.ts, channel: item.channel_id },
            fullContent: {
              bodyText: text,
              attachments,
              comments,
              syncStatus: 'synced',
              structuredContent: {
                user: msg.user,
                channel: channelId,
                thread_ts: msg.thread_ts || null,
              },
            },
          });
        }
      }

      // Reminders set by the user.
      const remRes = await slackPost(ctx.accessToken, 'reminders.list', {}, { stream: 'reminders' });
      if (remRes.ok) {
        for (const r of remRes.data.reminders ?? []) {
          if (r.complete) continue;
          items.push({
            type: 'deadline',
            title: r.text || 'Slack Reminder',
            description: null,
            due_at: r.time ? new Date(Number(r.time) * 1000).toISOString() : null,
            url: 'https://app.slack.com',
            source_id: `slack-rem-${r.id}`,
            priority_score: 72,
            metadata: { kind: 'reminder' },
            raw: { id: r.id, text: r.text },
            fullContent: {
              bodyText: r.text,
              syncStatus: 'synced',
            },
          });
        }
      }

      // stars.list failing with missing scope should not silently pass:
      if (!starsRes.ok && !remRes.ok) {
        throw new Error(starsRes.error);
      }
      return items;
    }));

    const summary = await finalizeAccount(admin, accountId, results);
    return new Response(JSON.stringify({ success: summary.success, accountId, ...summary }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[slack-sync] fatal:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
