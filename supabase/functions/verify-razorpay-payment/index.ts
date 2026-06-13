import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function computeHmacSha256(message: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw', encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
  return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function mask(id: string | null | undefined): string {
  if (!id) return '';
  return id.length > 8 ? `${id.slice(0, 4)}***${id.slice(-4)}` : '***';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET');
    const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!RAZORPAY_KEY_SECRET) {
      return new Response(JSON.stringify({ error: 'Payment verification not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ============= AUTHENTICATION =============
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsRes, error: authErr } = await userClient.auth.getClaims(
      authHeader.replace('Bearer ', '')
    );
    if (authErr || !claimsRes?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = claimsRes.claims.sub as string;

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, billingCycle } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return new Response(JSON.stringify({ error: 'Missing payment fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log('Verifying payment:', { order: mask(razorpay_order_id), payment: mask(razorpay_payment_id), user: mask(userId) });

    // ============= SIGNATURE VERIFY =============
    const generated = await computeHmacSha256(`${razorpay_order_id}|${razorpay_payment_id}`, RAZORPAY_KEY_SECRET);
    if (generated !== razorpay_signature) {
      console.error('Signature verification failed');
      return new Response(JSON.stringify({ error: 'Payment verification failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ============= AUTHORITATIVE TIER FROM DB =============
    // The tier MUST come from the pre-recorded subscription row created by create-razorpay-order,
    // not from the client request body. This prevents tier spoofing.
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: subRow, error: subFetchErr } = await admin
      .from('subscriptions')
      .select('id, user_id, tier, billing_cycle, amount')
      .eq('razorpay_order_id', razorpay_order_id)
      .maybeSingle();

    if (subFetchErr || !subRow) {
      console.error('Subscription order row not found');
      return new Response(JSON.stringify({ error: 'Order record missing' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // The order's user_id must match the JWT user
    if (subRow.user_id !== userId) {
      console.error('Order ownership mismatch');
      return new Response(JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const tier = subRow.tier as string;
    const cycle: 'monthly' | 'yearly' = (subRow.billing_cycle === 'monthly' ? 'monthly'
      : billingCycle === 'monthly' ? 'monthly' : 'yearly');

    const expiresAt = new Date();
    if (cycle === 'yearly') expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    else expiresAt.setMonth(expiresAt.getMonth() + 1);

    await admin
      .from('subscriptions')
      .update({
        razorpay_payment_id,
        razorpay_signature,
        status: 'active',
        billing_cycle: cycle,
        starts_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .eq('razorpay_order_id', razorpay_order_id);

    await admin
      .from('profiles')
      .update({
        subscription_tier: tier,
        subscription_expires_at: expiresAt.toISOString(),
      })
      .eq('id', userId);

    // Fetch actual order amount for invoice
    let orderAmount = 0;
    let orderCurrency = 'INR';
    try {
      const orderResponse = await fetch(`https://api.razorpay.com/v1/orders/${razorpay_order_id}`, {
        headers: { 'Authorization': 'Basic ' + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`) },
      });
      if (orderResponse.ok) {
        const orderData = await orderResponse.json();
        orderAmount = orderData.amount || 0;
        orderCurrency = orderData.currency || 'INR';
      }
    } catch (e) {
      console.error('Failed to fetch order details');
    }

    // Trigger invoice generation (service-role auth)
    try {
      const { data: userData } = await admin.auth.admin.getUserById(userId);
      if (userData?.user?.email) {
        await fetch(`${SUPABASE_URL}/functions/v1/generate-invoice-pdf`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'x-internal-service-role': SUPABASE_SERVICE_ROLE_KEY,
          },
          body: JSON.stringify({
            userId, email: userData.user.email, tier,
            amount: orderAmount, currency: orderCurrency,
            transactionId: razorpay_payment_id, orderId: razorpay_order_id,
          }),
        });
      }
    } catch (e) {
      console.error('Failed to trigger invoice generation');
    }

    return new Response(
      JSON.stringify({ success: true, tier, expiresAt: expiresAt.toISOString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Payment verification error:', error instanceof Error ? error.message : 'unknown');
    return new Response(JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
