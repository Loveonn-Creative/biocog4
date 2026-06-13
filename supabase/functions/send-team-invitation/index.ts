import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function escapeHtml(str: string | undefined | null): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

interface InvitationRequest {
  invitationId?: string; // legacy: token value
  email: string;
  role: string;
  organizationName: string;
  inviterName?: string;
  token: string;
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner", admin: "Admin", analyst: "Analyst", viewer: "Viewer",
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  owner: "Full access including billing and team management",
  admin: "All features except billing. Can manage team members",
  analyst: "Upload, verify, reports, and intelligence access",
  viewer: "Read-only access to dashboard and reports",
};

const getInvitationEmailHTML = (data: InvitationRequest) => {
  const acceptUrl = `https://senseible.earth/accept-invite?token=${encodeURIComponent(data.token)}`;
  const expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });
  const orgName = escapeHtml(data.organizationName);
  const role = escapeHtml(ROLE_LABELS[data.role] || data.role);
  const roleDesc = escapeHtml(ROLE_DESCRIPTIONS[data.role] || "");
  const inviter = escapeHtml(data.inviterName || "A team member");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;"><h1 style="color: #22c55e; margin: 0;">🤝 You're Invited!</h1></div>
  <p>Hello,</p>
  <p><strong>${inviter}</strong> has invited you to join <strong>${orgName}</strong> on Senseible.</p>
  <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
    <p style="margin: 0 0 8px 0; color: #166534; font-size: 14px;">Your Role</p>
    <p style="margin: 0; font-size: 24px; font-weight: 700; color: #166534;">${role}</p>
    <p style="margin: 8px 0 0 0; color: #15803d; font-size: 13px;">${roleDesc}</p>
  </div>
  <div style="text-align: center; margin: 30px 0;">
    <a href="${acceptUrl}" style="display: inline-block; background: #22c55e; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">Accept Invitation</a>
  </div>
  <p style="background: #fef3c7; border-radius: 8px; padding: 12px; font-size: 13px; text-align: center;">
    ⏰ This invitation expires on <strong>${expiryDate}</strong>
  </p>
  <p style="margin-top: 24px; color: #6b7280; font-size: 13px;">If you didn't expect this invitation, you can safely ignore this email.</p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
  <p style="color: #9ca3af; font-size: 12px; text-align: center;">Senseible — Carbon Intelligence for MSMEs</p>
</body></html>`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // ============= AUTH =============
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsRes, error: authErr } = await userClient.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (authErr || !claimsRes?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    const callerId = claimsRes.claims.sub as string;

    const data: InvitationRequest = await req.json();
    if (!data.token || !data.email || !data.organizationName) {
      return new Response(JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // ============= VERIFY INVITATION OWNERSHIP =============
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: invitation, error: invErr } = await admin
      .from("team_invitations")
      .select("id, organization_id, email, role, invited_by")
      .eq("token", data.token)
      .maybeSingle();

    if (invErr || !invitation) {
      return new Response(JSON.stringify({ error: "Invitation not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    if (invitation.email !== data.email) {
      return new Response(JSON.stringify({ error: "Invitation/email mismatch" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Caller must be an admin/owner of the invitation's organization
    const { data: membership } = await admin
      .from("organization_members")
      .select("role")
      .eq("organization_id", invitation.organization_id)
      .eq("user_id", callerId)
      .maybeSingle();
    const { data: orgOwner } = await admin
      .from("organizations")
      .select("owner_id")
      .eq("id", invitation.organization_id)
      .maybeSingle();
    const isAuthorized =
      orgOwner?.owner_id === callerId ||
      (membership && ["owner", "admin"].includes(membership.role));
    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const emailHTML = getInvitationEmailHTML(data);

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Senseible <noreply@senseible.earth>",
        to: [String(data.email).slice(0, 320)],
        subject: `You're invited to join ${String(data.organizationName).slice(0, 100)} on Senseible`,
        html: emailHTML,
      }),
    });

    const emailResult = await emailResponse.json();
    if (!emailResponse.ok) {
      console.error("Resend API error");
      return new Response(JSON.stringify({ error: "Failed to send invitation" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    return new Response(JSON.stringify({ success: true, emailId: emailResult.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (error: any) {
    console.error("Team invitation error:", error?.message ?? "unknown");
    return new Response(JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});
