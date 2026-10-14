// Razorpay -> server events, so a paid plan activates even when the
// customer's browser never returns from Checkout (closed tab, lost network,
// UPI app switch). Configure in the Razorpay Dashboard: Settings > Webhooks,
// URL https://<project>.supabase.co/functions/v1/razorpay-webhook, events
// payment.captured, order.paid and refund.processed, and a secret stored here
// as RAZORPAY_WEBHOOK_SECRET.
//
// Ordering: events can arrive late, twice or out of order. payment.failed is
// acknowledged and changes nothing, because a later attempt on the same order
// can still succeed. A refund that arrives before activation leaves the
// payment 'refunded' at Razorpay, so the order never activates.
//
// Security: the raw body must carry a valid X-Razorpay-Signature
// (HMAC-SHA256 with the webhook secret). Without the secret configured the
// endpoint refuses every event with 503, so Razorpay keeps retrying instead of
// anything being accepted unsigned. The event is only a hint: activation
// still asks Razorpay's API that the payment was captured for the stored
// order and amount, and is idempotent across this webhook, the browser
// callback and reconciliation.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { activateOrder, revokeRefundedPayment } from "../_shared/razorpayActivation.ts";
import { afterActivation, hmacSha256Hex, mask, razorpayApi, supabaseStore, timingSafeEqual } from "../_shared/razorpayServer.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const HANDLED = new Set(['payment.captured', 'order.paid']);

serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const WEBHOOK_SECRET = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');
  const KEY_ID = Deno.env.get('RAZORPAY_KEY_ID');
  const KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET');
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  if (!WEBHOOK_SECRET || !KEY_ID || !KEY_SECRET) {
    console.error('Webhook not configured');
    return json({ error: 'Webhook not configured' }, 503);
  }

  const raw = await req.text();
  const signature = req.headers.get('x-razorpay-signature') ?? '';
  const expected = await hmacSha256Hex(raw, WEBHOOK_SECRET);
  if (!signature || !timingSafeEqual(expected, signature)) {
    console.error('Webhook signature invalid');
    return json({ error: 'Invalid signature' }, 400);
  }

  let event: { event?: string; payload?: { payment?: { entity?: { id?: string; order_id?: string } }; order?: { entity?: { id?: string } }; refund?: { entity?: { payment_id?: string } } } };
  try { event = JSON.parse(raw); } catch { return json({ error: 'Bad payload' }, 400); }
  const type = event.event ?? '';
  if (type === 'refund.processed') {
    const refundedPayment = event.payload?.refund?.entity?.payment_id ?? event.payload?.payment?.entity?.id ?? null;
    if (!refundedPayment) return json({ ok: true, ignored: 'no payment' });
    try {
      const admin = createClient(SUPABASE_URL, SERVICE_KEY);
      const r = await revokeRefundedPayment({ store: supabaseStore(admin), razorpay: razorpayApi(KEY_ID, KEY_SECRET) }, refundedPayment);
      console.log('Refund processed:', { payment: mask(refundedPayment), result: r.ok ? (r.revoked ? 'plan ended' : 'already ended') : r.code });
      return json({ ok: true, revoked: r.ok ? r.revoked : false, code: r.ok ? undefined : r.code });
    } catch (e) {
      console.error('Refund processing error:', e instanceof Error ? e.message : 'unknown');
      return json({ error: 'Processing failed' }, 500);
    }
  }
  if (!HANDLED.has(type)) return json({ ok: true, ignored: type });

  const paymentId = event.payload?.payment?.entity?.id ?? null;
  const orderId = event.payload?.payment?.entity?.order_id ?? event.payload?.order?.entity?.id ?? null;
  if (!orderId) return json({ ok: true, ignored: 'no order' });

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const result = await activateOrder(
      { store: supabaseStore(admin), razorpay: razorpayApi(KEY_ID, KEY_SECRET) },
      { orderId, paymentId },
    );
    if (result.ok === false) {
      // order_missing: not a Senseible plan order (or created elsewhere); acknowledged so Razorpay stops retrying.
      console.log('Webhook not activated:', result.code, { order: mask(orderId) });
      return json({ ok: true, activated: false, code: result.code });
    }
    if (result.activated) {
      await afterActivation(admin, { supabaseUrl: SUPABASE_URL, serviceKey: SERVICE_KEY, keyId: KEY_ID, keySecret: KEY_SECRET }, {
        userId: result.userId, tier: result.tier, cycle: result.cycle, subscriptionId: result.subscriptionId, paymentId: result.payment.id, orderId,
      });
    }
    console.log('Webhook processed:', { order: mask(orderId), activated: result.activated });
    return json({ ok: true, activated: result.activated });
  } catch (e) {
    // 5xx makes Razorpay retry later; activation is idempotent.
    console.error('Webhook processing error:', e instanceof Error ? e.message : 'unknown');
    return json({ error: 'Processing failed' }, 500);
  }
});
