import { Link } from "react-router-dom";
import { lazy, Suspense } from "react";
import { ArrowRight } from "lucide-react";
import { MinimalNav } from "@/components/MinimalNav";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { PlatformMarquee } from "@/components/PlatformMarquee";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { COUNTRY_CONFIGS, gridFactorUnit } from "@/lib/countryConfig";
import platformOg from "@/assets/og/platform.jpg";
import { Reveal, SectionHead } from "@/components/platform/Reveal";
import { WhySwitcher } from "@/components/platform/WhySwitcher";
import { AudienceHub } from "@/components/platform/AudienceHub";
import { PrivacyVault } from "@/components/platform/PrivacyVault";
import { CreditToken, DecarbPath, FinanceDial, ReportSheets } from "@/components/doodles/Doodles";

const OUTCOME_ART: Record<string, () => JSX.Element> = { report: ReportSheets, finance: FinanceDial, decarbonize: DecarbPath, monetize: CreditToken };

const ProductPipeline = lazy(() => import("@/components/product/ProductPipeline"));
const EvidenceSeal = lazy(() => import("@/components/trust/EvidenceSeal"));

const audiences = [
  { key: "msme", label: "MSMEs & exporters", line: "Turn invoices into a verified emission record, no consultant required." },
  { key: "enterprise", label: "Enterprises", line: "Get Scope 3 supplier data that holds up under CBAM, ISSB and CSRD." },
  { key: "lender", label: "Banks & lenders", line: "Underwrite against hash-pinned figures, not borrower self-declarations." },
  { key: "policy", label: "Policy & regulators", line: "See emissions data with the exact method behind it, so you can check it yourself." },
  { key: "buyer", label: "Carbon credit buyers", line: "Source MSME-origin credits that clear additionality and evidence linkage." },
  { key: "partner", label: "Ecosystem partners", line: "Plug verified MSME climate data into your own product surface." },
];

const outcomes = [
  { key: "report", title: "Report", body: "One verified ledger serves CBAM, BRSR, GHG Protocol, ISSB, CSRD, TCFD, GRI and SBTi without re-keying.", to: "/trust", cta: "How verification works" },
  { key: "finance", title: "Finance", body: "Verified baselines and a Climate Credibility Score become underwriting inputs for green loans and factoring.", to: "/climate-finance", cta: "Climate finance flow" },
  { key: "decarbonize", title: "Decarbonize", body: "A baseline becomes a sector-aware roadmap. Reductions are tracked against the original methodology, not re-baselined.", to: "/net-zero", cta: "Net-Zero engine" },
  { key: "monetize", title: "Monetize", body: "Records that clear additionality, evidence linkage and methodology lock can become credit-ready signals for buyers.", to: "/carbon-credits", cta: "Carbon credits" },
];

const steps = [
  { n: "01", key: "capture", tone: "accent", title: "Capture", body: "Drop a document, take a photo, or speak the data point. The first response arrives in under two seconds." },
  { n: "02", key: "verify", tone: "verified", title: "Verify", body: "Every file gets a fingerprint, each line is sorted into Scope 1, 2 or 3 by fixed rules, and power is checked against your country's grid factor." },
  { n: "03", key: "use", tone: "primary", title: "Use", body: "The verified record feeds your disclosure, your lender, your reduction roadmap, and, when eligible, your credits." },
];

const proofMetrics = [
  { value: "29", label: "clusters", body: "Industrial clusters where we have run pilots." },
  { value: "11", label: "countries piloted", body: "Pilot reach across emerging markets." },
  { value: "92%", label: "benchmarking accuracy", body: "Accuracy against benchmark figures in pilots." },
];

const proofPaths = [
  {
    key: "textile",
    title: "Textile",
    source: "Utility bills, fuel, fibre and freight records.",
    decision: "Build product-level evidence for buyers and export screening.",
    to: "/industries/textile",
  },
  {
    key: "steel",
    title: "Steel",
    source: "Fuel, power, dispatch tonnage, ore and scrap records.",
    decision: "Compare evidenced intensity with the applicable CBAM default.",
    to: "/industries/steel",
  },
  {
    key: "logistics",
    title: "Logistics",
    source: "Fuel invoices, consignment notes and carrier records.",
    decision: "Give shippers a usable Category 4 view by lane or consignment.",
    to: "/industries/logistics",
  },
];

