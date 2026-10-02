/**
 * Shared sync engine used by every per-provider sync function.
 *
 * Guarantees:
 *  - Every data stream runs in its own try/catch: one failing stream never
 *    blocks the others, and every non-2xx logs `HTTP <status>: <body>` both to
 *    the console and into `sync_logs.error_message`.
 *  - Items are upserted on (account_id, source_id); never duplicated; per-item
 *    failures never abort the stream; oversized `raw` payloads are stripped
 *    before insert to avoid row-size failures.
 *  - Every stream writes a complete `sync_logs` row (items_fetched,
 *    items_upserted, started/finished, status, error) so the UI status panel
 *    can surface real numbers and real error text.
 */
import { fetchWithRetry } from './rate-limit.ts';

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export interface FullItemAttachment {
  name: string;
  mimeType?: string;
  sizeBytes: number;
  storagePath?: string | null;
  externalUrl?: string | null;
  isInline?: boolean;
  contentId?: string | null;
  dataBase64?: string;
  binaryData?: Uint8Array;
}

export interface FullItemComment {
  authorName?: string;
  authorAvatar?: string;
  body: string;
  bodyHtml?: string;
  sourceId?: string;
  createdAt?: string;
}

export interface FullItemContent {
  bodyText?: string | null;
  bodyHtml?: string | null;
  bodyMarkdown?: string | null;
  structuredContent?: Record<string, unknown> | null;
  syncStatus?: 'synced' | 'partial' | 'skipped' | 'too_large' | 'error';
  skipReason?: string | null;
  contentSizeBytes?: number;
  attachments?: FullItemAttachment[];
  comments?: FullItemComment[];
}

export interface NormalizedItem {
  type: 'email' | 'event' | 'deadline' | 'task' | 'file';
  title: string;
  description?: string | null;
  due_at?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  url?: string | null;
  source_id: string;
  priority_score?: number;
  is_done?: boolean;
  metadata?: Record<string, unknown>;
  raw?: Record<string, unknown>;
  fullContent?: FullItemContent;
}

export interface StreamResult {
  dataType: string;
  status: 'success' | 'partial_error' | 'failed';
  itemsFetched: number;
  itemsUpserted: number;
  errorMessage: string | null;
}

export interface StreamContext {
  admin: any; // service-role Supabase client
  accountId: string;
  userId: string;
  accessToken: string;
  /** Scopes the user actually granted at OAuth time (empty for token providers). */
  grantedScopes: string[];
}

const MAX_RAW_BYTES = 64 * 1024;

/** Build the DB row for an item, stripping oversized raw payloads pre-insert. */
function toRow(ctx: StreamContext, item: NormalizedItem): Record<string, unknown> {
  let raw = item.raw ?? {};
  try {
    if (JSON.stringify(raw).length > MAX_RAW_BYTES) raw = { stripped: true };
  } catch {
    raw = { stripped: true };
  }
  return {
    user_id: ctx.userId,
    account_id: ctx.accountId,
    type: item.type,
    title: (item.title || 'Untitled item').slice(0, 500),
    description: item.description ?? null,
    due_at: item.due_at ?? null,
    start_at: item.start_at ?? null,
    end_at: item.end_at ?? null,
    url: item.url ?? null,
    source_id: item.source_id,
    priority_score: Math.max(0, Math.min(100, item.priority_score ?? 50)),
    is_done: item.is_done ?? false,
    raw,
    metadata: item.metadata ?? {},
  };
}

/**
 * Upsert a batch of items on (account_id, source_id).
 * When item.fullContent is present, also persists full text content into
 * item_contents, uploads file attachments into Supabase Storage, and saves
 * comment threads into item_comments.
 */
