import { MinimalNav } from "@/components/MinimalNav";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { ArrowLeft, ArrowRight, Building, Banknote, FileCheck, Shield, Hash, Sliders, Lock, Gauge, Users, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import climateFinanceOg from "@/assets/og/climate-finance.jpg";

const lenderMechanics = [
  { icon: Hash, title: "Hash-pinned, spot-auditable", body: "Every scope total traces to the source document. The lender can spot-check any line item without ever taking custody of the borrower's invoices." },
  { icon: Sliders, title: "Confidence bands, never false precision", body: "Each figure carries the uncertainty band that produced it. The lender sees the range, not a fabricated point estimate." },
  { icon: Lock, title: "Methodology locked at disclosure time", body: "The factor source and methodology version are frozen with the output. A 2026 disclosure stays a 2026 disclosure even after factors evolve." },
  { icon: Gauge, title: "Climate Credibility Score (0–100)", body: "A single underwriting-ready signal aggregating verification quality, completeness, history depth, and green-benefit ratio — graded A+ to D." },
  { icon: Users, title: "Cross-MSME peer comparison", body: "The borrower is benchmarked against verified peers in the same sector and country — not against a self-reported claim or a global average." },
  { icon: Eye, title: "Decision-grade, not raw", body: "Lenders receive instrument fit (green loan, factoring, SLL), eligibility band, and evidence depth — borrower documents stay private." },
];

const useCases = [
  {
    title: "Sustainability-Linked Loans",
    sub: "SIDBI · IREDA · commercial banks",
    body: "The verified scope baseline becomes the KPI. Lenders price coupon step-ups or step-downs against year-over-year reduction on a number whose source they can spot-audit, not a self-reported claim.",
  },
  {
    title: "Receivables factoring on green invoices",
    sub: "Solar · EV · forestation invoices",
    body: "Invoices that pass the green-benefit rule and additionality check carry an evidence hash the factor can verify in seconds — shortening the discount on advances against those receivables.",
  },
  {
    title: "Trade finance under CBAM",
    sub: "EU-bound exporters",
    body: "Verified actual emissions per tonne replace the EU default values that would otherwise apply, reducing destination CBAM cost and improving the margin trade-finance desks can underwrite on the shipment.",
  },
];

const ClimateFinance = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Climate Finance — Senseible"
        description="How verified Senseible data becomes underwriting input for lenders, factors, and incentive desks across emerging markets. Senseible is the verification primitive, not the lender."
        canonical="/climate-finance"
        image={`https://senseible.earth${climateFinanceOg}`}
        keywords={["climate finance", "green loans", "CBAM finance", "sustainability linked loans", "green invoice factoring", "MSME climate finance"]}
        breadcrumbs={[{ name: "Home", url: "/" }, { name: "Climate Finance", url: "/climate-finance" }]}
      />
      <MinimalNav />

      <main className="container max-w-4xl mx-auto px-6 py-24 sm:py-32">
        <Link to="/trust" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-12">
          <ArrowLeft className="w-4 h-4" /> Back to Trust architecture
        </Link>

        <article className="animate-fade-in">
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-foreground mb-6">Climate Finance</h1>
          <p className="text-xl text-muted-foreground mb-4 max-w-2xl">
            Verified Senseible data is the primitive lenders, factors, and incentive desks consume.
          </p>
          <p className="text-sm text-muted-foreground mb-16 max-w-2xl">
            Senseible is not a lender, factor, or registry. It is the verification layer each of those institutions trusts when they price climate-linked risk.
          </p>

          {/* 1. Lender mechanics (migrated from Trust) */}
          <section className="mb-20">
            <div className="flex items-center gap-3 mb-3">
              <Banknote className="h-5 w-5 text-primary" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Why lenders can underwrite against this data</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mb-6">Six properties of every figure that reaches a bank</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {lenderMechanics.map(m => (
                <Card key={m.title} className="border-border">
                  <CardContent className="p-5">
                    <m.icon className="w-4 h-4 text-primary mb-3" />
                    <div className="text-sm font-medium text-foreground mb-1">{m.title}</div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{m.body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* 2. Where it gets consumed */}
          <section className="mb-20">
            <div className="flex items-center gap-3 mb-3">
              <Building className="h-5 w-5 text-primary" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Where the verified ledger gets consumed</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mb-6">Three concrete pipelines</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {useCases.map(u => (
                <Card key={u.title} className="border-border">
                  <CardContent className="p-5">
                    <div className="text-sm font-medium text-foreground mb-1">{u.title}</div>
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3">{u.sub}</div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{u.body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              The same verified ledger maps to government incentive schemes — SIDBI, IREDA and MNRE in India, with equivalent programmes wired through country config across every supported market.
            </p>
          </section>

          {/* 3. Opportunity cards — region-neutral, no guaranteed-rate claims */}
          <section className="mb-20">
            <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mb-6">Opportunities this unlocks for MSMEs</h2>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl border border-border hover:border-primary/30 transition-colors">
                <Banknote className="w-6 h-6 text-success mb-4" />
                <h3 className="font-medium text-foreground mb-2">Green loans</h3>
                <p className="text-sm text-muted-foreground mb-4">Verified baselines pre-qualify MSMEs for potentially preferential rates on working capital from banks that recognise verified sustainability data.</p>
                <p className="text-xs text-primary font-medium">Positioning, not a guaranteed rate.</p>
              </div>
              <div className="p-6 rounded-2xl border border-border hover:border-primary/30 transition-colors">
                <Building className="w-6 h-6 text-primary mb-4" />
                <h3 className="font-medium text-foreground mb-2">Government incentives</h3>
                <p className="text-sm text-muted-foreground mb-4">Qualify for state and central schemes with documented emission reductions — across SIDBI/IREDA in India and equivalents wired through country config elsewhere.</p>
                <p className="text-xs text-primary font-medium">Multiple schemes per market.</p>
              </div>
              <div className="p-6 rounded-2xl border border-border hover:border-primary/30 transition-colors">
                <FileCheck className="w-6 h-6 text-accent mb-4" />
                <h3 className="font-medium text-foreground mb-2">Export compliance</h3>
                <p className="text-sm text-muted-foreground mb-4">Meet EU CBAM requirements with verified actuals before defaults apply. Position for international buyers who require carbon disclosure.</p>
                <p className="text-xs text-primary font-medium">Export-access protection.</p>
              </div>
              <div className="p-6 rounded-2xl border border-border hover:border-primary/30 transition-colors">
                <Shield className="w-6 h-6 text-earth mb-4" />
                <h3 className="font-medium text-foreground mb-2">Sustainability-Linked Credit</h3>
                <p className="text-sm text-muted-foreground mb-4">Access emerging credit facilities tied to verified sustainability KPIs — early positioning for TCFD- and ISSB-aligned financing.</p>
                <p className="text-xs text-primary font-medium">Aligned with global standards.</p>
              </div>
            </div>
          </section>

          {/* 4. What MSMEs are missing */}
          <section className="mb-20 p-8 rounded-2xl bg-secondary/30 border border-border">
            <h2 className="text-xl font-semibold text-foreground mb-6">What MSMEs are missing without verified data</h2>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">Global trade access:</span> From India's FTAs (UAE, Australia, EU/UK negotiations) to the EU Green Deal, Brazil's CBIO market, and Southeast Asia's carbon-pricing pilots — verified sustainability data is becoming table stakes for trade access worldwide.
              </p>
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">CBAM &amp; border adjustments:</span> Exporters from emerging markets without carbon data face tariffs of 20–35% on steel, cement, aluminium, and related products entering the EU. Similar mechanisms are emerging in the UK, Canada, and Australia.
              </p>
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">Financial institution mandates:</span> Central banks globally — RBI in India, BCB in Brazil, BSP in the Philippines — increasingly favour sustainability-linked lending. Banks are building ESG scoring into credit decisions across emerging markets.
              </p>
            </div>
          </section>

          {/* CTA */}
          <div className="p-8 rounded-2xl bg-primary text-primary-foreground text-center">
            <h3 className="text-xl font-medium mb-3">Unlock your climate finance eligibility</h3>
            <p className="text-primary-foreground/80 mb-6">One document. Instant assessment. No consultants needed.</p>
            <Link to="/" className="inline-flex items-center gap-2 px-6 py-3 bg-background text-foreground rounded-full font-medium hover:bg-background/90 transition-colors">
              Start Now <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </article>

        <div className="mt-20 pt-12 border-t border-border flex justify-between items-center">
          <Link to="/trust" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Trust architecture</Link>
          <Link to="/carbon-credits" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Carbon Credits</Link>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ClimateFinance;
