/**
 * box-sync: syncs Box files, downloading binary contents into Storage
 * for files under 10MB and recording metadata/skip reasons for oversized files.
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

const API = 'https://api.box.com/2.0';

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
      Authorization: `Bearer ${ctx.accessToken}`,
    };

    const results: StreamResult[] = [];

    // ---------------------------------------------------------------- FILES
    results.push(await runStream(ctx, 'files', 'box', async (): Promise<NormalizedItem[]> => {
      const listRes = await fetchJson(`${API}/folders/0/items?limit=40&fields=id,name,type,size,modified_at,description,shared_link`, authHeaders, { provider: 'box', stream: 'files' });
      if (!listRes.ok) throw new Error(listRes.error);

      const entries: any[] = listRes.data.entries ?? [];
      const items: NormalizedItem[] = [];

      for (const entry of entries) {
        if (entry.type !== 'file') continue;

        const fileSize = Number(entry.size) || 0;
        const fileName = entry.name || 'box-file';
        let syncStatus: 'synced' | 'too_large' = 'synced';
        let skipReason: string | null = null;
        let textContent: string | null = null;
        const attachments: any[] = [];

        if (fileSize <= 10 * 1024 * 1024) {
          try {
            const dlRes = await fetch(`${API}/files/${entry.id}/content`, {
              headers: authHeaders,
            });

            if (dlRes.ok) {
              const buf = await dlRes.arrayBuffer();
              const bytes = new Uint8Array(buf);

              const isText = /\.(txt|md|json|js|ts|csv|html|py|sh|yml|yaml|css)$/i.test(fileName);
              if (isText && bytes.length < 500000) {
                textContent = new TextDecoder('utf-8').decode(bytes);
              }

              let binaryStr = '';
              const chunk = 8192;
              for (let i = 0; i < bytes.length; i += chunk) {
                binaryStr += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
              }

              attachments.push({
                name: fileName,
                sizeBytes: fileSize,
                dataBase64: btoa(binaryStr),
              });
            }
          } catch (dlErr) {
            console.warn('[Box] Download failed:', dlErr);
          }
        } else {
          syncStatus = 'too_large';
          skipReason = `File size (${Math.round(fileSize / (1024 * 1024))} MB) exceeds 10 MB limit`;
        }

        items.push({
          type: 'file',
          title: fileName,
          description: textContent ? textContent.slice(0, 300) : (entry.description || `${Math.round(fileSize / 1024)} KB file`),
          url: entry.shared_link?.url || null,
          source_id: `box-${entry.id}`,
          priority_score: 50,
          metadata: {
            modified_at: entry.modified_at,
            file_size: fileSize,
            file_size_formatted: `${Math.round(fileSize / 1024)} KB`,
          },
          raw: { id: entry.id, name: fileName, size: fileSize },
          fullContent: {
            bodyText: textContent || entry.description || `${fileName} (${Math.round(fileSize / 1024)} KB)`,
            attachments,
            syncStatus,
            skipReason,
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
    console.error('[box-sync] fatal:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
