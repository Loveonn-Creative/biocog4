import { Link } from "react-router-dom";
import { ArrowRight, FileCheck, Shield, Banknote, Target, Coins, Building2, Globe2 } from "lucide-react";
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

const audiences = [
  { key: "msme", label: "MSMEs & exporters", line: "Turn invoices into a verified emission record — no consultant required." },
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
  { n: "01", key: "capture", title: "Capture", body: "Drop a document, take a photo, or speak the data point. The first response arrives in under two seconds." },
  { n: "02", key: "verify", title: "Verify", body: "Every document is hashed, parsed, classified deterministically, and reconciled against country grid factors." },
  { n: "03", key: "use", title: "Use", body: "The verified record feeds your disclosure, your lender, your reduction roadmap, and — when eligible — your credits." },
];

const Platform = () => {
  const { t } = useTranslation();
  const countries = Object.values(COUNTRY_CONFIGS);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead
        title="Senseible — The Platform"
        description="What Senseible does, who it's for, and how it turns ordinary business documents into climate evidence trusted by auditors, lenders, regulators and carbon buyers."
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
        {/* Hero */}
        <section className="container max-w-4xl mx-auto px-6 pt-24 md:pt-28 pb-16 text-center">
          <Badge variant="secondary" className="mb-6 text-xs">{t("platform.eyebrow", "The Platform")}</Badge>
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight text-foreground mb-6">
            {t("platform.hero.title", "Climate evidence, in the time it takes to read this line.")}
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {t("platform.hero.sub", "Senseible turns any business document into a verified emission record — one that a lender can underwrite, a regulator can audit, and a buyer can rely on.")}
          </p>
        </section>

        {/* Marquee strip */}
        <PlatformMarquee />

        {/* What is Senseible? */}
        <section className="border-b border-border py-20">
          <div className="container max-w-3xl mx-auto px-6">
            <div className="text-xs uppercase tracking-wider text-primary mb-3">{t("platform.what.eyebrow", "What is Senseible?")}</div>
            <h2 className="text-3xl md:text-4xl font-semibold mb-6">{t("platform.what.title", "A verification layer for climate data.")}</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {t("platform.what.body", "Most climate numbers are self-reported. Senseible replaces the self-report with a chain of evidence — a hash, a methodology, a confidence band — that anyone downstream can independently check. It works on the documents a business already produces, in the language and the country the business already operates in.")}
            </p>
          </div>
        </section>

        {/* Who is it for? */}
        <section className="border-b border-border py-20 bg-secondary/30">
          <div className="container max-w-5xl mx-auto px-6">
            <div className="text-xs uppercase tracking-wider text-primary mb-3">{t("platform.who.eyebrow", "Who is it for?")}</div>
            <h2 className="text-3xl md:text-4xl font-semibold mb-10">{t("platform.who.title", "Six audiences. One verified record.")}</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {audiences.map(a => (
                <Card key={a.key} className="border-border hover:border-primary/40 transition-colors">
                  <CardContent className="p-6">
                    <div className="text-sm font-medium mb-2 text-foreground">{t(`platform.who.${a.key}.label`, a.label)}</div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{t(`platform.who.${a.key}.line`, a.line)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* The problem */}
        <section className="border-b border-border py-20">
          <div className="container max-w-3xl mx-auto px-6">
            <div className="text-xs uppercase tracking-wider text-primary mb-3">{t("platform.problem.eyebrow", "What problem does it solve?")}</div>
            <h2 className="text-3xl md:text-4xl font-semibold mb-6">{t("platform.problem.title", "The verification gap in emerging-market climate data.")}</h2>
            <p className="text-lg text-muted-foreground leading-relaxed mb-4">
              {t("platform.problem.p1", "Emerging-market supply chains carry most of the world's industrial emissions, and almost none of the verified data. Regulators ask for primary numbers. Buyers ask for primary numbers. Lenders ask for primary numbers. Without them, the default values apply — and the cost lands on the smallest producer.")}
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {t("platform.problem.p2", "Senseible closes that gap by making verification cheap enough to do at the speed of business, in the language and identifier system of every market it touches.")}
            </p>
          </div>
        </section>

        {/* How it works */}
        <section className="border-b border-border py-20 bg-secondary/30">
          <div className="container max-w-5xl mx-auto px-6">
            <div className="text-xs uppercase tracking-wider text-primary mb-3">{t("platform.how.eyebrow", "How it works")}</div>
            <h2 className="text-3xl md:text-4xl font-semibold mb-10">{t("platform.how.title", "Three steps. Same record, used three ways.")}</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {steps.map(s => (
                <Card key={s.n} className="border-border border-l-2 border-l-primary/40">
                  <CardContent className="p-6">
                    <div className="text-xs font-mono text-primary mb-3">{s.n}</div>
                    <div className="text-lg font-medium mb-2 text-foreground">{t(`platform.how.${s.key}.title`, s.title)}</div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{t(`platform.how.${s.key}.body`, s.body)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="mt-8">
              <Button asChild variant="ghost" className="px-0 text-primary hover:text-primary">
                <Link to="/trust">{t("platform.how.cta", "Read the technical depth")} <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Outcomes */}
        <section className="border-b border-border py-20">
          <div className="container max-w-5xl mx-auto px-6">
            <div className="text-xs uppercase tracking-wider text-primary mb-3">{t("platform.out.eyebrow", "What you can do with verified data")}</div>
            <h2 className="text-3xl md:text-4xl font-semibold mb-10">{t("platform.out.title", "Four outcomes, one ledger.")}</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {outcomes.map(o => (
                <Card key={o.key} className="border-border hover:border-primary/40 transition-colors">
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
              ))}
            </div>
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
        <section className="border-b border-border py-20">
          <div className="container max-w-5xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-3">
              <Building2 className="h-5 w-5 text-primary" />
              <span className="text-xs uppercase tracking-wider text-primary">{t("platform.industries.eyebrow", "Industries")}</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-semibold mb-6">{t("platform.industries.title", "Built for the sectors that need it most.")}</h2>
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
        <section className="border-b border-border py-20 bg-secondary/30">
          <div className="container max-w-5xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-3">
              <Globe2 className="h-5 w-5 text-primary" />
              <span className="text-xs uppercase tracking-wider text-primary">{t("platform.where.eyebrow", "Where it works")}</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-semibold mb-6">{t("platform.where.title", "Ten markets, each with its own identifier and grid factor.")}</h2>
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
