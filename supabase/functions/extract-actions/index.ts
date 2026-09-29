import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExtractRequest {
  subject: string;
  sender: string;
  body: string;
  account_id?: string;
}

interface ExtractedAction {
  title: string;
  due_at?: string;
  priority_score: number;
  confidence: number;
  rationale: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { subject, sender, body }: ExtractRequest = await req.json();
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

    let extractedActions: ExtractedAction[] = [];

    if (geminiApiKey) {
      try {
        const prompt = `Analyze this email and extract actionable tasks or deadlines.
Sender: ${sender}
Subject: ${subject}
Content: ${body.substring(0, 1500)}

Respond strictly in JSON array of objects with keys:
- "title": concise task action summary
- "due_at": ISO8601 string or null if none mentioned
- "priority_score": integer 1-100
- "confidence": float 0.0-1.0
- "rationale": short explanation
Do not include markdown markers or backticks.`;

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
            }),
          }
        );

        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
          const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
          extractedActions = JSON.parse(cleaned);
        }
      } catch (_err) {
        // Fallback to heuristic parser
      }
    }

    // Deterministic heuristic fallback if Gemini key is missing or errored
    if (!extractedActions || extractedActions.length === 0) {
      const combined = `${subject} ${body}`.toLowerCase();
      let detectedDate: string | undefined = undefined;
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(17, 0, 0, 0);

      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      nextWeek.setHours(23, 59, 0, 0);

      if (combined.includes("tomorrow") || combined.includes("by tomorrow") || combined.includes("eod")) {
        detectedDate = tomorrow.toISOString();
      } else if (combined.includes("by friday") || combined.includes("due friday")) {
        const fri = new Date();
        const diff = (5 - fri.getDay() + 7) % 7 || 7;
        fri.setDate(fri.getDate() + diff);
        fri.setHours(17, 0, 0, 0);
        detectedDate = fri.toISOString();
      } else if (combined.includes("due") || combined.includes("deadline")) {
        detectedDate = nextWeek.toISOString();
      }

      const isHighUrgency =
        combined.includes("urgent") ||
        combined.includes("asap") ||
        combined.includes("important") ||
        combined.includes("action required");

      extractedActions = [
        {
          title: `Follow up on: ${subject}`,
          due_at: detectedDate,
          priority_score: isHighUrgency ? 85 : 55,
          confidence: 0.82,
          rationale: `Detected actionable thread from ${sender}`,
        },
      ];
    }

    return new Response(JSON.stringify({ actions: extractedActions }), {
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
