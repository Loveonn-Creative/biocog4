import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
}

const categoryLabels: Record<string, string> = {
  sales: 'Sales & Partnerships',
  technical: 'Technical Support',
  climate: 'Climate & ESG Intelligence',
  monetization: 'Carbon Monetization',
  enterprise: 'Enterprise & API',
  general: 'General Inquiry',
};

const handler = async (req: Request): Promise<Response> => {
  console.log("Contact notification function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, phone, company, category, message, newsletter }: ContactRequest = await req.json();
    
    console.log("Processing contact from:", name, email, "Category:", category);

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
