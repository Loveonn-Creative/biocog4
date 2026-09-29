import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3.25.76';
import { estimateCustomScope, formatScopeRupees, CUSTOM_WORK, type ScopeInput } from '../_shared/customScopeEstimate.ts';
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContactRequest {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  category: string;
  message: string;
  newsletter?: boolean;
  scopeInput?: ScopeInput;
}

const scopeInputSchema = z.object({
  counts: z.object(Object.fromEntries(CUSTOM_WORK.map((work) => [work.id, z.number().int().min(0).max(10).optional()])) as Record<typeof CUSTOM_WORK[number]['id'], z.ZodOptional<z.ZodNumber>>).strict(),
  complexity: z.enum(['standard', 'complex', 'enterprise']),
  entities: z.number().int().min(1).max(100),
  users: z.number().int().min(1).max(10000),
  volume: z.enum(['normal', 'high', 'very-high']),
}).strict();

const scopeRequestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().max(40).optional(),
  company: z.string().max(160).optional(),
  category: z.enum(['sales', 'enterprise']),
  message: z.string().trim().min(1).max(4000),
  scopeInput: scopeInputSchema,
}).strict();

const categoryLabels: Record<string, string> = {
  sales: 'Sales & Partnerships',
  technical: 'Technical Support',
  climate: 'Climate & ESG Intelligence',
  monetization: 'Carbon Monetization',
  enterprise: 'Enterprise & API',
  general: 'General Inquiry',
};

function escapeHtml(str: string | undefined | null): string {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Contact notification function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody: ContactRequest = await req.json();
    if (rawBody.scopeInput !== undefined) {
      const parsed = scopeRequestSchema.safeParse(rawBody);
      if (!parsed.success) return new Response(JSON.stringify({ error: 'Check your details and estimate, then try again.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const data = parsed.data;
      const scopeInput = data.scopeInput as ScopeInput;
      const estimate = estimateCustomScope(scopeInput);
      if (!estimate) return new Response(JSON.stringify({ error: 'Choose at least one new piece of work.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

      const url = Deno.env.get('SUPABASE_URL');
      const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      if (!url || !key) throw new Error('Scope review storage is unavailable');
      const db = createClient(url, key, { auth: { persistSession: false } });
      const ip = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
      const secret = Deno.env.get('LOVABLE_API_KEY');
      if (!secret) throw new Error('Notification service unavailable');
      const payload = new TextEncoder().encode(`${secret}:${ip}`);
      const digest = await crypto.subtle.digest('SHA-256', payload);
      const ipHash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
      const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count, error: countError } = await db.from('scope_review_requests').select('id', { count: 'exact', head: true }).eq('request_ip_hash', ipHash).gte('created_at', since);
      if (countError) throw countError;
      if ((count ?? 0) >= 3) return new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const { data: saved, error: saveError } = await db.from('scope_review_requests').insert({
        name: data.name, email: data.email, phone: data.phone || null, company: data.company || null,
        message: data.message, scope_input: scopeInput, estimate_min_inr: estimate.min, estimate_max_inr: estimate.max, request_ip_hash: ipHash,
      }).select('id').single();
      if (saveError || !saved) throw saveError || new Error('Unable to save request');
      try {
        const sent = await sendTemplateEmail('scope-review', 'impact@senseible.earth', {
          templateData: { name: data.name, email: data.email, phone: data.phone, company: data.company, message: data.message,
            estimate: `${formatScopeRupees(estimate.min)} to ${formatScopeRupees(estimate.max)}`, drivers: estimate.drivers, requestId: saved.id },
          idempotencyKey: `scope-review-${saved.id}`, replyTo: data.email,
        });
        const status = sent.sent ? 'sent' : 'suppressed';
        const { error: updateError } = await db.from('scope_review_requests').update({ email_status: status }).eq('id', saved.id);
        if (updateError) console.error('Scope review status update failed', saved.id, updateError);
        return new Response(JSON.stringify({ success: true, saved: true, notified: sent.sent }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      } catch (sendError) {
        console.error('Scope review notification failed', saved.id, sendError);
        await db.from('scope_review_requests').update({ email_status: 'failed' }).eq('id', saved.id);
        return new Response(JSON.stringify({ success: true, saved: true, notified: false }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }
    const name = escapeHtml(rawBody.name);
    const email = escapeHtml(rawBody.email);
    const phone = escapeHtml(rawBody.phone);
    const company = escapeHtml(rawBody.company);
    const category = escapeHtml(rawBody.category);
    const message = escapeHtml(rawBody.message);
    const newsletter = rawBody.newsletter;
    
    console.log("Processing contact from:", name, "Category:", category);

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      throw new Error("Email service not configured");
    }

    const categoryLabel = categoryLabels[category] || category;
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 24px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
          .field { margin-bottom: 16px; }
          .label { font-weight: 600; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
          .value { margin-top: 4px; font-size: 15px; }
          .message-box { background: white; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb; margin-top: 16px; }
          .footer { text-align: center; color: #9ca3af; font-size: 12px; margin-top: 24px; }
          .badge { display: inline-block; background: #d1fae5; color: #047857; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 500; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;">New Contact Form Submission</h2>
            <p style="margin: 8px 0 0; opacity: 0.9;">Senseible Carbon Intelligence</p>
          </div>
          <div class="content">
            <div class="field">
              <div class="label">Category</div>
              <div class="value"><span class="badge">${categoryLabel}</span></div>
            </div>
            <div class="field">
              <div class="label">Name</div>
              <div class="value">${name}</div>
            </div>
            <div class="field">
              <div class="label">Email</div>
              <div class="value"><a href="mailto:${email}">${email}</a></div>
            </div>
            ${phone ? `<div class="field"><div class="label">Phone</div><div class="value">${phone}</div></div>` : ''}
            ${company ? `<div class="field"><div class="label">Company</div><div class="value">${company}</div></div>` : ''}
            ${newsletter ? `<div class="field"><div class="label">Newsletter</div><div class="value">Subscribed to newsletter</div></div>` : ''}
            <div class="message-box">
              <div class="label">Message</div>
              <div class="value" style="margin-top: 8px; white-space: pre-wrap;">${message}</div>
            </div>
          </div>
          <div class="footer">
            Sent from Senseible Contact Form • ${new Date().toLocaleDateString('en-IN', { dateStyle: 'full' })}
          </div>
        </div>
      </body>
      </html>
    `;

    // Send using Resend API directly
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Senseible Contact <onboarding@resend.dev>",
        to: ["biocog.v1@gmail.com"],
        reply_to: email,
        subject: `[${categoryLabel}] New inquiry from ${name}`,
        html: emailHtml,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Resend API error:", response.status, errorData);
      throw new Error(`Email sending failed: ${response.status}`);
    }

    const emailResponse = await response.json();
    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, messageId: emailResponse.id }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-contact-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
