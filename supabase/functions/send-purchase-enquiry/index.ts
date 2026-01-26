import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PurchaseEnquiry {
  listing: {
    id: string;
    sector: string;
    region: string;
    pricePerTonne: number;
    creditsAvailable: number;
    methodology: string;
    vintage: string;
    verificationScore: number;
    currency: string;
  };
  buyer: {
    name: string;
    email: string;
    company?: string;
    phone?: string;
  };
  requestedQuantity: number;
  message?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { listing, buyer, requestedQuantity, message }: PurchaseEnquiry = await req.json();

    // Validate required fields
    if (!listing?.id || !buyer?.email || !requestedQuantity) {
      throw new Error("Missing required fields: listing, buyer email, or quantity");
    }

    const totalValue = requestedQuantity * (listing.pricePerTonne || 0);
    const formattedTotal = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: listing.currency || 'INR',
      maximumFractionDigits: 0
    }).format(totalValue);

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 24px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🌱 New Carbon Credit Purchase Enquiry</h1>
        </div>
        
        <div style="padding: 24px; background: #f9fafb; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
          <h2 style="color: #111827; font-size: 18px; margin-bottom: 16px;">Buyer Information</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; width: 120px;">Name:</td>
              <td style="padding: 8px 0; color: #111827; font-weight: 500;">${buyer.name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Email:</td>
              <td style="padding: 8px 0; color: #111827;"><a href="mailto:${buyer.email}" style="color: #22c55e;">${buyer.email}</a></td>
            </tr>
            ${buyer.company ? `
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Company:</td>
              <td style="padding: 8px 0; color: #111827;">${buyer.company}</td>
            </tr>
            ` : ''}
            ${buyer.phone ? `
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Phone:</td>
              <td style="padding: 8px 0; color: #111827;">${buyer.phone}</td>
            </tr>
            ` : ''}
          </table>
        </div>

        <div style="padding: 24px; background: white; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
          <h2 style="color: #111827; font-size: 18px; margin-bottom: 16px;">Listing Details</h2>
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; color: #6b7280; width: 140px;">Listing ID:</td>
                <td style="padding: 6px 0; color: #111827; font-family: monospace;">${listing.id.slice(0, 8)}...</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6b7280;">Sector:</td>
                <td style="padding: 6px 0; color: #111827; font-weight: 500;">${listing.sector || 'General'}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6b7280;">Region:</td>
                <td style="padding: 6px 0; color: #111827;">${listing.region || 'India'}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6b7280;">Methodology:</td>
                <td style="padding: 6px 0; color: #111827;">${listing.methodology || 'IPCC'}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6b7280;">Vintage:</td>
                <td style="padding: 6px 0; color: #111827;">${listing.vintage || 'Current'}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6b7280;">Verification Score:</td>
                <td style="padding: 6px 0; color: #22c55e; font-weight: 600;">${listing.verificationScore || 0}%</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6b7280;">Price per tCO₂e:</td>
                <td style="padding: 6px 0; color: #111827;">${listing.currency || 'INR'} ${(listing.pricePerTonne || 0).toLocaleString()}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6b7280;">Available:</td>
                <td style="padding: 6px 0; color: #111827;">${(listing.creditsAvailable || 0).toLocaleString()} tCO₂e</td>
              </tr>
            </table>
          </div>
        </div>

        <div style="padding: 24px; background: #fef3c7; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
          <h2 style="color: #92400e; font-size: 18px; margin-bottom: 12px;">📊 Purchase Request</h2>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <p style="margin: 0; color: #78716c; font-size: 14px;">Requested Quantity</p>
              <p style="margin: 4px 0 0; color: #111827; font-size: 24px; font-weight: 700;">${requestedQuantity.toLocaleString()} tCO₂e</p>
            </div>
            <div style="text-align: right;">
              <p style="margin: 0; color: #78716c; font-size: 14px;">Estimated Value</p>
              <p style="margin: 4px 0 0; color: #22c55e; font-size: 24px; font-weight: 700;">${formattedTotal}</p>
            </div>
          </div>
        </div>

        ${message ? `
        <div style="padding: 24px; background: white; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
          <h2 style="color: #111827; font-size: 18px; margin-bottom: 12px;">💬 Additional Message</h2>
          <p style="color: #374151; background: #f3f4f6; padding: 12px; border-radius: 8px; margin: 0;">${message}</p>
        </div>
        ` : ''}

        <div style="padding: 24px; background: #111827; border-radius: 0 0 12px 12px;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0; text-align: center;">
            This enquiry was submitted via the Senseible Carbon Marketplace.<br/>
            Please respond to the buyer within 24 hours.
          </p>
        </div>
      </div>
    `;

    const emailResponse = await resend.emails.send({
      from: "Senseible Marketplace <noreply@senseible.earth>",
      to: ["impact@senseible.earth"],
      replyTo: buyer.email,
      subject: `🌱 Carbon Credit Enquiry: ${requestedQuantity} tCO₂e from ${buyer.name}`,
      html: emailHtml,
    });

    console.log("Purchase enquiry email sent:", emailResponse);

    return new Response(JSON.stringify({ success: true, id: emailResponse.id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-purchase-enquiry:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
