import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface PropertyPayload {
  propertyId: string;
  title: string;
  price: number;
  dealType: string;
  propertyType: string;
  stateRegionId?: string;
  townshipId?: string;
}

serve(async (req) => {
  try {
    const payload = (await req.json()) as PropertyPayload;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: searches } = await supabase
      .from("saved_searches")
      .select("user_id, search_params");

    if (!searches || searches.length === 0) {
      return new Response(JSON.stringify({ notified: 0 }), { status: 200 });
    }

    const matchedUserIds = new Set<string>();

    for (const search of searches) {
      const params = search.search_params as Record<string, any>;
      let match = true;

      if (params.deal_type && params.deal_type !== payload.dealType) match = false;
      if (params.property_type && params.property_type !== payload.propertyType) match = false;
      if (params.max_price && payload.price > params.max_price) match = false;
      if (params.min_price && payload.price < params.min_price) match = false;
      if (params.state_region_id && params.state_region_id !== payload.stateRegionId) match = false;
      if (params.township_id && params.township_id !== payload.townshipId) match = false;

      if (match) matchedUserIds.add(search.user_id);
    }

    if (matchedUserIds.size === 0) {
      return new Response(JSON.stringify({ notified: 0 }), { status: 200 });
    }

    const { data: tokens } = await supabase
      .from("push_tokens")
      .select("token, platform, user_id")
      .in("user_id", Array.from(matchedUserIds));

    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ notified: 0 }), { status: 200 });
    }

    const messages = tokens.map((t) => ({
      to: t.token,
      sound: "default",
      title: "New Property Available",
      body: payload.title || `${payload.propertyType} for ${payload.dealType}`,
      data: { screen: "property", propertyId: payload.propertyId },
    }));

    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messages),
    });

    const result = await res.json();
    return new Response(JSON.stringify({ notified: matchedUserIds.size, result }), {
      status: 200,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
