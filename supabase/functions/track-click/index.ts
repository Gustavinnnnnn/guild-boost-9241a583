import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Public endpoint — no auth. Tracks click, then redirects to button_url.
Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const campaignId = url.searchParams.get("d");
    const recipientId = url.searchParams.get("r");
    if (!campaignId) return new Response("missing", { status: 400 });

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: campaign } = await admin.from("campaigns").select("button_url").eq("id", campaignId).single();
    if (!campaign?.button_url) return new Response("not_found", { status: 404 });

    // Increment counter and mark delivery as clicked
    const { data: c } = await admin.from("campaigns").select("total_clicks").eq("id", campaignId).single();
    await admin.from("campaigns").update({ total_clicks: (c?.total_clicks ?? 0) + 1 }).eq("id", campaignId);

    if (recipientId) {
      await admin.from("campaign_deliveries")
        .update({ clicked_at: new Date().toISOString() })
        .eq("campaign_id", campaignId)
        .eq("recipient_discord_id", recipientId)
        .is("clicked_at", null);
    }

    return Response.redirect(campaign.button_url, 302);
  } catch (err) {
    console.error(err);
    return new Response("error", { status: 500 });
  }
});
