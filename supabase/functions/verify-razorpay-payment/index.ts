// Browser callback after Razorpay Checkout reports success. It proves the
// callback came from Razorpay (signature) and that the order belongs to the
// signed-in user, then activates through the shared path, which re-checks
// with Razorpay that the payment was captured for this order and amount.
// razorpay-webhook and reconcile-razorpay-payments use the same path, so a
// plan activates once even if this callback never arrives or arrives twice.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { activateOrder, activationFailure } from "../_shared/razorpayActivation.ts";
import { afterActivation, hmacSha256Hex, mask, razorpayApi, supabaseStore, timingSafeEqual } from "../_shared/razorpayServer.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET');
    const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    if (!RAZORPAY_KEY_SECRET || !RAZORPAY_KEY_ID) return json({ error: 'Payment verification not configured' }, 500);

    // ============= AUTHENTICATION =============
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: claimsRes, error: authErr } = await userClient.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (authErr || !claimsRes?.claims?.sub) return json({ error: 'Unauthorized' }, 401);
    const userId = claimsRes.claims.sub as string;

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json().catch(() => ({}));
    if (typeof razorpay_order_id !== 'string' || typeof razorpay_payment_id !== 'string' || typeof razorpay_signature !== 'string') {
      return json({ error: 'Missing payment fields' }, 400);
    }
    console.log('Verifying payment:', { order: mask(razorpay_order_id), payment: mask(razorpay_payment_id), user: mask(userId) });

    // ============= SIGNATURE VERIFY =============
    const generated = await hmacSha256Hex(`${razorpay_order_id}|${razorpay_payment_id}`, RAZORPAY_KEY_SECRET);
    if (!timingSafeEqual(generated, razorpay_signature)) {
      console.error('Signature verification failed');
      return json({ error: 'Payment verification failed' }, 400);
    }

    // ============= ACTIVATE (shared, idempotent, checked with Razorpay) =============
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const result = await activateOrder(
      { store: supabaseStore(admin), razorpay: razorpayApi(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET) },
      { orderId: razorpay_order_id, paymentId: razorpay_payment_id, expectedUserId: userId },
    );

    if (result.ok === false) {
      console.error('Activation refused:', result.code, { order: mask(razorpay_order_id) });
      const f = activationFailure(result.code);
      return json({ error: f.error, code: result.code }, f.status);
    }

    if (result.activated) {
      await afterActivation(admin, { supabaseUrl: SUPABASE_URL, serviceKey: SUPABASE_SERVICE_ROLE_KEY, keyId: RAZORPAY_KEY_ID, keySecret: RAZORPAY_KEY_SECRET }, {
        userId, tier: result.tier, cycle: result.cycle, subscriptionId: result.subscriptionId, paymentId: result.payment.id, orderId: razorpay_order_id,
      });
    } else {
      console.log('Payment already processed:', { order: mask(razorpay_order_id) });
    }

    return json({ success: true, tier: result.tier, expiresAt: result.expiresAt, alreadyProcessed: !result.activated });
  } catch (error) {
    console.error('Payment verification error:', error instanceof Error ? error.message : 'unknown');
    return json({ error: 'Internal error' }, 500);
  }
});
