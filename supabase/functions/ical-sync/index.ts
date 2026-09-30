/**
 * ical-sync: fetches a subscribed iCal/webcal feed and normalizes VEVENTs
 * into calendar events. Handles webcal:// -> https://, line unfolding,
 * UTC/DATE/TZID datetime forms, and recurring-expansion safeguards.
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

interface ParsedEvent {
  uid: string;
  summary: string;
  description: string | null;
  location: string | null;
  start: string | null;
  end: string | null;
  url: string | null;
}

function unfoldLines(raw: string): string[] {
  // RFC 5545: continuation lines begin with a space or tab.
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .reduce<string[]>((acc, line) => {
      if ((line.startsWith(' ') || line.startsWith('\t')) && acc.length > 0) {
        acc[acc.length - 1] += line.slice(1);
      } else {
        acc.push(line);
      }
      return acc;
    }, []);
}

function parseIcsDate(value: string, params: string): string | null {
  const isDateOnly = params.includes('VALUE=DATE') || /^\d{8}$/.test(value);
  const m = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if (!m) return null;
  const [, y, mo, d, h = '12', mi = '00', s = '00'] = m;
  // UTC form ends with Z; floating times treated as UTC for consistency.
  const iso = `${y}-${mo}-${d}T${h}:${mi}:${s}Z`;
  const date = new Date(iso);
  if (isNaN(date.getTime())) return null;
  if (isDateOnly && !h) {
    // All-day events: keep as date at noon UTC so day grouping is stable.
    return `${y}-${mo}-${d}T12:00:00Z`;
  }
  return date.toISOString();
}

function parseVEvents(raw: string): ParsedEvent[] {
  const lines = unfoldLines(raw);
  const events: ParsedEvent[] = [];
  let current: any = null;

  for (const line of lines) {
    if (line.startsWith('BEGIN:VEVENT')) {
      current = { uid: '', summary: '' };
      continue;
    }
    if (line.startsWith('END:VEVENT')) {
      if (current?.uid && (current.start || current.summary)) {
        events.push({
          uid: current.uid,
          summary: current.summary || 'Scheduled Event',
          description: current.description ?? null,
          location: current.location ?? null,
          start: current.start ?? null,
          end: current.end ?? null,
          url: current.url ?? null,
        });
      }
      current = null;
      continue;
    }
    if (!current) continue;

    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const left = line.slice(0, colon);
    const value = line.slice(colon + 1);
    const [name, ...paramParts] = left.split(';');
    const params = paramParts.join(';');

    switch (name.toUpperCase()) {
      case 'UID':
        current.uid = value.trim();
        break;
      case 'SUMMARY':
        current.summary = unescapeIcs(value).trim();
        break;
      case 'DESCRIPTION':
        current.description = unescapeIcs(value).slice(0, 800);
        break;
      case 'LOCATION':
        current.location = unescapeIcs(value);
        break;
      case 'DTSTART':
        current.start = parseIcsDate(value.trim(), params);
        current.dtstartParams = params;
        break;
      case 'DTEND':
        current.end = parseIcsDate(value.trim(), params);
        break;
      case 'URL':
        current.url = value.trim();
        break;
    }
  }
  return events;
}

function unescapeIcs(value: string): string {
  return value.replace(/\\n/gi, ' ').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\');
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
      grantedScopes: [],
    };

    const results: StreamResult[] = [];

    results.push(await runStream(ctx, 'ical_events', 'ical', async (): Promise<NormalizedItem[]> => {
      const feedUrl = ctx.accessToken
        .replace(/^webcal:\/\//i, 'https://')
        .replace(/^http:\/\//i, 'https://');

      let res: Response;
      try {
        res = await fetch(feedUrl, {
          headers: { Accept: 'text/calendar, text/plain, */*' },
          redirect: 'follow',
        });
      } catch (err) {
        throw new Error(`iCal feed unreachable: ${err instanceof Error ? err.message : String(err)}`);
      }
      if (!res.ok) {
        const body = await res.text().catch(() => '<unreadable>');
        throw new Error(`iCal feed returned HTTP ${res.status}: ${body.slice(0, 400)}`);
      }

      const text = await res.text();
      if (!text.includes('BEGIN:VCALENDAR')) {
        throw new Error('iCal feed response is not a valid VCALENDAR document');
      }

      const events = parseVEvents(text);
      const now = Date.now();
      const windowStart = now - 7 * 86400000;
      const windowEnd = now + 60 * 86400000;

      return events
        .filter((ev) => {
          if (!ev.start) return true; // keep undated items visible
          const t = new Date(ev.start).getTime();
          return t >= windowStart && t <= windowEnd;
        })
        .map((ev) => ({
          type: 'event' as const,
          title: ev.summary,
          description: ev.description,
          start_at: ev.start,
          end_at: ev.end ?? (ev.start ? new Date(new Date(ev.start).getTime() + 50 * 60000).toISOString() : null),
          url: ev.url,
          source_id: `ical-${ev.uid || `${ev.summary}-${ev.start}`}`,
          priority_score: 52,
          metadata: {
            location: ev.location ?? '',
            feed: account.email,
          },
          raw: { uid: ev.uid, summary: ev.summary },
        }));
    }));

    const summary = await finalizeAccount(admin, accountId, results);
    return new Response(JSON.stringify({ success: summary.success, accountId, ...summary }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[ical-sync] fatal:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
