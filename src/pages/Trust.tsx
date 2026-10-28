import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { trustSafeguards } from "@/data/trustSafeguards";
import { SEOHead } from "@/components/SEOHead";
import trustOg from "@/assets/og/trust.jpg";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { COUNTRY_CONFIGS } from "@/lib/countryConfig";
import { LedgerFanOut, LockDoodle, PipelineTrack, ScanLine, SealChain } from "@/components/trust/TrustVisuals";
import { ClaimGauntlet, detectMarket, Glyph, SafeguardReader, Scope3Explorer, ScoreComposer } from "@/components/trust/TrustInteractives";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FileCheck, Layers, Satellite, FileText, Target, ArrowRight, CheckCircle2, ScrollText, Sparkles } from "lucide-react";

const sections = [
  { id: "layers", label: "Trust Layers" },
  { id: "sources", label: "Data Sources" },
  { id: "mrv", label: "MRV Architecture" },
  { id: "intelligence", label: "ESG Intelligence" },
  { id: "frameworks", label: "Frameworks" },
  { id: "scope3", label: "Scope 3" },
  { id: "scoring", label: "Confidence Score" },
  { id: "greenwashing", label: "Greenwashing" },
  { id: "handoff", label: "Where it goes next" },
  { id: "netzero", label: "Net-Zero" },
  { id: "governance", label: "Governance" },
  { id: "faq", label: "FAQ" },
];

const trustLayers = [
  {
    icon: FileText,
    name: "Evidence Layer",
    desc: "Every document is fingerprinted with SHA-256 before processing. A pre-processing stub is written first, so even failed runs leave an audit trail. The same invoice cannot be claimed twice, across users, sessions or time.",
  },
  {
    icon: FileCheck,
    name: "Verification Layer",
    desc: "Deterministic HSN-to-scope mapping, country grid factors (IEA 2023), and math reconciliation. Missing inputs return a math-based failure reason, never a silent estimate.",
  },
  {
    icon: Sparkles,
    name: "Intelligence Layer",
    desc: "Biocog superintelligence reads the scope ledger as the single source of truth and projects it into every framework view non-destructively. The same number appears in every report because it comes from the same record.",
  },
  {
    icon: ScrollText,
    name: "Disclosure & Decision Layer",
    desc: "Framework-aligned outputs (CBAM, BRSR, GHG Protocol, CSRD, ISSB, TCFD, GRI, SBTi) carry the audit trail, confidence bands, and Climate Credibility Score (A+ to D) with them, ready for auditors, lenders, and buyers.",
  },
];

const dataSources = [
  { icon: "invoice", name: "Tax invoices & purchase records", what: "Vendor, line items, HSN/CN codes, amounts, dates", verify: "Schema, math reconciliation, vendor pattern match" },
  { icon: "meter", name: "Utility & energy bills", what: "kWh, kVAH, period, distributor", verify: "Period continuity, consumption sanity, country grid-factor lookup" },
  { icon: "signal", name: "IoT & meter signals", what: "Sub-metered electricity, fuel, water telemetry", verify: "Device identity, timestamp gaps, drift detection" },
  { icon: "ledger", name: "Operational records", what: "Production logs, fuel consumption, freight manifests", verify: "Cross-check against invoices and supplier evidence" },
  { icon: "satellite", name: "Satellite & remote signals", what: "Plot boundaries, change detection where applicable", verify: "Source provenance and acquisition-date stamping" },
  { icon: "pin", name: "Geotagging", what: "Facility coordinates, plant boundaries", verify: "Country-config alignment with grid factor and tax ID format" },
  { icon: "factory", name: "Supplier evidence", what: "Supplier-issued PCFs, certifications, counterparty IDs", verify: "Buyer–supplier identifier linkage and methodology check" },
];

