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
  Target, Lock, ArrowRight, CheckCircle2, GitBranch, ScrollText,
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
  { id: "finance", label: "Finance Readiness" },
  { id: "netzero", label: "Net-Zero" },
  { id: "governance", label: "Governance" },
  { id: "faq", label: "FAQ" },
];

const trustLayers = [
  { icon: FileText, name: "Evidence", desc: "Raw documents and signals captured with SHA-256 fingerprints before any processing begins." },
  { icon: FileCheck, name: "Verification", desc: "Deterministic rules — HSN-to-scope mapping, IEA 2023 grid factors, math-based failure when inputs are insufficient." },
  { icon: Shield, name: "Attestation", desc: "Methodology version, factor source, and evidence hash locked together in an immutable record." },
  { icon: ScrollText, name: "Disclosure", desc: "Framework-aligned outputs (CBAM, BRSR, GHG Protocol, ISSB) with the underlying audit trail attached." },
];

const dataSources = [
  { icon: FileText, name: "Tax invoices & GST records", what: "Vendor, line items, HSN codes, amounts, dates", verify: "Schema, math reconciliation, vendor pattern match" },
  { icon: Gauge, name: "Utility & energy bills", what: "kWh, kVAH, period, distributor", verify: "Period continuity, consumption sanity, grid-factor lookup" },
  { icon: Wifi, name: "IoT & meter signals", what: "Sub-metered electricity, fuel, water telemetry", verify: "Device identity, timestamp gaps, drift detection" },
  { icon: Database, name: "Operational records", what: "Production logs, fuel consumption, freight manifests", verify: "Cross-check against invoices and supplier evidence" },
  { icon: Satellite, name: "Satellite & remote signals", what: "Where applicable: plot boundaries, change detection", verify: "Source provenance and acquisition date stamping" },
  { icon: MapPin, name: "Geotagging", what: "Facility coordinates, plant boundaries", verify: "Country-config alignment with grid and tax IDs" },
  { icon: Building2, name: "Supplier evidence", what: "Supplier-issued PCFs, certifications, GSTIN linkage", verify: "Buyer-GSTIN cross-reference and methodology check" },
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
    q: "Can a carbon credit buyer independently verify a record?",
    a: "Yes. Each verified record carries a methodology version, factor source, and evidence hash. Buyers receive a decision-grade signal linked to that immutable fingerprint without exposure to the underlying MSME data.",
  },
  {
    q: "How is Scope 3 traceability handled?",
    a: "Supplier evidence is linked to buyer identifiers (e.g., GSTIN where applicable). This lets a buyer see that an MSME's upstream claim is anchored to a real, hash-pinned supplier document.",
  },
  {
    q: "What does the confidence score actually measure?",
    a: "It aggregates verification quality, data completeness (vendor + date + amount + HSN), history depth, and the green-benefit ratio into a single 0–100 band (A+ to D). Higher bands mean denser, better-attested evidence — not better marketing.",
  },
  {
    q: "How do you prevent greenwashing?",
    a: "Three mechanisms: universal SHA-256 deduplication blocks evidence reuse; an immutable document stub is written before processing so failed runs still leave an audit trail; methodology and factor versions are pinned per record so retroactive changes are visible.",
  },
  {
    q: "Are reporting outputs audit-ready?",
    a: "Framework outputs (CBAM, BRSR, GHG Protocol, ISSB, TCFD, GRI, CSRD) are produced from the same scope ledger with disclaimers identifying the methodology version and factor source. Auditors can trace any figure back to its evidence hash.",
  },
  {
    q: "How is confidentiality preserved between MSMEs and partners?",
    a: "Row-Level Security on every table; IP addresses are hashed; partners see anonymised, decision-grade signals — not raw invoices. Cross-tenant access is impossible by construction.",
  },
  {
    q: "Which countries are supported with localised factors?",
    a: "India, Bangladesh, Indonesia, Vietnam, the Philippines, Pakistan, Singapore, Thailand, Malaysia and Sri Lanka — each with localised grid factors, tax IDs, and document formats.",
  },
  {
    q: "Do you expose the algorithms or proprietary models?",
    a: "No. We expose the inputs, the standards we follow, the failure modes, and the evidence chain. Internal weights, prompts, and heuristics remain proprietary so the trust surface stays auditable without becoming gameable.",
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
            <Badge variant="outline" className="mb-6">Public reference · v1</Badge>
            <h1 className="text-4xl md:text-6xl font-semibold tracking-tight text-foreground mb-6">
              Trust & Technical Validation
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              How Senseible turns ordinary business documents into evidence partners, auditors,
              lenders and carbon-credit buyers can rely on — without exposing what makes the
              underlying methodology proprietary.
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
            <h2 className="text-3xl md:text-4xl font-semibold mb-4">A four-layer model, end to end</h2>
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
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Data Sources & Verification</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-semibold mb-4">What we collect — and how each item is checked</h2>
            <p className="text-muted-foreground max-w-2xl mb-10">
              Every input has a defined verification path. Nothing is accepted at face value, and nothing is silently estimated when a required field is missing.
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
              A public, simplified view of the pipeline. Internal weights, parsing prompts and heuristics are intentionally not shown.
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

        {/* 4. ESG Intelligence */}
        <section id="intelligence" className="py-20 border-b border-border bg-secondary/30">
          <div className="container max-w-5xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-3">
              <GitBranch className="h-5 w-5 text-primary" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground">ESG Intelligence Engine</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-semibold mb-4">Structured outputs that map cleanly to disclosure</h2>
            <p className="text-muted-foreground max-w-3xl">
              The intelligence layer organises verified records into a scope ledger and projects them onto the disclosure framework selected by the user. The ledger is the source of truth; framework views are non-destructive projections. The same numbers appear in every report because they come from the same record.
            </p>
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

        {/* 6. Scope 3 */}
        <section id="scope3" className="py-20 border-b border-border bg-secondary/30">
          <div className="container max-w-5xl mx-auto px-6 grid md:grid-cols-2 gap-10">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <Network className="h-5 w-5 text-primary" />
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Scope 3 Traceability</span>
              </div>
              <h2 className="text-3xl font-semibold mb-4">Supplier evidence, not supplier averages</h2>
              <p className="text-muted-foreground mb-4">
                Where a supplier-issued document exists, Scope 3 records reference its hash. Buyer identifiers (such as GSTIN in India) anchor upstream claims to a verifiable counterparty rather than a sector average.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" /> Supplier-document hash recorded</li>
                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" /> Buyer-GSTIN linkage where applicable</li>
                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" /> Methodology version pinned per line</li>
              </ul>
            </div>
            <Card className="border-border">
              <CardContent className="p-6 text-sm">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Buyer-side decision signal</div>
                <p className="text-muted-foreground mb-4">A purchaser sees that an upstream claim is backed by a real supplier document — not that we estimated it from an industry average.</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Hash anchored</Badge>
                  <Badge variant="secondary">Counterparty linked</Badge>
                  <Badge variant="secondary">Factor versioned</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 7. Scoring */}
        <section id="scoring" className="py-20 border-b border-border">
          <div className="container max-w-5xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-3">
              <Gauge className="h-5 w-5 text-primary" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Carbon & Confidence Scoring</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-semibold mb-4">A score you can audit</h2>
            <p className="text-muted-foreground max-w-2xl mb-10">
              The Climate Credibility Score is a single 0–100 band derived from four observable inputs. It rewards denser, better-attested evidence — not narrative quality.
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

        {/* 8. Greenwashing */}
        <section id="greenwashing" className="py-20 border-b border-border bg-secondary/30">
          <div className="container max-w-5xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle className="h-5 w-5 text-primary" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Greenwashing Prevention</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-semibold mb-4">Three mechanisms, working together</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { name: "Universal deduplication", desc: "SHA-256 fingerprints prevent the same evidence being claimed twice — across users, sessions, or time." },
                { name: "Immutable pre-processing stub", desc: "An audit row is written before processing starts. Failed or abandoned runs still leave a record." },
                { name: "Methodology version pinning", desc: "Each output stores the factor source and methodology version, so changes are visible — never retroactive." },
              ].map(m => (
                <Card key={m.name} className="border-border">
                  <CardContent className="p-5">
                    <div className="text-sm font-medium mb-2">{m.name}</div>
                    <p className="text-xs text-muted-foreground">{m.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
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
              Records eligible for credit consideration must clear three gates: additionality (the activity wouldn't occur without intervention), evidence linkage (hash-anchored to source documents), and methodology lock (the version used cannot drift). Buyers consume a decision-grade signal — not raw MSME data.
            </p>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { name: "Additionality flag", desc: "Activity meets baseline additionality test." },
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

        {/* 10. Finance */}
        <section id="finance" className="py-20 border-b border-border bg-secondary/30">
          <div className="container max-w-5xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-3">
              <Banknote className="h-5 w-5 text-primary" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Climate Finance Readiness</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-semibold mb-4">Evidence that lenders can act on</h2>
            <p className="text-muted-foreground max-w-3xl">
              Verified evidence powers eligibility signals used in green-loan, factoring, and SLL workflows. Lenders see a decision-grade view — instrument fit, eligibility band, evidence depth — without touching the borrower's underlying documents. The signal travels with the same methodology lock as the disclosure output.
            </p>
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
              The Net-Zero engine consumes the same scope ledger that feeds disclosure. A baseline becomes a sector-aware roadmap; progress is measured against the original methodology so reductions are real, not re-baselined.
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
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Governance & Security</span>
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

            <div className="mt-10 p-5 rounded-lg border border-border bg-background">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Illustrative outcomes</div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>— A mid-size exporter compressed first-pass CBAM evidence assembly from weeks to a single working session.</li>
                <li>— A lender shortened green-loan diligence by consuming evidence-backed eligibility signals instead of requesting raw bills.</li>
                <li>— A buyer reduced supplier-side Scope 3 disputes by referencing hash-anchored upstream evidence.</li>
              </ul>
              <p className="text-[11px] text-muted-foreground mt-3 italic">Illustrative only. No customer identities or confidential figures are disclosed.</p>
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
