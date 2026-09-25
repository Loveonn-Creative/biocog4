import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json", ...corsHeaders },
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: claims, error } = await userClient.auth.getClaims(authorization.slice(7));
    const userId = claims?.claims?.sub as string | undefined;
    const email = claims?.claims?.email as string | undefined;
    if (error || !userId || !email) return json({ error: "Unauthorized" }, 401);

    const { token } = await req.json();
    if (typeof token !== "string" || !token) return json({ error: "Invitation token required" }, 400);
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data, error: acceptError } = await admin.rpc("service_accept_team_invitation", {
      p_user_id: userId, p_user_email: email, p_token: token,
    });
    if (acceptError) return json({ error: acceptError.message }, 400);
    return json({ success: true, membership: data?.[0] });
  } catch (error) {
    console.error("Accept invitation error:", error instanceof Error ? error.message : "unknown");
    return json({ error: "Internal error" }, 500);
  }
});