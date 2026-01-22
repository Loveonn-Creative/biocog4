import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Compute HMAC-SHA256 signature
async function computeHmacSha256(message: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const messageData = encoder.encode(message);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!RAZORPAY_KEY_SECRET) {
      console.error('Razorpay secret not configured');
      return new Response(
        JSON.stringify({ error: 'Payment verification not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      userId,
      tier 
    } = await req.json();

    // Normalize tier name
    if (tier === 'basic') tier = 'essential';

    console.log('Verifying payment:', { razorpay_order_id, razorpay_payment_id, userId, tier });

    // Verify signature
    const generatedSignature = await computeHmacSha256(
      `${razorpay_order_id}|${razorpay_payment_id}`,
      RAZORPAY_KEY_SECRET
    );

    if (generatedSignature !== razorpay_signature) {
      console.error('Signature verification failed');
      return new Response(
        JSON.stringify({ error: 'Payment verification failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Signature verified successfully');

    // Update database
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Calculate expiry (1 month from now)
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    // Update subscription status
    const { error: subError } = await supabase
      .from('subscriptions')
      .update({
        razorpay_payment_id,
        razorpay_signature,
        status: 'active',
        starts_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .eq('razorpay_order_id', razorpay_order_id);

    if (subError) {
      console.error('Failed to update subscription:', subError);
    }

    // Update user profile with new tier
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        subscription_tier: tier,
        subscription_expires_at: expiresAt.toISOString(),
      })
      .eq('id', userId);

    if (profileError) {
      console.error('Failed to update profile:', profileError);
    }

    console.log('Payment verified and subscription activated for user:', userId);

    // Fetch actual order details from Razorpay for accurate amount
    let orderAmount = 0;
    let orderCurrency = 'INR';
    const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID');
    
    try {
      const orderResponse = await fetch(
        `https://api.razorpay.com/v1/orders/${razorpay_order_id}`,
        {
          headers: {
            'Authorization': 'Basic ' + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)
          }
        }
      );
      if (orderResponse.ok) {
        const orderData = await orderResponse.json();
        orderAmount = orderData.amount || 0;
        orderCurrency = orderData.currency || 'INR';
        console.log('Fetched order details:', { amount: orderAmount, currency: orderCurrency });
      }
    } catch (orderError) {
      console.error('Failed to fetch order details:', orderError);
    }

    // Generate invoice number
    const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;

    // Send payment success email notification with invoice details
    try {
      // Get user email from auth
      const { data: userData } = await supabase.auth.admin.getUserById(userId);
      if (userData?.user?.email) {
        await fetch(`${SUPABASE_URL}/functions/v1/send-payment-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            type: 'payment_success',
            email: userData.user.email,
            tier,
            amount: orderAmount,
            currency: orderCurrency,
            transactionId: razorpay_payment_id,
            invoiceNumber,
            orderId: razorpay_order_id,
          }),
        });
        console.log('Payment notification email triggered with invoice details');
      }
    } catch (emailError) {
      console.error('Failed to send payment notification:', emailError);
      // Don't fail the payment verification if email fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment verified successfully',
        tier,
        expiresAt: expiresAt.toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Payment verification error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
