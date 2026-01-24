import { MinimalNav } from "@/components/MinimalNav";
import { SecondaryFooter } from "@/components/SecondaryFooter";
import { ArrowLeft, ArrowRight, Leaf, TrendingUp, Globe } from "lucide-react";
import { Link } from "react-router-dom";

const CarbonCredits = () => {
  return (
    <div className="min-h-screen bg-background">
      <MinimalNav />
      
      <main className="container max-w-4xl mx-auto px-6 py-24 sm:py-32">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-12"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        
        <article className="animate-fade-in">
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-foreground mb-8">
            Carbon Credits
          </h1>
          
          <p className="text-xl text-muted-foreground mb-16 max-w-2xl">
            Your operational data already contains carbon signals. Senseible extracts, verifies, and converts them into tradeable value.
          </p>
          
          {/* Key metrics */}
          <div className="grid sm:grid-cols-3 gap-6 mb-20">
            <div className="p-6 rounded-2xl bg-secondary/50 border border-border">
              <Leaf className="w-6 h-6 text-primary mb-4" />
              <p className="text-3xl font-semibold text-foreground mb-2">47s</p>
              <p className="text-sm text-muted-foreground">Average processing time from invoice to carbon credit eligibility</p>
            </div>
            <div className="p-6 rounded-2xl bg-secondary/50 border border-border">
              <TrendingUp className="w-6 h-6 text-success mb-4" />
              <p className="text-3xl font-semibold text-foreground mb-2">₹12K+</p>
              <p className="text-sm text-muted-foreground">Average annual carbon credit value for a typical MSME</p>
            </div>
            <div className="p-6 rounded-2xl bg-secondary/50 border border-border">
              <Globe className="w-6 h-6 text-accent mb-4" />
              <p className="text-3xl font-semibold text-foreground mb-2">CCTS</p>
              <p className="text-sm text-muted-foreground">Aligned with India's Carbon Credit Trading Scheme</p>
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
      
      <SecondaryFooter />
    </div>
  );
};

export default CarbonCredits;
