import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Company details
const COMPANY = {
  name: "INSPYR FINNOVATION PRIVATE LIMITED",
  tradeName: "Senseible",
  gstin: "06AAHCI6700M1ZF",
  cin: "U74999TG2024PTC182629",
  address: "Plot No. 42, Sector 18, Gurugram, Haryana 122015",
  email: "billing@senseible.earth",
  website: "senseible.earth",
};

interface InvoiceData {
  userId: string;
  email: string;
  userName?: string;
  businessName?: string;
  customerGstin?: string;
  tier: string;
  billingCycle?: string;
  subscriptionId?: string;
  /** One-time add-on bought on the profile or Subscription page (invoice credits, Fast-track Verification, Expert Climate Audit). */
  itemName?: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  amount: number; // in paise
  /** Platform fee in paise (card, netbanking or wallet via Razorpay), shown as its own line; part of the taxable value. */
  platformFeePaise?: number;
  currency: string;
  transactionId: string;
  orderId: string;
  billingAddress?: {
    name: string;
    address_line_1?: string;
    address_line_2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
    gstin?: string;
  };
}

const formatCurrency = (paise: number, currency = 'INR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(paise / 100);
};

const getTierName = (tier: string) => {
  const names: Record<string, string> = {
    essential: 'Senseible Essential',
    basic: 'Senseible Essential',
    pro: 'Senseible Pro',
    scale: 'Senseible Scale',
  };
  return names[tier] || tier.charAt(0).toUpperCase() + tier.slice(1);
};

// Tier prices removed - amounts come from actual payment

// Every interpolated value goes through this before reaching invoice/email HTML.
const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatDate = (iso: string | null | undefined) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

// What the invoice is for: the plan's subscription, or the named add-on.
const itemTitle = (data: InvoiceData) => (data.itemName ? data.itemName : `${getTierName(data.tier)} Subscription`);

const getLineDescription = (data: InvoiceData) => {
  if (data.itemName) return 'One-time purchase - Carbon MRV & Intelligence Platform';
  const cycle = data.billingCycle === 'monthly' ? 'Monthly' : data.billingCycle === 'yearly' ? 'Annual' : '';
  const start = formatDate(data.periodStart);
  const end = formatDate(data.periodEnd);
  const period = start && end ? ` (${start} to ${end})` : '';
  return `${cycle ? `${cycle} subscription` : 'Subscription'}${period} - Carbon MRV & Intelligence Platform`;
};

