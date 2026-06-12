import { Link } from "react-router-dom";
import { SEOHead } from "@/components/SEOHead";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Shield, Database, FileCheck, Network, Layers, Satellite, MapPin,
  Wifi, FileText, Building2, Gauge, AlertTriangle, Coins, Banknote,
  Target, Lock, ArrowRight, CheckCircle2, GitBranch, ScrollText, Sparkles,
} from "lucide-react";

const sections = [
  { id: "layers", label: "Trust Layers" },
  { id: "sources", label: "Data Sources" },
  { id: "mrv", label: "MRV Architecture" },
  { id: "intelligence", label: "ESG Intelligence" },
  { id: "frameworks", label: "Frameworks" },
  { id: "scope3", label: "Scope 3" },
  { id: "scoring", label: "Confidence Score" },
  { id: "greenwashing", label: "Greenwashing" },
  { id: "credits", label: "Credit Validation" },
  { id: "finance", label: "Climate Finance" },
  { id: "netzero", label: "Net-Zero" },
  { id: "governance", label: "Governance" },
  { id: "faq", label: "FAQ" },
];

const trustLayers = [
  {
    icon: FileText,
    name: "Evidence Layer",
    desc: "Every document is fingerprinted with SHA-256 before processing. A pre-processing stub is written first, so even failed runs leave an audit trail. The same invoice cannot be claimed twice — across users, sessions, or time.",
  },
  {
    icon: FileCheck,
    name: "Verification Layer",
    desc: "Deterministic HSN-to-scope mapping, country grid factors (IEA 2023), and math reconciliation. Missing inputs return a math-based failure reason — never a silent estimate.",
  },
  {
    icon: Sparkles,
    name: "Intelligence Layer",
    desc: "Biocog superintelligence reads the scope ledger as the single source of truth and projects it into every framework view non-destructively. The same number appears in every report because it comes from the same record.",
  },
  {
    icon: ScrollText,
    name: "Disclosure & Decision Layer",
    desc: "Framework-aligned outputs (CBAM, BRSR, GHG Protocol, CSRD, ISSB, TCFD, GRI, SBTi) carry the audit trail, confidence bands, and Climate Credibility Score (A+ to D) with them — ready for auditors, lenders, and buyers.",
  },
];

const dataSources = [
  { icon: FileText, name: "Tax invoices & purchase records", what: "Vendor, line items, HSN/CN codes, amounts, dates", verify: "Schema, math reconciliation, vendor pattern match" },
  { icon: Gauge, name: "Utility & energy bills", what: "kWh, kVAH, period, distributor", verify: "Period continuity, consumption sanity, country grid-factor lookup" },
  { icon: Wifi, name: "IoT & meter signals", what: "Sub-metered electricity, fuel, water telemetry", verify: "Device identity, timestamp gaps, drift detection" },
  { icon: Database, name: "Operational records", what: "Production logs, fuel consumption, freight manifests", verify: "Cross-check against invoices and supplier evidence" },
  { icon: Satellite, name: "Satellite & remote signals", what: "Plot boundaries, change detection where applicable", verify: "Source provenance and acquisition-date stamping" },
  { icon: MapPin, name: "Geotagging", what: "Facility coordinates, plant boundaries", verify: "Country-config alignment with grid factor and tax ID format" },
  { icon: Building2, name: "Supplier evidence", what: "Supplier-issued PCFs, certifications, counterparty IDs", verify: "Buyer–supplier identifier linkage and methodology check" },
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
  { country: "Thailand", id: "TIN" },
  { country: "Philippines", id: "TIN" },
  { country: "Malaysia", id: "TIN" },
  { country: "Bangladesh", id: "BIN" },
  { country: "Pakistan", id: "NTN" },
  { country: "Brazil", id: "CNPJ" },
  { country: "EU", id: "VAT" },
];