const frameworks = [
  { name: "GHG Protocol", coverage: "Scope 1, 2, 3", evidence: "Invoices, bills, ops records, supplier PCFs" },
  { name: "CBAM (EU)", coverage: "Embedded emissions for steel, aluminium, cement, fertiliser, hydrogen, electricity", evidence: "Production data, energy mix, CN customs codes" },
  { name: "BRSR (India)", coverage: "Section A–C, environmental disclosures", evidence: "Bills, water, waste, GHG totals" },
  { name: "CSRD / ESRS (EU)", coverage: "E1 climate, value-chain alignment", evidence: "Audit-trail-backed scope ledger" },
  { name: "ISSB IFRS S2", coverage: "Climate-related financial disclosures", evidence: "GHG inventory with methodology lock" },
  { name: "TCFD", coverage: "Governance, strategy, risk, metrics", evidence: "Scope inventory and transition signals" },
  { name: "GRI 305", coverage: "Emissions standard disclosures", evidence: "Scope-resolved ledger" },
  { name: "SBTi", coverage: "Target setting and validation inputs", evidence: "Baseline + roadmap from Net-Zero engine" },
  { name: "ISO 14064 / 14067", coverage: "Organisation and product inventories", evidence: "Per-item PCF with traceable factors" },
];

const countryIds = [
  { country: "India", id: "GSTIN" },
  { country: "Indonesia", id: "NPWP" },
  { country: "Vietnam", id: "MST" },
  { country: "Thailand", id: "Tax ID" },
  { country: "Philippines", id: "TIN" },
  { country: "Malaysia", id: "SST ID" },
  { country: "Bangladesh", id: "TIN" },
  { country: "Pakistan", id: "NTN" },
  { country: "Singapore", id: "UEN" },
  { country: "Sri Lanka", id: "TIN" },
];

// Region-aware Scope 3 examples — each shows how supplier evidence
// is anchored in that market using its own tax ID, grid factor and frameworks.
const scope3Examples: Record<string, { headline: string; example: string; frameworks: string }> = {
  IN: {
    headline: "India: GSTIN-anchored supplier chain",
    example: "A Tiruppur textile exporter pulls a yarn purchase invoice carrying the supplier's GSTIN. The line item is matched to the CEA FY 2025-26 India grid factor (0.675 kgCO₂/kWh) for upstream electricity, and the supplier hash links it to a verified peer cluster.",
    frameworks: "BRSR · CBAM · ISSB",
  },
  ID: {
    headline: "Indonesia: NPWP-anchored supplier chain",
    example: "A Jakarta nickel processor's input invoice carries the upstream miner's NPWP. The line item is benchmarked against the Indonesia grid factor (0.761 kgCO₂e/kWh) and OJK-ESG disclosure templates, with anomaly detection flagging suppliers outside the peer cluster.",
    frameworks: "OJK-ESG · CBAM · ISSB",
  },
  VN: {
    headline: "Vietnam: MST-anchored supplier chain",
    example: "A Hai Phong electronics MSME imports components from a Hanoi vendor whose MST appears on every line. Upstream electricity is priced at the Vietnam grid factor (0.625 kgCO₂e/kWh) and the line carries the methodology version pinned for MONRE submission.",
    frameworks: "MONRE-EIA · CBAM",
  },
  BD: {
    headline: "Bangladesh: TIN-anchored supplier chain",
    example: "A Dhaka garment exporter's dye supplier issues an invoice with its TIN. The bill is reconciled against the Bangladesh grid factor (0.623 kgCO₂e/kWh), and the supplier's emission intensity is held against the verified RMG peer cluster.",
    frameworks: "DoE-ECA · CBAM · EU CSDDD",
  },
  PK: {
    headline: "Pakistan: NTN-anchored supplier chain",
    example: "A Faisalabad textile MSME's spinning supplier provides an invoice carrying its NTN. The line is priced at the Pakistan grid factor (0.495 kgCO₂e/kWh), and the methodology version travels with the figure into the SECP-ESG output.",
    frameworks: "SECP-ESG",
  },
  PH: {
    headline: "Philippines: TIN-anchored supplier chain",
    example: "A Cebu electronics assembler receives PCB invoices with the supplier's TIN. The Philippines grid factor (0.505 kgCO₂e/kWh) is applied to upstream electricity, and the figure feeds SEC-ESG and DTI-EO outputs from the same record.",
    frameworks: "SEC-ESG · DTI-EO",
  },
  TH: {
    headline: "Thailand: Tax-ID-anchored supplier chain",
    example: "A Bangkok food-processor's packaging supplier issues an invoice with its 13-digit Tax ID. The line is reconciled against the Thailand grid factor (0.493 kgCO₂e/kWh) and rolled into a TGO-CFO report with the factor source pinned.",
    frameworks: "TGO-CFO · SEC-ESG",
  },
  MY: {
    headline: "Malaysia: SST-ID-anchored supplier chain",
    example: "A Penang E&E manufacturer receives upstream invoices carrying the supplier's SST ID. Energy is priced at the Malaysia grid factor (0.585 kgCO₂e/kWh) and outputs feed Bursa-ESG and MyCarbon disclosures from the same scope ledger.",
    frameworks: "Bursa-ESG · MyCarbon",
  },
  SG: {
    headline: "Singapore: UEN-anchored supplier chain",
    example: "A Singapore logistics MSME's fuel supplier issues an invoice carrying its UEN. The line is priced at the Singapore grid factor (0.408 kgCO₂e/kWh) and routed into an SGX-ESG-aligned disclosure with Carbon Tax Act exposure flagged.",
    frameworks: "SGX-ESG · Carbon Tax Act",
  },
  LK: {
    headline: "Sri Lanka: TIN-anchored supplier chain",
    example: "A Colombo apparel MSME's accessories supplier provides an invoice with its TIN. The Sri Lanka grid factor (0.462 kgCO₂e/kWh) is applied to upstream electricity, with the supplier's intensity anchored to the verified peer cluster.",
    frameworks: "CEA-EIA",
  },
};

