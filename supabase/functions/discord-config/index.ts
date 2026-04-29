// Public endpoint that returns the Discord OAuth Client ID so the frontend
// can build the authorize URL without needing it baked at build time.
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const client_id = Deno.env.get("DISCORD_CLIENT_ID") ?? "";
  return new Response(JSON.stringify({ client_id }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
