import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { reconcileUser } from "../_shared/razorpayReconcile.ts";
import { blocksNewOrder } from "../_shared/razorpayActivation.ts";
import { LAUNCH_PRICES, orderPrice, REGULAR_PRICING_STARTS_AT } from "../_shared/planPricing.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Prices in paise come from ../_shared/planPricing.ts (launch prices today;
// regular prices only once that file sets a start date). Keys are the tier
// values allowed by the subscriptions.tier CHECK constraint; Essential is 'basic'.
const PLAN_PRICES = LAUNCH_PRICES;
// Scale has no list price. It is custom priced and can only be bought against an
// admin-issued row in public.scale_price_quotes (see
// supabase/pending-migrations/20261011160000_scale_price_quotes.sql).
// Not related to the India scope estimate in _shared/customScopeEstimate.ts.
const SCALE_PLAN_NAME = 'Biocog Scale';
const SCALE_REFUSAL = 'Scale is custom priced. Contact us for a quote.';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID');
    const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      console.error('Razorpay keys not configured');
      return new Response(
        JSON.stringify({ error: 'Payment gateway not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============= AUTHENTICATION =============
    // Identity comes from the caller's JWT, never from the request body.
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Please sign in to subscribe' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { data: authData, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !authData?.user) {
      return new Response(
        JSON.stringify({ error: 'Please sign in to subscribe' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const userId = authData.user.id;
    const userEmail = authData.user.email || '';

    const body = await req.json().catch(() => ({}));
    // Client-supplied amounts (and teamSize) are ignored: price comes from
    // PLAN_PRICES or from an admin-issued Scale quote.
    const rawTier = typeof body?.tier === 'string' ? body.tier.toLowerCase() : '';
    // The DB CHECK constraint only allows 'basic' for Essential.
    const tier = rawTier === 'essential' ? 'basic' : rawTier;
    let cycle: 'monthly' | 'yearly' = body?.billingCycle === 'monthly' ? 'monthly' : 'yearly';
    console.log('Creating order for:', { tier, cycle, userId });

    let amount: number;
    let planName: string;
    let quoteId: string | null = null;
    let seats: number | null = null;
    // Active rows (any expiry), for launch-price retention. null = not read.
    let priceHistory: { tier: string; amount: number | null; expires_at: string | null }[] | null = null;

    // ============= NO DOUBLE CHARGES =============
    // 1. A payment Razorpay captured earlier but that never activated (closed
    //    tab, lost callback) is activated now instead of taking a second payment.
    // 2. An account already on this plan or a higher one, with more than 30
    //    days left, is not sent to checkout again.
    if (tier === 'scale' || PLAN_PRICES[tier as keyof typeof PLAN_PRICES]) {
      try {
        const recovered = await reconcileUser(supabase, userId, {
          supabaseUrl: SUPABASE_URL!, serviceKey: SUPABASE_SERVICE_ROLE_KEY!, keyId: RAZORPAY_KEY_ID, keySecret: RAZORPAY_KEY_SECRET,
        });
        if (recovered.activated.length > 0) {
          return json({ error: 'Your earlier payment was received and your plan is now active. No new payment is needed.', alreadyActive: true, tier: recovered.activated[0].tier }, 409);
        }
      } catch (e) {
        // Never block checkout on a recovery error; it is retried on the next visit.
        console.error('Pre-checkout reconcile failed:', e instanceof Error ? e.message : 'unknown');
      }
      const { data: activeRows, error: activeErr } = await supabase
        .from('subscriptions')
        .select('tier, amount, expires_at')
        .eq('user_id', userId)
        .eq('status', 'active');
      priceHistory = activeErr ? null : (activeRows ?? []);
      if (!activeErr) {
        const block = blocksNewOrder(tier, (activeRows ?? []).filter((r: { expires_at: string | null }) => r.expires_at && Date.parse(r.expires_at) > Date.now()));
        if (block) {
          return json({ error: `You already have this plan or a higher one until ${block.until.slice(0, 10)}. You can renew within 30 days of that date.`, alreadyActive: true }, 409);
        }
      }
    }

    if (tier === 'scale') {
      const requestedQuoteId = typeof body?.quoteId === 'string' ? body.quoteId : '';
      if (!UUID_RE.test(requestedQuoteId)) {
        return json({ error: SCALE_REFUSAL }, 403);
      }
      const { data: quote, error: quoteErr } = await supabase
        .from('scale_price_quotes')
        .select('id, user_id, amount_inr, billing_cycle, seats, valid_until, status')
        .eq('id', requestedQuoteId)
        .maybeSingle();
      if (quoteErr) {
        // 42P01 = table not created yet (pending migration not applied). Fail closed either way.
        console.error('Scale quote lookup failed:', quoteErr.code === '42P01' ? 'table missing' : quoteErr.code);
        return json({ error: SCALE_REFUSAL }, 403);
      }
      const amountInr = Number(quote?.amount_inr);
      if (
        !quote ||
        quote.user_id !== userId ||
        quote.status !== 'active' ||
        !quote.valid_until ||
        new Date(quote.valid_until).getTime() <= Date.now() ||
        !Number.isFinite(amountInr) ||
        amountInr <= 0
      ) {
        return json({ error: SCALE_REFUSAL }, 403);
      }
      amount = Math.round(amountInr * 100);
      if (quote.billing_cycle === 'monthly' || quote.billing_cycle === 'yearly') {
        cycle = quote.billing_cycle;
      }
      planName = SCALE_PLAN_NAME;
      quoteId = quote.id;
      seats = typeof quote.seats === 'number' ? quote.seats : null;
    } else if (PLAN_PRICES[tier as keyof typeof PLAN_PRICES]) {
      // Once regular pricing is in force, a launch customer's retention must be
      // proven from their rows; if they could not be read, do not quote at all.
      if (priceHistory === null && REGULAR_PRICING_STARTS_AT) {
        return json({ error: 'Could not check your current plan. Please try again in a moment.' }, 503);
      }
      const price = orderPrice(tier as 'basic' | 'pro', cycle, priceHistory ?? []);
      amount = price.paise;
      planName = price.name;
      if (price.basis !== 'launch') console.log('Order price basis:', price.basis);
    } else {
      return json({ error: 'Invalid plan selected' }, 400);
    }

    // Create Razorpay order
    const credentials = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
    
    const orderResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount,
        currency: 'INR',
        receipt: `senseible_${tier}_${cycle}_${Date.now()}`.slice(0, 40),
        notes: {
          tier,
          billing_cycle: cycle,
          user_id: userId,
          user_email: userEmail,
          ...(quoteId ? { scale_quote_id: quoteId } : {}),
          ...(seats !== null ? { seats } : {}),
        },
      }),
    });

    if (!orderResponse.ok) {
      const errorText = await orderResponse.text();
      console.error('Razorpay order creation failed:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to create payment order' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const order = await orderResponse.json();
    console.log('Razorpay order created:', order.id);

    // Store pending subscription in database. Fail closed: if the row cannot be
    // written, verify-razorpay-payment could never activate the plan, so the
    // order id is NOT returned and the customer is never asked to pay.
    const { error: subError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        tier,
        billing_cycle: cycle,
        razorpay_order_id: order.id,
        amount: amount / 100, // Store in rupees
        status: 'pending',
      });

    if (subError) {
      console.error('Failed to store subscription:', subError.code, subError.message);
      return json({ error: 'Could not start checkout. Please try again or contact billing@senseible.earth.' }, 500);
    }

    return json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: RAZORPAY_KEY_ID,
      planName,
    });

  } catch (error) {
    console.error('Order creation error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
