import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface DigestRequest {
  user_id?: string;
  dispatch_notification?: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    let targetUserId = "";

    const admin = createClient(supabaseUrl, serviceRoleKey);

    if (authHeader) {
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (user) {
        targetUserId = user.id;
      }
    }

    const body: DigestRequest = await req.json().catch(() => ({}));
    if (!targetUserId && body.user_id) {
      targetUserId = body.user_id;
    }

    if (!targetUserId) {
      return new Response(JSON.stringify({ error: "Unauthorized or missing user_id" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine week dates
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 is Sunday
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Query items for this user across all providers
    const { data: allItems } = await admin
      .from("items")
      .select("id, title, type, source, priority, priority_score, is_done, due_at, start_at, updated_at, created_at")
      .eq("user_id", targetUserId);

    const items = allItems || [];

    // Analyze performance metrics
    const completedThisWeek = items.filter(
      (i) => i.is_done && i.updated_at && i.updated_at >= sevenDaysAgo
    );

    const missedThisWeek = items.filter(
      (i) => !i.is_done && (i.type === "deadline" || i.type === "task") && i.due_at && i.due_at < now.toISOString() && i.due_at >= sevenDaysAgo
    );

    const upcomingDeadlines = items.filter(
      (i) => !i.is_done && (i.type === "deadline" || i.type === "task") && i.due_at && i.due_at >= now.toISOString() && i.due_at <= sevenDaysAhead
    );

    const unactionedMessages = items.filter(
      (i) => (i.type === "message" || i.source === "slack" || i.source === "google") && (i.priority === "high" || (i.priority_score && i.priority_score >= 70))
    );

    const openPrsAndIssues = items.filter(
      (i) => i.source === "github" && !i.is_done
    );

    const upcomingEvents = items.filter(
      (i) => i.type === "event" && i.start_at && i.start_at >= now.toISOString() && i.start_at <= sevenDaysAhead
    );

    const stats = {
      completed_deadlines: completedThisWeek.length,
      missed_deadlines: missedThisWeek.length,
      upcoming_deadlines: upcomingDeadlines.length,
      unactioned_messages: unactionedMessages.length,
      open_pull_requests: openPrsAndIssues.length,
      upcoming_events: upcomingEvents.length,
    };

    const weekStartStr = startOfWeek.toISOString().split("T")[0];
    const weekEndStr = endOfWeek.toISOString().split("T")[0];

    let summaryMarkdown = "";

    if (geminiApiKey) {
      try {
        const prompt = `You are the executive intelligence officer for UnifyHub, a personal command station for high performers uniting Google, GitHub, Notion, Todoist, Slack, Linear, Jira, Asana, ClickUp, and Dropbox.
Generate a calm, structured, and high-impact Weekly Executive Digest for the week of ${weekStartStr} to ${weekEndStr}.

DATA SUMMARY:
- Deadlines completed this week: ${stats.completed_deadlines} (${completedThisWeek.map((c) => c.title).slice(0, 5).join(", ") || "None recorded"})
- Missed or slipped deadlines: ${stats.missed_deadlines} (${missedThisWeek.map((m) => m.title).slice(0, 5).join(", ") || "None"})
- Upcoming deadlines next 7 days: ${stats.upcoming_deadlines} (${upcomingDeadlines.map((u) => `${u.title} (due ${u.due_at?.split("T")[0]})`).slice(0, 6).join(", ") || "None scheduled"})
- Urgent emails & messages pending: ${stats.unactioned_messages}
- Open GitHub PRs/issues: ${stats.open_pull_requests}
- Scheduled meetings & calendar events next week: ${stats.upcoming_events}

OUTPUT FORMAT:
Generate clean Markdown with exactly these three sections (keep the tone commanded calm, encouraging, and razor-sharp):
### 🚀 Retrospective & Momentum
[1-2 paragraphs analyzing velocity, completion rate, and highlights across work and academic workspaces]

### ⚡ The Week Ahead: Critical Friction Points
[Bullet points identifying clustered deadlines, meeting load, and priority items that require early preparation]

### 🎯 Strategic Directives
[3 numbered, concrete high-leverage focus areas for the week]`;

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
          }
        );

        if (res.ok) {
          const resData = await res.json();
          summaryMarkdown = resData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
        }
      } catch (gErr) {
        console.warn("[weekly-digest] Gemini synthesis error:", gErr);
      }
    }

    // High quality deterministic fallback if Gemini unavailable
    if (!summaryMarkdown) {
      summaryMarkdown = `### 🚀 Retrospective & Momentum
You completed **${stats.completed_deadlines} item${stats.completed_deadlines === 1 ? "" : "s"}** across your connected workspaces this past week. ${
        stats.missed_deadlines > 0
          ? `There are **${stats.missed_deadlines} slipped deadline${stats.missed_deadlines === 1 ? "" : "s"}** that require immediate rescheduling.`
          : "Zero missed deadlines — clean execution."
      }

### ⚡ The Week Ahead: Critical Friction Points
- **Upcoming Deadlines**: ${stats.upcoming_deadlines} item${stats.upcoming_deadlines === 1 ? "" : "s"} due in the next 7 days.
- **Calendar Density**: ${stats.upcoming_events} scheduled event${stats.upcoming_events === 1 ? "" : "s"} across Google Calendar.
- **Pending Communications**: ${stats.unactioned_messages} priority messages/emails awaiting reply.

### 🎯 Strategic Directives
1. Front-load major deadlines before peak calendar days.
2. Clear the ${stats.unactioned_messages} actionable notices during low-energy focus blocks.
3. Review open GitHub PRs (${stats.open_pull_requests}) to unblock collaborating peers.`;
    }

    const digestTitle = `Executive Digest: Week of ${new Date(startOfWeek).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

    // Store in weekly_digests table (upsert on user_id, week_start_date)
    const { data: savedDigest, error: saveErr } = await admin
      .from("weekly_digests")
      .upsert(
        {
          user_id: targetUserId,
          week_start_date: weekStartStr,
          week_end_date: weekEndStr,
          title: digestTitle,
          summary_markdown: summaryMarkdown,
          stats,
        },
        { onConflict: "user_id,week_start_date" }
      )
      .select("*")
      .single();

    if (saveErr) {
      console.error("[weekly-digest] DB persist error:", saveErr);
    }

    // Optional email/telegram notification dispatch
    if (body.dispatch_notification) {
      try {
        const { data: userProfile } = await admin
          .from("profiles")
          .select("email")
          .eq("id", targetUserId)
          .maybeSingle();

        const userEmail = userProfile?.email;
        if (userEmail) {
          await fetch(`${supabaseUrl}/functions/v1/dispatch-notification`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${serviceRoleKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              channel: "email",
              recipient: userEmail,
              title: `UnifyHub: ${digestTitle}`,
              body: `Your executive weekly briefing is ready. Completed: ${stats.completed_deadlines}, Upcoming: ${stats.upcoming_deadlines}. Open UnifyHub to review full breakdown.`,
              priority: "normal",
            }),
          });
        }
      } catch (nErr) {
        console.warn("[weekly-digest] notification dispatch warning:", nErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        digest: savedDigest || {
          week_start_date: weekStartStr,
          week_end_date: weekEndStr,
          title: digestTitle,
          summary_markdown: summaryMarkdown,
          stats,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[weekly-digest] fatal:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
