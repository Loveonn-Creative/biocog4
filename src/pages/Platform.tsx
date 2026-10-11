import { Link } from "react-router-dom";
import { lazy, Suspense } from "react";
import { ArrowRight, FileCheck, Shield, Banknote, Target, Coins, Building2, BarChart3, Bot, Landmark, Workflow, ScanLine, ShieldCheck, Layers } from "lucide-react";
import { MinimalNav } from "@/components/MinimalNav";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { PlatformMarquee } from "@/components/PlatformMarquee";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { COUNTRY_CONFIGS } from "@/lib/countryConfig";
import platformOg from "@/assets/og/platform.jpg";
import { Reveal, SectionHead } from "@/components/platform/Reveal";

const ProductPipeline = lazy(() => import("@/components/product/ProductPipeline"));

const audiences = [
  { key: "msme", label: "MSMEs & exporters", line: "Turn invoices into a verified emission record, no consultant required." },
  { key: "enterprise", label: "Enterprises", line: "Get Scope 3 supplier data that holds up under CBAM, ISSB and CSRD." },
  { key: "lender", label: "Banks & lenders", line: "Underwrite against hash-pinned figures, not borrower self-declarations." },
  { key: "policy", label: "Policy & regulators", line: "Read decision-grade signals tied to a methodology version you can audit." },
  { key: "buyer", label: "Carbon credit buyers", line: "Source MSME-origin credits that clear additionality and evidence linkage." },
  { key: "partner", label: "Ecosystem partners", line: "Plug verified MSME climate data into your own product surface." },
];

const outcomes = [
  { key: "report", icon: FileCheck, title: "Report", body: "One verified ledger serves CBAM, BRSR, GHG Protocol, ISSB, CSRD, TCFD, GRI and SBTi without re-keying.", to: "/trust", cta: "How verification works" },
  { key: "finance", icon: Banknote, title: "Finance", body: "Verified baselines and a Climate Credibility Score become underwriting inputs for green loans and factoring.", to: "/climate-finance", cta: "Climate finance flow" },
  { key: "decarbonize", icon: Target, title: "Decarbonize", body: "A baseline becomes a sector-aware roadmap. Reductions are tracked against the original methodology, not re-baselined.", to: "/net-zero", cta: "Net-Zero engine" },
  { key: "monetize", icon: Coins, title: "Monetize", body: "Records that clear additionality, evidence linkage and methodology lock can become credit-ready signals for buyers.", to: "/carbon-credits", cta: "Carbon credits" },
];

const steps = [
  { n: "01", key: "capture", icon: ScanLine, tone: "accent", title: "Capture", body: "Drop a document, take a photo, or speak the data point. The first response arrives in under two seconds." },
  { n: "02", key: "verify", icon: ShieldCheck, tone: "verified", title: "Verify", body: "Every document is hashed, parsed, classified deterministically, and reconciled against country grid factors." },
  { n: "03", key: "use", icon: Layers, tone: "primary", title: "Use", body: "The verified record feeds your disclosure, your lender, your reduction roadmap, and, when eligible, your credits." },
];

