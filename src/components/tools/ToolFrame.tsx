import type { ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { MinimalNav } from "@/components/MinimalNav";
import { Footer } from "@/components/Footer";
import { ORG_REF } from "@/lib/seo/entity";
import { pageMeta } from "@/lib/seo/seoMeta";

export interface ToolFaq { q: string; a: string }

/**
 * Page frame for the one-job tools: head tags and structured data from the
 * shared SEO registry, the site nav and footer. Each tool designs its own hero
 * and body; the frame adds nothing visual beyond the back link.
 */
export function ToolFrame({ path, name, faqs, children }: { path: string; name: string; faqs: ToolFaq[]; children: ReactNode }) {
  const meta = pageMeta(path);
  const url = `https://senseible.earth${path}`;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name,
      description: meta?.description,
      url,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
      provider: ORG_REF,
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://senseible.earth/" },
        { "@type": "ListItem", position: 2, name: "Calculators", item: "https://senseible.earth/calculators" },
        { "@type": "ListItem", position: 3, name, item: url },
      ],
    },
  ];
  return (
    <>
      <Helmet>
        {meta && <title>{meta.title}</title>}
        {meta && <meta name="description" content={meta.description} />}
        <link rel="canonical" href={url} />
        {meta && <meta property="og:title" content={meta.title} />}
        {meta && <meta property="og:description" content={meta.description} />}
        <meta property="og:url" content={url} />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>
      <MinimalNav />
      <main className="min-h-screen overflow-x-clip bg-background pb-16 pt-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <Link to="/calculators" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> All calculators
          </Link>
          {children}
        </div>
      </main>
      <Footer />
    </>
  );
}

/** The one next step every tool ends on: the real bill, read and kept as a record. */
export function ToolNextStep({ line, cta }: { line: string; cta: string }) {
  return (
    <section className="mt-14 rounded-3xl bg-primary px-6 py-8 text-primary-foreground sm:px-10">
      <p className="max-w-2xl text-lg font-semibold leading-snug sm:text-xl">{line}</p>
      <Link to="/" className="mt-5 inline-flex h-11 items-center rounded-full bg-background px-6 text-sm font-bold text-foreground hover:opacity-90">
        {cta}
      </Link>
    </section>
  );
}

export function ToolFaqs({ faqs }: { faqs: ToolFaq[] }) {
  return (
    <section className="mt-14">
      <h2 className="font-display text-2xl font-bold text-foreground">Questions people ask</h2>
      <div className="mt-4 divide-y divide-border border-y border-border">
        {faqs.map((f) => (
          <details key={f.q} className="group py-4">
            <summary className="cursor-pointer list-none font-semibold text-foreground marker:hidden">
              <span className="mr-2 inline-block text-primary transition-transform group-open:rotate-45 motion-reduce:transition-none">+</span>{f.q}
            </summary>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
