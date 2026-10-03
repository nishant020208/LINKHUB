/**
 * moodle-sync: syncs courses and assignments for one Moodle account via the
 * Moodle Web Services REST API.
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

function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

function calculatePriority(dueDate: Date | null): number {
  if (!dueDate) return 50;
  const now = Date.now();
  const diffHours = (dueDate.getTime() - now) / (1000 * 60 * 60);
  if (diffHours < 0) return 30; // Past due
  if (diffHours < 24) return 95; // Due within 24h
  if (diffHours < 72) return 85; // Due within 3 days
  if (diffHours < 168) return 70; // Due within 1 week
  return 55;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  try {
    const { accountId } = await req.json().catch(() => ({}));
    if (!accountId) {
      return new Response(JSON.stringify({ error: 'accountId is required' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { account, token, errorResponse } = await loadAccountWithToken(admin, accountId);
    if (errorResponse || !account || !token) {
      return new Response(JSON.stringify(errorResponse ?? { error: 'Account load failed' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const baseUrl = token.extra?.base_url || account.email;
    const cleanBaseUrl = baseUrl.startsWith('http') ? baseUrl.replace(/\/+$/, '') : `https://${baseUrl.replace(/\/+$/, '')}`;
    const wsToken = token.accessToken;

    if (!cleanBaseUrl || !wsToken) {
      return new Response(
        JSON.stringify({ error: 'Missing Moodle portal URL or web service token', needsReconnect: true }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // Helper to query Moodle REST server
    async function callMoodle(wsfunction: string, params: Record<string, string | number> = {}) {
      const url = new URL(`${cleanBaseUrl}/webservice/rest/server.php`);
      url.searchParams.set('wstoken', wsToken);
      url.searchParams.set('moodlewsrestformat', 'json');
      url.searchParams.set('wsfunction', wsfunction);
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, String(v));
      }

      const res = await fetch(url.toString());
      if (!res.ok) {
        throw new Error(`Moodle server responded with HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.exception || data.errorcode) {
        throw new Error(`Moodle API [${data.errorcode || 'error'}]: ${data.message || 'Call failed'}`);
      }
      return data;
    }

    const ctx: StreamContext = {
      admin,
      accountId: account.id,
      userId: account.user_id,
      accessToken: wsToken,
      grantedScopes: [],
    };

    const results: StreamResult[] = [];

    // ------------------------------------------------------------- ASSIGNMENTS STREAM
    results.push(
      await runStream(ctx, 'assignments', 'moodle', async (): Promise<NormalizedItem[]> => {
        // 1. Get site info to resolve current user ID
        const siteInfo = await callMoodle('core_webservice_get_site_info');
        const moodleUserId = siteInfo.userid;

        // 2. Fetch enrolled courses
        let courses: any[] = [];
        try {
          const coursesRes = await callMoodle('core_enrol_get_users_courses', { userid: moodleUserId });
          if (Array.isArray(coursesRes)) courses = coursesRes;
        } catch (cErr) {
          console.warn('[moodle-sync] course fetch warning:', cErr);
        }

        const courseMap = new Map<number, string>();
        for (const c of courses) {
          courseMap.set(c.id, c.fullname || c.shortname || `Course #${c.id}`);
        }

        // 3. Fetch assignments across courses
        const assignParams: Record<string, string | number> = {};
        courses.slice(0, 30).forEach((c, idx) => {
          assignParams[`courseids[${idx}]`] = c.id;
        });

        const assignmentsRes = await callMoodle('mod_assign_get_assignments', assignParams);
        const fetchedCourses: any[] = assignmentsRes.courses || [];

        const items: NormalizedItem[] = [];

        for (const cEntry of fetchedCourses) {
          const courseTitle = courseMap.get(cEntry.id) || `Course #${cEntry.id}`;
          const assignList: any[] = cEntry.assignments || [];

          for (const a of assignList) {
            const dueDate = a.duedate ? new Date(a.duedate * 1000) : null;
            const plainIntro = stripHtml(a.intro || '');
            const priority = calculatePriority(dueDate);
            const assignUrl = `${cleanBaseUrl}/mod/assign/view.php?id=${a.cmid || a.id}`;

            const attachments: any[] = [];
            if (Array.isArray(a.introattachments)) {
              for (const att of a.introattachments) {
                attachments.push({
                  name: att.filename || 'attachment',
                  mimeType: att.mimetype || 'application/octet-stream',
                  externalUrl: att.fileurl ? `${att.fileurl}?token=${wsToken}` : undefined,
                  sizeBytes: att.filesize || 0,
                });
              }
            }

            items.push({
              source: 'moodle',
              sourceId: String(a.id),
              type: 'deadline',
              title: a.name || 'Untitled Assignment',
              description: plainIntro ? `${courseTitle} — ${plainIntro.slice(0, 300)}` : courseTitle,
              contentHtml: a.intro || '',
              contentText: plainIntro,
              url: assignUrl,
              dueAt: dueDate ? dueDate.toISOString() : undefined,
              priorityScore: priority,
              priority: priority >= 80 ? 'high' : priority >= 60 ? 'medium' : 'normal',
              isDone: false,
              rawMetadata: {
                courseId: cEntry.id,
                courseName: courseTitle,
                cutoffDate: a.cutoffdate ? new Date(a.cutoffdate * 1000).toISOString() : null,
                allowSubmissionsFromDate: a.allowsubmissionsfromdate
                  ? new Date(a.allowsubmissionsfromdate * 1000).toISOString()
                  : null,
              },
              attachments,
            });
          }
        }

        return items;
      })
    );

    const totalUpserted = await finalizeAccount(admin, account.id, results);

    return new Response(
      JSON.stringify({
        success: true,
        totalUpserted,
        streams: results,
      }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[moodle-sync] fatal:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
