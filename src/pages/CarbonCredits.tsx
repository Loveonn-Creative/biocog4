import { MinimalNav } from "@/components/MinimalNav";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { GateRun, StepTrail, ValueEquation, type CreditGate, type TrailStep } from "@/components/credits/CreditVisuals";
import climateFinanceOg from "@/assets/og/climate-finance.jpg";

const creditGates: CreditGate[] = [
  { name: "Additionality flag", desc: "The activity meets the baseline additionality test: credit only for what would not have happened anyway.", held: "the reduction would have happened anyway, so there is nothing to credit." },
  { name: "Evidence linkage", desc: "Every claim traces to a SHA-256 hash on the source document. Spot-auditable, never reusable.", held: "the figure no longer matches its source document, or that document was already used." },
  { name: "Methodology lock", desc: "Factor source and methodology version pinned to the record. The figure cannot drift after issue.", held: "the factor source or method version is missing, so the figure could drift." },
];

type Path = "invoices" | "solar";

const PATHS: Record<Path, { label: string; firstTerm: string; firstNote: string; steps: TrailStep[]; cta: { title: string; body: string; to: string; label: string } }> = {
  invoices: {
    label: "Invoices and bills",
    firstTerm: "verified t",
    firstNote: "Tonnes from verified invoice records only",
    steps: [
      { title: "Document Upload", body: "Upload invoices, electricity bills, fuel receipts, or transport documents. Image, PDF, or voice description." },
      { title: "Automatic Extraction", body: "Our AI reads and interprets document data: quantities, suppliers, dates, emission-relevant fields." },
      { title: "Carbon Calculation", body: "Apply BEE and CCTS-aligned emission factors. Calculate Scope 1, 2, and 3 emissions automatically." },
      { title: "Credit Eligibility", body: "See whether your emission reductions could qualify. Records that clear all three gates move to the offline credit process." },
    ],
    cta: { title: "Ready to monetize your carbon data?", body: "Start with a single invoice. See your potential value in seconds.", to: "/", label: "Try Now" },
  },
  solar: {
    label: "Rooftop solar",
    firstTerm: "metered t",
    firstNote: "Tonnes from metered generation, after the meter accuracy deduction",
    steps: [
      { title: "System details", body: "Add the system size in kWp and the date it was commissioned." },
      { title: "Metered readings", body: "Add monthly generation from net-meter bills or a generation meter. Gaps are never filled in." },
      { title: "Reduction calculation", body: "Generation times the grid's combined-margin emission factor from the CEA CO2 Baseline Database, less the meter's accuracy class." },
      { title: "Credit process", body: "When every check passes, the signal moves to the offline credit process. It is a signal, not a credit." },
    ],
    cta: { title: "Have rooftop solar?", body: "Add your system and its monthly readings to see the signal build.", to: "/solar-signal", label: "Open the solar signal" },
  },
};

const CarbonCredits = () => {
  const [params, setParams] = useSearchParams();
  const path: Path = params.get("path") === "solar" ? "solar" : "invoices";
  const ctx = PATHS[path];
  const choose = (p: Path) => setParams(p === "solar" ? { path: "solar" } : {}, { replace: true });

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Carbon Credits | Senseible"
        description="From verified record to credit-ready signal. The three gates every Senseible-verified record clears before it can become a tradeable carbon credit signal for buyers."
        canonical="/carbon-credits"
        image={`https://senseible.earth${climateFinanceOg}`}
        keywords={["carbon credits", "MSME carbon credits", "additionality", "carbon credit verification", "CCTS", "voluntary carbon market"]}
        breadcrumbs={[{ name: "Home", url: "/" }, { name: "Carbon Credits", url: "/carbon-credits" }]}
      />
      <MinimalNav />

      <main className="container max-w-4xl mx-auto px-6 py-24 sm:py-32">
        <Link
          to="/trust"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-12"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Trust architecture
        </Link>

        <article className="animate-fade-in">
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-foreground mb-8">
            Carbon Credits
          </h1>

          <p className="text-xl text-muted-foreground mb-8 max-w-2xl">
            Your operational data already contains carbon signals. Senseible extracts, verifies, and converts them into tradeable value, only after three gates are cleared.
          </p>

          {/* Context: where the record comes from */}
          <div role="radiogroup" aria-label="Where your record comes from" className="mb-16 inline-flex rounded-full border border-border p-1">
            {(Object.keys(PATHS) as Path[]).map((p) => (
              <button key={p} type="button" role="radio" aria-checked={path === p} onClick={() => choose(p)}
                className={`rounded-full px-4 py-1.5 text-sm transition-colors ${path === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {PATHS[p].label}
              </button>
            ))}
          </div>

          {/* Credit-validation gates */}
          <section className="mb-20">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">From verified record to credit-ready signal</span>
            <h2 className="mt-3 text-2xl sm:text-3xl font-semibold text-foreground mb-3">Three gates every record clears</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
              Buyers consume a decision-grade signal, not raw MSME data. Records that fail any gate are held back, with a math-based reason. Try failing one.
            </p>
            <GateRun gates={creditGates} />
          </section>

          {/* Value */}
          <section className="mb-20">
            <h2 className="text-2xl font-semibold text-foreground mb-6">How value is worked out</h2>
            <ValueEquation key={path} firstTerm={ctx.firstTerm} firstNote={ctx.firstNote} />
            <p className="mt-8 text-sm text-muted-foreground max-w-2xl">
              Designed with reference to India's CCTS, the EU ETS and voluntary programmes such as Verra and Gold Standard. Each programme decides what it accepts.
            </p>
          </section>

          {/* How it works */}
          <section className="mb-20">
            <h2 className="text-2xl font-semibold text-foreground mb-8">How It Works</h2>
            <StepTrail key={path} steps={ctx.steps} />
          </section>

          {/* CTA */}
          <div className="p-8 rounded-2xl bg-carbon text-carbon-foreground text-center">
            <h3 className="text-xl font-medium mb-3">{ctx.cta.title}</h3>
            <p className="text-carbon-foreground/70 mb-6">{ctx.cta.body}</p>
            <Link
              to={ctx.cta.to}
              className="inline-flex items-center gap-2 px-6 py-3 bg-background text-foreground rounded-full font-medium hover:bg-background/90 transition-colors"
            >
              {ctx.cta.label} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </article>
        
        {/* Subtle navigation */}
        <div className="mt-20 pt-12 border-t border-border flex justify-between items-center">
          <Link 
            to="/trust" 
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Trust architecture
          </Link>
          <Link 
            to="/climate-finance" 
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Climate Finance
          </Link>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default CarbonCredits;
