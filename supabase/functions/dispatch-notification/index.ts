import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationPayload {
  channel: "email" | "push" | "telegram" | "sms" | "whatsapp";
  recipient: string;
  title: string;
  body: string;
  priority?: "low" | "medium" | "high" | "critical";
  quiet_hours_start?: string; // e.g. "22:00"
  quiet_hours_end?: string;   // e.g. "08:00"
  timezone?: string;
}

function isWithinQuietHours(start?: string, end?: string, timezone?: string): boolean {
  if (!start || !end) return false;
  try {
    const tz = timezone || "UTC";
    const now = new Date();
    const timeFormatter = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "numeric",
      hour12: false,
      timeZone: tz,
    });
    const parts = timeFormatter.format(now).split(":");
    const currentMins = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);

    const [sH, sM] = start.split(":").map((v) => parseInt(v, 10));
    const [eH, eM] = end.split(":").map((v) => parseInt(v, 10));
    const startMins = sH * 60 + sM;
    const endMins = eH * 60 + eM;

    if (startMins <= endMins) {
      return currentMins >= startMins && currentMins <= endMins;
    } else {
      // Crosses midnight (e.g. 22:00 to 08:00)
      return currentMins >= startMins || currentMins <= endMins;
    }
  } catch {
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: NotificationPayload = await req.json();
    const { channel, recipient, title, body, priority = "medium", quiet_hours_start, quiet_hours_end, timezone } = payload;

    // Check Quiet Hours (Critical alerts bypass quiet hours)
    if (priority !== "critical" && isWithinQuietHours(quiet_hours_start, quiet_hours_end, timezone)) {
      return new Response(
        JSON.stringify({
          success: false,
          status: "suppressed_quiet_hours",
          message: `Notification suppressed during quiet hours (${quiet_hours_start} - ${quiet_hours_end})`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let dispatchResult = { success: true, message: `Dispatched to ${channel} successfully (Demo Mode simulated)` };

    // 1. Email Channel (Resend)
    if (channel === "email") {
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      if (resendApiKey) {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "UnifyHub Alerts <notifications@unifyhub.app>",
            to: [recipient],
            subject: title,
            html: `<div style="font-family: sans-serif; padding: 20px;"><h2>${title}</h2><p>${body}</p><hr/><small>Sent by UnifyHub</small></div>`,
          }),
        });
        if (!res.ok) {
          throw new Error(`Resend email failed with status ${res.status}`);
        }
        dispatchResult = { success: true, message: "Email sent via Resend" };
      }
    }

    // 2. Telegram Bot Channel
    else if (channel === "telegram") {
      const telegramToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
      if (telegramToken && recipient) {
        const url = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: recipient,
            text: `*${title}*\n\n${body}`,
            parse_mode: "Markdown",
          }),
        });
        if (!res.ok) {
          throw new Error(`Telegram send failed with status ${res.status}`);
        }
        dispatchResult = { success: true, message: "Message sent via Telegram bot" };
      }
    }

    // 3. SMS Channel (Twilio)
    else if (channel === "sms") {
      const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
      const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
      const fromPhone = Deno.env.get("TWILIO_PHONE_NUMBER");
      if (accountSid && authToken && fromPhone) {
        const basicAuth = btoa(`${accountSid}:${authToken}`);
        const params = new URLSearchParams();
        params.append("To", recipient);
        params.append("From", fromPhone);
        params.append("Body", `${title}: ${body}`);

        const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
          method: "POST",
          headers: {
            Authorization: `Basic ${basicAuth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params.toString(),
        });
        if (!res.ok) {
          throw new Error(`Twilio SMS failed with status ${res.status}`);
        }
        dispatchResult = { success: true, message: "SMS dispatched via Twilio" };
      }
    }

    // 4. WhatsApp Channel (Twilio WhatsApp)
    else if (channel === "whatsapp") {
      const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
      const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
      const fromWa = Deno.env.get("TWILIO_WHATSAPP_NUMBER") || "whatsapp:+14155238886";
      if (accountSid && authToken) {
        const basicAuth = btoa(`${accountSid}:${authToken}`);
        const params = new URLSearchParams();
        params.append("To", recipient.startsWith("whatsapp:") ? recipient : `whatsapp:${recipient}`);
        params.append("From", fromWa);
        params.append("Body", `*${title}*\n${body}`);

        const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
          method: "POST",
          headers: {
            Authorization: `Basic ${basicAuth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params.toString(),
        });
        if (!res.ok) {
          throw new Error(`WhatsApp send failed with status ${res.status}`);
        }
        dispatchResult = { success: true, message: "WhatsApp message dispatched" };
      }
    }

    return new Response(
      JSON.stringify({
        ...dispatchResult,
        channel,
        recipient,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
