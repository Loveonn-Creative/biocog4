import { MinimalNav } from "@/components/MinimalNav";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { ArrowLeft, ArrowRight, Leaf, TrendingUp, Globe, ShieldCheck, Hash, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import climateFinanceOg from "@/assets/og/climate-finance.jpg";

const creditGates = [
  { icon: ShieldCheck, name: "Additionality flag", desc: "The activity meets the baseline additionality test — credit only for what would not have happened anyway." },
  { icon: Hash, name: "Evidence linkage", desc: "Every claim traces to a SHA-256 hash on the source document. Spot-auditable, never reusable." },
  { icon: Lock, name: "Methodology lock", desc: "Factor source and methodology version pinned to the record. The figure cannot drift after issue." },
];

const CarbonCredits = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Carbon Credits — Senseible"
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
          
          <p className="text-xl text-muted-foreground mb-16 max-w-2xl">
            Your operational data already contains carbon signals. Senseible extracts, verifies, and converts them into tradeable value — only after three gates are cleared.
          </p>

          {/* Credit-validation gates (migrated from Trust) */}
          <section className="mb-20">
            <div className="flex items-center gap-3 mb-3">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground">From verified record to credit-ready signal</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mb-3">Three gates every record clears</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-2xl">
              Buyers consume a decision-grade signal — not raw MSME data. Records that fail any gate are held back, with a math-based reason.
            </p>
            <div className="grid sm:grid-cols-3 gap-4">
              {creditGates.map(g => (
                <Card key={g.name} className="border-border">
                  <CardContent className="p-5">
                    <g.icon className="w-4 h-4 text-primary mb-3" />
                    <div className="text-sm font-medium text-foreground mb-1">{g.name}</div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{g.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
          
          {/* Key metrics */}
          <div className="grid sm:grid-cols-3 gap-6 mb-20">
            <div className="p-6 rounded-2xl bg-secondary/50 border border-border">
              <Leaf className="w-6 h-6 text-primary mb-4" />
              <p className="text-3xl font-semibold text-foreground mb-2">47s</p>
              <p className="text-sm text-muted-foreground">Average processing time from invoice to carbon credit eligibility check</p>
            </div>
            <div className="p-6 rounded-2xl bg-secondary/50 border border-border">
              <TrendingUp className="w-6 h-6 text-success mb-4" />
              <p className="text-3xl font-semibold text-foreground mb-2">$150+</p>
              <p className="text-sm text-muted-foreground">Indicative annual carbon credit value for a typical MSME (varies by sector and region)</p>
            </div>
            <div className="p-6 rounded-2xl bg-secondary/50 border border-border">
              <Globe className="w-6 h-6 text-accent mb-4" />
              <p className="text-3xl font-semibold text-foreground mb-2">Global standards</p>
              <p className="text-sm text-muted-foreground">Aligned with India's CCTS, EU ETS, and voluntary markets (Verra, Gold Standard)</p>
            </div>
          </div>

          
          {/* How it works */}
          <section className="mb-20">
            <h2 className="text-2xl font-semibold text-foreground mb-8">How It Works</h2>
            <div className="space-y-6">
              <div className="flex gap-6 items-start group">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                  <span className="text-sm font-medium text-primary">1</span>
                </div>
                <div>
                  <h3 className="font-medium text-foreground mb-1">Document Upload</h3>
                  <p className="text-muted-foreground">Upload invoices, electricity bills, fuel receipts, or transport documents. Image, PDF, or voice description.</p>
                </div>
              </div>
              
              <div className="flex gap-6 items-start group">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                  <span className="text-sm font-medium text-primary">2</span>
                </div>
                <div>
                  <h3 className="font-medium text-foreground mb-1">Automatic Extraction</h3>
                  <p className="text-muted-foreground">Our AI reads and interprets document data — quantities, suppliers, dates, emission-relevant fields.</p>
                </div>
              </div>
              
              <div className="flex gap-6 items-start group">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                  <span className="text-sm font-medium text-primary">3</span>
                </div>
                <div>
                  <h3 className="font-medium text-foreground mb-1">Carbon Calculation</h3>
                  <p className="text-muted-foreground">Apply BEE and CCTS-aligned emission factors. Calculate Scope 1, 2, and 3 emissions automatically.</p>
                </div>
              </div>
              
              <div className="flex gap-6 items-start group">
                <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center shrink-0 group-hover:bg-success/20 transition-colors">
                  <span className="text-sm font-medium text-success">4</span>
                </div>
                <div>
                  <h3 className="font-medium text-foreground mb-1">Credit Eligibility</h3>
                  <p className="text-muted-foreground">Determine if your emissions reductions qualify for carbon credits. Connect with verified trading partners.</p>
                </div>
              </div>
            </div>
          </section>
          
          {/* CTA */}
          <div className="p-8 rounded-2xl bg-carbon text-carbon-foreground text-center">
            <h3 className="text-xl font-medium mb-3">Ready to monetize your carbon data?</h3>
            <p className="text-carbon-foreground/70 mb-6">Start with a single invoice. See your potential value in seconds.</p>
            <Link 
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-background text-foreground rounded-full font-medium hover:bg-background/90 transition-colors"
            >
              Try Now <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </article>
        
        {/* Subtle navigation */}
        <div className="mt-20 pt-12 border-t border-border flex justify-between items-center">
          <Link 
            to="/principles" 
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Principles
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
