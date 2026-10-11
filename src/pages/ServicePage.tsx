import { lazy, Suspense, useCallback, useMemo, useRef, useState, type ComponentType } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, MessageCircle, CalendarClock } from "lucide-react";
import { MinimalNav } from "@/components/MinimalNav";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { serviceBySlug, servicePages } from "@/data/services";
import type { ServiceConfig, ToolResult } from "@/data/services/types";
import { serviceModules } from "@/components/services/registry";
import type { ServiceToolProps, ServiceVisualProps } from "@/components/services/types";
import { CompanyProvider } from "@/components/services/shell/CompanyContext";
import { ResultPanel } from "@/components/services/shell/ResultPanel";
import { AnswerBlock, DeliverablePreview, Lanes, Objections, ProductAndFaq } from "@/components/services/shell/Sections";
import { serviceEvents, whatsappUrl } from "@/components/services/shell/actions";

const moduleCache = new Map<string, { Tool: ComponentType<ServiceToolProps>; Visual: ComponentType<ServiceVisualProps> }>();
function pageParts(slug: string) {
  let parts = moduleCache.get(slug);
  if (!parts) {
    const load = serviceModules[slug];
    parts = {
      Tool: lazy(() => load().then(m => ({ default: m.Tool }))),
      Visual: lazy(() => load().then(m => ({ default: m.Visual }))),
    };
    moduleCache.set(slug, parts);
  }
  return parts;
}

const ToolSkeleton = () => <div className="h-64 rounded-2xl bg-secondary/50 animate-pulse" aria-hidden="true" />;

const ServiceBody = ({ config }: { config: ServiceConfig }) => {
  const { Tool, Visual } = pageParts(config.slug);
  const [data, setData] = useState<Record<string, unknown>>({});
  const [result, setResult] = useState<ToolResult | null>(null);
  const started = useRef(false);
  const toolRef = useRef<HTMLDivElement>(null);

  const onStart = useCallback(() => {
    if (started.current) return;
    started.current = true;
    serviceEvents.toolStart(config.slug);
  }, [config.slug]);
  const onResult = useCallback((r: ToolResult | null) => {
    setResult(prev => {
      if (r && !prev) serviceEvents.toolComplete(config.slug);
      return r;
    });
  }, [config.slug]);

  const related = useMemo(() => {
    const i = servicePages.findIndex(s => s.slug === config.slug);
    return [1, 2, 3].map(k => servicePages[(i + k) % servicePages.length]);
  }, [config.slug]);

  return (
    <>
      {/* Hero: the product is the hero. Answer first, form never. */}
      <section className="container max-w-6xl mx-auto px-5 pt-20 md:pt-28 pb-10 md:pb-16">
        <div className="grid gap-8 lg:gap-14 lg:grid-cols-[1fr_1fr] lg:items-start">
          <div>
            <Link to="/platform" className="inline-block text-xs uppercase tracking-[0.14em] text-primary mb-4">{config.nav}</Link>
            <h1 className="text-[2rem] leading-[1.08] sm:text-[2.6rem] lg:text-[3.1rem] font-semibold tracking-tight text-foreground [text-wrap:balance]">
              {config.hero.headline}
            </h1>
            <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-[38rem]">{config.hero.sub}</p>
            {config.hero.stake && (
              <p className="mt-4 inline-flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-foreground">
                <CalendarClock className="h-4 w-4 mt-0.5 shrink-0 text-warning" aria-hidden="true" />
                <span>{config.hero.stake.text} <span className="text-muted-foreground">({config.hero.stake.source})</span></span>
              </p>
            )}

            <div ref={toolRef} id="tool" className="mt-7 scroll-mt-24 rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-[0_30px_60px_-45px_hsl(var(--foreground)/.4)]">
              <h2 className="text-base font-semibold mb-4">{config.tool.title}</h2>
              <Suspense fallback={<ToolSkeleton />}>
                <Tool onStart={onStart} onChange={setData} onResult={onResult} />
              </Suspense>
              {result && <ResultPanel config={config} result={result} />}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">No sign-up. Your answers stay in this browser.</p>
          </div>

          <div className="lg:sticky lg:top-24">
            <Suspense fallback={<div className="aspect-[4/3] rounded-3xl bg-secondary/40" aria-hidden="true" />}>
              <Visual data={data} result={result} />
            </Suspense>
          </div>
        </div>
      </section>

      <AnswerBlock config={config} />
      <DeliverablePreview config={config} />
      <Lanes config={config} />
      <Objections config={config} />
      <ProductAndFaq config={config} />

      <section className="border-t border-border">
        <div className="container max-w-5xl mx-auto px-5 py-12">
          <h2 className="text-sm uppercase tracking-[0.14em] text-muted-foreground mb-4">Related services</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {related.map(r => (
              <Link key={r.slug} to={`/${r.slug}`} className="group rounded-2xl border border-border p-4 hover:border-primary/50">
                <div className="text-sm font-medium mb-1 group-hover:text-primary">{r.nav}</div>
                <div className="text-xs text-muted-foreground line-clamp-2">{r.tool.title}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Mobile: one sticky action. Before an answer, get one; after, send it. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
        {result ? (
          <a href={whatsappUrl(config.nav, result.summary)} target="_blank" rel="noopener noreferrer"
            onClick={() => serviceEvents.cta(config.slug, "msme", "whatsapp_sticky")}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground">
            <MessageCircle className="h-4 w-4" aria-hidden="true" /> Send my result on WhatsApp
          </a>
        ) : (
          <button type="button" onClick={() => toolRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground">
            {config.tool.cta} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
      <div className="h-20 md:hidden" aria-hidden="true" />
    </>
  );
};

const ServicePage = ({ slug }: { slug: string }) => {
  const config = serviceBySlug.get(slug);
  if (!config) return null;
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead
        title={config.seo.title}
        description={config.seo.description}
        canonical={`/${config.slug}`}
        keywords={config.seo.keywords}
        breadcrumbs={[{ name: "Home", url: "/" }, { name: config.nav, url: `/${config.slug}` }]}
        faqSchema={[{ question: config.answer.q, answer: config.answer.a }, ...config.faqs.map(f => ({ question: f.q, answer: f.a }))]}
      />
      <MinimalNav />
      <main className="flex-1">
        <CompanyProvider>
          <ServiceBody config={config} />
        </CompanyProvider>
      </main>
      <Footer />
    </div>
  );
};

export default ServicePage;
