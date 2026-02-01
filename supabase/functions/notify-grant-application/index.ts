import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

interface ResendEmailResponse {
  id?: string;
  error?: { message: string };
}

async function sendEmail(to: string[], subject: string, html: string, from: string): Promise<ResendEmailResponse> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });
  return response.json();
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface GrantApplicationRequest {
  applicantName: string;
  email: string;
  companyName: string;
  country: string;
  companyStage: string;
  sector: string;
  pitch: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { applicantName, email, companyName, country, companyStage, sector, pitch }: GrantApplicationRequest = await req.json();

    if (!applicantName || !email || !companyName) {
      throw new Error("Missing required fields: applicantName, email, companyName");
    }

    const applicantEmailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Application Received</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <tr>
      <td>
        <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <div style="text-align: center; margin-bottom: 32px;">
            <img src="https://senseible.earth/logo.png" alt="Senseible" width="140" style="max-width: 140px;">
          </div>
          
          <h1 style="font-size: 24px; font-weight: 700; color: #18181b; margin: 0 0 16px 0; text-align: center;">
            Application Received ✓
          </h1>
          
          <p style="font-size: 16px; color: #52525b; line-height: 1.6; margin: 0 0 24px 0;">
            Hi ${applicantName},
          </p>
          
          <p style="font-size: 16px; color: #52525b; line-height: 1.6; margin: 0 0 24px 0;">
            Thank you for applying to the <strong>Senseible Accelerator Program</strong>. We've received your application for <strong>${companyName}</strong>.
          </p>
          
          <div style="background: #f4f4f5; border-radius: 8px; padding: 20px; margin: 0 0 24px 0;">
            <p style="font-size: 14px; color: #71717a; margin: 0 0 8px 0;">What happens next:</p>
            <ul style="font-size: 14px; color: #52525b; line-height: 1.8; margin: 0; padding-left: 20px;">
              <li>Our team reviews applications within <strong>5 business days</strong></li>
              <li>Shortlisted candidates receive an interview invitation</li>
              <li>Final decisions are communicated within 10 business days</li>
            </ul>
          </div>
          
          <p style="font-size: 16px; color: #52525b; line-height: 1.6; margin: 0 0 24px 0;">
            In the meantime, explore our <a href="https://senseible.earth/climate-intelligence" style="color: #16a34a; text-decoration: none;">Climate Intelligence</a> resources.
          </p>
          
          <p style="font-size: 14px; color: #a1a1aa; line-height: 1.6; margin: 0;">
            Questions? Reply to this email or reach us at <a href="mailto:accelerator@senseible.earth" style="color: #16a34a;">accelerator@senseible.earth</a>
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 24px;">
          <p style="font-size: 12px; color: #a1a1aa; margin: 0;">
            © ${new Date().getFullYear()} Senseible Earth Pvt. Ltd. All rights reserved.
          </p>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const internalEmailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Grant Application</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #18181b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <tr>
      <td>
        <div style="background: #27272a; border-radius: 12px; padding: 32px; border: 1px solid #3f3f46;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 24px;">
            <span style="background: #22c55e; width: 10px; height: 10px; border-radius: 50%; display: inline-block;"></span>
            <span style="font-size: 14px; color: #a1a1aa; font-weight: 500;">NEW APPLICATION</span>
          </div>
          
          <h1 style="font-size: 22px; font-weight: 700; color: #fafafa; margin: 0 0 24px 0;">
            ${companyName}
          </h1>
          
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #3f3f46;">
                <span style="font-size: 13px; color: #71717a;">Applicant</span>
              </td>
              <td style="padding: 8px 0; border-bottom: 1px solid #3f3f46; text-align: right;">
                <span style="font-size: 14px; color: #fafafa;">${applicantName}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #3f3f46;">
                <span style="font-size: 13px; color: #71717a;">Email</span>
              </td>
              <td style="padding: 8px 0; border-bottom: 1px solid #3f3f46; text-align: right;">
                <a href="mailto:${email}" style="font-size: 14px; color: #22c55e; text-decoration: none;">${email}</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #3f3f46;">
                <span style="font-size: 13px; color: #71717a;">Country</span>
              </td>
              <td style="padding: 8px 0; border-bottom: 1px solid #3f3f46; text-align: right;">
                <span style="font-size: 14px; color: #fafafa;">${country}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #3f3f46;">
                <span style="font-size: 13px; color: #71717a;">Stage</span>
              </td>
              <td style="padding: 8px 0; border-bottom: 1px solid #3f3f46; text-align: right;">
                <span style="font-size: 14px; color: #fafafa;">${companyStage}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">
                <span style="font-size: 13px; color: #71717a;">Sector</span>
              </td>
              <td style="padding: 8px 0; text-align: right;">
                <span style="font-size: 14px; color: #fafafa;">${sector}</span>
              </td>
            </tr>
          </table>
          
          <div style="background: #3f3f46; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="font-size: 13px; color: #a1a1aa; margin: 0 0 8px 0; font-weight: 500;">PITCH</p>
            <p style="font-size: 14px; color: #e4e4e7; line-height: 1.6; margin: 0;">
              ${pitch.substring(0, 500)}${pitch.length > 500 ? '...' : ''}
            </p>
          </div>
          
          <a href="https://senseible.earth/admin" style="display: inline-block; background: #22c55e; color: #052e16; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
            Review in Admin →
          </a>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // Send confirmation email to applicant
    const applicantEmailResponse = await sendEmail(
      [email],
      "Application Received — Senseible Accelerator",
      applicantEmailHtml,
      "Senseible Accelerator <grants@senseible.earth>"
    );

    console.log("Applicant confirmation email sent:", applicantEmailResponse);

    // Send internal notification to team
    const internalEmailResponse = await sendEmail(
      ["accelerator@senseible.earth"],
      `[NEW] Grant Application: ${companyName} (${country})`,
      internalEmailHtml,
      "Senseible System <system@senseible.earth>"
    );

    console.log("Internal notification email sent:", internalEmailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        applicantEmail: applicantEmailResponse,
        internalEmail: internalEmailResponse 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in notify-grant-application:", error);
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
