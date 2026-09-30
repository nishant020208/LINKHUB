/**
 * google-sync: syncs Calendar, Classroom, Gmail, Drive, and Tasks streams for
 * one Google account. Each stream is fully isolated (its own try/catch +
 * sync_logs row). Requires the account's granted scopes to include the
 * permission each stream needs; a missing scope produces a precise
 * "reconnect required" error instead of a raw 403.
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
  missingScope,
  scopeError,
} from '../_shared/sync-helpers.ts';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  try {
    const { accountId } = await req.json();
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

    const granted: string[] = (account as any).granted_scopes ?? [];
    const ctx: StreamContext = {
      admin,
      accountId: account.id,
      userId: account.user_id,
      accessToken: token.accessToken,
      grantedScopes: granted,
    };

    const now = new Date();
    const past7 = new Date(now.getTime() - 7 * 86400000).toISOString();
    const future30 = new Date(now.getTime() + 30 * 86400000).toISOString();
    const past14 = new Date(now.getTime() - 14 * 86400000).toISOString();
    const results: StreamResult[] = [];
    const auth = { Authorization: `Bearer ${ctx.accessToken}` };

    // ---------------------------------------------------------------- CALENDAR
    results.push(await runStream(ctx, 'calendar', 'google', async (): Promise<NormalizedItem[]> => {
      if (missingScope(ctx, 'calendar')) {
        throw new Error(scopeError('Google', 'Calendar', 'calendar'));
      }
      const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(past7)}&timeMax=${encodeURIComponent(future30)}&singleEvents=true&orderBy=startTime&maxResults=250`;
      const res = await fetchJson(url, auth, { provider: 'google', stream: 'calendar' });
      if (!res.ok) throw new Error(res.error);

      const events: any[] = res.data.items ?? [];
      return events
        .filter((ev) => ev.status !== 'cancelled')
        .map((ev) => {
          const startAt = ev.start?.dateTime || ev.start?.date || null;
          const isToday = startAt && new Date(startAt).toDateString() === now.toDateString();
          return {
            type: 'event' as const,
            title: ev.summary || 'Scheduled Calendar Event',
            description: ev.description || null,
            start_at: startAt,
            end_at: ev.end?.dateTime || ev.end?.date || null,
            url: ev.htmlLink || null,
            source_id: ev.id,
            priority_score: isToday ? 75 : 50,
            metadata: {
              location: ev.location || '',
              organizer: ev.organizer?.email || '',
              attendees_count: ev.attendees?.length || 0,
              hangout_link: ev.hangoutLink || null,
            },
            raw: ev,
          };
        });
    }));

    // ---------------------------------------------------------------- CLASSROOM
    results.push(await runStream(ctx, 'classroom', 'google', async (): Promise<NormalizedItem[]> => {
      if (missingScope(ctx, 'classroom')) {
        throw new Error(scopeError('Google', 'Classroom', 'classroom'));
      }
      const coursesRes = await fetchJson(
        'https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE&pageSize=20',
        auth,
        { provider: 'google', stream: 'classroom-courses' }
      );
      if (!coursesRes.ok) throw new Error(coursesRes.error);
      const courses: any[] = coursesRes.data.courses ?? [];

      const items: NormalizedItem[] = [];
      for (const course of courses) {
        const cwRes = await fetchJson(
          `https://classroom.googleapis.com/v1/courses/${course.id}/courseWork?pageSize=30`,
          auth,
          { provider: 'google', stream: 'classroom-coursework' }
        );
        if (!cwRes.ok) continue; // one course failing must not block others
        for (const cw of cwRes.data.courseWork ?? []) {
          let dueAt: string | null = null;
          if (cw.dueDate) {
            const h = String(cw.dueTime?.hours ?? 23).padStart(2, '0');
            const m = String(cw.dueTime?.minutes ?? 59).padStart(2, '0');
            dueAt = new Date(`${cw.dueDate.year}-${String(cw.dueDate.month).padStart(2, '0')}-${String(cw.dueDate.day).padStart(2, '0')}T${h}:${m}:00Z`).toISOString();
          }
          let isDone = false;
          try {
            const subRes = await fetchJson(
              `https://classroom.googleapis.com/v1/courses/${course.id}/courseWork/${cw.id}/studentSubmissions?pageSize=1`,
              auth,
              { provider: 'google', stream: 'classroom-submissions' }
            );
            if (subRes.ok) {
              const st = subRes.data.studentSubmissions?.[0]?.state;
              isDone = st === 'TURNED_IN' || st === 'RETURNED';
            }
          } catch { /* submission check is best-effort */ }

          items.push({
            type: 'deadline',
            title: cw.title || 'Course Assignment',
            description: cw.description || null,
            due_at: dueAt,
            url: cw.alternateLink || null,
            source_id: `cw-${cw.id}`,
            priority_score: 85,
            is_done: isDone,
            metadata: { course_name: course.name, course_id: course.id, max_points: cw.maxPoints, submission_type: cw.workType },
            raw: cw,
          });
        }
      }
      return items;
    }));

    // ---------------------------------------------------------------- GMAIL
    results.push(await runStream(ctx, 'gmail', 'google', async (): Promise<NormalizedItem[]> => {
      if (missingScope(ctx, 'gmail')) {
        throw new Error(scopeError('Google', 'Gmail', 'gmail'));
      }
      const q = encodeURIComponent('newer_than:14d (is:important OR is:starred OR is:unread)');
      const listRes = await fetchJson(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${q}&maxResults=35`,
        auth,
        { provider: 'google', stream: 'gmail-list' }
      );
      if (!listRes.ok) throw new Error(listRes.error);
      const messages: any[] = listRes.data.messages ?? [];

      const items: NormalizedItem[] = [];
      for (const m of messages) {
        const msgRes = await fetchJson(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
          auth,
          { provider: 'google', stream: 'gmail-message' }
        );
        if (!msgRes.ok) continue;
        const msg = msgRes.data;
        const headers: any[] = msg.payload?.headers ?? [];
        const find = (name: string) => headers.find((h) => h.name.toLowerCase() === name)?.value;
        const subject = find('subject') || '(No Subject)';
        const from = find('from') || 'Unknown Sender';
        const snippet: string = msg.snippet || '';
        const combined = `${subject} ${snippet}`.toLowerCase();
        const hasExam = /exam|midterm|quiz|syllabus/.test(combined);
        const hasBill = /invoice|receipt|bill|payment due|subscription/.test(combined);
        const hasTravel = /flight|hotel|reservation|boarding pass|itinerary/.test(combined);
        const hasAction = /action required|urgent|deadline|due by/.test(combined);
        items.push({
          type: hasExam || hasAction ? 'deadline' : 'email',
          title: subject,
          description: snippet,
          url: `https://mail.google.com/mail/u/0/#all/${m.id}`,
          source_id: `gmail-${m.id}`,
          priority_score: hasAction ? 85 : hasExam ? 80 : hasBill ? 75 : 60,
          metadata: {
            sender: from,
            received_at: find('date'),
            travel_data: hasTravel ? { note: 'Travel itinerary detected' } : undefined,
            bill_data: hasBill ? { note: 'Payment / invoice statement' } : undefined,
            urgent_keywords: hasAction ? ['action required'] : hasExam ? ['exam'] : undefined,
          },
          raw: { id: m.id, threadId: msg.threadId, labelIds: msg.labelIds },
        });
      }
      return items;
    }));

    // ---------------------------------------------------------------- DRIVE
    results.push(await runStream(ctx, 'drive', 'google', async (): Promise<NormalizedItem[]> => {
      if (missingScope(ctx, 'drive')) {
        throw new Error(scopeError('Google', 'Drive', 'drive'));
      }
      const q = encodeURIComponent(`trashed = false and (starred = true or modifiedTime > '${past14}')`);
      const res = await fetchJson(
        `https://www.googleapis.com/drive/v3/files?q=${q}&pageSize=30&fields=files(id,name,mimeType,webViewLink,modifiedTime,size)`,
        auth,
        { provider: 'google', stream: 'drive' }
      );
      if (!res.ok) throw new Error(res.error);
      const files: any[] = res.data.files ?? [];
      return files.map((f) => {
        let fileType = 'DOC';
        if (f.mimeType?.includes('spreadsheet')) fileType = 'SHEET';
        else if (f.mimeType?.includes('presentation')) fileType = 'SLIDES';
        else if (f.mimeType?.includes('pdf')) fileType = 'PDF';
        else if (f.mimeType?.includes('folder')) fileType = 'FOLDER';
        return {
          type: 'file' as const,
          title: f.name || 'Cloud File',
          url: f.webViewLink || null,
          source_id: `drive-${f.id}`,
          priority_score: 50,
          metadata: {
            file_type: fileType,
            mime_type: f.mimeType,
            file_size_formatted: f.size ? `${Math.round(Number(f.size) / 1024)} KB` : 'Google Doc',
            pinned: true,
          },
          raw: f,
        };
      });
    }));

    // ---------------------------------------------------------------- TASKS
    results.push(await runStream(ctx, 'tasks', 'google', async (): Promise<NormalizedItem[]> => {
      if (missingScope(ctx, 'tasks')) {
        throw new Error(scopeError('Google', 'Tasks', 'tasks'));
      }
      const listsRes = await fetchJson(
        'https://tasks.googleapis.com/tasks/v1/users/@me/lists?maxResults=10',
        auth,
        { provider: 'google', stream: 'tasks-lists' }
      );
      if (!listsRes.ok) throw new Error(listsRes.error);
      const lists: any[] = listsRes.data.items ?? [];

      const items: NormalizedItem[] = [];
      for (const list of lists) {
        const tRes = await fetchJson(
          `https://tasks.googleapis.com/tasks/v1/lists/${list.id}/tasks?showCompleted=false&showHidden=false&maxResults=50`,
          auth,
          { provider: 'google', stream: 'tasks-items' }
        );
        if (!tRes.ok) continue;
        for (const t of tRes.data.items ?? []) {
          items.push({
            type: 'task',
            title: t.title || 'Untitled Task',
            description: t.notes || null,
            due_at: t.due || null,
            url: 'https://tasks.google.com',
            source_id: `gtask-${t.id}`,
            priority_score: 70,
            is_done: t.status === 'completed',
            metadata: { task_list_id: list.id, task_list_title: list.title },
            raw: t,
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
    console.error('[google-sync] fatal:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
