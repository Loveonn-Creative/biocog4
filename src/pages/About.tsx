import { MinimalNav } from "@/components/MinimalNav";
import { ChapterStory, BecomesLine, type Chapter } from "@/components/about/AboutStory";
import { Footer } from "@/components/Footer";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { SEOHead } from "@/components/SEOHead";
import { IndiaAIBadge } from "@/components/IndiaAIBadge";
import aboutOg from "@/assets/og/about.jpg";

// Sources (kept here, not on the page): CBAM Regulation (EU) 2023/956, eur-lex.europa.eu;
// CCTS 2023, Bureau of Energy Efficiency, beeindia.gov.in; ~63 million MSMEs, Ministry of MSME Annual Report, msme.gov.in.
const chapters: Chapter[] = [
  {
    id: "problem", label: "The Problem",
    body: (
      <>
        <p className="text-xl text-foreground leading-relaxed mb-6">
          Trade rules and buyers increasingly ask for verified carbon data.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="border-l-2 border-primary/40 pl-4">
            <p className="text-2xl font-semibold text-foreground">EU CBAM</p>
            <p className="text-sm text-muted-foreground mt-1">Importers of covered goods into the EU report their embedded emissions. The definitive period begins in 2026.</p>
          </div>
          <div className="border-l-2 border-primary/40 pl-4">
            <p className="text-2xl font-semibold text-foreground">India CCTS</p>
            <p className="text-sm text-muted-foreground mt-1">The Carbon Credit Trading Scheme, 2023 sets up India's domestic carbon market under the Energy Conservation Act.</p>
          </div>
        </div>
        <p className="text-muted-foreground mt-6 leading-relaxed">
          Banks and buyers treat a business with verified data differently from one without. From Mumbai to São Paulo to Jakarta, having the numbers is now an edge.
        </p>
      </>
    ),
  },
  {
    id: "gap", label: "The Gap",
    body: (
      <>
        <div className="space-y-4">
          <div className="flex flex-col gap-1 py-4 border-b border-border sm:flex-row sm:items-baseline sm:justify-between">
            <span className="text-muted-foreground">How carbon is measured today</span>
            <span className="text-xl font-semibold">Consultants, site visits, spreadsheets</span>
          </div>
          <div className="flex flex-col gap-1 py-4 border-b border-border sm:flex-row sm:items-baseline sm:justify-between">
            <span className="text-muted-foreground">Who can access</span>
            <span className="text-xl font-semibold">Enterprises with dedicated teams</span>
          </div>
        </div>
        <p className="text-muted-foreground mt-6 leading-relaxed">
          India alone has around 63 million MSMEs, and most have no practical way to measure and prove their emissions.
        </p>
      </>
    ),
  },
  {
    id: "replacement", label: "The Replacement",
    body: (
      <>
        <p className="text-xl text-foreground leading-relaxed mb-6">
          Senseible replaces manual bureaucracy with software.
        </p>
        <ul className="space-y-5">
          <BecomesLine doc="invoice" from="An invoice" to="a carbon calculation" />
          <BecomesLine doc="bill" from="A bill" to="a compliance signal" />
          <BecomesLine doc="receipt" from="A receipt" to="revenue from climate finance" />
        </ul>
        <p className="text-muted-foreground mt-6">
          No forms, no consultant, no waiting for a site visit.
        </p>
      </>
    ),
  },
  {
    id: "why-now", label: "Why Now",
    body: (
      <>
        <div className="space-y-4">
          <p className="text-foreground leading-relaxed">
            <span className="font-medium">Vision-language models</span> can now read documents the way experts do.
          </p>
          <p className="text-foreground leading-relaxed">
            <span className="font-medium">Carbon accounting rules</span> are settled enough to turn into software.
          </p>
          <p className="text-foreground leading-relaxed">
            <span className="font-medium">New rules</span> mean buyers and banks now actually ask for the carbon numbers.
          </p>
        </div>
        <p className="text-lg text-muted-foreground mt-6 leading-relaxed">
          So the tool small businesses never had can finally exist.
        </p>
      </>
    ),
  },
];

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="About | Senseible"
        description="How the world works differently because Senseible exists. Infrastructure-grade carbon MRV for MSMEs and exporters."
        keywords={["about senseible", "carbon MRV infrastructure", "MSME climate finance", "carbon verification"]}
        canonical="/about"
        image={`https://senseible.earth${aboutOg}`}
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
          {/* India AI Badge */}
          <div className="flex flex-col items-center gap-3 mb-10">
            <IndiaAIBadge size={64} />
            <p className="text-lg sm:text-xl text-center leading-relaxed font-semibold">
              <span className="text-muted-foreground">AI infrastructure for MSMEs </span>
              <span className="font-bold text-[#A85400] dark:text-[#FF9933]">from India.</span>
            </p>
          </div>

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-foreground mb-16">
            Why This Exists
          </h1>
          
          <ChapterStory chapters={chapters} />
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
      
      <Footer />
    </div>
  );
};

export default About;
