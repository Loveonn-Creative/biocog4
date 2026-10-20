import { trackEvent } from "@/lib/analytics";
import { revealContact } from "../../../../supabase/functions/_shared/publicContacts";

/** Senseible's published WhatsApp number (same as the Contact page), decoded only at runtime. */
export const WHATSAPP_NUMBER = revealContact("salesWhatsapp");

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export function whatsappUrl(page: string, summary?: string): string {
  const text = summary
    ? `Hi Senseible, I used the ${page} check on your site. ${clip(summary, 500)}`
    : `Hi Senseible, I have a question about ${page}.`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

/** Contact form, pre-filled with the topic and the tool result. */
export function scopingCallUrl(slug: string, topic: string, page: string, summary?: string): string {
  const msg = summary
    ? `Scoping call: ${page}. My check result: ${clip(summary, 500)}`
    : `Scoping call: ${page}.`;
  const q = new URLSearchParams({ topic, ref: slug, msg });
  return `/contact?${q.toString()}`;
}

/** Engagement events. Never pass personal data, company IDs or free text. */
export const serviceEvents = {
  toolStart: (page: string) => trackEvent("service_tool_start", { page }),
  toolComplete: (page: string) => trackEvent("service_tool_complete", { page }),
  cta: (page: string, lane: "msme" | "enterprise" | "self_serve", cta: string) =>
    trackEvent("service_cta_click", { page, lane, cta }),
};
