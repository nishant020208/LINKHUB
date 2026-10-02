/**
 * jira-sync: syncs assigned Jira issues, full ADF descriptions, comments,
 * and attachment binaries for one Jira account via Jira REST API v3.
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

// Helper to convert Atlassian Document Format (ADF) to plain text / markdown
function adfToText(node: any): string {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (node.text) return node.text;
  let out = '';
  if (Array.isArray(node.content)) {
    for (const child of node.content) {
      out += adfToText(child);
    }
  }
  if (['paragraph', 'heading', 'bulletList', 'orderedList', 'listItem'].includes(node.type)) {
    out += '\n';
  }
  return out;
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

    const cloudId = token.extra?.cloud_id;
    if (!cloudId) {
      return new Response(JSON.stringify({ error: 'Jira account has no associated cloudId. Please reconnect.' }), {
        status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const ctx: StreamContext = {
      admin,
      accountId: account.id,
      userId: account.user_id,
      accessToken: token.accessToken,
      grantedScopes: (account as any).granted_scopes ?? [],
    };

    const API = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3`;
    const authHeaders = {
      Authorization: `Bearer ${ctx.accessToken}`,
      Accept: 'application/json',
    };

    const results: StreamResult[] = [];

    // ---------------------------------------------------------------- ISSUES
    results.push(await runStream(ctx, 'issues', 'jira', async (): Promise<NormalizedItem[]> => {
      const jql = encodeURIComponent('assignee = currentUser() AND resolution = Unresolved ORDER BY updated DESC');
      const url = `${API}/search?jql=${jql}&maxResults=50&fields=summary,description,duedate,priority,status,project,comment,attachment`;
      const res = await fetchJson(url, authHeaders, { provider: 'jira', stream: 'issues' });
      if (!res.ok) throw new Error(res.error);

      const issues: any[] = res.data.issues ?? [];
      const items: NormalizedItem[] = [];

      for (const issue of issues) {
        const fields = issue.fields || {};
        const summary = fields.summary || 'Jira Issue';
        const descText = adfToText(fields.description).trim();
        const dueDate = fields.duedate ? new Date(`${fields.duedate}T12:00:00Z`).toISOString() : null;

        // Parse comments
        const comments: any[] = [];
        for (const c of fields.comment?.comments || []) {
          comments.push({
            authorName: c.author?.displayName || 'Jira User',
            authorAvatar: c.author?.avatarUrls?.['48x48'] || null,
            body: adfToText(c.body).trim(),
            createdAt: c.created,
            sourceId: c.id,
          });
        }

        // Parse attachments and download if < 10MB
        const attachments: any[] = [];
        for (const att of (fields.attachment || []).slice(0, 5)) {
          const size = Number(att.size) || 0;
          if (size <= 10 * 1024 * 1024 && att.content) {
            try {
              const fileRes = await fetch(att.content, { headers: authHeaders });
              if (fileRes.ok) {
                const buf = await fileRes.arrayBuffer();
                const bytes = new Uint8Array(buf);
                let binaryStr = '';
                const chunk = 8192;
                for (let i = 0; i < bytes.length; i += chunk) {
                  binaryStr += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
                }
                attachments.push({
                  name: att.filename || 'jira-attachment',
                  mimeType: att.mimeType || 'application/octet-stream',
                  sizeBytes: size,
                  dataBase64: btoa(binaryStr),
                  externalUrl: att.content,
                });
                continue;
              }
            } catch (dErr) {
              console.warn('[Jira] Attachment download failed:', dErr);
            }
          }
          attachments.push({
            name: att.filename || 'jira-attachment',
            mimeType: att.mimeType || 'application/octet-stream',
            sizeBytes: size,
            externalUrl: att.content,
          });
        }

        const priorityName = fields.priority?.name || 'Medium';
        const score = /highest|critical|blocker/i.test(priorityName) ? 90
          : /high/i.test(priorityName) ? 80
          : /low/i.test(priorityName) ? 45
          : 60;

        items.push({
          type: dueDate ? 'deadline' : 'task',
          title: `${issue.key}: ${summary}`,
          description: descText ? descText.slice(0, 400) : null,
          due_at: dueDate,
          url: `https://jira.atlassian.com/browse/${issue.key}`,
          source_id: `jira-${issue.id}`,
          priority_score: score,
          metadata: {
            issue_key: issue.key,
            project_name: fields.project?.name || '',
            status_name: fields.status?.name || '',
            priority: priorityName,
            comments_count: comments.length,
          },
          raw: { id: issue.id, key: issue.key, summary },
          fullContent: {
            bodyText: descText,
            bodyMarkdown: descText,
            comments,
            attachments,
            syncStatus: 'synced',
            structuredContent: {
              issueKey: issue.key,
              project: fields.project?.name,
              status: fields.status?.name,
              priority: priorityName,
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
    console.error('[jira-sync] fatal:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
