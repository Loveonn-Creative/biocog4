import { MinimalNav } from "@/components/MinimalNav";
import { Footer } from "@/components/Footer";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { SEOHead } from "@/components/SEOHead";
import { MissionField, DrawnUnderline, RiseIn } from "@/components/mission/MissionVisuals";

const Mission = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="Mission | Senseible"
        description="Why Senseible exists: Making carbon verification infrastructure accessible to MSMEs excluded from global climate finance."
        keywords={["senseible mission", "MSME carbon", "climate finance inclusion", "carbon verification infrastructure"]}
        canonical="/mission"
      />
      <MinimalNav />
      
      <main className="mission-anim container max-w-6xl mx-auto px-6 py-20 sm:py-28">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-12 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back
        </Link>
        
        <MissionField>
        <article className="animate-fade-in max-w-3xl">
          {/* Hero Statement */}
          <div className="mb-16">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-foreground mb-6 leading-[1.1]">
              Most small businesses are invisible to climate finance
            </h1>
            <div className="w-16 h-1 bg-primary rounded-full" />
          </div>
          
          {/* The Observation */}
          <section className="mb-16">
            <h2 className="text-sm font-medium text-primary uppercase tracking-wider mb-4">
              What We Observed
            </h2>
            <p className="text-xl sm:text-2xl text-foreground/90 leading-relaxed mb-6">
              Micro, small, and medium enterprises across emerging markets are excluded from global trade, 
              climate finance, and regulatory clarity.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed">
              This exclusion is not by choice. It exists because carbon measurement, verification, 
              and compliance infrastructure was never designed for scale. It was designed for large 
              enterprises with dedicated compliance teams, sophisticated software, and direct 
              relationships with regulators.
            </p>
          </section>
          
          {/* The Constraint */}
          <section className="mb-16 p-8 bg-secondary/30 rounded-2xl border border-border/50">
            <h2 className="text-sm font-medium text-primary uppercase tracking-wider mb-4">
              Our Constraint
            </h2>
            <p className="text-lg text-foreground leading-relaxed mb-4">
              We deliberately chose to build infrastructure, not products. Not dashboards. Not consulting. 
              Not another platform that requires setup, training, and ongoing maintenance.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Infrastructure means: you bring an invoice, we return verified carbon data. 
              You bring a receipt, we return a monetization pathway. The complexity is ours to carry.
            </p>
            <div className="mt-6 grid grid-cols-[auto_1fr_auto] items-center gap-3 text-xs text-muted-foreground" aria-hidden="true">
              <span className="rounded-lg border border-border bg-background px-3 py-1.5">Invoice</span>
              <svg viewBox="0 0 200 10" preserveAspectRatio="none" className="w-full h-2.5">
                <path d="M2 5 H198" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeDasharray="6 6" className="mission-flow" />
              </svg>
              <span className="rounded-lg bg-foreground text-background px-3 py-1.5">Verified carbon data</span>
            </div>
          </section>
          
          {/* The Consequence */}
          <section className="mb-16">
            <h2 className="text-sm font-medium text-primary uppercase tracking-wider mb-4">
              The Consequence
            </h2>
            <div className="grid sm:grid-cols-3 gap-6">
              <RiseIn delay={0}>
                <div className="h-full p-6 bg-card rounded-xl border">
                  <p className="text-3xl font-semibold text-primary mb-2">1 upload</p>
                  <p className="text-sm text-muted-foreground">Document to verified carbon signal</p>
                </div>
              </RiseIn>
              <RiseIn delay={120}>
                <div className="h-full p-6 bg-card rounded-xl border">
                  <p className="text-3xl font-semibold text-primary mb-2">₹0</p>
                  <p className="text-sm text-muted-foreground">Upfront cost for measurement</p>
                </div>
              </RiseIn>
              <RiseIn delay={240}>
                <div className="h-full p-6 bg-card rounded-xl border">
                  <p className="text-3xl font-semibold text-primary mb-2">14+</p>
                  <p className="text-sm text-muted-foreground">Global reporting frameworks</p>
                </div>
              </RiseIn>
            </div>
          </section>
          
          {/* Founder's Statement - Key Quote */}
          <section className="mb-12 p-8 bg-gradient-to-br from-primary/5 to-transparent rounded-2xl border border-primary/10">
            <p className="text-xl sm:text-2xl text-foreground leading-relaxed font-medium">
              <span className="text-muted-foreground">Senseible exists to replace that infrastructure.</span>{' '}
              To turn everyday business documents (<DrawnUnderline>invoices, bills, receipts</DrawnUnderline>) into verified carbon signals.{' '}
              To make compliance automatic. To make <DrawnUnderline>revenue from carbon</DrawnUnderline> accessible to every business, not just large ones.
            </p>
            <p className="text-sm text-muted-foreground mt-6 italic">Founder's Note</p>
          </section>
          
          {/* Founder's Voice */}
          <section className="mb-12">
            <p className="text-lg text-foreground leading-relaxed mb-6">
              We measure in seconds, not months. We convert documents into decisions. 
              We make regulatory fear irrelevant.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              If you're building something that touches climate, trade, or MSME finance, and you see 
              the same infrastructure gap we do, we should talk.
            </p>
          </section>
        </article>
        </MissionField>
        
        {/* Navigation */}
        <div className="mt-16 pt-8 border-t border-border flex justify-between items-center">
          <Link 
            to="/about" 
            className="text-sm text-muted-foreground hover:text-foreground transition-colors group flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Why Us
          </Link>
          <Link 
            to="/principles" 
            className="text-sm text-muted-foreground hover:text-foreground transition-colors group flex items-center gap-2"
          >
            Our Principles
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Mission;