const proofMetrics = [
  { value: "29", label: "clusters", body: "Where the platform has been piloted." },
  { value: "11", label: "countries piloted", body: "Pilot reach across emerging markets." },
  { value: "92%", label: "benchmarking accuracy", body: "The confirmed benchmarking result." },
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
                {t("platform.hero.sub", "Senseible turns any business document into a verified emission record, one that a lender can underwrite, a regulator can audit, and a buyer can rely on.")}
              </p>
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

        {/* Positioning */}
        <section className="border-b border-border py-16">
          <div className="container max-w-5xl mx-auto px-6">
            <div className="grid gap-8 md:grid-cols-[1.1fr_0.9fr] md:items-end">
              <div>
                <SectionHead n="01" className="mb-5" eyebrow={t("platform.positioning.eyebrow", "Built into Senseible")} title={t("platform.positioning.title", "An agent automating Scope 3 compliance for enterprises.")} />
                <p className="text-lg text-muted-foreground leading-relaxed">{t("platform.positioning.body", "For an enterprise, that means seeing which suppliers have usable evidence, where the gaps are, and what is ready for Scope 3 reporting.")}</p>
              </div>
              <div className="border-l-2 border-primary/30 pl-5 text-sm text-muted-foreground leading-relaxed">
                {t("platform.positioning.note", "Start with the document. Keep the evidence attached as the record moves into reporting, supplier decisions, or finance.")}
              </div>
            </div>
          </div>
        </section>

        {/* What is Senseible? */}
        <section className="border-b border-border py-20 md:py-28">
          <div className="container max-w-3xl mx-auto px-6">
            <SectionHead n="02" className="mb-7" eyebrow={t("platform.what.eyebrow", "What is Senseible?")} title={t("platform.what.title", "A verification layer for climate data.")} />
            <p className="text-lg text-muted-foreground leading-relaxed">
              {t("platform.what.body", "Most climate numbers are self-reported. Senseible replaces the self-report with a chain of evidence (a hash, a methodology, a confidence band) that anyone downstream can independently check. It works on the documents a business already produces, in the language and the country the business already operates in.")}
            </p>
          </div>
        </section>

        {/* Who is it for? */}
        <section className="border-b border-border py-20 md:py-28 bg-secondary/30">
          <div className="container max-w-5xl mx-auto px-6">
            <SectionHead n="03" className="mb-10" eyebrow={t("platform.who.eyebrow", "Who is it for?")} title={t("platform.who.title", "Six audiences. One verified record.")} />
            {/* One record in the middle, six readers around it: hairline rows instead of six boxes. */}
            <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-10 border-t border-border">
              {audiences.map((a, i) => (
                <li key={a.key} className="group border-b border-border py-5">
                  <Reveal delay={i * 60}>
                    <div className="flex items-baseline gap-3">
                      <span aria-hidden="true" className="shrink-0 whitespace-nowrap font-mono text-[11px] text-muted-foreground tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                      <div>
                        <div className="text-[15px] font-medium mb-1.5 text-foreground group-hover:text-primary transition-colors">{t(`platform.who.${a.key}.label`, a.label)}</div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{t(`platform.who.${a.key}.line`, a.line)}</p>
                      </div>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* The problem */}
        <section className="border-b border-border py-20 md:py-28">
          <div className="container max-w-3xl mx-auto px-6">
            <SectionHead n="04" className="mb-7" eyebrow={t("platform.problem.eyebrow", "What problem does it solve?")} title={t("platform.problem.title", "The verification gap in emerging-market climate data.")} />
            <p className="text-lg text-muted-foreground leading-relaxed mb-4">
              {t("platform.problem.p1", "Emerging-market supply chains carry most of the world's industrial emissions, and almost none of the verified data. Regulators ask for primary numbers. Buyers ask for primary numbers. Lenders ask for primary numbers. Without them, the default values apply, and the cost lands on the smallest producer.")}
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {t("platform.problem.p2", "Senseible closes that gap by making verification cheap enough to do at the speed of business, in the language and identifier system of every market it touches.")}
            </p>
          </div>
        </section>

        {/* How it works */}
        <section className="border-b border-border py-20 md:py-28 bg-secondary/30">
          <div className="container max-w-5xl mx-auto px-6">
            <SectionHead n="05" className="mb-10" eyebrow={t("platform.how.eyebrow", "How it works")} title={t("platform.how.title", "Three steps. Same record, used three ways.")} />
            {/* Colour follows the record: data (blue), checked (green), in use (brand). */}
            <ol className="relative grid md:grid-cols-3 gap-6">
              <svg aria-hidden="true" className="hidden md:block absolute left-0 right-0 top-9 h-6 w-full text-muted-foreground/50" viewBox="0 0 900 24" preserveAspectRatio="none">
                <path d="M120 12 C 220 2, 300 22, 400 12 S 580 2, 690 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 5" />
                <path d="M684 6 L 694 12 L 684 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              {steps.map((s, i) => (
                <li key={s.n} className="relative">
                  <Reveal delay={i * 140}>
                    <div className="h-full rounded-2xl border border-border bg-background p-6 transition-shadow hover:shadow-[0_18px_40px_-24px_hsl(var(--foreground)/.35)]">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="grid place-items-center h-9 w-9 rounded-xl" style={{ background: `hsl(var(--${s.tone}) / .12)`, color: `hsl(var(--${s.tone}))` }}>
                          <s.icon className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className="text-xs font-mono text-muted-foreground">{s.n}</span>
                      </div>
                      <div className="text-lg font-medium mb-2 text-foreground">{t(`platform.how.${s.key}.title`, s.title)}</div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{t(`platform.how.${s.key}.body`, s.body)}</p>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ol>
            <div className="mt-8">
              <Button asChild variant="ghost" className="px-0 text-primary hover:text-primary">
                <Link to="/trust">{t("platform.how.cta", "Read the technical depth")} <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Outcomes */}
        <section className="border-b border-border py-20 md:py-28">
          <div className="container max-w-5xl mx-auto px-6">
            <SectionHead n="06" className="mb-10" eyebrow={t("platform.out.eyebrow", "What you can do with verified data")} title={t("platform.out.title", "Four outcomes, one ledger.")} />
            <div className="grid sm:grid-cols-2 gap-4">
              {outcomes.map((o, i) => (
                <Reveal key={o.key} delay={i * 80}>
                <Card className="h-full border-border hover:border-primary/40 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-md bg-primary/10 border border-primary/20">
                        <o.icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-base font-medium mb-2 text-foreground">{t(`platform.out.${o.key}.title`, o.title)}</div>
                        <p className="text-sm text-muted-foreground leading-relaxed mb-3">{t(`platform.out.${o.key}.body`, o.body)}</p>
                        <Link to={o.to} className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                          {t(`platform.out.${o.key}.cta`, o.cta)} <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Proof and operating paths */}
        <section className="border-b border-border py-20 md:py-28 bg-secondary/30">
          <div className="container max-w-5xl mx-auto px-6">
            <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
              <div>
                <SectionHead n="07" className="mb-6" eyebrow={t("platform.proof.eyebrow", "What we have proven")} title={t("platform.proof.title", "The numbers are real. So is the work behind them.")} />
                <p className="text-muted-foreground leading-relaxed mb-6">{t("platform.proof.body", "Senseible has been piloted across 29 clusters and 11 countries, with 92% benchmarking accuracy. Each number comes from the work of turning everyday business records into usable climate evidence.")}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="h-4 w-4 text-primary" />
                  <span>{t("platform.proof.disclaimer", "These are platform pilot and benchmarking figures, not promises about a customer’s future result.")}</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3" aria-label={t("platform.proof.metrics.label", "Platform proof metrics")}>
                {proofMetrics.map(metric => (
                  <div key={metric.label} className="border border-border bg-background p-4 md:p-5 transition-transform duration-300 hover:-translate-y-1">
                    <div className="font-mono text-4xl md:text-5xl leading-none text-primary mb-3">{metric.value}</div>
                    <div className="text-sm font-medium mb-2">{t(`platform.proof.metrics.${metric.label}`, metric.label)}</div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{metric.body}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-12 border-t border-border pt-10">
              <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
                <div>
                  <div className="text-xs uppercase tracking-wider text-primary mb-2">{t("platform.proof.paths.eyebrow", "Where it becomes useful")}</div>
                  <h3 className="text-2xl md:text-3xl font-semibold">{t("platform.proof.paths.title", "The same evidence solves a different problem in every sector.")}</h3>
                </div>
                <span className="text-xs text-muted-foreground">{t("platform.proof.paths.note", "Choose a sector to see the evidence and the decision it supports.")}</span>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {proofPaths.map(path => (
                  <Card key={path.key} className="border-border bg-background hover:border-primary/40 transition-all duration-300 hover:-translate-y-1">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-md bg-primary/10 border border-primary/20">
                          <Workflow className="h-4 w-4 text-primary" />
                        </div>
                        <div className="font-medium">{t(`platform.proof.paths.${path.key}.title`, path.title)}</div>
                      </div>
                      <div className="space-y-3 mb-5">
                        <div>
                          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">{t("platform.proof.paths.source", "Evidence")}</div>
                          <p className="text-sm text-muted-foreground leading-relaxed">{t(`platform.proof.paths.${path.key}.source`, path.source)}</p>
                        </div>
                        <div>
                          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">{t("platform.proof.paths.decision", "Decision")}</div>
                          <p className="text-sm text-foreground leading-relaxed">{t(`platform.proof.paths.${path.key}.decision`, path.decision)}</p>
                        </div>
                      </div>
                      <Link to={path.to} className="group text-sm text-primary hover:underline inline-flex items-center gap-1">
                        {t("platform.proof.paths.cta", "Explore this use case")} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Buyer pricing guide */}
        <section className="border-b border-border py-20 md:py-28">
          <div className="container max-w-5xl mx-auto px-6">
            <div className="flex flex-wrap items-end justify-between gap-5 mb-10">
              <div className="max-w-2xl">
                <SectionHead n="08" className="mb-5" eyebrow={t("platform.pricing.eyebrow", "Choose your starting point")} title={t("platform.pricing.title", "Pricing that maps to the job in front of you.")} />
                <p className="text-muted-foreground leading-relaxed">{t("platform.pricing.body", "Start free if you are still building your first record. Choose yearly billing for the lower monthly equivalent on Essential or Pro, or speak with the team when your work spans people, entities, or integrations.")}</p>
              </div>
              <Button asChild variant="outline">
                <Link to="/pricing">{t("platform.pricing.cta", "Compare all plans")} <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {pricingSummary.map(tier => (
                <Card key={tier.key} className="border-border h-full flex flex-col">
                  <CardContent className="p-5 flex flex-col h-full">
                    <div className="flex items-center gap-2 mb-4">
                      {tier.key === "snapshot" && <BarChart3 className="h-4 w-4 text-primary" />}
                      {tier.key === "essential" && <Bot className="h-4 w-4 text-primary" />}
                      {tier.key === "pro" && <Landmark className="h-4 w-4 text-primary" />}
                      {tier.key === "scale" && <Building2 className="h-4 w-4 text-primary" />}
                      <div className="text-sm font-medium">{t(`platform.pricing.${tier.key}.name`, tier.name)}</div>
                    </div>
                    <div className="font-mono text-lg text-foreground mb-3">{t(`platform.pricing.${tier.key}.price`, tier.price)}</div>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">{t(`platform.pricing.${tier.key}.detail`, tier.detail)}</p>
                    <div className="mt-auto pt-4 border-t border-border">
                      <div className="text-xs text-muted-foreground mb-3">{t(`platform.pricing.${tier.key}.fit`, tier.fit)}</div>
                      <Link to={tier.to} className="group text-sm text-primary hover:underline inline-flex items-center gap-1">
                        {t("platform.pricing.view", "Compare this plan")} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-5">{t("platform.pricing.note", "See the pricing page for the current billing choice, full entitlements, and checkout.")}</p>
          </div>
        </section>

        {/* Trust strip */}
        <section className="border-b border-border py-16 bg-secondary/30">
          <div className="container max-w-5xl mx-auto px-6 text-center">
            <Shield className="h-5 w-5 text-primary mx-auto mb-4" />
            <h2 className="text-2xl md:text-3xl font-semibold mb-4">{t("platform.trust.title", "Trust, in one line.")}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
              {t("platform.trust.body", "Every figure carries its SHA-256 evidence hash, its methodology version, its confidence band, and a Climate Credibility Score from A+ to D.")}
            </p>
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {["GHG Protocol", "CBAM", "BRSR", "CSRD", "ISSB", "TCFD", "GRI", "SBTi", "ISO 14064"].map(f => (
                <span key={f} className="px-2.5 py-1 text-[11px] rounded-full bg-primary/8 text-primary border border-primary/15">{f}</span>
              ))}
            </div>
            <Button asChild variant="outline">
              <Link to="/trust">{t("platform.trust.cta", "See the trust architecture")} <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </section>

        {/* Industries */}
        <section className="border-b border-border py-20 md:py-28">
          <div className="container max-w-5xl mx-auto px-6">
            <SectionHead n="09" className="mb-8" eyebrow={t("platform.industries.eyebrow", "Industries")} title={t("platform.industries.title", "Built for the sectors that need it most.")} />
            <div className="flex flex-wrap gap-2">
              {["textile", "steel", "chemical", "logistics", "automobile", "construction"].map(s => (
                <Link key={s} to={`/industries/${s}`} className="px-4 py-2 rounded-full border border-border text-sm text-foreground/80 hover:border-primary/40 hover:text-primary transition-colors capitalize">
                  {t(`platform.industries.${s}`, s)}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Where it works */}
        <section className="border-b border-border py-20 md:py-28 bg-secondary/30">
          <div className="container max-w-5xl mx-auto px-6">
            <SectionHead n="10" className="mb-8" eyebrow={t("platform.where.eyebrow", "Where it works")} title={t("platform.where.title", "19 configured countries, each with its own identifier and grid factor.")} />
            <div className="grid sm:grid-cols-2 md:grid-cols-5 gap-3">
              {countries.map(c => (
                <div key={c.code} className="p-3 rounded-md border border-border bg-background">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <div className="text-sm font-medium">{c.name}</div>
                  </div>
                  <div className="text-[11px] text-muted-foreground font-mono mt-1">{c.taxIdLabel} · {c.gridFactor} kgCO₂e/kWh</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-24">
          <div className="container max-w-3xl mx-auto px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-semibold mb-4">{t("platform.cta.title", "Two ways to start.")}</h2>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              {t("platform.cta.body", "Try the verification surface with your own document. Or talk to the team about embedding it in yours.")}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <Link to="/">{t("platform.cta.try", "Try Senseible")} <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/contact">{t("platform.cta.talk", "Talk to us")}</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Platform;