// Climate-finance and credit depth now lives in /climate-finance and /carbon-credits.
// Trust keeps a single tight handoff (section 9 below) and ends.

const faqs = [
  {
    q: "How do you know an invoice wasn't fabricated or reused?",
    a: "Every document is hashed with SHA-256 before processing. The same evidence cannot be claimed twice, across users, sessions or time. Duplicates fail at the verification layer with an explicit reason.",
  },
  {
    q: "Where does AI sit in the pipeline?",
    a: "AI is used strictly to parse unstructured inputs into structured fields. Classification (HSN-to-scope), grid factors, and arithmetic are deterministic. When required inputs are missing, the system returns the math reason for failure rather than estimating silently.",
  },
  {
    q: "Why can a lender trust a number that came from an MSME's own invoice?",
    a: "Because the lender isn't trusting the MSME; they're trusting the chain. Every figure traces to a hash-pinned source document the lender can spot-audit, sits inside a confidence band, and carries the methodology version that produced it. Cross-MSME benchmarking lets the lender compare a borrower against verified peers rather than self-reported claims.",
  },
  {
    q: "How is Scope 3 traceability handled outside India?",
    a: "Counterparty linkage is country-aware. The platform uses the local tax identifier auto-selected by country config: GSTIN in India, NPWP in Indonesia, MST in Vietnam, TIN in Thailand and the Philippines, CNPJ in Brazil, VAT in the EU, and so on, so supplier evidence is anchored to a real counterparty in every supported market.",
  },
  {
    q: "What does the Climate Credibility Score actually measure?",
    a: "It aggregates verification quality, data completeness (vendor + date + amount + HSN), history depth, and the green-benefit ratio into a single 0–100 band (A+ to D). Higher bands mean denser, better-attested evidence, not better marketing.",
  },
  {
    q: "How do you prevent greenwashing?",
    a: "Six structural defenses: universal SHA-256 deduplication, immutable pre-processing stubs, methodology and factor pinning per output, deterministic failure when inputs are missing, an additionality lock on credit-eligible records, and cross-MSME peer challenge before disclosure. Verification you can challenge, and that holds up when challenged.",
  },
  {
    q: "Can an auditor trace a reported figure to its evidence?",
    a: "Framework outputs (CBAM, BRSR, GHG Protocol, ISSB, TCFD, GRI, CSRD) are produced from the same scope ledger with the methodology version and factor source attached. Auditors can trace any figure back to its evidence hash.",
  },
  {
    q: "How is confidentiality preserved between MSMEs, lenders, and buyers?",
    a: "Row-Level Security on every table; IP addresses are hashed; lenders and buyers see anonymised decision-grade signals, not raw invoices. Cross-tenant access is impossible by construction.",
  },
  {
    q: "Which countries are supported with localised factors?",
    a: "India, Bangladesh, Indonesia, Vietnam, the Philippines, Pakistan, Singapore, Thailand, Malaysia and Sri Lanka, each with localised grid factors, tax IDs, and document formats. CBAM and EU exporters are supported across CN customs codes.",
  },
];

