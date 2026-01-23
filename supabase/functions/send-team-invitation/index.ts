import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  invitationId: string;
  email: string;
  role: string;
  organizationName: string;
  inviterName?: string;
  token: string;
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  analyst: 'Analyst',
  viewer: 'Viewer',
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  owner: 'Full access including billing and team management',
  admin: 'All features except billing. Can manage team members',
  analyst: 'Upload, verify, reports, and intelligence access',
  viewer: 'Read-only access to dashboard and reports',
};

const getInvitationEmailHTML = (data: InvitationRequest) => {
  const acceptUrl = `https://senseible.earth/accept-invite?token=${data.token}`;
  const expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #22c55e; margin: 0;">🤝 You're Invited!</h1>
  </div>
  
  <p>Hello,</p>
  
  <p><strong>${data.inviterName || 'A team member'}</strong> has invited you to join <strong>${data.organizationName}</strong> on Senseible.</p>
  
  <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
    <p style="margin: 0 0 8px 0; color: #166534; font-size: 14px;">Your Role</p>
    <p style="margin: 0; font-size: 24px; font-weight: 700; color: #166534;">${ROLE_LABELS[data.role] || data.role}</p>
    <p style="margin: 8px 0 0 0; color: #15803d; font-size: 13px;">${ROLE_DESCRIPTIONS[data.role] || ''}</p>
  </div>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="${acceptUrl}" style="display: inline-block; background: #22c55e; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">Accept Invitation</a>
  </div>
  
  <p style="background: #fef3c7; border-radius: 8px; padding: 12px; font-size: 13px; text-align: center;">
    ⏰ This invitation expires on <strong>${expiryDate}</strong>
  </p>
  
  <div style="margin-top: 24px; padding: 16px; background: #f9fafb; border-radius: 8px;">
    <p style="margin: 0 0 12px 0; font-weight: 600; color: #374151;">What is Senseible?</p>
    <p style="margin: 0; color: #6b7280; font-size: 14px;">
      Senseible is India's carbon intelligence platform for MSMEs. Your team uses it to track emissions, 
      generate compliance reports, and access climate finance opportunities.
    </p>
  </div>
  
  <p style="margin-top: 24px; color: #6b7280; font-size: 13px;">
    If you didn't expect this invitation, you can safely ignore this email.
  </p>
  
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
  
  <p style="color: #9ca3af; font-size: 12px; text-align: center;">
    Senseible by INSPYR FINNOVATION PRIVATE LIMITED<br>
    Carbon Intelligence for 400M+ MSMEs
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
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const data: InvitationRequest = await req.json();
    
    console.log("Sending team invitation to:", data.email);

    const emailHTML = getInvitationEmailHTML(data);

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Senseible <noreply@senseible.earth>",
        to: [data.email],
        subject: `You're invited to join ${data.organizationName} on Senseible`,
        html: emailHTML,
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Resend API error:", emailResult);
      throw new Error(emailResult.message || "Failed to send invitation email");
    }

    console.log("Invitation email sent:", emailResult.id);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResult.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Team invitation error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