const faqs = [
  {
    q: "How do you know an invoice wasn't fabricated or reused?",
    a: "Every document is hashed with SHA-256 before processing. The same evidence cannot be claimed twice — across users, sessions, or time. Duplicates fail at the verification layer with an explicit reason.",
  },
  {
    q: "Where does AI sit in the pipeline?",
    a: "AI is used strictly to parse unstructured inputs into structured fields. Classification (HSN-to-scope), grid factors, and arithmetic are deterministic. When required inputs are missing, the system returns the math reason for failure rather than estimating silently.",
  },
  {
    q: "Why can a lender trust a number that came from an MSME's own invoice?",
    a: "Because the lender isn't trusting the MSME — they're trusting the chain. Every figure traces to a hash-pinned source document the lender can spot-audit, sits inside a confidence band, and carries the methodology version that produced it. Cross-MSME benchmarking lets the lender compare a borrower against verified peers rather than self-reported claims.",
  },
  {
    q: "How is Scope 3 traceability handled outside India?",
    a: "Counterparty linkage is country-aware. The platform uses the local tax identifier auto-selected by country config — GSTIN in India, NPWP in Indonesia, MST in Vietnam, TIN in Thailand and the Philippines, CNPJ in Brazil, VAT in the EU, and so on — so supplier evidence is anchored to a real counterparty in every supported market.",
  },
  {
    q: "What does the Climate Credibility Score actually measure?",
    a: "It aggregates verification quality, data completeness (vendor + date + amount + HSN), history depth, and the green-benefit ratio into a single 0–100 band (A+ to D). Higher bands mean denser, better-attested evidence — not better marketing.",
  },
  {
    q: "How do you prevent greenwashing?",
    a: "Five structural defenses: universal SHA-256 deduplication, immutable pre-processing stubs, methodology and factor pinning per output, deterministic failure when inputs are missing, and an additionality lock on credit-eligible records. Verification you can challenge — and that holds up when challenged.",
  },
  {
    q: "Are reporting outputs audit-ready?",
    a: "Framework outputs (CBAM, BRSR, GHG Protocol, ISSB, TCFD, GRI, CSRD) are produced from the same scope ledger with the methodology version and factor source attached. Auditors can trace any figure back to its evidence hash.",
  },
  {
    q: "How is confidentiality preserved between MSMEs, lenders, and buyers?",
    a: "Row-Level Security on every table; IP addresses are hashed; lenders and buyers see anonymised decision-grade signals — not raw invoices. Cross-tenant access is impossible by construction.",
  },
  {
    q: "Which countries are supported with localised factors?",
    a: "India, Bangladesh, Indonesia, Vietnam, the Philippines, Pakistan, Singapore, Thailand, Malaysia and Sri Lanka — each with localised grid factors, tax IDs, and document formats. CBAM and EU exporters are supported across CN customs codes.",
  },
];