export async function upsertItems(ctx: StreamContext, items: NormalizedItem[]): Promise<number> {
  let upserted = 0;
  for (const item of items) {
    try {
      const row = toRow(ctx, item);
      const { data: itemRow, error } = await ctx.admin
        .from('items')
        .upsert(row, { onConflict: 'account_id,source_id' })
        .select('id')
        .single();

      if (error) {
        console.error(`[Upsert] failed for source_id=${item.source_id}: ${error.message}`);
        continue;
      }
      upserted++;

      // If full content is attached, persist text, comments, and storage attachments
      if (item.fullContent && itemRow?.id) {
        const fc = item.fullContent;
        let totalBytes = fc.contentSizeBytes ?? 0;
        if (!totalBytes) {
          if (fc.bodyText) totalBytes += fc.bodyText.length;
          if (fc.bodyHtml) totalBytes += fc.bodyHtml.length;
          if (fc.bodyMarkdown) totalBytes += fc.bodyMarkdown.length;
        }

        // Process attachments: upload binary content to private storage bucket if available
        if (fc.attachments && fc.attachments.length > 0) {
          for (const att of fc.attachments) {
            let storagePath = att.storagePath || null;
            if ((att.binaryData || att.dataBase64) && !storagePath) {
              try {
                const safeName = att.name.replace(/[^a-zA-Z0-9._-]/g, '_');
                storagePath = `${ctx.userId}/${ctx.accountId}/${itemRow.id}/${safeName}`;
                const fileBytes = att.binaryData || Uint8Array.from(atob(att.dataBase64!), (c) => c.charCodeAt(0));
                const { error: uploadErr } = await ctx.admin.storage
                  .from('unifyhub-content')
                  .upload(storagePath, fileBytes, {
                    contentType: att.mimeType || 'application/octet-stream',
                    upsert: true,
                  });
                if (uploadErr) {
                  console.warn(`[Storage] Failed to upload ${storagePath}: ${uploadErr.message}`);
                  storagePath = null;
                } else {
                  totalBytes += fileBytes.length;
                }
              } catch (uErr) {
                console.warn('[Storage] Upload error:', uErr);
              }
            }

            await ctx.admin.from('item_attachments').insert({
              user_id: ctx.userId,
              account_id: ctx.accountId,
              item_id: itemRow.id,
              name: att.name,
              mime_type: att.mimeType || null,
              size_bytes: att.sizeBytes || 0,
              storage_path: storagePath,
              external_url: att.externalUrl || null,
              is_inline: att.isInline || false,
              content_id: att.contentId || null,
            });
          }
        }

        // Process comments
        if (fc.comments && fc.comments.length > 0) {
          for (const c of fc.comments) {
            await ctx.admin.from('item_comments').insert({
              user_id: ctx.userId,
              account_id: ctx.accountId,
              item_id: itemRow.id,
              author_name: c.authorName || null,
              author_avatar: c.authorAvatar || null,
              body: c.body,
              body_html: c.bodyHtml || null,
              source_id: c.sourceId || null,
              created_at: c.createdAt || new Date().toISOString(),
            });
          }
        }

        // Upsert full text content record
        await ctx.admin.from('item_contents').upsert(
          {
            user_id: ctx.userId,
            account_id: ctx.accountId,
            item_id: itemRow.id,
            body_text: fc.bodyText || null,
            body_html: fc.bodyHtml || null,
            body_markdown: fc.bodyMarkdown || null,
            structured_content: fc.structuredContent || {},
            sync_status: fc.syncStatus || 'synced',
            skip_reason: fc.skipReason || null,
            content_size_bytes: totalBytes,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'item_id' }
        );
      }
    } catch (err) {
      console.error(`[Upsert] exception for source_id=${item.source_id}:`, err);
    }
  }
  return upserted;
}

/**
 * Extract the enable-API console URL from a Google error body.
 * Real activation URLs look like:
 *   https://console.developers.google.com/apis/api/calendar-json.googleapis.com/overview?project=123
 * i.e. an optional path segment (/overview) sits between the service name and
 * the query string — the pattern must allow it or the match silently fails.
 */
