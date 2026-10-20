// Profile purchases: invoice credit packs (₹79 per 100), Expert Climate Audit
// (₹7,999) and Fast-track Verification (₹2,999 per report). Prices come from
// _shared/addonPurchases.ts; the browser only says what and how many.
//
// action "create": makes a Razorpay order (UPI by default; no card fee) and a
//   pending row, fail closed: no row, no order id.
// action "verify": checks Razorpay's signature on the browser callback, then
//   activates through the shared path, which asks Razorpay that the payment
//   was captured for this order and amount. razorpay-webhook activates the
//   same orders when the callback never arrives (UPI app switch, closed tab).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { basePaiseFor, creditValidity, CREDIT_PACK_INVOICES, parsePurchase, purchaseName, SERVICES } from "../_shared/addonPurchases.ts";
import { activateAddonOrder } from "../_shared/addonActivation.ts";
import { checkoutTotal, isPaymentMethod } from "../_shared/checkoutTotals.ts";
import { hmacSha256Hex, mask, razorpayApi, timingSafeEqual } from "../_shared/razorpayServer.ts";
import { notifyServiceOrder, sendAddonInvoice } from "../_shared/addonNotify.ts";

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
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    if (!KEY_ID || !KEY_SECRET) return json({ error: 'Payments are not available right now.' }, 503);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Please sign in to buy.' }, 401);
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: auth, error: authErr } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authErr || !auth?.user) return json({ error: 'Please sign in to buy.' }, 401);
    const userId = auth.user.id;

    const body = await req.json().catch(() => ({}));
    const rz = razorpayApi(KEY_ID, KEY_SECRET);

    if (body?.action === 'verify') {
      const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = body;
      if (typeof orderId !== 'string' || typeof paymentId !== 'string' || typeof signature !== 'string') return json({ error: 'Missing payment fields' }, 400);
      const expected = await hmacSha256Hex(`${orderId}|${paymentId}`, KEY_SECRET);
      if (!timingSafeEqual(expected, signature)) return json({ error: 'Payment verification failed' }, 400);
      const r = await activateAddonOrder(admin, rz, { orderId, paymentId, expectedUserId: userId });
      if (r.ok === false) {
        console.error('Add-on activation refused:', r.code, { order: mask(orderId) });
        const msg = r.code === 'not_captured' ? 'Your payment is still being confirmed. It will appear on your Subscription page within a few minutes.' : 'This payment could not be matched to your order. Contact billing@senseible.earth.';
        return json({ error: msg, code: r.code }, r.code === 'not_captured' ? 202 : 400);
      }
      if (r.activated && r.table === 'service_orders') await notifyServiceOrder(admin, r.rowId);
      if (r.activated) await sendAddonInvoice(admin, { supabaseUrl: SUPABASE_URL, serviceKey: SERVICE_KEY }, { table: r.table, rowId: r.rowId });
      return json({ success: true, kind: r.kind, alreadyProcessed: !r.activated });
    }

    // ---- create ----
    const purchase = parsePurchase(body);
    if (!purchase) return json({ error: 'Choose what to buy.' }, 400);
    const method = isPaymentMethod(body?.paymentMethod) ? body.paymentMethod : 'upi';
    const total = checkoutTotal(basePaiseFor(purchase), method);

    let validity: 'yearly' | 'monthly' = 'monthly';
    if (purchase.item === 'credits') {
      const { data: subs } = await admin.from('subscriptions').select('billing_cycle, expires_at')
        .eq('user_id', userId).eq('status', 'active').gt('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: false }).limit(1);
      validity = creditValidity(subs?.[0]?.billing_cycle === 'yearly' ? 'yearly' : subs?.[0] ? 'monthly' : null);
    }

    const credentials = btoa(`${KEY_ID}:${KEY_SECRET}`);
    const orderRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: total.totalPaise, currency: 'INR',
        receipt: `senseible_${purchase.item}_${Date.now()}`.slice(0, 40),
        notes: {
          kind: 'addon', item: purchase.item, quantity: purchase.item === 'credits' ? purchase.packs : purchase.quantity,
          user_id: userId, payment_method: method, base_paise: total.basePaise, platform_fee_paise: total.feePaise, gst_paise: total.gstPaise,
        },
      }),
    });
    if (!orderRes.ok) { console.error('Razorpay order failed', orderRes.status); return json({ error: 'Could not start checkout. Please try again.' }, 502); }
    const order = await orderRes.json();

    const row = purchase.item === 'credits'
      ? admin.from('invoice_credit_packs').insert({ user_id: userId, razorpay_order_id: order.id, packs: purchase.packs, credits: purchase.packs * CREDIT_PACK_INVOICES, base_paise: total.basePaise, amount_paise: total.totalPaise, validity })
      : admin.from('service_orders').insert({ user_id: userId, kind: purchase.item, quantity: purchase.quantity, razorpay_order_id: order.id, base_paise: total.basePaise, amount_paise: total.totalPaise });
    const { error: rowErr } = await row;
    if (rowErr) {
      console.error('Pending purchase not stored:', rowErr.code);
      return json({ error: rowErr.code === '42P01' ? 'Purchases open shortly. Please try again later.' : 'Could not start checkout. Please try again.' }, 503);
    }

    return json({
      orderId: order.id, amount: order.amount, currency: order.currency, keyId: KEY_ID,
      name: purchaseName(purchase), paymentMethod: method, breakdown: total,
      validity: purchase.item === 'credits' ? validity : null,
      turnaround: purchase.item === 'credits' ? null : SERVICES[purchase.item].turnaround,
    });
  } catch (e) {
    console.error('Purchase error:', e instanceof Error ? e.name : 'unknown');
    return json({ error: 'Something went wrong. Nothing was charged.' }, 500);
  }
});
