import { MinimalNav } from "@/components/MinimalNav";
import { Footer } from "@/components/Footer";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { PillarsVisual, useSectionsReached } from "@/components/principles/Pillars";

const Principles = () => {
  const { refs, reached, current } = useSectionsReached(3);
  // Phones: each section shows its own pillar rising once it is read.
  const inline = (i: number) => (
    <div className="md:hidden mb-6" aria-hidden="true">
      <PillarsVisual raised={reached > i ? i + 1 : i} highlight={i} compact />
    </div>
  );
  return (
    <div className="min-h-screen bg-background">
      <MinimalNav />
      
      <main className="pl-anim container max-w-5xl mx-auto px-6 py-24 sm:py-32">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-12"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        
        <div className="grid gap-12 md:grid-cols-[1fr_16rem] lg:grid-cols-[1fr_18rem]">
        <article className="animate-fade-in min-w-0">
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-foreground mb-16">
            Three Pillars
          </h1>
          
          <div className="space-y-20">
            {/* Senseible AI */}
            <section ref={el => (refs.current[0] = el)} className="group">
              {inline(0)}
              <div className="flex items-baseline gap-4 mb-6">
                <span className="text-sm font-medium text-muted-foreground/60 uppercase tracking-wider">01</span>
                <h2 className="text-2xl sm:text-3xl font-semibold text-foreground">Senseible AI</h2>
              </div>
              <div className="pl-10 border-l-2 border-primary/20 group-hover:border-primary/40 transition-colors">
                <p className="text-lg text-foreground/80 leading-relaxed mb-4">
                  Software that converts documents into decisions.
                </p>
                <p className="text-base text-muted-foreground leading-relaxed">
                  It removes regulatory uncertainty by interpreting real-world paperwork the way institutions do: instantly, consistently, without manual effort. For MSMEs, this replaces months of verification with seconds of certainty.
                </p>
              </div>
            </section>
            
            {/* Senseible Climate */}
            <section ref={el => (refs.current[1] = el)} className="group">
              {inline(1)}
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
            <section ref={el => (refs.current[2] = el)} className="group">
              {inline(2)}
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
        <aside className="hidden md:block" aria-hidden="true">
          <div className="sticky top-28 rounded-3xl border border-border bg-secondary/20 p-5">
            <PillarsVisual raised={reached} highlight={current} />
            <p className="mt-3 text-[11px] text-muted-foreground">{reached < 3 ? `${reached} of 3 pillars standing` : "Three pillars, one structure"}</p>
          </div>
        </aside>
        </div>
        
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
      
      <Footer />
    </div>
  );
};

export default Principles;
