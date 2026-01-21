import { MinimalNav } from "@/components/MinimalNav";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { SEOHead } from "@/components/SEOHead";

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="About — Senseible"
        description="How the world works differently because Senseible exists. Infrastructure-grade carbon MRV for 400 million MSMEs."
        keywords={["about senseible", "carbon MRV infrastructure", "MSME climate finance", "carbon verification"]}
      />
      <MinimalNav />
      
      <main className="container max-w-4xl mx-auto px-6 py-20 sm:py-28">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-12 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back
        </Link>
        
        <article className="animate-fade-in">
          {/* Title */}
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-foreground mb-16">
            Why This Exists
          </h1>
          
          {/* The Problem - Observed */}
          <section className="mb-16">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center text-sm font-medium text-destructive">1</div>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">The Problem</h2>
            </div>
            <p className="text-xl text-foreground leading-relaxed mb-4">
              International trade agreements increasingly require carbon certification.
            </p>
            <div className="grid sm:grid-cols-2 gap-4 mt-6">
              <div className="p-5 bg-secondary/50 rounded-xl">
                <p className="text-2xl font-semibold text-foreground">$8.8B</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Indian exports affected by EU CBAM by 2026
                </p>
              </div>
              <div className="p-5 bg-secondary/50 rounded-xl">
                <p className="text-2xl font-semibold text-foreground">CCTS</p>
                <p className="text-sm text-muted-foreground mt-1">
                  India's Carbon Credit Trading Scheme mandates reporting
                </p>
              </div>
            </div>
            <p className="text-muted-foreground mt-6 leading-relaxed">
              Banks price risk differently for businesses with verified sustainability data. 
              The gap between "has data" and "doesn't have data" is now a competitive moat.
            </p>
          </section>
          
          {/* The Gap - Quantified */}
          <section className="mb-16">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center text-sm font-medium text-warning">2</div>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">The Gap</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-baseline justify-between py-4 border-b border-border">
                <span className="text-muted-foreground">Traditional carbon measurement cost</span>
                <span className="text-xl font-semibold">₹50,000 — ₹5,00,000/year</span>
              </div>
              <div className="flex items-baseline justify-between py-4 border-b border-border">
                <span className="text-muted-foreground">Verification timeline</span>
                <span className="text-xl font-semibold">2-6 months</span>
              </div>
              <div className="flex items-baseline justify-between py-4 border-b border-border">
                <span className="text-muted-foreground">Who can access</span>
                <span className="text-xl font-semibold">Enterprises with dedicated teams</span>
              </div>
            </div>
            <p className="text-muted-foreground mt-6 leading-relaxed">
              MSMEs—who employ 110 million people in India alone—are structurally excluded from the 
              infrastructure required to participate in the transition.
            </p>
          </section>
          
          {/* The Replacement - Infrastructure */}
          <section className="mb-16 p-8 bg-primary/5 rounded-2xl border border-primary/10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium text-primary">3</div>
              <h2 className="text-sm font-medium text-primary uppercase tracking-wider">The Replacement</h2>
            </div>
            <p className="text-xl text-foreground leading-relaxed mb-6">
              Senseible replaces manual bureaucracy with software.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <p className="text-foreground">An invoice becomes a carbon calculation</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <p className="text-foreground">A bill becomes a compliance signal</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <p className="text-foreground">A receipt becomes revenue from climate finance</p>
              </div>
            </div>
            <p className="text-muted-foreground mt-6">
              No forms. No consultants. No waiting.
            </p>
          </section>
          
          {/* Why Now - Timing */}
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center text-sm font-medium text-success">4</div>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Why Now</h2>
            </div>
            <div className="space-y-4">
              <p className="text-foreground leading-relaxed">
                <span className="font-medium">Vision-language models</span> can now read documents the way experts do.
              </p>
              <p className="text-foreground leading-relaxed">
                <span className="font-medium">Carbon accounting standards</span> have matured enough to be codified.
              </p>
              <p className="text-foreground leading-relaxed">
                <span className="font-medium">Regulatory pressure</span> has created genuine demand.
              </p>
            </div>
            <p className="text-lg text-muted-foreground mt-6 leading-relaxed">
              The infrastructure layer that was missing can now be built.
            </p>
          </section>
        </article>
        
        {/* Navigation */}
        <div className="mt-16 pt-8 border-t border-border flex justify-between items-center">
          <Link 
            to="/mission" 
            className="text-sm text-muted-foreground hover:text-foreground transition-colors group flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Our Mission
          </Link>
          <Link 
            to="/carbon-credits" 
            className="text-sm text-muted-foreground hover:text-foreground transition-colors group flex items-center gap-2"
          >
            Carbon Credits
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </main>
    </div>
  );
};

export default About;
