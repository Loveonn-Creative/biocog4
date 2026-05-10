import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Prices in paise. Yearly = listed monthly price * 12 (the discounted "yearly" headline).
// Monthly (no discount) is roughly 4x the discounted monthly equivalent.
const PLAN_PRICES: Record<string, { monthly: number; yearly: number; name: string }> = {
  essential: { monthly: 199900, yearly: 598800, name: 'Biocog Essential' },   // ₹1,999/mo  OR ₹5,988/yr (₹499/mo equiv)
  basic:     { monthly: 199900, yearly: 598800, name: 'Biocog Essential' },   // legacy alias
  pro:       { monthly: 999900, yearly: 5998800, name: 'Biocog Pro' },        // ₹9,999/mo OR ₹59,988/yr (₹4,999/mo equiv)
  scale:     { monthly: 3000000, yearly: 18000000, name: 'Biocog Scale' },    // ₹30,000/mo OR ₹1,80,000/yr base
};
const PER_EMPLOYEE_MONTHLY = 19800; // ₹198/employee/month
const PER_EMPLOYEE_YEARLY = 118800; // ₹1,188/employee/year (₹99/mo equiv)

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

    let { tier, teamSize, billingCycle, userId, userEmail } = await req.json();
    // Normalize tier name
    if (tier === 'basic') tier = 'essential';
    const cycle: 'monthly' | 'yearly' = billingCycle === 'monthly' ? 'monthly' : 'yearly';
    console.log('Creating order for:', { tier, teamSize, cycle, userId, userEmail });

    // Validate tier
    if (!PLAN_PRICES[tier]) {
      return new Response(
        JSON.stringify({ error: 'Invalid plan selected' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate amount
    let amount = PLAN_PRICES[tier][cycle];
    if (tier === 'scale' && teamSize) {
      amount += teamSize * (cycle === 'yearly' ? PER_EMPLOYEE_YEARLY : PER_EMPLOYEE_MONTHLY);
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
          team_size: teamSize || 0,
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

    // Store pending subscription in database
    if (userId) {
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
      
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
        console.error('Failed to store subscription:', subError);
      }
    }

    return new Response(
      JSON.stringify({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: RAZORPAY_KEY_ID,
        planName: PLAN_PRICES[tier].name,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Order creation error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
