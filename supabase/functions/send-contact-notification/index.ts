import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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
    const { name, email, phone, company, category, message }: ContactRequest = await req.json();
    
    console.log("Processing contact from:", name, email, "Category:", category);

    const categoryLabel = categoryLabels[category] || category;
    
    const emailHtml = `
      <h2>New Contact Form Submission</h2>
      <p><strong>From:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
      ${company ? `<p><strong>Company:</strong> ${company}</p>` : ''}
      <p><strong>Category:</strong> ${categoryLabel}</p>
      <hr />
      <h3>Message:</h3>
      <p>${message.replace(/\n/g, '<br>')}</p>
      <hr />
      <p style="color: #666; font-size: 12px;">
        Sent from Senseible Contact Form at ${new Date().toISOString()}
      </p>
    `;

    const emailResponse = await resend.emails.send({
      from: "Senseible Contact <onboarding@resend.dev>",
      to: ["biocog.v1@gmail.com"],
      replyTo: email,
      subject: `[${categoryLabel}] New inquiry from ${name}`,
      html: emailHtml,
    });

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