/**
 * Extract the enable-API console URL from a Google error body.
 * Real activation URLs look like:
 *   https://console.developers.google.com/apis/api/calendar-json.googleapis.com/overview?project=123
 *   https://console.cloud.google.com/apis/library/gmail.googleapis.com?project=123
 *   https://console.cloud.google.com/apis/enableflow?apiid=gmail.googleapis.com&project=123
 */
const GOOGLE_ENABLE_URL_RE = /https:\/\/(?:console\.developers\.google\.com|console\.cloud\.google\.com)\/(?:apis\/[^\s"'<>\\]+)/i;

function apiNameFromEnableUrl(url: string): string {
  if (/gmail/i.test(url)) return 'Gmail';
  if (/calendar/i.test(url)) return 'Google Calendar';
  if (/drive/i.test(url)) return 'Google Drive';
  if (/tasks/i.test(url)) return 'Google Tasks';
  if (/classroom/i.test(url)) return 'Google Classroom';
  return 'Google';
}

/**
 * Turn a provider API failure into a precise, actionable message.
 * Extracts the full Google API error object (message, reason, status, enable link)
 * and formats an actionable message while preserving exact technical details.
 */
export function humanizeProviderError(provider: string, stream: string, status: number | null, rawBody: string): string {
  let parsedErrorMsg = '';
  let parsedErrorCode: any = null;
  let parsedReason = '';

  try {
    const json = JSON.parse(rawBody);
    if (json?.error) {
      if (typeof json.error === 'string') {
        parsedErrorMsg = json.error;
      } else if (typeof json.error === 'object') {
        parsedErrorMsg = json.error.message || '';
        parsedErrorCode = json.error.code || null;
        parsedReason =
          json.error.details?.[0]?.reason ||
          json.error.errors?.[0]?.reason ||
          json.error.status ||
          '';
      }
    }
  } catch {
    // not JSON
  }

  const effectiveStatus = status ?? parsedErrorCode;
  const searchableText = `${rawBody} ${parsedErrorMsg} ${parsedReason}`;

  if (provider === 'google') {
    const enableMatch = searchableText.match(GOOGLE_ENABLE_URL_RE);
    const notConfigured =
      searchableText.includes('accessNotConfigured') ||
      searchableText.includes('SERVICE_DISABLED') ||
      searchableText.includes('has not been used in project') ||
      (searchableText.includes('is disabled') && searchableText.includes('Enable it'));

    if (notConfigured) {
      const apiName = enableMatch ? apiNameFromEnableUrl(enableMatch[0]) : `Google ${stream}`;
      const url = enableMatch ? enableMatch[0] : 'https://console.cloud.google.com/apis/library';
      return `${apiName} API is disabled for your Google Cloud project. Open ${url} , click Enable, wait about 1-2 minutes, then press Sync Now. [Details: ${parsedErrorMsg || 'API not configured in Google Cloud Console'}]`;
    }

    if (
      effectiveStatus === 401 ||
      /invalid credentials|INVALID_CREDENTIALS|invalid_grant|token expired/i.test(searchableText)
    ) {
      return `Access token expired or revoked. Reconnect this Google account from the Integrations page. [Details: ${parsedErrorMsg || 'Invalid grant'}]`;
    }

    if (
      (effectiveStatus === 403 || effectiveStatus === 401) &&
      /insufficientPermissions|PERMISSION_DENIED|insufficient authentication scopes/i.test(searchableText)
    ) {
      return `Missing granted scope for ${stream}. Reconnect this Google account and ensure all permissions (including Gmail and Calendar) are checked in the Google consent screen. [Details: ${parsedErrorMsg || 'Insufficient permissions'}]`;
    }

    if (effectiveStatus === 429) {
      return `Google API rate limit reached. The sync retries automatically with backoff. [Details: ${parsedErrorMsg || 'Quota exceeded'}]`;
    }

    if (parsedErrorMsg) {
      return `Google ${stream} API error (${effectiveStatus || 'API'}): ${parsedErrorMsg}`;
    }
  }

  const short = rawBody.replace(/\s+/g, ' ').trim().slice(0, 500);
  return effectiveStatus ? `HTTP ${effectiveStatus}: ${short}` : short;
}

/** Fetch JSON with authenticated headers, retry/backoff, and full error surfacing. */
export async function fetchJson(
  url: string,
  headers: Record<string, string>,
  httpInfo: { provider: string; stream: string }
): Promise<{ ok: true; data: any } | { ok: false; error: string; rawBody?: string; status?: number }> {
  const res = await fetchWithRetry(url, { headers });
  if (!res.ok) {
    let body = '';
    try {
      body = await res.text();
    } catch {
      body = '<unreadable body>';
    }
    const msg = humanizeProviderError(httpInfo.provider, httpInfo.stream, res.status, body);
    console.error(`[${httpInfo.provider}:${httpInfo.stream}] HTTP ${res.status}: ${body.slice(0, 600)}`);
    return { ok: false, error: msg, rawBody: body, status: res.status };
  }
  try {
    return { ok: true, data: await res.json() };
  } catch (err) {
    const msg = `${httpInfo.provider} ${httpInfo.stream} returned invalid JSON: ${err instanceof Error ? err.message : String(err)}`;
    console.error(`[${httpInfo.provider}:${httpInfo.stream}] ${msg}`);
    return { ok: false, error: msg };
  }
}

/** Persist a stream outcome to sync_logs with every column the UI reads. */
export async function writeSyncLog(
  ctx: StreamContext,
  result: StreamResult,
  startedAt: string
): Promise<void> {
  try {
    await ctx.admin.from('sync_logs').insert({
      user_id: ctx.userId,
      account_id: ctx.accountId,
      data_type: result.dataType,
      status: result.status,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      items_fetched: result.itemsFetched,
      items_upserted: result.itemsUpserted,
      items_synced: result.itemsUpserted,
      error_message: result.errorMessage,
    });
  } catch (err) {
    console.error('[SyncLog] failed to persist stream log:', err);
  }
}

/**
 * Run one data stream with full isolation. The runner fetches from the
 * provider API and returns normalized items; everything else (error capture,
 * counting, upsert, logging) is handled here.
 */
export async function runStream(
  ctx: StreamContext,
  dataType: string,
  provider: string,
  runner: () => Promise<NormalizedItem[]>
): Promise<StreamResult> {
  const startedAt = new Date().toISOString();
  let fetched = 0;
  let errorMessage: string | null = null;

  try {
    const items = await runner();
    fetched = items.length;
    const upserted = await upsertItems(ctx, items);
    const result: StreamResult = {
      dataType,
      status: errorMessage ? 'partial_error' : 'success',
      itemsFetched: fetched,
      itemsUpserted: upserted,
      errorMessage: null,
    };
    await writeSyncLog(ctx, result, startedAt);
    return result;
  } catch (err) {
    const rawError = err instanceof Error ? err.message : String(err);
    // If rawError is already humanized with [Details: ...] or contains API activation link, preserve it directly
    errorMessage = rawError.includes('[Details:') || rawError.includes('API is disabled')
      ? rawError
      : humanizeProviderError(provider, dataType, null, rawError);
    console.error(`[${provider}:${dataType}] stream failed: ${errorMessage}`);
    const result: StreamResult = {
      dataType,
      status: 'failed',
      itemsFetched: fetched,
      itemsUpserted: 0,
      errorMessage,
    };
    await writeSyncLog(ctx, result, startedAt);
    return result;
  }
}

/** True when the granted OAuth scope set lacks a scope this stream requires. */
export function missingScope(ctx: StreamContext, requiredSubstring: string): boolean {
  if (ctx.grantedScopes.length === 0) return false; // token/URL providers: no scope model
  return !ctx.grantedScopes.some((s) => s.includes(requiredSubstring));
}

export function scopeError(provider: string, stream: string, requiredSubstring: string): string {
  return `Missing granted scope for ${stream} (requires "${requiredSubstring}"). Reconnect the ${provider} account and approve this permission.`;
}

/** Finalize: update the account row from the stream results. */
export async function finalizeAccount(
  admin: any,
  accountId: string,
  results: StreamResult[]
): Promise<{ success: boolean; streams: StreamResult[]; totalUpserted: number }> {
  const anyFailed = results.some((r) => r.status === 'failed');
  const allFailed = results.length > 0 && results.every((r) => r.status === 'failed');
  // Compact per-stream summary: the UI splits it back out per card. Keep each
  // segment short — full details already live in sync_logs. Google enable-API
  // URLs are preserved WHOLE (never sliced) so the UI can render a working
  // "Enable on Google Cloud" recovery link from the summary alone.
  const errorSummary = results
    .filter((r) => r.errorMessage)
    .map((r) => {
      const msg = r.errorMessage!;
      const enableMatch = msg.match(GOOGLE_ENABLE_URL_RE);
      if (enableMatch) {
        const apiName = apiNameFromEnableUrl(enableMatch[0]);
        return `${r.dataType}: ${apiName} API is disabled for this Google Cloud project — enable: ${enableMatch[0]}`;
      }
      return `${r.dataType}: ${msg.slice(0, 140)}`;
    })
    .join(' | ')
    .slice(0, 2400);

  // Aggregate account storage and full-sync metrics
  let storageUsed = 0;
  let totalItems = 0;
  let fullSynced = 0;
  let skippedItems = 0;
  const skipReasons: Record<string, number> = {};

  try {
    const { count } = await admin.from('items').select('*', { count: 'exact', head: true }).eq('account_id', accountId);
    totalItems = count || 0;

    const { data: contents } = await admin
      .from('item_contents')
      .select('content_size_bytes, sync_status, skip_reason')
      .eq('account_id', accountId);

    if (contents) {
      for (const c of contents) {
        storageUsed += Number(c.content_size_bytes) || 0;
        if (c.sync_status === 'synced') fullSynced++;
        else if (c.sync_status === 'skipped' || c.sync_status === 'too_large') {
          skippedItems++;
          const reason = c.skip_reason || 'File or block content skipped';
          skipReasons[reason] = (skipReasons[reason] || 0) + 1;
        }
      }
    }

    const { data: atts } = await admin
      .from('item_attachments')
      .select('size_bytes')
      .eq('account_id', accountId);
    if (atts) {
      for (const a of atts) {
        storageUsed += Number(a.size_bytes) || 0;
      }
    }

    const { data: accRow } = await admin.from('connected_accounts').select('user_id').eq('id', accountId).single();
    if (accRow?.user_id) {
      await admin
        .from('connected_accounts')
        .update({
          last_synced_at: new Date().toISOString(),
          status: allFailed ? 'error' : 'connected',
          error_message: errorSummary || null,
          storage_used_bytes: storageUsed,
          items_total_count: totalItems,
          items_full_synced_count: fullSynced,
          items_skipped_count: skippedItems,
          skip_reasons: skipReasons,
        })
        .eq('id', accountId);

      const { data: allUserAccs } = await admin
        .from('connected_accounts')
        .select('storage_used_bytes')
        .eq('user_id', accRow.user_id);
      const totalUserStorage = (allUserAccs || []).reduce(
        (acc: number, r: any) => acc + (Number(r.storage_used_bytes) || 0),
        0
      );
      await admin.from('user_settings').update({ storage_used_bytes: totalUserStorage }).eq('user_id', accRow.user_id);
    }
  } catch (mErr) {
    console.warn('[Sync] Could not update account metrics:', mErr);
    await admin
      .from('connected_accounts')
      .update({
        last_synced_at: new Date().toISOString(),
        status: allFailed ? 'error' : 'connected',
        error_message: errorSummary || null,
      })
      .eq('id', accountId);
  }

  return {
    success: !allFailed,
    streams: results,
    totalUpserted: results.reduce((acc, r) => acc + r.itemsUpserted, 0),
  };
}
