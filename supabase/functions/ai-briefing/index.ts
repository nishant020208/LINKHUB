import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BriefingRequest {
  user_id?: string;
  items?: Array<{
    id: string;
    title: string;
    type: string;
    start_at?: string;
    due_at?: string;
    priority_score: number;
    account_label?: string;
  }>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

    let body: BriefingRequest = {};
    try {
      body = await req.json();
    } catch {
      // Body may be empty
    }

    let items = body.items || [];

    // If items were not directly provided in payload and user_id is present, query from database
    if (items.length === 0 && body.user_id && supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { data } = await supabase
        .from("items")
        .select("id, title, type, start_at, due_at, priority_score")
        .eq("user_id", body.user_id)
        .order("priority_score", { ascending: false })
        .limit(20);
      if (data) {
        items = data;
      }
    }

    const todayDate = new Date().toISOString().split("T")[0];
    const urgentItems = items.filter(
      (i) => (i.type === "deadline" || i.type === "task") && i.due_at
    );
    const todayEvents = items.filter((i) => i.type === "event" && i.start_at);

    let summaryText = "";

    // If Gemini API Key is available, prompt Gemini for a hyper-concise executive briefing
    if (geminiApiKey) {
      try {
        const prompt = `You are an AI chief of staff summarizing a student/professional's day in exactly 1-2 punchy, motivating sentences.
Today is ${todayDate}.
Scheduled events: ${JSON.stringify(todayEvents.map((e) => ({ title: e.title, time: e.start_at })))}
Urgent deadlines: ${JSON.stringify(urgentItems.map((d) => ({ title: d.title, due: d.due_at, priority: d.priority_score })))}

Output a concise summary stating their first priority, meeting load, and what needs finishing today. Keep it under 30 words.`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
            }),
          }
        );

        if (response.ok) {
          const resData = await response.json();
          const generated = resData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (generated) {
            summaryText = generated.replace(/^["']|["']$/g, "");
          }
        }
      } catch (_err) {
        // Fall back to rule-based summary below
      }
    }

    // High quality deterministic fallback if no Gemini key or fetch failed
    if (!summaryText) {
      if (urgentItems.length > 0 && todayEvents.length > 0) {
        summaryText = `Focus on ${urgentItems[0].title} before ${new Date(urgentItems[0].due_at!).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}; you have ${todayEvents.length} meeting${todayEvents.length > 1 ? "s" : ""} scheduled today starting with ${todayEvents[0].title}.`;
      } else if (urgentItems.length > 0) {
        summaryText = `Primary objective today is ${urgentItems[0].title}; your schedule has ample focus blocks available.`;
      } else if (todayEvents.length > 0) {
        summaryText = `Clean slate on urgent submissions today; pace through your ${todayEvents.length} scheduled event${todayEvents.length > 1 ? "s" : ""}.`;
      } else {
        summaryText = "All caught up across college, work, and personal workspaces. A great day for proactive deep work.";
      }
    }

    const briefingResult = {
      date: todayDate,
      summary: summaryText,
      urgent_count: urgentItems.length,
      events_count: todayEvents.length,
      created_at: new Date().toISOString(),
    };

    // If user_id is provided, optionally cache into user_briefings
    if (body.user_id && supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      await supabase.from("user_briefings").upsert(
        {
          user_id: body.user_id,
          date: todayDate,
          summary: summaryText,
          urgent_count: urgentItems.length,
          events_count: todayEvents.length,
          generated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,date" }
      );
    }

    return new Response(JSON.stringify(briefingResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
