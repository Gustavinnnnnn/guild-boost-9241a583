import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DISCORD_BOT_TOKEN = Deno.env.get("DISCORD_BOT_TOKEN")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!userData?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // 1. Buscar todos os guilds onde o bot está
    const guildsRes = await fetch("https://discord.com/api/v10/users/@me/guilds?limit=200", {
      headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
    });
    if (!guildsRes.ok) {
      const t = await guildsRes.text();
      return new Response(JSON.stringify({ error: "discord_guilds_failed", details: t }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const guilds = await guildsRes.json() as Array<{ id: string; name: string; icon: string | null; owner: boolean }>;

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    let synced = 0;

    // 2. Para cada guild, buscar member count via /guilds/:id?with_counts=true
    for (const g of guilds) {
      try {
        const detailRes = await fetch(`https://discord.com/api/v10/guilds/${g.id}?with_counts=true`, {
          headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
        });
        if (!detailRes.ok) continue;
        const detail = await detailRes.json();
        const memberCount = detail.approximate_member_count ?? 0;
        const iconUrl = g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png` : null;

        await admin.from("discord_servers").upsert({
          guild_id: g.id,
          name: g.name,
          icon_url: iconUrl,
          member_count: memberCount,
          bot_in_server: true,
          owner_discord_id: detail.owner_id ?? null,
          last_synced_at: new Date().toISOString(),
        }, { onConflict: "guild_id" });

        synced++;
        // Rate-limit gentle
        await new Promise((r) => setTimeout(r, 50));
      } catch (e) {
        console.error("guild sync err", g.id, e);
      }
    }

    return new Response(JSON.stringify({ success: true, synced, total: guilds.length }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown";
    console.error(err);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
