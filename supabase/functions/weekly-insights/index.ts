import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "https://esm.sh/openai@4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", // using service role to bypass RLS for aggregate cron
      { auth: { persistSession: false } }
    );

    const openai = new OpenAI({
      apiKey: Deno.env.get("OPENAI_API_KEY"),
    });

    // In a real cron job, you'd iterate over users or accept user_id = "all" in body.
    // For this example, we assume we want to generate an insight for a specific user.
    const { user_id } = await req.json();

    if (!user_id) {
       return new Response(JSON.stringify({ error: "Missing user_id" }), { status: 400 });
    }

    // 1. Gather weekly stats. E.g. get sleep logs for the last 7 days.
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const { data: sleeps, error: sleepErr } = await supabaseClient
      .from("sleeps")
      .select("duration_seconds, created_at, end_time")
      .eq("user_id", user_id) // If you use an auth system, user_id is implicit
      .gte("created_at", oneWeekAgo.toISOString());

    if (sleepErr) throw sleepErr;

    // Aggregate data into a small payload to save tokens
    const stats = {
      total_sleeps_last_week: sleeps?.length || 0,
      avg_duration_minutes: sleeps?.length 
        ? Math.round(sleeps.reduce((acc, s) => acc + s.duration_seconds, 0) / sleeps.length / 60)
        : 0
    };

    const prompt = `Ты педиатр-сомнолог. Проанализируй данные за эту неделю: ${JSON.stringify(stats)}. 
Придумай 1 короткий, полезный и подбадривающий инсайт для мамы. 
Верни JSON формата: {"insight_title": string, "short_text": string, "type": "warning" | "success" | "info"}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    });

    const responseContent = completion.choices[0].message.content;
    const insightData = JSON.parse(responseContent || "{}");

    // 2. Insert into insight_cards
    if (insightData.insight_title && insightData.short_text) {
      const { error: insertErr } = await supabaseClient
        .from("insight_cards")
        .insert({
          user_id,
          insight_title: insightData.insight_title,
          short_text: insightData.short_text,
          type: insightData.type || "info"
        });

      if (insertErr) throw insertErr;
    }

    return new Response(
      JSON.stringify({ success: true, insight: insightData }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
