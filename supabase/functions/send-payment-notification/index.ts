import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentNotificationRequest {
  type: 'payment_success' | 'subscription_activated' | 'renewal_reminder';
  email: string;
  tier: string;
  amount?: number;
  currency?: string;
  expiresAt?: string;
  userName?: string;
  transactionId?: string;
  invoiceNumber?: string;
  orderId?: string;
}

const formatCurrency = (amount: number, currency: string = 'INR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount / 100); // Razorpay sends in paise
};

const getTierName = (tier: string) => {
  const names: Record<string, string> = {
    essential: 'Biocog Essential',
    pro: 'Biocog Pro',
    scale: 'Biocog Scale',
  };
  return names[tier] || tier.charAt(0).toUpperCase() + tier.slice(1);
};

const getPaymentSuccessEmail = (data: PaymentNotificationRequest) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #22c55e; margin: 0;">🎉 Welcome to ${getTierName(data.tier)}!</h1>
  </div>
  
  <p>Hi${data.userName ? ` ${data.userName}` : ''},</p>
  
  <p>Your payment has been processed successfully. Here are your invoice details:</p>
  
  <!-- Payment Receipt / Invoice Section -->
  <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin: 20px 0;">
    <h2 style="margin: 0 0 15px 0; color: #374151; font-size: 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px;">Payment Receipt</h2>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      ${data.invoiceNumber ? `<tr><td style="padding: 8px 0; color: #6b7280;">Invoice No:</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${data.invoiceNumber}</td></tr>` : ''}
      ${data.transactionId ? `<tr><td style="padding: 8px 0; color: #6b7280;">Transaction ID:</td><td style="padding: 8px 0; text-align: right; font-family: monospace; font-size: 12px;">${data.transactionId}</td></tr>` : ''}
      <tr><td style="padding: 8px 0; color: #6b7280;">Plan:</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${getTierName(data.tier)}</td></tr>
      <tr><td style="padding: 8px 0; color: #6b7280;">Date:</td><td style="padding: 8px 0; text-align: right;">${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</td></tr>
      ${data.amount ? `
        <tr style="border-top: 1px solid #e5e7eb;">
          <td style="padding: 12px 0 8px 0; color: #374151; font-weight: 600;">Amount Paid:</td>
          <td style="padding: 12px 0 8px 0; text-align: right; font-weight: 700; font-size: 18px; color: #22c55e;">${formatCurrency(data.amount, data.currency)}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #9ca3af; font-size: 12px;">GST (18%):</td>
          <td style="padding: 4px 0; text-align: right; color: #9ca3af; font-size: 12px;">Included</td>
        </tr>
      ` : ''}
    </table>
  </div>
  
  <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 12px; padding: 20px; margin: 20px 0;">
    <h2 style="margin: 0 0 15px 0; color: #166534;">What's Unlocked:</h2>
    <ul style="margin: 0; padding-left: 20px; color: #15803d;">
      ${data.tier === 'essential' ? `
        <li>Full GST→Carbon Automation</li>
        <li>Verified Climate Score</li>
        <li>Green Loan Eligibility Check</li>
        <li>Government Incentives Finder</li>
        <li>3 Team Members</li>
      ` : data.tier === 'pro' ? `
        <li>Everything in Essential, plus:</li>
        <li>Carbon Monetization Setup</li>
        <li>Automated ESG Reports</li>
        <li>AI ESG Head (Voice AI)</li>
        <li>Biocog Superintelligence</li>
        <li>10 Team Members</li>
      ` : `
        <li>Everything in Pro, plus:</li>
        <li>Real-time MRV Pipeline</li>
        <li>Multi-entity Support</li>
        <li>API & Integrations</li>
        <li>Dedicated Support</li>
      `}
    </ul>
  </div>
  
  <p><strong>Next Steps:</strong></p>
  <ol>
    <li>Upload your invoices to see your carbon footprint</li>
    <li>Check your green loan eligibility</li>
    <li>Explore AI-powered insights in the Intelligence tab</li>
  </ol>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="https://senseible.earth/dashboard" style="background: #22c55e; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Go to Dashboard</a>
  </div>
  
  <p style="color: #6b7280; font-size: 14px;">Questions? Just reply to this email or contact us at impact@senseible.earth</p>
  
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
  
  <p style="color: #9ca3af; font-size: 12px; text-align: center;">
    Senseible by INSPYR FINNOVATION PRIVATE LIMITED<br>
    CIN: U74999TG2024PTC182629 | GSTIN: On File<br>
    Turning carbon data into revenue for MSMEs
  </p>
</body>
</html>
`;

const getRenewalReminderEmail = (data: PaymentNotificationRequest) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #f59e0b; margin: 0;">⏰ Subscription Renewal Reminder</h1>
  </div>
  
  <p>Hi${data.userName ? ` ${data.userName}` : ''},</p>
  
  <p>Your <strong>${getTierName(data.tier)}</strong> subscription is expiring on <strong>${data.expiresAt ? new Date(data.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'soon'}</strong>.</p>
  
  <p>To continue enjoying uninterrupted access to your sustainability tools, please renew your subscription.</p>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="https://senseible.earth/subscription" style="background: #22c55e; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Renew Subscription</a>
  </div>
  
  <p style="color: #6b7280; font-size: 14px;">If you have any questions about your subscription, just reply to this email.</p>
  
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
  
  <p style="color: #9ca3af; font-size: 12px; text-align: center;">
    Senseible by INSPYR FINNOVATION PRIVATE LIMITED<br>
    Turning carbon data into revenue for MSMEs
  </p>
</body>
</html>
`;

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const data: PaymentNotificationRequest = await req.json();
    
    console.log('Sending payment notification:', data.type, 'to:', data.email);

    let subject: string;
    let html: string;

    switch (data.type) {
      case 'payment_success':
      case 'subscription_activated':
        subject = `Welcome to ${getTierName(data.tier)} — Payment Confirmed ✅`;
        html = getPaymentSuccessEmail(data);
        break;
      case 'renewal_reminder':
        subject = `Your ${getTierName(data.tier)} subscription is expiring soon`;
        html = getRenewalReminderEmail(data);
        break;
      default:
        throw new Error('Invalid notification type');
    }

    // Use fetch to call Resend API directly
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Senseible <noreply@senseible.earth>",
        to: [data.email],
        subject,
        html,
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Resend API error:", emailResult);
      throw new Error(emailResult.message || "Failed to send email");
    }

    console.log("Payment notification sent:", emailResult);

    return new Response(JSON.stringify({ success: true, id: emailResult.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Payment notification error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
