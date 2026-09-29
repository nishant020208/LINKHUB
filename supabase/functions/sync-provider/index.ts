import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { fetchWithRetry } from '../_shared/rate-limit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncLogResult {
  dataType: string;
  status: 'success' | 'partial_error' | 'failed';
  itemsFetched: number;
  itemsUpserted: number;
  errorMessage: string | null;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const syncResults: SyncLogResult[] = [];

  try {
    const { accountId } = await req.json();
    if (!accountId) {
      return new Response(JSON.stringify({ error: 'accountId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Fetch connected account
    const { data: account, error: accError } = await supabase
      .from('connected_accounts')
      .select('*')
      .eq('id', accountId)
      .single();

    if (accError || !account) {
      return new Response(JSON.stringify({ error: 'Account not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Refresh token to acquire fresh access_token
    console.log(`[Sync] Initiating token refresh for account ${account.email} (${account.provider})`);
    const refreshRes = await fetch(`${supabaseUrl}/functions/v1/oauth-refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ accountId }),
    });

    const refreshData = await refreshRes.json();
    if (!refreshRes.ok || !refreshData.access_token) {
      const errMsg = refreshData.error || 'Failed to obtain fresh access token from provider';
      console.error(`[Sync Error] Token refresh failed: ${errMsg}`);

      await supabase
        .from('connected_accounts')
        .update({
          status: 'needs_reconnect',
          error_message: errMsg,
        })
        .eq('id', accountId);

      return new Response(JSON.stringify({ error: errMsg, status: 'needs_reconnect' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const accessToken = refreshData.access_token;
    console.log(`[Sync] Token refreshed successfully. Proceeding with Google APIs sync.`);

    // =========================================================================
    // 3. SYNC GOOGLE PROVIDER DATA STREAMS
    // =========================================================================
    if (account.provider === 'google') {
      const now = new Date();
      const past7Days = new Date(now.getTime() - 7 * 86400000).toISOString();
      const future30Days = new Date(now.getTime() + 30 * 86400000).toISOString();
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000).toISOString();

      // -----------------------------------------------------------------------
      // A. GOOGLE CALENDAR
      // -----------------------------------------------------------------------
      const calStart = new Date().toISOString();
      let calFetched = 0;
      let calUpserted = 0;
      let calError: string | null = null;

      try {
        console.log(`[Calendar] Fetching events from ${past7Days} to ${future30Days}...`);
        const calUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
          past7Days
        )}&timeMax=${encodeURIComponent(
          future30Days
        )}&singleEvents=true&orderBy=startTime&maxResults=250`;

        const calRes = await fetchWithRetry(calUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        console.log(`[Calendar] Response HTTP ${calRes.status}`);
        if (!calRes.ok) {
          const errBody = await calRes.text();
          throw new Error(`Google Calendar API returned HTTP ${calRes.status}: ${errBody}`);
        }

        const calData = await calRes.json();
        const events = calData.items || [];
        calFetched = events.length;

        for (const ev of events) {
          if (ev.status === 'cancelled') continue;

          const startAt = ev.start?.dateTime || ev.start?.date;
          const endAt = ev.end?.dateTime || ev.end?.date;
          const isToday =
            startAt &&
            new Date(startAt).toDateString() === new Date().toDateString();

          const { error: upsertErr } = await supabase.from('items').upsert(
            {
              user_id: account.user_id,
              account_id: account.id,
              type: 'event',
              title: ev.summary || 'Scheduled Calendar Event',
              description: ev.description || '',
              start_at: startAt,
              end_at: endAt,
              url: ev.htmlLink,
              source_id: ev.id,
              priority_score: isToday ? 75 : 50,
              is_done: false,
              raw: ev,
              metadata: {
                location: ev.location || '',
                organizer: ev.organizer?.email || '',
                attendees_count: ev.attendees?.length || 0,
              },
            },
            { onConflict: 'account_id,source_id' }
          );

          if (!upsertErr) calUpserted++;
        }
      } catch (err: unknown) {
        calError = err instanceof Error ? err.message : String(err);
        console.error('[Calendar Sync Failed]', calError);
      } finally {
        const calStatus = calError ? 'failed' : 'success';
        syncResults.push({
          dataType: 'calendar',
          status: calStatus,
          itemsFetched: calFetched,
          itemsUpserted: calUpserted,
          errorMessage: calError,
        });

        await supabase.from('sync_logs').insert({
          user_id: account.user_id,
          account_id: account.id,
          data_type: 'calendar',
          status: calStatus,
          started_at: calStart,
          finished_at: new Date().toISOString(),
          items_fetched: calFetched,
          items_upserted: calUpserted,
          items_synced: calUpserted,
          error_message: calError,
        });
      }

      // -----------------------------------------------------------------------
      // B. GOOGLE CLASSROOM (Courses & CourseWork Deadlines)
      // -----------------------------------------------------------------------
      const classStart = new Date().toISOString();
      let classFetched = 0;
      let classUpserted = 0;
      let classError: string | null = null;

      try {
        console.log('[Classroom] Fetching active student courses...');
        const coursesRes = await fetchWithRetry(
          'https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE&pageSize=20',
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        console.log(`[Classroom Courses] Response HTTP ${coursesRes.status}`);
        if (!coursesRes.ok) {
          const errBody = await coursesRes.text();
          throw new Error(`Google Classroom API returned HTTP ${coursesRes.status}: ${errBody}`);
        }

        const coursesData = await coursesRes.json();
        const courses = coursesData.courses || [];

        for (const course of courses) {
          // Fetch coursework for course
          const cwRes = await fetchWithRetry(
            `https://classroom.googleapis.com/v1/courses/${course.id}/courseWork?pageSize=30`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );

          if (!cwRes.ok) continue;
          const cwData = await cwRes.json();
          const courseWorkList = cwData.courseWork || [];

          for (const cw of courseWorkList) {
            classFetched++;

            // Calculate due_at from dueDate and dueTime
            let dueAt: string | null = null;
            if (cw.dueDate) {
              const year = cw.dueDate.year;
              const month = String(cw.dueDate.month).padStart(2, '0');
              const day = String(cw.dueDate.day).padStart(2, '0');
              const hours = cw.dueTime?.hours ? String(cw.dueTime.hours).padStart(2, '0') : '23';
              const minutes = cw.dueTime?.minutes ? String(cw.dueTime.minutes).padStart(2, '0') : '59';
              dueAt = new Date(`${year}-${month}-${day}T${hours}:${minutes}:00Z`).toISOString();
            }

            // Check submission state
            let isSubmitted = false;
            try {
              const subRes = await fetchWithRetry(
                `https://classroom.googleapis.com/v1/courses/${course.id}/courseWork/${cw.id}/studentSubmissions?pageSize=1`,
                { headers: { Authorization: `Bearer ${accessToken}` } }
              );
              if (subRes.ok) {
                const subData = await subRes.json();
                const submission = subData.studentSubmissions?.[0];
                if (submission && (submission.state === 'TURNED_IN' || submission.state === 'RETURNED')) {
                  isSubmitted = true;
                }
              }
            } catch {
              // Ignore submission check failure
            }

            const { error: upsertErr } = await supabase.from('items').upsert(
              {
                user_id: account.user_id,
                account_id: account.id,
                type: 'deadline',
                title: cw.title || 'Course Assignment',
                description: cw.description || '',
                due_at: dueAt,
                url: cw.alternateLink,
                source_id: `cw-${cw.id}`,
                priority_score: 85,
                is_done: isSubmitted,
                raw: cw,
                metadata: {
                  course_name: course.name,
                  course_id: course.id,
                  max_points: cw.maxPoints,
                  submission_type: cw.workType,
                },
              },
              { onConflict: 'account_id,source_id' }
            );

            if (!upsertErr) classUpserted++;
          }
        }
      } catch (err: unknown) {
        classError = err instanceof Error ? err.message : String(err);
        console.error('[Classroom Sync Failed]', classError);
      } finally {
        const classStatus = classError ? 'failed' : 'success';
        syncResults.push({
          dataType: 'classroom',
          status: classStatus,
          itemsFetched: classFetched,
          itemsUpserted: classUpserted,
          errorMessage: classError,
        });

        await supabase.from('sync_logs').insert({
          user_id: account.user_id,
          account_id: account.id,
          data_type: 'classroom',
          status: classStatus,
          started_at: classStart,
          finished_at: new Date().toISOString(),
          items_fetched: classFetched,
          items_upserted: classUpserted,
          items_synced: classUpserted,
          error_message: classError,
        });
      }

      // -----------------------------------------------------------------------
      // C. GMAIL (Important, Starred & Unread from last 14 days)
      // -----------------------------------------------------------------------
      const mailStart = new Date().toISOString();
      let mailFetched = 0;
      let mailUpserted = 0;
      let mailError: string | null = null;

      try {
        console.log('[Gmail] Querying messages newer than 14d...');
        const mailQuery = encodeURIComponent('newer_than:14d (is:important OR is:starred OR is:unread)');
        const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${mailQuery}&maxResults=35`;

        const listRes = await fetchWithRetry(listUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        console.log(`[Gmail List] Response HTTP ${listRes.status}`);
        if (!listRes.ok) {
          const errBody = await listRes.text();
          throw new Error(`Gmail API returned HTTP ${listRes.status}: ${errBody}`);
        }

        const listData = await listRes.json();
        const messages = listData.messages || [];
        mailFetched = messages.length;

        for (const m of messages) {
          const msgRes = await fetchWithRetry(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );

          if (!msgRes.ok) continue;
          const msgData = await msgRes.json();

          const headers = msgData.payload?.headers || [];
          const subject = headers.find((h: { name: string }) => h.name.toLowerCase() === 'subject')?.value || '(No Subject)';
          const from = headers.find((h: { name: string }) => h.name.toLowerCase() === 'from')?.value || 'Unknown Sender';
          const dateStr = headers.find((h: { name: string }) => h.name.toLowerCase() === 'date')?.value;
          const snippet = msgData.snippet || '';

          // Smart heuristic classifiers
          const combined = `${subject} ${snippet}`.toLowerCase();
          const hasExam = combined.includes('exam') || combined.includes('midterm') || combined.includes('quiz') || combined.includes('syllabus');
          const hasBill = combined.includes('invoice') || combined.includes('receipt') || combined.includes('bill') || combined.includes('payment due') || combined.includes('subscription');
          const hasTravel = combined.includes('flight') || combined.includes('hotel') || combined.includes('reservation') || combined.includes('boarding pass') || combined.includes('itinerary');
          const hasAction = combined.includes('action required') || combined.includes('urgent') || combined.includes('deadline') || combined.includes('due by');

          const isDeadlineItem = hasExam || hasAction;
          const priorityScore = hasAction ? 85 : hasExam ? 80 : hasBill ? 75 : 60;

          const { error: upsertErr } = await supabase.from('items').upsert(
            {
              user_id: account.user_id,
              account_id: account.id,
              type: isDeadlineItem ? 'deadline' : 'email',
              title: subject,
              description: snippet,
              url: `https://mail.google.com/mail/u/0/#all/${m.id}`,
              source_id: `gmail-${m.id}`,
              priority_score: priorityScore,
              is_done: false,
              raw: { id: m.id, threadId: msgData.threadId, labelIds: msgData.labelIds },
              metadata: {
                sender: from,
                received_at: dateStr,
                travel_data: hasTravel ? { note: 'Travel itinerary detected' } : undefined,
                bill_data: hasBill ? { note: 'Payment / invoice statement' } : undefined,
                urgent_keywords: hasAction ? ['action required'] : hasExam ? ['exam'] : undefined,
              },
            },
            { onConflict: 'account_id,source_id' }
          );

          if (!upsertErr) mailUpserted++;
        }
      } catch (err: unknown) {
        mailError = err instanceof Error ? err.message : String(err);
        console.error('[Gmail Sync Failed]', mailError);
      } finally {
        const mailStatus = mailError ? 'failed' : 'success';
        syncResults.push({
          dataType: 'gmail',
          status: mailStatus,
          itemsFetched: mailFetched,
          itemsUpserted: mailUpserted,
          errorMessage: mailError,
        });

        await supabase.from('sync_logs').insert({
          user_id: account.user_id,
          account_id: account.id,
          data_type: 'gmail',
          status: mailStatus,
          started_at: mailStart,
          finished_at: new Date().toISOString(),
          items_fetched: mailFetched,
          items_upserted: mailUpserted,
          items_synced: mailUpserted,
          error_message: mailError,
        });
      }

      // -----------------------------------------------------------------------
      // D. GOOGLE DRIVE (Starred & Recently Modified Files)
      // -----------------------------------------------------------------------
      const driveStart = new Date().toISOString();
      let driveFetched = 0;
      let driveUpserted = 0;
      let driveError: string | null = null;

      try {
        console.log('[Google Drive] Fetching recently accessed & starred files...');
        const driveQuery = encodeURIComponent(
          `trashed = false and (starred = true or modifiedTime > '${fourteenDaysAgo}')`
        );
        const driveUrl = `https://www.googleapis.com/drive/v3/files?q=${driveQuery}&pageSize=30&fields=files(id,name,mimeType,webViewLink,modifiedTime,size,iconLink)`;

        const driveRes = await fetchWithRetry(driveUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        console.log(`[Google Drive] Response HTTP ${driveRes.status}`);
        if (!driveRes.ok) {
          const errBody = await driveRes.text();
          throw new Error(`Google Drive API returned HTTP ${driveRes.status}: ${errBody}`);
        }

        const driveData = await driveRes.json();
        const files = driveData.files || [];
        driveFetched = files.length;

        for (const f of files) {
          let fileType = 'DOC';
          if (f.mimeType?.includes('spreadsheet')) fileType = 'SHEET';
          else if (f.mimeType?.includes('presentation')) fileType = 'SLIDES';
          else if (f.mimeType?.includes('pdf')) fileType = 'PDF';
          else if (f.mimeType?.includes('folder')) fileType = 'FOLDER';

          const { error: upsertErr } = await supabase.from('items').upsert(
            {
              user_id: account.user_id,
              account_id: account.id,
              type: 'file',
              title: f.name || 'Cloud File',
              url: f.webViewLink,
              source_id: `drive-${f.id}`,
              priority_score: 50,
              is_done: false,
              raw: f,
              metadata: {
                file_type: fileType,
                mime_type: f.mimeType,
                file_size_formatted: f.size ? `${Math.round(f.size / 1024)} KB` : 'Google Doc',
                pinned: true,
              },
            },
            { onConflict: 'account_id,source_id' }
          );

          if (!upsertErr) driveUpserted++;
        }
      } catch (err: unknown) {
        driveError = err instanceof Error ? err.message : String(err);
        console.error('[Google Drive Sync Failed]', driveError);
      } finally {
        const driveStatus = driveError ? 'failed' : 'success';
        syncResults.push({
          dataType: 'drive',
          status: driveStatus,
          itemsFetched: driveFetched,
          itemsUpserted: driveUpserted,
          errorMessage: driveError,
        });

        await supabase.from('sync_logs').insert({
          user_id: account.user_id,
          account_id: account.id,
          data_type: 'drive',
          status: driveStatus,
          started_at: driveStart,
          finished_at: new Date().toISOString(),
          items_fetched: driveFetched,
          items_upserted: driveUpserted,
          items_synced: driveUpserted,
          error_message: driveError,
        });
      }

      // -----------------------------------------------------------------------
      // E. GOOGLE TASKS
      // -----------------------------------------------------------------------
      const tasksStart = new Date().toISOString();
      let tasksFetched = 0;
      let tasksUpserted = 0;
      let tasksError: string | null = null;

      try {
        console.log('[Google Tasks] Fetching task lists...');
        const listsRes = await fetchWithRetry(
          'https://tasks.googleapis.com/tasks/v1/users/@me/lists?maxResults=10',
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        console.log(`[Google Tasks Lists] Response HTTP ${listsRes.status}`);
        if (!listsRes.ok) {
          const errBody = await listsRes.text();
          throw new Error(`Google Tasks API returned HTTP ${listsRes.status}: ${errBody}`);
        }

        const listsData = await listsRes.json();
        const taskLists = listsData.items || [];

        for (const tList of taskLists) {
          const tRes = await fetchWithRetry(
            `https://tasks.googleapis.com/tasks/v1/lists/${tList.id}/tasks?showCompleted=false&showHidden=false&maxResults=50`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );

          if (!tRes.ok) continue;
          const tData = await tRes.json();
          const taskItems = tData.items || [];

          for (const t of taskItems) {
            tasksFetched++;

            const { error: upsertErr } = await supabase.from('items').upsert(
              {
                user_id: account.user_id,
                account_id: account.id,
                type: 'task',
                title: t.title || 'Untitled Task',
                description: t.notes || '',
                due_at: t.due || null,
                url: 'https://tasks.google.com',
                source_id: `gtask-${t.id}`,
                priority_score: 70,
                is_done: t.status === 'completed',
                raw: t,
                metadata: {
                  task_list_id: tList.id,
                  task_list_title: tList.title,
                },
              },
              { onConflict: 'account_id,source_id' }
            );

            if (!upsertErr) tasksUpserted++;
          }
        }
      } catch (err: unknown) {
        tasksError = err instanceof Error ? err.message : String(err);
        console.error('[Google Tasks Sync Failed]', tasksError);
      } finally {
        const tasksStatus = tasksError ? 'failed' : 'success';
        syncResults.push({
          dataType: 'tasks',
          status: tasksStatus,
          itemsFetched: tasksFetched,
          itemsUpserted: tasksUpserted,
          errorMessage: tasksError,
        });

        await supabase.from('sync_logs').insert({
          user_id: account.user_id,
          account_id: account.id,
          data_type: 'tasks',
          status: tasksStatus,
          started_at: tasksStart,
          finished_at: new Date().toISOString(),
          items_fetched: tasksFetched,
          items_upserted: tasksUpserted,
          items_synced: tasksUpserted,
          error_message: tasksError,
        });
      }
    }

    // 4. Update connected_accounts row with sync status
    const anyFailed = syncResults.some((r) => r.status === 'failed');
    const allFailed = syncResults.length > 0 && syncResults.every((r) => r.status === 'failed');
    const errorSummaries = syncResults
      .filter((r) => r.errorMessage)
      .map((r) => `${r.dataType}: ${r.errorMessage}`)
      .join(' | ');

    await supabase
      .from('connected_accounts')
      .update({
        last_synced_at: new Date().toISOString(),
        status: allFailed ? 'error' : anyFailed ? 'connected' : 'connected',
        error_message: errorSummaries || null,
      })
      .eq('id', accountId);

    const totalUpserted = syncResults.reduce((acc, r) => acc + r.itemsUpserted, 0);

    return new Response(
      JSON.stringify({
        success: !allFailed,
        accountId,
        totalItemsUpserted: totalUpserted,
        streams: syncResults,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Fatal Sync Error:', errorMsg);
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
