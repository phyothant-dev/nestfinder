import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface NotificationPayload {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

serve(async (req) => {
  try {
    const { userId, title, body, data } = (await req.json()) as NotificationPayload;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: tokens } = await supabase
      .from("push_tokens")
      .select("token, platform")
      .eq("user_id", userId);

    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
    }

    const messages = tokens.map((t) => ({
      to: t.token,
      sound: "default",
      title,
      body,
      data: data ?? {},
    }));

    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messages),
    });

    const result = await res.json();
    return new Response(JSON.stringify(result), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
