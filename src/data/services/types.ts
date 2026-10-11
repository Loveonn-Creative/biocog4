// Data model for the service lead pages. Pure data (no React) so the SEO
// build scripts can import it through routeRegistry.

export type PlanKey = 'snapshot' | 'essential' | 'pro' | 'scale';

export interface ServiceConfig {
  slug: string;
  /** Short name for the footer and breadcrumbs. */
  nav: string;
  seo: {
    /** 60 characters or fewer, unique site-wide. */
    title: string;
    /** 70 to 160 characters. */
    description: string;
    keywords: string[];
  };
  hero: {
    /** Outcome + audience, in the buyer's words. No stuffed keywords. */
    headline: string;
    /** Where the SEO terms live: one plain sentence. */
    sub: string;
    /** A specific, dated, sourced stake. Omit when there is no honest one. */
    stake?: { text: string; source: string };
  };
  /** The quotable opening answer (40 to 70 words) for search, voice and AI assistants. */
  answer: { q: string; a: string };
  tool: {
    /** One-line title of the free tool. */
    title: string;
    /** Button copy that states the result, e.g. "See my CBAM cost". */
    cta: string;
  };
  /** The deliverable a buyer receives, previewed partly blurred. */
  deliverable: {
    title: string;
    /** Rows shown in the preview (label, value). Values are illustrative and labelled as a sample. */
    rows: [string, string][];
  };
  /** Inline objection handling: price, time, data needed, who does the work. */
  objections: { price: string; time: string; data: string; who: string };
  /** Senseible plan that fits most MSME buyers of this service. */
  plan: PlanKey;
  /** Existing product surfaces that do part of this job today. Only real routes. */
  product: { label: string; to: string }[];
  faqs: { q: string; a: string }[];
  /** Contact form topic id (Contact categories). */
  contactTopic: 'sales' | 'climate' | 'monetization' | 'enterprise' | 'technical' | 'general';
}

/** What a tool hands back to the page once it has an answer. */
export interface ToolResult {
  /** The answer in one line, shown big. */
  headline: string;
  /** Plain-text summary passed to WhatsApp and the contact form. No personal data. */
  summary: string;
  /** Free-form numbers the page visual can draw. */
  data?: Record<string, unknown>;
}
