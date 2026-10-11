import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Base URL for the accept link. Optional SITE_URL secret (e.g. a staging origin);
// falls back to production so behaviour is unchanged when it is not set.
const DEFAULT_SITE_URL = "https://senseible.earth";
const SITE_URL = (() => {
  const raw = Deno.env.get("SITE_URL")?.trim();
  if (!raw) return DEFAULT_SITE_URL;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.hostname !== "localhost") return DEFAULT_SITE_URL;
    return url.origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
})();

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
  email: string;
  role: string;
  organizationId: string;
}

interface InvitationEmailData extends InvitationRequest {
  token: string;
  organizationName: string;
  inviterName?: string;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

// Map the business-rule exceptions raised by service_create_team_invitation
// to client errors so the caller sees the real reason instead of a 500.
const RPC_ERROR_STATUS: Array<[RegExp, number]> = [
  [/administrator access required/i, 403],
  [/member limit reached/i, 409],
  [/active invitation already exists/i, 409],
  [/already an organization member/i, 409],
  [/organization not found/i, 404],
  [/invalid team role|valid email required/i, 400],
];

const rpcErrorResponse = (err: { message?: string; code?: string } | null) => {
  const message = err?.message || "";
  for (const [pattern, status] of RPC_ERROR_STATUS) {
    if (pattern.test(message)) return json({ error: message }, status);
  }
  // Any other RAISE EXCEPTION from the function body (SQLSTATE P0001) is a rule violation.
  if (err?.code === "P0001" && message) return json({ error: message }, 400);
  return null;
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner", admin: "Admin", analyst: "Analyst", viewer: "Viewer",
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  owner: "Full access including billing and team management",
  admin: "All features except billing. Can manage team members",
  analyst: "Upload, verify, reports, and intelligence access",
  viewer: "Read-only access to dashboard and reports",
};

const getInvitationEmailHTML = (data: InvitationEmailData) => {
  const acceptUrl = `${SITE_URL}/accept-invite?token=${encodeURIComponent(data.token)}`;
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
  <p style="color: #9ca3af; font-size: 12px; text-align: center;">Senseible · Carbon Intelligence for MSMEs</p>
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

    let data: InvitationRequest;
    try {
      data = await req.json();
    } catch {
      return json({ error: "Invalid request body" }, 400);
    }
    if (!data.email || !data.organizationId || !data.role) {
      return new Response(JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // The RPC checks admin access first, so non-admins cannot probe which organizations exist.
    const token = crypto.randomUUID();
    const { data: invitation, error: invErr } = await admin.rpc("service_create_team_invitation", {
      p_actor_id: callerId,
      p_organization_id: data.organizationId,
      p_email: data.email,
      p_role: data.role,
      p_token: token,
    });
    if (invErr || !invitation) {
      const mapped = rpcErrorResponse(invErr);
      if (mapped) return mapped;
      throw new Error(invErr?.message || "Invitation creation failed");
    }

    const { data: organization } = await admin
      .from("organizations")
      .select("name")
      .eq("id", data.organizationId)
      .maybeSingle();
    const organizationName = String(organization?.name || "your organization");

    const emailData: InvitationEmailData = { ...data, token, organizationName, inviterName: String(claimsRes.claims.email || "").split("@")[0] };

    const emailHTML = getInvitationEmailHTML(emailData);

    // If the email cannot be sent, remove the invitation we just created so it
    // does not hold a seat or block a retry as a "duplicate invite".
    const discardInvitation = async () => {
      const { error: delErr } = await admin.from("team_invitations").delete().eq("id", invitation.id);
      if (delErr) console.error("Failed to remove unsent invitation:", delErr.message);
    };

    let emailResponse: Response;
    try {
      emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Senseible <noreply@senseible.earth>",
          to: [String(invitation.email).slice(0, 320)],
          subject: `You're invited to join ${organizationName.slice(0, 100)} on Senseible`,
          html: emailHTML,
        }),
      });
    } catch (sendErr) {
      console.error("Resend request failed:", sendErr instanceof Error ? sendErr.message : "unknown");
      await discardInvitation();
      return json({ error: "We could not send the invitation email. No invitation was created. Please try again." }, 502);
    }

    const emailResult = await emailResponse.json().catch(() => ({}));
    if (!emailResponse.ok) {
      console.error("Resend API error", emailResponse.status);
      await discardInvitation();
      return json({ error: "We could not send the invitation email. No invitation was created. Please try again." }, 502);
    }

    return new Response(JSON.stringify({ success: true, invitation, emailId: emailResult.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (error: any) {
    console.error("Team invitation error:", error?.message ?? "unknown");
    return new Response(JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});
