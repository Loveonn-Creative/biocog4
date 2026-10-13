// Recovery for the signed-in user's own orders: if a payment was captured by
// Razorpay but the browser callback never activated the plan, this finds it
// and activates it. Called by the app after a failed verification, when the
// account has a recent pending order, and by create-razorpay-order before it
// opens a new checkout (so nobody is asked to pay twice).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { reconcileUser } from "../_shared/razorpayReconcile.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const KEY_ID = Deno.env.get('RAZORPAY_KEY_ID');
    const KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    if (!KEY_ID || !KEY_SECRET) return json({ error: 'Payment gateway not configured' }, 500);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: claims, error } = await userClient.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (error || !claims?.claims?.sub) return json({ error: 'Unauthorized' }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const out = await reconcileUser(admin, claims.claims.sub as string, { supabaseUrl: SUPABASE_URL, serviceKey: SERVICE_KEY, keyId: KEY_ID, keySecret: KEY_SECRET });
    return json(out);
  } catch (e) {
    console.error('Reconcile error:', e instanceof Error ? e.message : 'unknown');
    return json({ error: 'Internal error' }, 500);
  }
});
