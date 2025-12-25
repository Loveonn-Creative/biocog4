import { MinimalNav } from "@/components/MinimalNav";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const Mission = () => {
  return (
    <div className="min-h-screen bg-background">
      <MinimalNav />
      
      <main className="container max-w-3xl mx-auto px-6 py-24 sm:py-32">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-12"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        
        <article className="animate-fade-in">
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-foreground mb-8">
            Mission
          </h1>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-xl sm:text-2xl text-foreground/80 leading-relaxed mb-8">
              400 million micro, small, and medium enterprises across emerging markets are excluded from global trade, climate finance, and regulatory clarity.
            </p>
            
            <p className="text-lg text-muted-foreground leading-relaxed mb-8">
              This exclusion is not by choice. It exists because carbon measurement, verification, and compliance infrastructure was never designed for scale. It was designed for large enterprises with dedicated compliance teams, sophisticated software, and direct relationships with regulators.
            </p>
            
            <p className="text-lg text-muted-foreground leading-relaxed mb-8">
              Senseible exists to replace that infrastructure. To turn everyday business documents — invoices, bills, receipts — into verified carbon signals. To make compliance automatic. To make revenue from carbon accessible to every business, not just large ones.
            </p>
            
            <p className="text-lg text-foreground leading-relaxed">
              We measure in seconds, not months. We convert documents into decisions. We make regulatory fear irrelevant.
            </p>
          </div>
        </article>
        
        {/* Subtle navigation */}
        <div className="mt-20 pt-12 border-t border-border flex justify-between items-center">
          <Link 
            to="/about" 
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            About Senseible
          </Link>
          <Link 
            to="/principles" 
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Our Principles
          </Link>
        </div>
      </main>
    </div>
  );
};

export default Mission;
