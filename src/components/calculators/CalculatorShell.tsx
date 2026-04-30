import { ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import { MinimalNav } from "@/components/MinimalNav";
import { Footer } from "@/components/Footer";
import { Link } from "react-router-dom";
import { ArrowLeft, Calculator } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface RelatedLink { href: string; label: string; }
export interface FAQ { q: string; a: string; }

interface Props {
  slug: string;
  title: string;            // <60 chars
  description: string;      // <155 chars
  keywords: string;
  h1: string;
  intro: string;
  howToSteps: string[];     // 5–7
  faqs: FAQ[];              // 3–5
  factorSources: string[];
  related: RelatedLink[];
  children: ReactNode;
}

export const CalculatorShell = ({
  slug, title, description, keywords, h1, intro,
  howToSteps, faqs, factorSources, related, children,
}: Props) => {
  const url = `https://senseible.earth/calculators/${slug}`;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": h1,
      "description": description,
      "url": url,
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "EUR" },
      "provider": { "@type": "Organization", "name": "Senseible", "url": "https://senseible.earth" },
    },
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": h1,
      "step": howToSteps.map((text, i) => ({
        "@type": "HowToStep",
        "position": i + 1,
        "name": `Step ${i + 1}`,
        "text": text,
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqs.map(f => ({
        "@type": "Question",
        "name": f.q,
        "acceptedAnswer": { "@type": "Answer", "text": f.a },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://senseible.earth/" },
        { "@type": "ListItem", "position": 2, "name": "Calculators", "item": "https://senseible.earth/calculators" },
        { "@type": "ListItem", "position": 3, "name": h1, "item": url },
      ],
    },
  ];

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="keywords" content={keywords} />
        <link rel="canonical" href={url} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={url} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <MinimalNav />

      <main className="min-h-screen bg-background pt-20 pb-12">
        <div className="container max-w-5xl mx-auto px-4 sm:px-6">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
            <Link to="/calculators" className="inline-flex items-center hover:text-foreground transition-colors">
              <ArrowLeft className="w-3 h-3 mr-1" /> All calculators
            </Link>
          </nav>

          {/* Hero */}
          <header className="mb-8 text-center">
            <Badge variant="outline" className="mb-3 border-primary/30 text-primary">
              <Calculator className="w-3 h-3 mr-1" /> Free tool
            </Badge>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3 font-display">{h1}</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">{intro}</p>
          </header>

          {/* Calculator body */}
          {children}

          {/* How it works */}
          <section className="mt-12 max-w-3xl mx-auto">
            <h2 className="text-xl font-semibold text-foreground mb-4">How it works</h2>
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
              {howToSteps.map((s, i) => <li key={i}>{s}</li>)}
            </ol>
          </section>

          {/* FAQ */}
          <section className="mt-12 max-w-3xl mx-auto">
            <h2 className="text-xl font-semibold text-foreground mb-4">Frequently asked questions</h2>
            <div className="space-y-4">
              {faqs.map((f, i) => (
                <div key={i} className="border-l-2 border-primary/30 pl-4">
                  <h3 className="font-medium text-foreground text-sm">{f.q}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{f.a}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Sources */}
          <section className="mt-10 max-w-3xl mx-auto text-xs text-muted-foreground">
            <p><strong className="text-foreground">Sources:</strong> {factorSources.join(' · ')}</p>
          </section>

          {/* Related */}
          {related.length > 0 && (
            <section className="mt-12 max-w-3xl mx-auto">
              <h2 className="text-xl font-semibold text-foreground mb-4">Related calculators</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {related.map(r => (
                  <Link
                    key={r.href}
                    to={r.href}
                    className="block p-4 border border-border rounded-lg hover:bg-secondary transition-colors text-sm"
                  >
                    {r.label}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
};
