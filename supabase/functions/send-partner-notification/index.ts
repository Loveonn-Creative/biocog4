import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PartnerNotificationRequest {
  email: string;
  organization_name: string;
  decision: "approved" | "rejected";
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, organization_name, decision }: PartnerNotificationRequest = await req.json();

    if (!email || !organization_name || !decision) {
      throw new Error("Missing required fields: email, organization_name, decision");
    }

    const isApproved = decision === "approved";
    
    const subject = isApproved
      ? `🎉 Welcome to Senseible Partner Network!`
      : `Update on Your Senseible Partner Application`;

    const htmlContent = isApproved
      ? `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #16a34a; margin-bottom: 24px;">Welcome to the Partner Network!</h1>
          <p style="font-size: 16px; line-height: 1.6; color: #374151;">
            Great news! Your partner application for <strong>${organization_name}</strong> has been approved.
          </p>
          <p style="font-size: 16px; line-height: 1.6; color: #374151;">
            You now have access to:
          </p>
          <ul style="font-size: 16px; line-height: 1.8; color: #374151;">
            <li>Carbon credit marketplace purchasing</li>
            <li>Partner dashboard with portfolio analytics</li>
            <li>Direct MSME engagement opportunities</li>
            <li>Exclusive partner resources and support</li>
          </ul>
          <div style="margin-top: 32px;">
            <a href="https://biocog4.lovable.app/partner-dashboard" 
               style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 500;">
              Access Partner Dashboard
            </a>
          </div>
          <p style="font-size: 14px; color: #6b7280; margin-top: 32px;">
            If you have any questions, reach out to our partner support team.
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
          <p style="font-size: 12px; color: #9ca3af;">
            Senseible — Simplifying Carbon Intelligence for Indian MSMEs
          </p>
        </div>
      `
      : `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #374151; margin-bottom: 24px;">Application Update</h1>
          <p style="font-size: 16px; line-height: 1.6; color: #374151;">
            Thank you for your interest in becoming a Senseible partner.
          </p>
          <p style="font-size: 16px; line-height: 1.6; color: #374151;">
            After careful review, we're unable to approve your partner application for <strong>${organization_name}</strong> at this time.
          </p>
          <p style="font-size: 16px; line-height: 1.6; color: #374151;">
            This decision may be due to:
          </p>
          <ul style="font-size: 16px; line-height: 1.8; color: #374151;">
            <li>Incomplete organization information</li>
            <li>Misalignment with our current partner criteria</li>
            <li>Capacity constraints in your region</li>
          </ul>
          <p style="font-size: 16px; line-height: 1.6; color: #374151;">
            You're welcome to reapply in the future or contact us for more details about the decision.
          </p>
          <div style="margin-top: 32px;">
            <a href="https://biocog4.lovable.app/contact" 
               style="background-color: #374151; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 500;">
              Contact Us
            </a>
          </div>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
          <p style="font-size: 12px; color: #9ca3af;">
            Senseible — Simplifying Carbon Intelligence for Indian MSMEs
          </p>
        </div>
      `;

    const emailResponse = await resend.emails.send({
      from: "Senseible Partners <partners@senseible.in>",
      to: [email],
      subject,
      html: htmlContent,
    });

    console.log("Partner notification email sent:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending partner notification:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
