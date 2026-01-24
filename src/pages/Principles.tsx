import { MinimalNav } from "@/components/MinimalNav";
import { SecondaryFooter } from "@/components/SecondaryFooter";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const Principles = () => {
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
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-foreground mb-16">
            Three Pillars
          </h1>
          
          <div className="space-y-20">
            {/* Senseible AI */}
            <section className="group">
              <div className="flex items-baseline gap-4 mb-6">
                <span className="text-sm font-medium text-muted-foreground/60 uppercase tracking-wider">01</span>
                <h2 className="text-2xl sm:text-3xl font-semibold text-foreground">Senseible AI</h2>
              </div>
              <div className="pl-10 border-l-2 border-primary/20 group-hover:border-primary/40 transition-colors">
                <p className="text-lg text-foreground/80 leading-relaxed mb-4">
                  Software that converts documents into decisions.
                </p>
                <p className="text-base text-muted-foreground leading-relaxed">
                  It removes regulatory uncertainty by interpreting real-world paperwork the way institutions do — instantly, consistently, without manual effort. For MSMEs, this replaces months of verification with seconds of certainty.
                </p>
              </div>
            </section>
            
            {/* Senseible Climate */}
            <section className="group">
              <div className="flex items-baseline gap-4 mb-6">
                <span className="text-sm font-medium text-muted-foreground/60 uppercase tracking-wider">02</span>
                <h2 className="text-2xl sm:text-3xl font-semibold text-foreground">Senseible Climate</h2>
              </div>
              <div className="pl-10 border-l-2 border-success/20 group-hover:border-success/40 transition-colors">
                <p className="text-lg text-foreground/80 leading-relaxed mb-4">
                  Carbon treated as infrastructure, not obligation.
                </p>
                <p className="text-base text-muted-foreground leading-relaxed">
                  A measurable layer that allows emissions to move through trade, finance, and policy systems without friction. This enables climate action to scale across millions of small businesses, not just large enterprises. We are building livable futures for this generation and the next.
                </p>
              </div>
            </section>
            
            {/* Senseible Business */}
            <section className="group">
              <div className="flex items-baseline gap-4 mb-6">
                <span className="text-sm font-medium text-muted-foreground/60 uppercase tracking-wider">03</span>
                <h2 className="text-2xl sm:text-3xl font-semibold text-foreground">Senseible Business</h2>
              </div>
              <div className="pl-10 border-l-2 border-accent/30 group-hover:border-accent/50 transition-colors">
                <p className="text-lg text-foreground/80 leading-relaxed mb-4">
                  A financial bridge for those excluded from global systems.
                </p>
                <p className="text-base text-muted-foreground leading-relaxed">
                  By converting everyday operational documents into verifiable signals, Senseible unlocks revenue, incentives, and climate finance that were previously inaccessible. This is how local businesses participate in trillion-dollar climate markets.
                </p>
              </div>
            </section>
          </div>
        </article>
        
        {/* Subtle navigation */}
        <div className="mt-20 pt-12 border-t border-border flex justify-between items-center">
          <Link 
            to="/about" 
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            About
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

export default Principles;