const pricingSummary = [
  { key: "snapshot", name: "Snapshot", price: "Free", detail: "AI emission snapshot, basic ESG score, 10 invoice scans per month, and 90-day data backup.", fit: "Start with the verification surface.", to: "/pricing" },
  { key: "essential", name: "Essential", price: "₹499 / month yearly", detail: "₹1,999 monthly. Adds GST → Carbon Automation, a verified climate score, and 3 team members.", fit: "For a business building a repeatable record.", to: "/pricing" },
  { key: "pro", name: "Pro", price: "₹4,999 / month yearly", detail: "₹9,999 monthly. Adds monetization setup, automated ESG reports, the verification ledger, and 10 team members.", fit: "For teams turning verified data into action.", to: "/pricing" },
  { key: "scale", name: "Scale", price: "Custom pricing", detail: "Custom pricing for your team, entities, and integrations. Contact us for a quote.", fit: "For larger teams, entities, and integrations.", to: "/pricing" },
];

const Platform = () => {
  const { t } = useTranslation();
  const countries = Object.values(COUNTRY_CONFIGS);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead
        title="Senseible | The Platform"
        description="What Senseible does, who it's for, and how it turns ordinary business documents into climate evidence built to hold up with auditors, lenders, regulators and carbon buyers."
        canonical="/platform"
        image={`https://senseible.earth${platformOg}`}
        keywords={["climate platform", "carbon MRV platform", "verified emissions", "MSME climate", "Senseible platform"]}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Platform", url: "/platform" },
        ]}
      />
      <MinimalNav />

      <main className="flex-1">
        {/* Hero: the words on one side, the product doing them on the other */}
        <section className="container max-w-6xl mx-auto px-6 pt-24 md:pt-28 pb-14 md:pb-20">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:items-center">
            <div className="text-center lg:text-left">
              <Badge variant="secondary" className="mb-6 text-xs">{t("platform.eyebrow", "The Platform")}</Badge>
              <h1 className="text-[2.25rem] leading-[1.08] md:text-[3.5rem] font-semibold tracking-tight text-foreground mb-6 [text-wrap:balance]">
                {t("platform.hero.title", "Climate evidence, in the time it takes to read this line.")}
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-[34rem] mx-auto lg:mx-0 leading-relaxed">
                {t("platform.hero.sub", "Senseible turns your invoices, bills and fuel slips into a verified emission record that a lender can underwrite, a regulator can audit and a buyer can rely on.")}
              </p>
              <div className="mt-8 flex justify-center lg:justify-start">
                <Button asChild size="lg" className="group rounded-full px-6">
                  <Link to="/">
                    {t("platform.hero.cta", "Upload a bill")}
                    <ArrowRight className="ml-1.5 h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </div>
            <div className="min-h-[280px] sm:min-h-[360px]">
              <Suspense fallback={<div className="h-[280px] sm:h-[360px]" aria-hidden="true" />}>
                <ProductPipeline tone="page" />
              </Suspense>
            </div>
          </div>
        </section>

        {/* Marquee strip */}
        <PlatformMarquee />

        {/* 1. Why: three questions, one answer open at a time, each with its drawing. */}
        <section className="overflow-x-clip py-20 md:py-28">
          <div className="container max-w-5xl mx-auto px-6">
            <WhySwitcher items={[
              {
                key: "positioning",
                eyebrow: t("platform.positioning.eyebrow", "Built into Senseible"),
                title: t("platform.positioning.title", "Scope 3 supplier data, collected and checked for you."),
                body: <>
                  <p>{t("platform.positioning.body", "For an enterprise, that means seeing which suppliers have usable evidence, where the gaps are, and what is ready for Scope 3 reporting.")}</p>
                  <p className="mt-4 border-l-2 border-primary/30 pl-4 text-[15px]">{t("platform.positioning.note", "Start with the document. Keep the evidence attached as the record moves into reporting, supplier decisions, or finance.")}</p>
                </>,
              },
              {
                key: "what",
                eyebrow: t("platform.what.eyebrow", "What is Senseible?"),
                title: t("platform.what.title", "A verification layer for climate data."),
                body: <p>{t("platform.what.body", "Most climate numbers are self-reported. Senseible ties each one to its document fingerprint, the method used and a confidence range, so your lender or buyer can check it themselves. It works on the documents you already have, in your language and your country.")}</p>,
              },
              {
                key: "problem",
                eyebrow: t("platform.problem.eyebrow", "What problem does it solve?"),
                title: t("platform.problem.title", "The verification gap in emerging-market climate data. Buyers, lenders and regulators want proof small suppliers rarely have."),
                body: <>
                  <p>{t("platform.problem.p1", "Emerging-market supply chains carry most of the world's industrial emissions, and almost none of the verified data. Regulators ask for primary numbers. Buyers ask for primary numbers. Lenders ask for primary numbers. Without them, the default values apply, and the cost lands on the smallest producer.")}</p>
                  <p className="mt-4">{t("platform.problem.p2", "Senseible makes that proof cheap and quick to produce, in your language and with your country's tax ID.")}</p>
                </>,
              },
            ]} />
          </div>
        </section>

        {/* 2. Who: one record in the middle, six readers around it. */}
        <section className="py-20 md:py-28 bg-secondary/30">
          <div className="container max-w-5xl mx-auto px-6">
            <SectionHead className="mb-10" eyebrow={t("platform.who.eyebrow", "Who is it for?")} title={t("platform.who.title", "Six audiences. One verified record.")} />
            <AudienceHub centre={t("platform.who.centre", "One verified record")} audiences={audiences.map(a => ({ key: a.key, label: t(`platform.who.${a.key}.label`, a.label), line: t(`platform.who.${a.key}.line`, a.line) }))} />
          </div>
        </section>

        {/* 3. How, then what it is for: the record's journey, left to right. */}
        <section className="py-20 md:py-28">
          <div className="container max-w-5xl mx-auto px-6">
            <SectionHead className="mb-10" eyebrow={t("platform.how.eyebrow", "How it works")} title={t("platform.how.title", "Three steps. Same record, used three ways.")} />
            {/* Colour follows the record: data (blue), checked (green), in use (brand). */}
            <ol className="grid gap-8 md:grid-cols-3 md:gap-10">
              {steps.map((s, i) => (
                <li key={s.n}>
                  <Reveal delay={i * 120}>
                    <div className="h-0.5 w-full rounded-full" style={{ background: `hsl(var(--${s.tone}))` }} aria-hidden="true" />
                    <div className="mt-4 flex items-baseline gap-3">
                      <span className="font-mono text-xs text-muted-foreground">{s.n}</span>
                      <span className="text-lg font-medium text-foreground">{t(`platform.how.${s.key}.title`, s.title)}</span>
                    </div>
                    <p className="mt-2 text-[15px] text-muted-foreground leading-relaxed">{t(`platform.how.${s.key}.body`, s.body)}</p>
                  </Reveal>
                </li>
              ))}
            </ol>
            <Link to="/trust" className="group mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
              {t("platform.how.cta", "See how verification works")} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>

            <div className="mt-20 md:mt-24">
              <SectionHead className="mb-10" eyebrow={t("platform.out.eyebrow", "What you can do with verified data")} title={t("platform.out.title", "Four outcomes, one ledger.")} />
              <div className="grid gap-4 sm:grid-cols-2">
                {outcomes.map((o, i) => {
                  const Art = OUTCOME_ART[o.key];
                  return (
                    <Reveal key={o.key} delay={i * 70}>
                      <Link to={o.to} className="group flex h-full flex-col rounded-3xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_24px_50px_-34px_hsl(var(--foreground)/.4)]">
                        <div className="flex items-start justify-between gap-4">
                          <div className="text-lg font-medium text-foreground">{t(`platform.out.${o.key}.title`, o.title)}</div>
                          <div className="-mt-1 shrink-0 text-foreground/60">{Art && <Art />}</div>
                        </div>
                        <p className="mt-2 text-[15px] text-muted-foreground leading-relaxed">{t(`platform.out.${o.key}.body`, o.body)}</p>
                        <span className="mt-auto pt-4 inline-flex items-center gap-1 text-sm text-primary">
                          {t(`platform.out.${o.key}.cta`, o.cta)} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                        </span>
                      </Link>
                    </Reveal>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* 4. Proof: what has been shown, and what every figure carries. */}
        <section className="py-20 md:py-28 bg-secondary/30">
          <div className="container max-w-5xl mx-auto px-6">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
              <div>
                <SectionHead className="mb-6" eyebrow={t("platform.proof.eyebrow", "What we have proven")} title={t("platform.proof.title", "What the pilots showed")} />
                <p className="text-muted-foreground leading-relaxed">{t("platform.proof.body", "Senseible has been piloted across 29 clusters and 11 countries, with 92% benchmarking accuracy.")}</p>
              </div>
              <dl className="grid grid-cols-3 divide-x divide-border border-y border-border" aria-label={t("platform.proof.metrics.label", "Platform proof metrics")}>
                {proofMetrics.map(metric => (
                  <div key={metric.label} className="px-3 py-5 first:pl-0 md:px-5">
                    <dt className="sr-only">{t(`platform.proof.metrics.${metric.label}`, metric.label)}</dt>
                    <dd>
                      <div className="font-mono text-4xl md:text-5xl leading-none text-primary">{metric.value}</div>
                      <div className="mt-3 text-sm font-medium">{t(`platform.proof.metrics.${metric.label}`, metric.label)}</div>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{metric.body}</p>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
            <p className="mt-6 text-xs text-muted-foreground">{t("platform.proof.disclaimer", "These are platform pilot and benchmarking figures, not promises about a customer’s future result.")}</p>

            <div className="mt-16 grid gap-6 border-t border-border pt-10 md:grid-cols-[0.9fr_1.1fr] md:items-start">
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">{t("platform.trust.title", "Trust, in one line.")}</h2>
              <div>
                <p className="text-muted-foreground leading-relaxed">{t("platform.trust.body", "Every figure carries its SHA-256 evidence hash, its methodology version, its confidence band, and a Climate Credibility Score from A+ to D.")}</p>
                <p className="mt-4 text-[13px] text-muted-foreground">{["GHG Protocol", "CBAM", "BRSR", "CSRD", "ISSB", "TCFD", "GRI", "SBTi", "ISO 14064"].join(" · ")}</p>
                <Link to="/trust" className="group mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                  {t("platform.trust.cta", "See the trust architecture")} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </Link>
              </div>
            </div>

            <div className="mt-16 border-t border-border pt-12">
              <Suspense fallback={<div className="h-[340px]" aria-hidden="true" />}>
                <EvidenceSeal title={t("platform.seal.title", "Every claim, with its source.")} />
              </Suspense>
            </div>
          </div>
        </section>

        {/* Privacy by design: what stays in the account, what may leave. */}
        <section className="py-20 md:py-28 border-b border-border">
          <div className="container max-w-4xl mx-auto px-6">
            <PrivacyVault />
          </div>
        </section>

        {/* 5. Where it applies: sectors first, then countries on demand. */}
        <section className="py-20 md:py-28">
          <div className="container max-w-5xl mx-auto px-6">
            <div className="text-xs uppercase tracking-[0.14em] text-primary mb-3">{t("platform.proof.paths.eyebrow", "Where it becomes useful")}</div>
            <h2 className="max-w-3xl text-[1.75rem] leading-[1.15] md:text-[2.5rem] font-semibold tracking-tight [text-wrap:balance]">{t("platform.proof.paths.title", "The same evidence solves a different problem in every sector.")}</h2>

            <div className="mt-8 border-t border-border">
              <div className="hidden md:grid grid-cols-[9rem_1fr_1fr_auto] gap-6 py-3 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                <span />
                <span>{t("platform.proof.paths.source", "Evidence")}</span>
                <span>{t("platform.proof.paths.decision", "Decision")}</span>
                <span />
              </div>
              {proofPaths.map(path => (
                <Link key={path.key} to={path.to} className="group grid gap-2 border-b border-border py-5 md:grid-cols-[9rem_1fr_1fr_auto] md:gap-6 md:items-baseline">
                  <span className="font-medium text-foreground group-hover:text-primary transition-colors">{t(`platform.proof.paths.${path.key}.title`, path.title)}</span>
                  <span className="text-sm text-muted-foreground leading-relaxed"><span className="md:hidden text-[11px] uppercase tracking-wider">{t("platform.proof.paths.source", "Evidence")}: </span>{t(`platform.proof.paths.${path.key}.source`, path.source)}</span>
                  <span className="text-sm text-foreground leading-relaxed"><span className="md:hidden text-[11px] uppercase tracking-wider text-muted-foreground">{t("platform.proof.paths.decision", "Decision")}: </span>{t(`platform.proof.paths.${path.key}.decision`, path.decision)}</span>
                  <span className="inline-flex items-center gap-1 text-sm text-primary">
                    {t("platform.proof.paths.cta", "Explore this use case")} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </div>

            <div className="mt-14 grid gap-10 md:grid-cols-2">
              <div>
                <div className="text-xs uppercase tracking-[0.14em] text-primary mb-3">{t("platform.industries.eyebrow", "Industries")}</div>
                <h3 className="text-xl font-semibold tracking-tight">{t("platform.industries.title", "Pick your sector.")}</h3>
                <div className="mt-5 flex flex-wrap gap-2">
                  {["textile", "steel", "chemical", "logistics", "automobile", "construction"].map(s => (
                    <Link key={s} to={`/industries/${s}`} className="px-3.5 py-1.5 rounded-full border border-border text-sm text-foreground/80 hover:border-primary/40 hover:text-primary transition-colors capitalize">
                      {t(`platform.industries.${s}`, s)}
                    </Link>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.14em] text-primary mb-3">{t("platform.where.eyebrow", "Where it works")}</div>
                <h3 className="text-xl font-semibold tracking-tight">{t("platform.where.title", "19 configured countries, each with its own identifier and grid factor.")}</h3>
                <p className="mt-5 text-sm text-muted-foreground leading-relaxed">{countries.map(c => c.name).join(" · ")}</p>
                <details className="group mt-4">
                  <summary className="cursor-pointer list-none text-sm font-medium text-primary">
                    <span className="group-open:hidden">{t("platform.where.show", "Show identifiers and grid factors")}</span>
                    <span className="hidden group-open:inline">{t("platform.where.hide", "Hide identifiers and grid factors")}</span>
                  </summary>
                  <ul className="mt-4 grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                    {countries.map(c => (
                      <li key={c.code} className="flex justify-between gap-3 border-b border-border py-2 text-[13px]">
                        <span className="text-foreground">{c.name}</span>
                        <span className="font-mono text-muted-foreground">{c.taxIdLabel} · {c.gridFactor} {gridFactorUnit(c.code)}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Start: pick a plan, or one of two doors. */}
        <section className="py-20 md:py-28 bg-secondary/30">
          <div className="container max-w-5xl mx-auto px-6">
            <div className="flex flex-wrap items-end justify-between gap-5 mb-10">
              <div className="max-w-2xl">
                <SectionHead className="mb-5" eyebrow={t("platform.pricing.eyebrow", "Choose your starting point")} title={t("platform.pricing.title", "Pricing that maps to the job in front of you.")} />
                <p className="text-muted-foreground leading-relaxed">{t("platform.pricing.body", "Start free if you are still building your first record. Choose yearly billing for the lower monthly equivalent on Essential or Pro, or speak with the team when your work spans people, entities, or integrations.")}</p>
              </div>
              <Button asChild variant="outline">
                <Link to="/pricing">{t("platform.pricing.cta", "Compare all plans")} <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
            <div className="grid border-t border-border sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-border">
              {pricingSummary.map(tier => (
                <Link key={tier.key} to={tier.to} className="group flex flex-col border-b border-border py-6 sm:pr-6 lg:border-b-0 lg:px-5 lg:first:pl-0">
                  <div className="text-sm font-medium text-foreground">{t(`platform.pricing.${tier.key}.name`, tier.name)}</div>
                  <div className="mt-2 font-mono text-lg text-foreground">{t(`platform.pricing.${tier.key}.price`, tier.price)}</div>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{t(`platform.pricing.${tier.key}.detail`, tier.detail)}</p>
                  <div className="mt-auto pt-4 text-xs text-muted-foreground">{t(`platform.pricing.${tier.key}.fit`, tier.fit)}</div>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm text-primary">
                    {t("platform.pricing.view", "Compare this plan")} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </div>

            <div className="mt-20 rounded-3xl bg-foreground px-6 py-14 text-center text-background md:py-16">
              <h2 className="text-3xl md:text-4xl font-semibold mb-4">{t("platform.cta.title", "Two ways to start.")}</h2>
              <p className="text-background/70 mb-8 max-w-xl mx-auto">
                {t("platform.cta.body", "Upload one of your own bills and see the result. Or talk to us about adding Senseible to your product.")}
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button asChild size="lg" className="rounded-full px-6">
                  <Link to="/">{t("platform.cta.try", "Try Senseible")} <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-full px-6 border-background/30 bg-transparent text-background hover:bg-background/10 hover:text-background">
                  <Link to="/contact">{t("platform.cta.talk", "Talk to us")}</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Platform;