const generateInvoiceHTML = (data: InvoiceData, invoiceNumber: string) => {
  const baseAmount = data.amount / 1.18; // Remove GST to get the taxable value
  const fee = Number.isFinite(data.platformFeePaise) && (data.platformFeePaise ?? 0) > 0 ? Math.min(data.platformFeePaise as number, baseAmount) : 0;
  const planAmount = baseAmount - fee;
  const cgst = baseAmount * 0.09;
  const sgst = baseAmount * 0.09;
  const igst = baseAmount * 0.18;
  const invoiceDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  
  // Determine if IGST or CGST+SGST based on place of supply
  const isInterState = !data.billingAddress?.state?.toLowerCase().includes('haryana');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #1a1a1a; background: #fff; }
    .invoice { max-width: 800px; margin: 0 auto; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 3px solid #22c55e; padding-bottom: 20px; }
    .logo { font-size: 28px; font-weight: 700; color: #22c55e; }
    .logo-sub { font-size: 10px; color: #666; margin-top: 4px; }
    .invoice-title { text-align: right; }
    .invoice-title h1 { font-size: 24px; color: #374151; margin-bottom: 8px; }
    .invoice-number { font-size: 14px; color: #22c55e; font-weight: 600; }
    .invoice-date { color: #666; margin-top: 4px; }
    .parties { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .party { width: 48%; }
    .party-label { font-size: 10px; text-transform: uppercase; color: #22c55e; font-weight: 600; letter-spacing: 1px; margin-bottom: 8px; }
    .party-name { font-weight: 600; font-size: 14px; margin-bottom: 4px; }
    .party-detail { color: #666; line-height: 1.6; }
    .gstin-badge { display: inline-block; background: #f0fdf4; border: 1px solid #22c55e; color: #166534; font-size: 11px; padding: 2px 8px; border-radius: 4px; margin-top: 8px; font-family: monospace; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th { background: #f8fafc; text-align: left; padding: 12px; font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0; }
    td { padding: 16px 12px; border-bottom: 1px solid #e2e8f0; }
    .item-desc { font-weight: 500; }
    .item-sub { color: #666; font-size: 11px; margin-top: 2px; }
    .text-right { text-align: right; }
    .totals { width: 300px; margin-left: auto; }
    .totals tr td { padding: 8px 12px; }
    .totals .label { color: #666; }
    .totals .final { background: #22c55e; color: white; font-weight: 700; font-size: 16px; }
    .totals .final td { padding: 16px 12px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; }
    .footer-section { width: 48%; }
    .footer-label { font-size: 10px; text-transform: uppercase; color: #22c55e; font-weight: 600; letter-spacing: 1px; margin-bottom: 8px; }
    .footer-content { color: #666; font-size: 11px; line-height: 1.6; }
    .qr-placeholder { width: 80px; height: 80px; background: #f8fafc; border: 1px dashed #cbd5e1; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #94a3b8; }
    .stamp { text-align: right; margin-top: 40px; }
    .stamp-text { font-size: 10px; color: #666; margin-top: 60px; }
    .paid-badge { display: inline-block; background: #dcfce7; color: #166534; font-weight: 700; font-size: 20px; padding: 8px 24px; border-radius: 8px; border: 2px solid #22c55e; transform: rotate(-5deg); }
  </style>
</head>
<body>
  <div class="invoice">
    <div class="header">
      <div>
        <div class="logo">Senseible</div>
        <div class="logo-sub">Carbon Intelligence for MSMEs</div>
      </div>
      <div class="invoice-title">
        <h1>TAX INVOICE</h1>
        <div class="invoice-number">${escapeHtml(invoiceNumber)}</div>
        <div class="invoice-date">Date: ${escapeHtml(invoiceDate)}</div>
      </div>
    </div>

    <div class="parties">
      <div class="party">
        <div class="party-label">From</div>
        <div class="party-name">${escapeHtml(COMPANY.name)}</div>
        <div class="party-detail">
          Trading as: ${escapeHtml(COMPANY.tradeName)}<br>
          ${escapeHtml(COMPANY.address)}<br>
          Email: ${escapeHtml(COMPANY.email)}
        </div>
        <div class="gstin-badge">GSTIN: ${escapeHtml(COMPANY.gstin)}</div>
        <div style="font-size: 10px; color: #666; margin-top: 4px;">CIN: ${escapeHtml(COMPANY.cin)}</div>
      </div>
      <div class="party">
        <div class="party-label">Bill To</div>
        <div class="party-name">${escapeHtml(data.billingAddress?.name || data.businessName || data.userName || 'Customer')}</div>
        <div class="party-detail">
          ${data.billingAddress?.address_line_1 ? `${escapeHtml(data.billingAddress.address_line_1)}<br>` : ''}
          ${data.billingAddress?.address_line_2 ? `${escapeHtml(data.billingAddress.address_line_2)}<br>` : ''}
          ${escapeHtml([data.billingAddress?.city, data.billingAddress?.state, data.billingAddress?.postal_code].filter(Boolean).join(', '))}<br>
          ${escapeHtml(data.billingAddress?.country || 'India')}<br>
          Email: ${escapeHtml(data.email)}
        </div>
        ${data.billingAddress?.gstin || data.customerGstin ? `<div class="gstin-badge">GSTIN: ${escapeHtml(data.billingAddress?.gstin || data.customerGstin)}</div>` : ''}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 50%;">Description</th>
          <th>HSN/SAC</th>
          <th>Qty</th>
          <th class="text-right">Rate</th>
          <th class="text-right">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <div class="item-desc">${escapeHtml(itemTitle(data))}</div>
            <div class="item-sub">${escapeHtml(getLineDescription(data))}</div>
          </td>
          <td>998314</td>
          <td>1</td>
          <td class="text-right">${escapeHtml(formatCurrency(planAmount, data.currency))}</td>
          <td class="text-right">${escapeHtml(formatCurrency(planAmount, data.currency))}</td>
        </tr>
        ${fee > 0 ? `<tr>
          <td>
            <div class="item-desc">Platform fee</div>
            <div class="item-sub">Card, netbanking or wallet payment (4%)</div>
          </td>
          <td>998314</td>
          <td>1</td>
          <td class="text-right">${escapeHtml(formatCurrency(fee, data.currency))}</td>
          <td class="text-right">${escapeHtml(formatCurrency(fee, data.currency))}</td>
        </tr>` : ''}
      </tbody>
    </table>

    <table class="totals">
      <tr>
        <td class="label">Subtotal</td>
        <td class="text-right">${escapeHtml(formatCurrency(baseAmount, data.currency))}</td>
      </tr>
      ${isInterState ? `
      <tr>
        <td class="label">IGST @ 18%</td>
        <td class="text-right">${escapeHtml(formatCurrency(igst, data.currency))}</td>
      </tr>
      ` : `
      <tr>
        <td class="label">CGST @ 9%</td>
        <td class="text-right">${escapeHtml(formatCurrency(cgst, data.currency))}</td>
      </tr>
      <tr>
        <td class="label">SGST @ 9%</td>
        <td class="text-right">${escapeHtml(formatCurrency(sgst, data.currency))}</td>
      </tr>
      `}
      <tr class="final">
        <td>Total</td>
        <td class="text-right">${escapeHtml(formatCurrency(data.amount, data.currency))}</td>
      </tr>
    </table>

    <div class="footer">
      <div class="footer-section">
        <div class="footer-label">Payment Details</div>
        <div class="footer-content">
          Transaction ID: ${escapeHtml(data.transactionId)}<br>
          Order ID: ${escapeHtml(data.orderId)}<br>
          Payment Method: Razorpay<br>
          Status: <strong style="color: #22c55e;">PAID</strong>
        </div>
      </div>
      <div class="footer-section">
        <div class="footer-label">Terms & Conditions</div>
        <div class="footer-content">
          1. This is a computer-generated invoice.<br>
          2. Subscriptions are non-refundable once activated.<br>
          3. For queries: billing@senseible.earth
        </div>
      </div>
    </div>

    <div class="stamp">
      <span class="paid-badge">PAID</span>
      <div class="stamp-text">
        Authorized Signatory<br>
        ${escapeHtml(COMPANY.tradeName)}
      </div>
    </div>
  </div>
</body>
</html>
`;
};

// Helper to encode string to base64
const encodeBase64 = (str: string): string => {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const binString = Array.from(data, (byte) => String.fromCodePoint(byte)).join("");
  return btoa(binString);
};

const generateInvoiceEmailHTML = (data: InvoiceData, invoiceNumber: string) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #22c55e; margin: 0;">🧾 Your Invoice is Ready</h1>
  </div>
  
  <p>Hi${data.userName || data.businessName ? ` ${escapeHtml(data.userName || data.businessName)}` : ''},</p>
  
  <p>Thank you for your ${data.itemName ? 'purchase of' : 'subscription to'} <strong>${escapeHtml(data.itemName || getTierName(data.tier))}</strong>. Your tax invoice is attached to this email.</p>
  
  <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin: 20px 0;">
    <h2 style="margin: 0 0 15px 0; color: #374151; font-size: 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px;">Invoice Summary</h2>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      <tr><td style="padding: 8px 0; color: #6b7280;">Invoice No:</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${escapeHtml(invoiceNumber)}</td></tr>
      <tr><td style="padding: 8px 0; color: #6b7280;">Transaction ID:</td><td style="padding: 8px 0; text-align: right; font-family: monospace; font-size: 12px;">${escapeHtml(data.transactionId)}</td></tr>
      <tr><td style="padding: 8px 0; color: #6b7280;">${data.itemName ? 'Item' : 'Plan'}:</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${escapeHtml(data.itemName || getTierName(data.tier))}</td></tr>
      <tr><td style="padding: 8px 0; color: #6b7280;">Date:</td><td style="padding: 8px 0; text-align: right;">${escapeHtml(new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }))}</td></tr>
      <tr style="border-top: 1px solid #e5e7eb;">
        <td style="padding: 12px 0 8px 0; color: #374151; font-weight: 600;">Amount Paid:</td>
        <td style="padding: 12px 0 8px 0; text-align: right; font-weight: 700; font-size: 18px; color: #22c55e;">${escapeHtml(formatCurrency(data.amount, data.currency))}</td>
      </tr>
    </table>
  </div>
  
  <p style="background: #fef3c7; border-radius: 8px; padding: 12px; font-size: 13px;">
    <strong>💡 Tip:</strong> Save this invoice for your tax records. The GSTIN details are included for Input Tax Credit (ITC) claims.
  </p>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="https://senseible.earth/billing" style="background: #22c55e; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">View All Invoices</a>
  </div>
  
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
  
  <p style="color: #9ca3af; font-size: 12px; text-align: center;">
    ${escapeHtml(COMPANY.name)}<br>
    GSTIN: ${escapeHtml(COMPANY.gstin)} | CIN: ${escapeHtml(COMPANY.cin)}<br>
    ${escapeHtml(COMPANY.address)}
  </p>
</body>
</html>
`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing required environment variables");
    }

    // ============= SERVICE-ROLE-ONLY: caller must present the service role key =============
    const authHeader = req.headers.get("Authorization") || "";
    const internalHeader = req.headers.get("x-internal-service-role") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (token !== SUPABASE_SERVICE_ROLE_KEY && internalHeader !== SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const data: InvoiceData = await req.json();

    // Generate invoice number
    const invoiceNumber = `INV-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${Date.now().toString(36).toUpperCase()}`;

    // Fetch billing address if not provided
    let billingAddress = data.billingAddress;
    if (!billingAddress && data.userId) {
      const { data: addresses } = await supabase
        .from('billing_addresses')
        .select('*')
        .eq('user_id', data.userId)
        .eq('is_default', true)
        .single();
      
      if (addresses) {
        billingAddress = addresses;
      }
    }

    // Fetch profile for additional details
    let profile = null;
    if (data.userId) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('business_name, gstin')
        .eq('id', data.userId)
        .single();
      
      if (profileData) {
        profile = profileData;
      }
    }

    // Load the subscription row so the invoice states the actual tier, billing
    // cycle and service period, and links back via invoices.subscription_id.
    let subscription: { id: string; tier: string; billing_cycle: string | null; starts_at: string | null; expires_at: string | null } | null = null;
    if (data.userId && !data.itemName && (data.subscriptionId || data.orderId)) {
      let query = supabase
        .from('subscriptions')
        .select('id, tier, billing_cycle, starts_at, expires_at')
        .eq('user_id', data.userId);
      query = data.subscriptionId ? query.eq('id', data.subscriptionId) : query.eq('razorpay_order_id', data.orderId);
      const { data: subData, error: subErr } = await query.maybeSingle();
      if (subErr) console.error('Subscription lookup for invoice failed:', subErr.code);
      if (subData) subscription = subData;
    }

    const invoiceData: InvoiceData = {
      ...data,
      tier: subscription?.tier || data.tier,
      billingCycle: subscription?.billing_cycle || data.billingCycle,
      subscriptionId: subscription?.id,
      periodStart: subscription?.starts_at ?? null,
      periodEnd: subscription?.expires_at ?? null,
      billingAddress,
      businessName: data.businessName || profile?.business_name,
      customerGstin: data.customerGstin || profile?.gstin,
    };

    // Generate invoice HTML
    const invoiceHTML = generateInvoiceHTML(invoiceData, invoiceNumber);
    const emailHTML = generateInvoiceEmailHTML(invoiceData, invoiceNumber);

    // Store invoice HTML in storage bucket for download
    let pdfUrl: string | null = null;
    try {
      const htmlBlob = new Blob([invoiceHTML], { type: 'text/html' });
      const fileName = `invoices/${data.userId}/${invoiceNumber}.html`;
      
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, htmlBlob, {
          contentType: 'text/html',
          upsert: true,
        });

      if (!uploadError) {
        // Create signed URL valid for 1 year
        const { data: signedData } = await supabase.storage
          .from('documents')
          .createSignedUrl(fileName, 365 * 24 * 60 * 60);
        
        pdfUrl = signedData?.signedUrl || null;
        console.log('Invoice stored with signed URL');
      } else {
        console.error('Failed to upload invoice:', uploadError);
      }
    } catch (storageError) {
      console.error('Storage error:', storageError);
    }

    // Store invoice in database
    const { error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        user_id: data.userId,
        subscription_id: subscription?.id ?? null,
        invoice_number: invoiceNumber,
        amount: data.amount / 1.18 / 100, // Base amount in rupees
        tax_amount: (data.amount - data.amount / 1.18) / 100,
        total_amount: data.amount / 100,
        currency: data.currency,
        status: 'paid',
        paid_at: new Date().toISOString(),
        razorpay_payment_id: data.transactionId,
        pdf_url: pdfUrl,
      });

    if (invoiceError) {
      console.error("Failed to store invoice:", invoiceError);
    }

    // Send email with invoice HTML as attachment
    // Note: For actual PDF, you'd use a PDF generation service
    // Here we send HTML which can be printed as PDF by the user
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Senseible Billing <billing@senseible.earth>",
        to: [data.email],
        subject: `Invoice ${invoiceNumber} - ${itemTitle(invoiceData)}`,
        html: emailHTML,
        attachments: [
          {
            filename: `${invoiceNumber}.html`,
            content: encodeBase64(invoiceHTML),
            content_type: 'text/html',
          }
        ],
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Resend API error:", emailResult);
      throw new Error(emailResult.message || "Failed to send invoice email");
    }

    console.log("Invoice email sent:", emailResult.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        invoiceNumber,
        emailId: emailResult.id,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Invoice generation error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
