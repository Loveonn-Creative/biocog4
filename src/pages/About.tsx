import { MinimalNav } from "@/components/MinimalNav";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const About = () => {
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
            About
          </h1>
          
          <div className="space-y-12">
            <section>
              <h2 className="text-xl font-medium text-foreground mb-4">The Problem</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                International trade agreements increasingly require carbon certification. The EU's Carbon Border Adjustment Mechanism will affect $8.8 billion of Indian exports by 2026. India's own Carbon Credit Trading Scheme mandates reporting for designated consumers. Banks price risk differently for businesses with verified sustainability data.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-medium text-foreground mb-4">The Gap</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Today, carbon measurement costs between ₹50,000 to ₹5,00,000 per year. Verification takes 2-6 months. Only enterprises with dedicated teams can navigate the complexity. MSMEs — who employ 110 million people in India alone — are left behind.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-medium text-foreground mb-4">The Replacement</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Senseible replaces manual bureaucracy with software. An invoice becomes a carbon calculation. A bill becomes a compliance signal. A receipt becomes revenue from climate finance. No forms. No consultants. No waiting.
              </p>
            </section>
            
            <section>
              <h2 className="text-xl font-medium text-foreground mb-4">Why Now</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Vision-language models can now read documents the way experts do. Carbon accounting standards have matured enough to be codified. Regulatory pressure has created genuine demand. The infrastructure layer that was missing can now be built.
              </p>
            </section>
          </div>
        </article>
        
        {/* Subtle navigation */}
        <div className="mt-20 pt-12 border-t border-border flex justify-between items-center">
          <Link 
            to="/mission" 
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Our Mission
          </Link>
          <Link 
            to="/carbon-credits" 
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Carbon Credits
          </Link>
        </div>
      </main>
    </div>
  );
};

export default About;
