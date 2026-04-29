import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DISCORD_BOT_TOKEN = Deno.env.get("DISCORD_BOT_TOKEN")!;

function hexToInt(hex: string): number {
  return parseInt(hex.replace("#", ""), 16) || 0x5865f2;
}

async function discordReq(path: string, init: RequestInit = {}, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(`https://discord.com/api/v10${path}`, {
      ...init,
      headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}`, "Content-Type": "application/json", ...(init.headers || {}) },
    });
    if (res.status === 429) {
      const data = await res.json().catch(() => ({ retry_after: 1 }));
      await new Promise((r) => setTimeout(r, ((data.retry_after as number) || 1) * 1000));
      continue;
    }
    return res;
  }
  throw new Error("discord_rate_limit_exhausted");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!userData?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const userId = userData.user.id;

    const { campaign_id } = await req.json();
    if (!campaign_id) return new Response(JSON.stringify({ error: "campaign_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: campaign, error: cErr } = await admin.from("campaigns").select("*").eq("id", campaign_id).eq("user_id", userId).single();
    if (cErr || !campaign) return new Response(JSON.stringify({ error: "campaign_not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (campaign.status === "sent" || campaign.status === "sending") {
      return new Response(JSON.stringify({ error: "already_sent_or_sending" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: profile } = await admin.from("profiles").select("credits").eq("id", userId).single();
    if (!profile || profile.credits < 1) return new Response(JSON.stringify({ error: "insufficient_credits" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Marcar como enviando
    await admin.from("campaigns").update({ status: "sending" }).eq("id", campaign_id);

    // Buscar membros da rede (com paginação, deduplicando por user_id)
    const { data: servers } = await admin.from("discord_servers").select("guild_id, name").eq("bot_in_server", true);
    if (!servers || servers.length === 0) {
      await admin.from("campaigns").update({ status: "failed", error_message: "Nenhum servidor na rede" }).eq("id", campaign_id);
      return new Response(JSON.stringify({ error: "no_servers" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Coletar IDs únicos de membros (limitado pelo saldo de créditos)
    const maxBudget = profile.credits;
    const recipients = new Map<string, string>(); // discord_id -> guild_id

    outer: for (const s of servers) {
      let after = "0";
      while (true) {
        const r = await discordReq(`/guilds/${s.guild_id}/members?limit=1000&after=${after}`);
        if (!r.ok) break;
        const members = await r.json() as Array<{ user: { id: string; bot?: boolean } }>;
        if (!members.length) break;
        for (const m of members) {
          if (m.user.bot) continue;
          if (!recipients.has(m.user.id)) {
            recipients.set(m.user.id, s.guild_id);
            if (recipients.size >= maxBudget) break outer;
          }
        }
        after = members[members.length - 1].user.id;
        if (members.length < 1000) break;
      }
    }

    const targets = Array.from(recipients.entries()); // [discord_id, guild_id][]
    const targeted = targets.length;

    if (targeted === 0) {
      await admin.from("campaigns").update({ status: "failed", error_message: "Nenhum membro alcançável" }).eq("id", campaign_id);
      return new Response(JSON.stringify({ error: "no_recipients" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await admin.from("campaigns").update({ total_targeted: targeted }).eq("id", campaign_id);

    // Build embed
    const trackBase = `${SUPABASE_URL}/functions/v1/track-click`;

    let delivered = 0;
    let failed = 0;

    // Send DMs (sequencial pra respeitar rate limits)
    for (const [discordId, guildId] of targets) {
      try {
        // 1. Criar/obter DM channel
        const dmRes = await discordReq("/users/@me/channels", {
          method: "POST",
          body: JSON.stringify({ recipient_id: discordId }),
        });
        if (!dmRes.ok) {
          failed++;
          await admin.from("campaign_deliveries").insert({
            campaign_id, user_id: userId, recipient_discord_id: discordId, guild_id: guildId,
            status: "failed", error_message: `dm_create_${dmRes.status}`,
          });
          continue;
        }
        const dm = await dmRes.json();

        const embed: any = {
          color: hexToInt(campaign.embed_color || "#5865F2"),
        };
        if (campaign.title) embed.title = campaign.title;
        if (campaign.message) embed.description = campaign.message;
        if (campaign.image_url) embed.image = { url: campaign.image_url };

        const components: any[] = [];
        if (campaign.button_url && campaign.button_label) {
          // Wrap URL via tracking redirect
          const trackUrl = `${trackBase}?d=${encodeURIComponent(campaign_id)}&r=${encodeURIComponent(discordId)}`;
          components.push({
            type: 1,
            components: [{ type: 2, style: 5, label: campaign.button_label.slice(0, 80), url: trackUrl }],
          });
        }

        const sendRes = await discordReq(`/channels/${dm.id}/messages`, {
          method: "POST",
          body: JSON.stringify({ embeds: [embed], components }),
        });

        if (sendRes.ok) {
          delivered++;
          await admin.from("campaign_deliveries").insert({
            campaign_id, user_id: userId, recipient_discord_id: discordId, guild_id: guildId,
            status: "delivered", delivered_at: new Date().toISOString(),
          });
        } else {
          failed++;
          const errTxt = await sendRes.text();
          await admin.from("campaign_deliveries").insert({
            campaign_id, user_id: userId, recipient_discord_id: discordId, guild_id: guildId,
            status: "failed", error_message: errTxt.slice(0, 200),
          });
        }
      } catch (e) {
        failed++;
        const msg = e instanceof Error ? e.message : "unknown";
        await admin.from("campaign_deliveries").insert({
          campaign_id, user_id: userId, recipient_discord_id: discordId, guild_id: null,
          status: "failed", error_message: msg.slice(0, 200),
        });
      }
      // Pequena pausa pra não detonar rate limit
      await new Promise((r) => setTimeout(r, 80));
    }

    // Cobrar créditos pelas entregues
    const newBalance = profile.credits - delivered;
    await admin.from("profiles").update({ credits: newBalance }).eq("id", userId);
    await admin.from("credit_transactions").insert({
      user_id: userId, amount: -delivered, type: "campaign_spend",
      description: `Campanha: ${campaign.name}`, campaign_id, balance_after: newBalance,
    });

    await admin.from("campaigns").update({
      status: "sent",
      sent_at: new Date().toISOString(),
      total_delivered: delivered,
      total_failed: failed,
      credits_spent: delivered,
      error_message: null,
    }).eq("id", campaign_id);

    return new Response(JSON.stringify({ success: true, targeted, delivered, failed }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown";
    console.error("send-campaign error", err);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
