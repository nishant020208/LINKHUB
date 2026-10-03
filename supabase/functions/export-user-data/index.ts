import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");

    let targetUserId = "";
    let targetEmail = "";

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // If caller provided a user auth header, authenticate them
    if (authHeader) {
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (user) {
        targetUserId = user.id;
        targetEmail = user.email || "";
      }
    }

    // Allow service role or body fallback
    const body = await req.json().catch(() => ({}));
    if (!targetUserId && body.user_id) {
      targetUserId = body.user_id;
    }

    if (!targetUserId) {
      return new Response(JSON.stringify({ error: "Unauthorized: Missing or invalid user session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Fetch user profile
    const { data: profile } = await admin
      .from("profiles")
      .select("id, email, full_name, role, onboarding_completed, created_at")
      .eq("id", targetUserId)
      .maybeSingle();

    // 2. Fetch connected accounts (SAFE METADATA ONLY - STRICTLY EXCLUDE ENCRYPTED TOKENS)
    const { data: accounts } = await admin
      .from("connected_accounts")
      .select("id, provider, email, label, status, storage_used_bytes, items_total_count, created_at")
      .eq("user_id", targetUserId);

    // 3. Fetch items
    const { data: items } = await admin
      .from("items")
      .select("id, title, description, type, source, priority, priority_score, is_done, due_at, start_at, end_at, url, created_at, updated_at")
      .eq("user_id", targetUserId);

    // 4. Fetch user settings
    const { data: settings } = await admin
      .from("user_settings")
      .select("data_retention_days, triage_preferred_mode, widget_order, created_at, updated_at")
      .eq("user_id", targetUserId)
      .maybeSingle();

    // 5. Fetch weekly digests
    const { data: digests } = await admin
      .from("weekly_digests")
      .select("id, week_start_date, week_end_date, title, summary_markdown, stats, created_at")
      .eq("user_id", targetUserId);

    const exportPayload = {
      export_version: "1.0",
      generated_at: new Date().toISOString(),
      user: profile || { id: targetUserId, email: targetEmail },
      connected_accounts: accounts || [],
      items_summary: {
        total_items: items?.length || 0,
        tasks_count: items?.filter((i) => i.type === "deadline" || i.type === "task").length || 0,
        events_count: items?.filter((i) => i.type === "event").length || 0,
        messages_count: items?.filter((i) => i.type === "message").length || 0,
        files_count: items?.filter((i) => i.type === "file").length || 0,
      },
      items: items || [],
      user_settings: settings || {},
      weekly_digests: digests || [],
    };

    const filename = `unifyhub-export-${targetUserId.slice(0, 8)}-${new Date().toISOString().split("T")[0]}.json`;

    return new Response(JSON.stringify(exportPayload, null, 2), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[export-user-data] fatal:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
