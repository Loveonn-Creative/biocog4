import { MinimalNav } from "@/components/MinimalNav";
import { Footer } from "@/components/Footer";
import { ArrowLeft, ArrowRight, Building, Banknote, FileCheck, Shield } from "lucide-react";
import { Link } from "react-router-dom";

const ClimateFinance = () => {
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
            Climate Finance
          </h1>
          
          <p className="text-xl text-muted-foreground mb-16 max-w-2xl">
            Verified carbon data unlocks preferential financing, government incentives, and access to sustainability-linked capital.
          </p>
          
          {/* Opportunity cards */}
          <div className="grid sm:grid-cols-2 gap-6 mb-20">
            <div className="p-6 rounded-2xl border border-border hover:border-primary/30 transition-colors group">
              <Banknote className="w-6 h-6 text-success mb-4" />
              <h3 className="font-medium text-foreground mb-2">Green Loans</h3>
              <p className="text-sm text-muted-foreground mb-4">Access preferential interest rates from banks who recognize verified sustainability data. Save 0.5-2% on working capital.</p>
              <p className="text-xs text-primary font-medium">Potential savings: ₹25,000 - ₹2,00,000/year</p>
            </div>
            
            <div className="p-6 rounded-2xl border border-border hover:border-primary/30 transition-colors group">
              <Building className="w-6 h-6 text-primary mb-4" />
              <h3 className="font-medium text-foreground mb-2">Government Incentives</h3>
              <p className="text-sm text-muted-foreground mb-4">Qualify for state and central schemes for MSMEs with documented emission reductions. Including BEE star ratings.</p>
              <p className="text-xs text-primary font-medium">Unlocks: Multiple state/central schemes</p>
            </div>
            
            <div className="p-6 rounded-2xl border border-border hover:border-primary/30 transition-colors group">
              <FileCheck className="w-6 h-6 text-accent mb-4" />
              <h3 className="font-medium text-foreground mb-2">Export Compliance</h3>
              <p className="text-sm text-muted-foreground mb-4">Meet EU CBAM requirements before they become mandatory. Position for international buyers who require carbon disclosure.</p>
              <p className="text-xs text-primary font-medium">Risk mitigation: Export access protection</p>
            </div>
            
            <div className="p-6 rounded-2xl border border-border hover:border-primary/30 transition-colors group">
              <Shield className="w-6 h-6 text-earth mb-4" />
              <h3 className="font-medium text-foreground mb-2">Sustainability-Linked Credit</h3>
              <p className="text-sm text-muted-foreground mb-4">Access emerging credit facilities tied to verified sustainability performance. Early positioning for TCFD-aligned financing.</p>
              <p className="text-xs text-primary font-medium">Future-ready: Aligned with global standards</p>
            </div>
          </div>
          
          {/* Why MSMEs are missing out */}
          <section className="mb-20 p-8 rounded-2xl bg-secondary/30 border border-border">
            <h2 className="text-xl font-semibold text-foreground mb-6">What MSMEs Are Missing</h2>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">Global Trade Access:</span> From India's FTAs (UAE, Australia, EU/UK negotiations) to EU's Green Deal, Brazil's CBIO market, and Southeast Asia's carbon pricing pilots — verified sustainability data is becoming table stakes for trade access worldwide.
              </p>
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">CBAM & Border Adjustments:</span> Starting 2026, exporters from emerging markets without carbon data face tariffs of 20-35% on steel, cement, aluminum, and related products entering the EU. Similar mechanisms are emerging in UK, Canada, and Australia.
              </p>
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">Financial Institution Mandates:</span> Central banks globally — from RBI in India to BCB in Brazil — increasingly favor sustainability-linked lending. Banks are building ESG scoring into credit decisions across emerging markets.
              </p>
            </div>
          </section>
          
          {/* CTA */}
          <div className="p-8 rounded-2xl bg-primary text-primary-foreground text-center">
            <h3 className="text-xl font-medium mb-3">Unlock your climate finance eligibility</h3>
            <p className="text-primary-foreground/80 mb-6">One document. Instant assessment. No consultants needed.</p>
            <Link 
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-background text-foreground rounded-full font-medium hover:bg-background/90 transition-colors"
            >
              Start Now <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </article>
        
        {/* Subtle navigation */}
        <div className="mt-20 pt-12 border-t border-border flex justify-between items-center">
          <Link 
            to="/carbon-credits" 
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Carbon Credits
          </Link>
          <Link 
            to="/mission" 
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Our Mission
          </Link>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default ClimateFinance;