const Trust = () => {
  const faqSchema = faqs.map(f => ({ question: f.q, answer: f.a }));

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Trust & Technical Validation"
        description="How Senseible validates MSME climate data: trust layers, MRV architecture, framework alignment, Scope 3 traceability, confidence scoring, and greenwashing prevention — for partners, auditors, buyers and lenders."
        canonical="/trust"
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
              <Layers className="h-5 w-5 text-primary" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Trust Layers</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-semibold mb-4">Four layers. One unbroken chain.</h2>
            <p className="text-muted-foreground max-w-2xl mb-10">
              Evidence flows through four layers. Each one is independently verifiable and leaves a trail the next layer cannot rewrite.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {trustLayers.map((l, i) => (
                <Card key={l.name} className="border-border">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <l.icon className="h-5 w-5 text-primary" />
                      <span className="text-xs text-muted-foreground">0{i + 1}</span>
                    </div>
                    <CardTitle className="text-base mt-3">{l.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed">{l.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* 2. Data Sources */}
        <section id="sources" className="py-20 border-b border-border bg-secondary/30">
          <div className="container max-w-5xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-3">
              <Database className="h-5 w-5 text-primary" />
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
                      <div className="p-2 rounded-md bg-background border border-border">
                        <s.icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-medium mb-2">{s.name}</h3>
                        <p className="text-xs text-muted-foreground mb-1"><span className="text-foreground/80">What we read: </span>{s.what}</p>
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
              <Network className="h-5 w-5 text-primary" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground">MRV Architecture</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-semibold mb-4">From document to disclosure</h2>
            <p className="text-muted-foreground max-w-2xl mb-10">
              A five-step pipeline. Deterministic where it matters; AI only where it earns its place.
            </p>
            <Card className="border-border">
              <CardContent className="p-6 md:p-10">
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
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground">ESG Intelligence Engine</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-semibold mb-4">One verified ledger. Every framework. Every decision.</h2>
            <p className="text-muted-foreground max-w-3xl mb-10">
              Biocog superintelligence reads the scope ledger once and serves every disclosure, every reduction recommendation,
              and every finance signal from it. Sustainability teams stop re-keying numbers across spreadsheets and start
              compounding insight from a shared memory of every invoice processed.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                {
                  title: "Do more in less time",
                  body: "One ingestion event produces CBAM, BRSR, GHG Protocol, ISSB, CSRD, TCFD, GRI and SBTi outputs with no re-keying. Work that took weeks per framework collapses into a single verified record.",
                },
                {
                  title: "Reduce cost from invoice memory",
                  body: "The platform surfaces duplicate spend, high-emission supplier substitutes, and energy-mix arbitrage hidden in your own purchase history — each reduction routed into the Net-Zero engine as a tracked action.",
                },
                {
                  title: "Maximize net-zero progress",
                  body: "Sector-aware reduction levers (energy, logistics, supplier swap, green-tariff) are ranked by tCO₂e impact per unit of spend, so the next action is always the one with the largest measurable return.",
                },
                {
                  title: "Audit-ready by default",
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
              <ScrollText className="h-5 w-5 text-primary" />
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
              <Network className="h-5 w-5 text-primary" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Scope 3 Traceability</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-semibold mb-4">Supplier evidence enterprises can't gather alone</h2>
            <p className="text-muted-foreground max-w-3xl mb-8">
              In emerging markets, most suppliers don't publish PCFs. Enterprises fall back on sector averages and lose
              defensibility under CBAM, ISSB, and CSRD. Senseible's cross-MSME footprint turns that gap into a primary-data
              network — your suppliers' real numbers, benchmarked against thousands of peers.
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
                    Sector medians come from verified MSME activity across the network — peer-normalized scores instead of
                    generic industry averages from outdated reports.
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
                    {countryIds.map(c => (
                      <Badge key={c.country} variant="secondary" className="text-[11px] font-mono">
                        {c.country} · {c.id}
                      </Badge>
                    ))}
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

            <p className="text-base text-foreground/90 italic max-w-3xl">
              "Your suppliers' real data, benchmarked against thousands of peers — not a sector average from 2019."
            </p>
          </div>
        </section>

        {/* 7. Scoring */}
        <section id="scoring" className="py-20 border-b border-border">
          <div className="container max-w-5xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-3">
              <Gauge className="h-5 w-5 text-primary" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Carbon &amp; Confidence Scoring</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-semibold mb-4">A score you can audit</h2>
            <p className="text-muted-foreground max-w-2xl mb-10">
              The Climate Credibility Score is a single 0–100 band derived from four observable inputs. It rewards denser,
              better-attested evidence — not narrative quality.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { name: "Verification quality", desc: "Average verification outcome across records." },
                { name: "Green-benefit ratio", desc: "Share of records eligible for green benefit." },
                { name: "Data completeness", desc: "Vendor + date + amount + HSN present." },
                { name: "History depth", desc: "Count of verified documents over time." },
              ].map(b => (
                <Card key={b.name} className="border-border">
                  <CardContent className="p-5">
                    <div className="text-sm font-medium mb-2">{b.name}</div>
                    <p className="text-xs text-muted-foreground">{b.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mt-6">
              {["A+ ≥ 90", "A ≥ 75", "B ≥ 55", "C ≥ 35", "D < 35"].map(g => (
                <Badge key={g} variant="outline" className="text-xs">{g}</Badge>
              ))}
            </div>
          </div>
        </section>

        {/* 8. Greenwashing — structural defense */}
        <section id="greenwashing" className="py-20 border-b border-border bg-secondary/30">
          <div className="container max-w-5xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle className="h-5 w-5 text-primary" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Greenwashing Prevention</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-semibold mb-4">Structural defense, not a disclaimer</h2>
            <p className="text-muted-foreground max-w-3xl mb-10">
              Greenwashing is prevented by the architecture, not by policy. Five mechanisms work together so a claim cannot
              be inflated, recycled, or quietly re-baselined after the fact.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                {
                  name: "Universal SHA-256 deduplication",
                  desc: "Every document is fingerprinted across users, sessions and time. The same invoice cannot be claimed by two MSMEs or twice by one.",
                },
                {
                  name: "Immutable pre-processing stub",
                  desc: "An audit row is written before parsing begins. Failed or abandoned runs still leave a record — no silent retries, no quiet edits.",
                },
                {
                  name: "Methodology & factor pinning per output",
                  desc: "Each disclosure stores its methodology version and factor source. Retroactive factor changes are visible in the audit trail; nothing is overwritten.",
                },
                {
                  name: "Deterministic failure",
                  desc: "Missing inputs return a math-based failure reason. The platform never estimates to fill a gap — gaps stay visible until they are resolved.",
                },
                {
                  name: "Additionality lock on credits",
                  desc: "Only records that clear additionality, evidence linkage, and methodology lock are eligible for credit generation. Everything else is held back.",
                },
                {
                  name: "Cross-MSME peer challenge",
                  desc: "Anomalous values are flagged against the verified peer cluster before they reach a buyer or auditor — reducing the surface for after-the-fact disputes.",
                },
              ].map(m => (
                <Card key={m.name} className="border-border">
                  <CardContent className="p-5">
                    <div className="text-sm font-medium mb-2">{m.name}</div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{m.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <p className="mt-8 text-base text-foreground/90 italic">
              "Verification you can challenge — and that holds up when challenged."
            </p>
          </div>
        </section>

        {/* 9. Credit Validation */}
        <section id="credits" className="py-20 border-b border-border">
          <div className="container max-w-5xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-3">
              <Coins className="h-5 w-5 text-primary" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Carbon Credit Validation</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-semibold mb-4">From verified record to credit-ready signal</h2>
            <p className="text-muted-foreground max-w-3xl mb-8">
              Records eligible for credit consideration must clear three gates: additionality, evidence linkage
              (hash-anchored), and methodology lock (the version used cannot drift). Buyers consume a decision-grade signal
              — not raw MSME data.
            </p>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { name: "Additionality flag", desc: "Activity meets the baseline additionality test." },
                { name: "Evidence linkage", desc: "Every claim traces to a SHA-256 hash." },
                { name: "Methodology lock", desc: "Factor source and version pinned to the record." },
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

        {/* 10. Climate Finance — why lenders can act on it */}
        <section id="finance" className="py-20 border-b border-border bg-secondary/30">
          <div className="container max-w-5xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-3">
              <Banknote className="h-5 w-5 text-primary" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Climate &amp; Green Finance</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-semibold mb-4">Why a lender can underwrite against this data</h2>
            <p className="text-muted-foreground max-w-3xl mb-10">
              Lenders don't trust borrower self-declarations — they trust verifiable chains. Every figure that reaches a
              bank, factoring desk, or government incentive scheme carries the proof of how it was produced.
            </p>
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              {[
                {
                  title: "Hash-pinned, spot-auditable",
                  body: "Every scope total traces to the source document. The lender can spot-check any line item without ever taking custody of the borrower's invoices.",
                },
                {
                  title: "Confidence bands, never false precision",
                  body: "Each figure carries the uncertainty band that produced it. The lender sees the range, not a fabricated point estimate.",
                },
                {
                  title: "Methodology locked at disclosure time",
                  body: "The factor source and methodology version are frozen with the output. A 2026 disclosure stays a 2026 disclosure even after factors evolve.",
                },
                {
                  title: "Climate Credibility Score (0–100)",
                  body: "A single underwriting-ready signal aggregating verification quality, completeness, history depth, and green-benefit ratio — graded A+ to D.",
                },
                {
                  title: "Cross-MSME peer comparison",
                  body: "The borrower is benchmarked against verified peers in the same sector and country — not against a self-reported claim or a global average.",
                },
                {
                  title: "Decision-grade, not raw",
                  body: "Lenders receive instrument fit (green loan, factoring, SLL), eligibility band, and evidence depth — borrower documents stay private.",
                },
              ].map(b => (
                <Card key={b.title} className="border-border">
                  <CardContent className="p-6">
                    <div className="text-sm font-medium mb-2">{b.title}</div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{b.body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              The same verified ledger maps to government incentive schemes across emerging markets — including SIDBI,
              IREDA, and MNRE in India, with equivalent programmes wired through country config elsewhere.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline"><Link to="/climate-finance">See the full climate-finance flow <ArrowRight className="h-4 w-4 ml-2" /></Link></Button>
              <Button asChild variant="ghost"><Link to="/partners">For lenders &amp; partners</Link></Button>
            </div>
          </div>
        </section>

        {/* 11. Net-Zero */}
        <section id="netzero" className="py-20 border-b border-border">
          <div className="container max-w-5xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-3">
              <Target className="h-5 w-5 text-primary" />
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
              <Lock className="h-5 w-5 text-primary" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Governance &amp; Security</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-semibold mb-4">Private by default</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { name: "Row-Level Security on every table", desc: "Cross-tenant access is impossible by construction." },
                { name: "IP-address hashing", desc: "Operational logs never store raw identifiers." },
                { name: "Centralised audit ledger", desc: "Sensitive actions are recorded with immutable references." },
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
            <h2 className="text-2xl md:text-3xl font-semibold mb-4">Bring this trust layer to your team</h2>
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