const Trust = () => {
  // Redirected article URLs land on /trust#<safeguard>; scroll there once the
  // lazily loaded page has rendered.
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(decodeURIComponent(hash.slice(1)));
    // A safeguard panel opens itself (SafeguardReader); scroll to its section.
    const target = el?.hidden ? document.getElementById("safeguards") : el;
    target?.scrollIntoView({ block: "start" });
  }, [hash]);
  const faqSchema = faqs.map(f => ({ question: f.q, answer: f.a }));
  const [scope3Country, setScope3Country] = useState<string>(() => detectMarket(Object.keys(scope3Examples)));
  // Only markets with a worked example are offered (the region list used to
  // include countries without one, which broke this section).
  const nameOfMarket = (code: string) => COUNTRY_CONFIGS[code]?.name;
  const codeOfCountry = (country: string) => Object.keys(scope3Examples).find(code => nameOfMarket(code) === country);



  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Trust & Technical Validation"
        description="How Senseible validates MSME climate data: trust layers, MRV architecture, framework alignment, Scope 3 traceability, confidence scoring, and greenwashing prevention, for partners, auditors, buyers and lenders."
        canonical="/trust"
        image={`https://senseible.earth${trustOg}`}
        keywords={[
          "MRV validation", "carbon data trust layer", "Scope 3 traceability",
          "carbon confidence score", "greenwashing prevention", "CBAM evidence",
          "climate finance readiness", "carbon credit validation",
          "ESG intelligence", "audit-grade carbon data",
        ]}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Trust & Validation", url: "/trust" },
        ]}
        faqSchema={faqSchema}
      />

      <Navigation />

      <main>
        {/* Hero */}
        <section className="border-b border-border">
          <div className="container max-w-5xl mx-auto px-6 py-20 md:py-28 text-center">
            <h1 className="text-4xl md:text-6xl font-semibold tracking-tight text-foreground mb-6">
              Trust &amp; Technical Validation
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              How Senseible turns ordinary business documents into evidence that auditors,
              lenders, carbon-credit buyers, enterprises, and ESG teams can independently rely on.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-2">
              {["Deterministic", "SHA-256 evidence", "RLS isolated", "Methodology-pinned", "Framework-aligned"].map(t => (
                <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
              ))}
            </div>
          </div>
        </section>

        {/* Sticky anchor nav */}
        <nav aria-label="On this page" className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
          <div className="container max-w-6xl mx-auto px-6 overflow-x-auto">
            <ul className="flex gap-1 py-3 text-sm whitespace-nowrap">
              {sections.map(s => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* 1. Trust Layers */}
        <section id="layers" className="py-20 border-b border-border">
          <div className="container max-w-5xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-primary"><Glyph name="layers" /></span>
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Trust Layers</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-semibold mb-4">Four layers. One unbroken chain.</h2>
            <p className="text-muted-foreground max-w-2xl mb-10">
              Evidence flows through four layers. Each one is independently verifiable and leaves a trail the next layer cannot rewrite.
            </p>
            <SealChain layers={trustLayers} />
          </div>
        </section>

        {/* 2. Data Sources */}
        <section id="sources" className="py-20 border-b border-border bg-secondary/30">
          <div className="container max-w-5xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-primary"><Glyph name="ledger" /></span>
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Data Sources &amp; Verification</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-semibold mb-4">Every input has a defined verification path</h2>
            <p className="text-muted-foreground max-w-2xl mb-10">
              Nothing is accepted at face value. Nothing is silently estimated when a required field is missing.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              {dataSources.map(s => (
                <Card key={s.name} className="border-border">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-md bg-background border border-border text-primary">
                        <Glyph name={s.icon} className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-medium mb-2">{s.name}</h3>
                        <ScanLine><p className="text-xs text-muted-foreground mb-1"><span className="text-foreground/80">What we read: </span>{s.what}</p></ScanLine>
                        <p className="text-xs text-muted-foreground"><span className="text-foreground/80">How it's verified: </span>{s.verify}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* 3. MRV Architecture */}
        <section id="mrv" className="py-20 border-b border-border">
          <div className="container max-w-5xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-primary"><Glyph name="network" /></span>
              <span className="text-xs uppercase tracking-wider text-muted-foreground">MRV Architecture</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-semibold mb-4">From document to disclosure</h2>
            <p className="text-muted-foreground max-w-2xl mb-10">
              A five-step pipeline. Deterministic where it matters; AI only where it earns its place.
            </p>
            <Card className="border-border">
              <CardContent className="p-6 md:p-10">
                <div className="hidden md:block"><PipelineTrack steps={5} /></div>
                <ol className="grid md:grid-cols-5 gap-4">
                  {[
                    { step: "Ingest", desc: "Document, photo, bill, or signal arrives." },
                    { step: "Stub + Hash", desc: "SHA-256 fingerprint and audit stub written before processing." },
                    { step: "Parse", desc: "AI extracts structured fields from unstructured inputs only." },
                    { step: "Deterministic rules", desc: "HSN → scope, country grid factor, math reconciliation." },
                    { step: "Attest", desc: "Methodology version + factor source + evidence hash locked." },
                  ].map((s, i) => (
                    <li key={s.step} className="relative">
                      <div className="p-4 rounded-lg bg-secondary/50 border border-border h-full">
                        <div className="text-xs text-muted-foreground mb-2">Step {i + 1}</div>
                        <div className="font-medium text-sm mb-1">{s.step}</div>
                        <p className="text-xs text-muted-foreground">{s.desc}</p>
                      </div>
                      {i < 4 && (
                        <ArrowRight className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
                      )}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 4. ESG Intelligence — outcome multiplier */}
        <section id="intelligence" className="py-20 border-b border-border bg-secondary/30">
          <div className="container max-w-5xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-primary"><Glyph name="spark" /></span>
              <span className="text-xs uppercase tracking-wider text-muted-foreground">ESG Intelligence Engine</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-semibold mb-4">One verified ledger. Every framework. Every decision.</h2>
            <p className="text-muted-foreground max-w-3xl mb-10">
              Biocog superintelligence reads the scope ledger once and serves every disclosure, every reduction recommendation,
              and every finance signal from it. Sustainability teams stop re-keying numbers across spreadsheets and start
              compounding insight from a shared memory of every invoice processed.
            </p>
            <LedgerFanOut targets={["CBAM", "BRSR", "GHG Protocol", "ISSB", "CSRD", "TCFD", "GRI", "SBTi"]} />
            <div className="grid md:grid-cols-2 gap-4">
              {[
                {
                  title: "Do more in less time",
                  body: "One ingestion event produces CBAM, BRSR, GHG Protocol, ISSB, CSRD, TCFD, GRI and SBTi outputs with no re-keying. Work that took weeks per framework collapses into a single verified record.",
                },
                {
                  title: "Reduce cost from invoice memory",
                  body: "The platform surfaces duplicate spend, high-emission supplier substitutes, and energy-mix arbitrage hidden in your own purchase history, with each reduction routed into the Net-Zero engine as a tracked action.",
                },
                {
                  title: "Maximize net-zero progress",
                  body: "Sector-aware reduction levers (energy, logistics, supplier swap, green-tariff) are ranked by tCO₂e impact per unit of spend, so the next action is always the one with the largest measurable return.",
                },
                {
                  title: "Evidence-linked by default",
                  body: "Methodology version, factor source, and evidence hash lock at write time. Disclosures compound credibility instead of depreciating between audit cycles.",
                },
              ].map(b => (
                <Card key={b.title} className="border-border">
                  <CardContent className="p-6">
                    <div className="text-base font-medium mb-2">{b.title}</div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{b.body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-2">
              <Badge variant="outline">Same ledger · eight frameworks · zero re-keying</Badge>
              <Badge variant="outline">Every reduction action traces to a verified invoice</Badge>
            </div>
          </div>
        </section>

        {/* 5. Frameworks */}
        <section id="frameworks" className="py-20 border-b border-border">
          <div className="container max-w-5xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-primary"><Glyph name="scroll" /></span>
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Reporting Frameworks</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-semibold mb-4">Framework coverage matrix</h2>
            <p className="text-muted-foreground max-w-2xl mb-10">
              Each framework is fed from the same evidence ledger. Methodology versions and factor sources travel with every figure.
            </p>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-medium">Framework</th>
                    <th className="px-4 py-3 font-medium">Coverage</th>
                    <th className="px-4 py-3 font-medium">Primary evidence</th>
                  </tr>
                </thead>
                <tbody>
                  {frameworks.map((f, i) => (
                    <tr key={f.name} className={i % 2 === 0 ? "" : "bg-secondary/20"}>
                      <td className="px-4 py-3 font-medium">{f.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{f.coverage}</td>
                      <td className="px-4 py-3 text-muted-foreground">{f.evidence}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* 6. Scope 3 — emerging-markets reframing */}
        <section id="scope3" className="py-20 border-b border-border bg-secondary/30">
          <div className="container max-w-5xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-primary"><Glyph name="network" /></span>
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Scope 3 Traceability</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-semibold mb-4">Supplier evidence enterprises can't gather alone</h2>
            <p className="text-muted-foreground max-w-3xl mb-8">
              In emerging markets, most suppliers don't publish PCFs. Enterprises fall back on sector averages and lose
              defensibility under CBAM, ISSB, and CSRD. Senseible fills that gap with your suppliers' real numbers, compared against thousands of similar MSMEs.
            </p>

            <div className="grid md:grid-cols-2 gap-4 mb-8">
              <Card className="border-border">
                <CardContent className="p-6">
                  <div className="text-sm font-medium mb-2">Anomaly detection across the network</div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Supplier emission intensity is flagged when it deviates beyond 2σ from the peer cluster mean for the same
                    HSN/CN code and country grid factor. Outliers surface before they reach a disclosure.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-6">
                  <div className="text-sm font-medium mb-2">Cluster benchmarking no single enterprise can build</div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Sector benchmarks come from verified MSME records, not generic industry averages from old reports.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-6">
                  <div className="text-sm font-medium mb-2">Country-aware counterparty linkage</div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                    The platform anchors upstream claims to the local tax identifier auto-selected by country config.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {countryIds.map(c => {
                      const code = codeOfCountry(c.country);
                      const selected = code === scope3Country;
                      return (
                        <button key={c.country} type="button" disabled={!code} onClick={() => code && setScope3Country(code)} aria-pressed={selected}
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-mono transition-colors ${selected ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-primary/15"}`}>
                          {c.country} · {c.id}
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-6">
                  <div className="text-sm font-medium mb-2">Hash-anchored, factor-versioned, per line</div>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" /> Supplier-document hash recorded</li>
                    <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" /> Counterparty identifier linked</li>
                    <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" /> Methodology version pinned per line</li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Region-aware Scope 3 example: pick a market, the flow redraws for it. */}
            <Scope3Explorer examples={scope3Examples} countryIds={countryIds} nameOf={nameOfMarket} value={scope3Country} onChange={setScope3Country} />

            <p className="text-base text-foreground/90 italic max-w-3xl mt-8">
              Same architecture, anchored to the right identifier and the right grid factor in every market.
            </p>

            <p className="mt-8 text-sm text-muted-foreground">
              Managing hundreds of suppliers?{" "}
              <Link to="/enterprise" className="text-foreground underline underline-offset-4">How supplier emissions work for enterprises</Link>
            </p>
          </div>
        </section>

        {/* 7. Scoring */}
        <section id="scoring" className="py-20 border-b border-border">
          <div className="container max-w-5xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-primary"><Glyph name="gauge" /></span>
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Carbon &amp; Confidence Scoring</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-semibold mb-4">A score you can audit</h2>
            <p className="text-muted-foreground max-w-2xl mb-10">
              The Climate Credibility Score is a single 0–100 band derived from four observable inputs. It rewards denser,
              better-attested evidence, not narrative quality.
            </p>
            <ScoreComposer
              inputs={[
                { name: "Verification quality", desc: "Average verification outcome across records." },
                { name: "Green-benefit ratio", desc: "Share of records eligible for green benefit." },
                { name: "Data completeness", desc: "Vendor + date + amount + HSN present." },
                { name: "History depth", desc: "Count of verified invoices over time." },
              ]}
              bands={["A+ ≥ 90", "A ≥ 75", "B ≥ 55", "C ≥ 35", "D < 35"]}
            />
          </div>
        </section>

        {/* 8. Greenwashing — structural defense */}
        <section id="greenwashing" className="py-20 border-b border-border bg-secondary/30">
          <div className="container max-w-5xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-primary"><Glyph name="alert" /></span>
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Greenwashing Prevention</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-semibold mb-4">Greenwashing is blocked by how the system works</h2>
            <p className="text-muted-foreground max-w-3xl mb-10">
              Six checks work together so a claim cannot be inflated, reused or quietly reset after the fact.
            </p>
            <ClaimGauntlet
              mechanisms={[
                {
                  name: "Universal SHA-256 deduplication",
                  desc: "Every document is fingerprinted across users, sessions and time. The same invoice cannot be claimed by two MSMEs or twice by one.",
                },
                {
                  name: "Immutable pre-processing stub",
                  desc: "An audit row is written before parsing begins. Failed or abandoned runs still leave a record: no silent retries, no quiet edits.",
                },
                {
                  name: "Methodology & factor pinning per output",
                  desc: "Each disclosure stores its methodology version and factor source. Retroactive factor changes are visible in the audit trail; nothing is overwritten.",
                },
                {
                  name: "Deterministic failure",
                  desc: "Missing inputs return a math-based failure reason. The platform never estimates to fill a gap; gaps stay visible until they are resolved.",
                },
                {
                  name: "Additionality lock on credits",
                  desc: "Only records that clear additionality, evidence linkage, and methodology lock are passed on as a credit signal from their invoice evidence. Credit generation itself is carried out offline, outside the platform. Everything else is held back.",
                },
                {
                  name: "Cross-MSME peer challenge",
                  desc: "Anomalous values are flagged against the verified peer cluster before they reach a buyer or auditor, reducing the surface for after-the-fact disputes.",
                },
              ]}
            />
            <p className="mt-8 text-base text-foreground/90 italic">
              "Verification you can challenge, and that holds up when challenged."
            </p>
          </div>
        </section>

        {/* 9. Handoff — where this verified ledger goes next */}
        <section id="handoff" className="py-20 border-b border-border">
          <div className="container max-w-5xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-primary"><Glyph name="arrow" /></span>
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Where this ledger goes next</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-semibold mb-4">Once verified, a record can go to a lender or a credit buyer</h2>
            <p className="text-muted-foreground max-w-3xl mb-10">
              The verified scope ledger described above is the primitive. Two of its downstream uses have their own dedicated
              pages, with the lender mechanics, the credit gates, and the regulatory grounding spelled out in full.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="border-border">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-primary"><Glyph name="banknote" className="h-4 w-4" /></span>
                    <div className="text-sm font-medium">Climate &amp; green finance</div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    Lenders, factors and incentive desks consume hash-pinned figures, confidence bands, methodology lock,
                    and the Climate Credibility Score, not borrower self-declarations. Senseible is not a lender; it is
                    the verification primitive each of those institutions consumes.
                  </p>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/climate-finance">See the climate-finance flow <ArrowRight className="h-3.5 w-3.5 ml-2" /></Link>
                  </Button>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-primary"><Glyph name="coin" className="h-4 w-4" /></span>
                    <div className="text-sm font-medium">Carbon credit validation</div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    Records that clear additionality, evidence linkage and methodology lock become credit-ready signals.
                    Buyers consume a decision-grade signal, not raw MSME data. The three gates and the underlying
                    workflow are documented on the carbon credits page.
                  </p>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/carbon-credits">See carbon credit flow <ArrowRight className="h-3.5 w-3.5 ml-2" /></Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>


        {/* 11. Net-Zero */}
        <section id="netzero" className="py-20 border-b border-border">
          <div className="container max-w-5xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-primary"><Glyph name="target" /></span>
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Net-Zero Enablement</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-semibold mb-4">Baseline → roadmap → tracked tasks</h2>
            <p className="text-muted-foreground max-w-3xl mb-8">
              The Net-Zero engine consumes the same scope ledger that feeds disclosure. A baseline becomes a sector-aware
              roadmap; progress is measured against the original methodology so reductions are real, not re-baselined.
            </p>
            <Button asChild variant="outline">
              <Link to="/net-zero">Explore the Net-Zero engine <ArrowRight className="h-4 w-4 ml-2" /></Link>
            </Button>
          </div>
        </section>

        {/* Governance */}
        <section id="governance" className="py-20 border-b border-border bg-secondary/30">
          <div className="container max-w-5xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-primary"><Glyph name="lock" /></span>
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Governance &amp; Security</span>
            </div>
            <LockDoodle />
            <h2 className="text-3xl md:text-4xl font-semibold mb-4">Private by default</h2>
            <p className="text-muted-foreground max-w-3xl mb-8">
              Enterprise data paths follow zero-trust principles: explicit authorization, least-privilege access,
              tenant-scoped records and traceable actions. This describes the platform architecture, not a third-party certification.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { name: "Account-scoped data access", desc: "Policies restrict authenticated business records to authorized account and organization contexts." },
                { name: "IP-address hashing", desc: "Operational logs never store raw identifiers." },
                { name: "Centralised audit ledger", desc: "Verification and evidence actions retain traceable references." },
                { name: "Methodology version pinning", desc: "Every output carries its factor source and version." },
              ].map(g => (
                <Card key={g.name} className="border-border">
                  <CardContent className="p-5">
                    <div className="text-sm font-medium mb-2">{g.name}</div>
                    <p className="text-xs text-muted-foreground">{g.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Safeguards: replaces the earlier one-feature-per-article pieces */}
        <section id="safeguards" className="py-20 border-b border-border bg-secondary/30">
          <div className="container max-w-5xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-semibold mb-4">How each safeguard works</h2>
            <p className="text-muted-foreground mb-10 max-w-2xl">
              The checks that sit between an uploaded document and a figure you can put in front of an auditor, lender or buyer.
            </p>
            <SafeguardReader items={trustSafeguards} />
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-20 border-b border-border">
          <div className="container max-w-3xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-semibold mb-8 text-center">Frequently asked</h2>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((f, i) => (
                <AccordionItem key={i} value={`item-${i}`}>
                  <AccordionTrigger className="text-left text-base">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* CTAs */}
        <section className="py-20">
          <div className="container max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-2xl md:text-3xl font-semibold mb-4">Use verified MSME data in your work</h2>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              For climate-finance partners, carbon buyers, ESG consultants and auditors evaluating Senseible-verified data.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild><Link to="/partners">Partner with Senseible</Link></Button>
              <Button asChild variant="outline"><Link to="/contact">Talk to the team</Link></Button>
              <Button asChild variant="ghost"><Link to="/principles">Read our operating principles</Link></Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Trust;
