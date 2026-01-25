import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { MinimalNav } from "@/components/MinimalNav";
import { SecondaryFooter } from "@/components/SecondaryFooter";
import { SEOHead } from "@/components/SEOHead";
import { legalDocuments, getLegalDocumentBySlug } from "@/data/legalContent";

const Legal = () => {
  const { slug } = useParams<{ slug: string }>();
  
  // If no slug, show legal hub
  if (!slug) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <SEOHead 
          title="Legal - Terms, Privacy & Policies"
          description="Access Senseible's legal documents including Terms of Service, Privacy Policy, Data Processing Addendum, and Service Level Agreement."
          canonical="/legal"
        />
        <MinimalNav />
        
        <main className="container max-w-3xl mx-auto px-6 py-24 sm:py-32 flex-1">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-12">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          
          <article className="animate-fade-in">
            <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-foreground mb-4">
              Legal
            </h1>
            <p className="text-lg text-muted-foreground mb-12">
              Our policies and agreements that govern your use of Senseible.
            </p>
            
            <div className="space-y-4">
              {legalDocuments.map((doc) => (
                <Link
                  key={doc.id}
                  to={`/legal/${doc.slug}`}
                  className="block p-6 rounded-lg border border-border hover:border-primary/50 hover:bg-secondary/50 transition-all group"
                >
                  <h2 className="text-xl font-medium text-foreground group-hover:text-primary transition-colors">
                    {doc.title}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Last updated: {doc.lastUpdated}
                  </p>
                </Link>
              ))}
            </div>
          </article>
        </main>
        
        <SecondaryFooter />
      </div>
    );
  }
  
  // Show specific document
  const document = getLegalDocumentBySlug(slug);
  
  if (!document) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <MinimalNav />
        <main className="container max-w-3xl mx-auto px-6 py-24 flex-1">
          <h1 className="text-2xl font-semibold">Document not found</h1>
          <Link to="/legal" className="text-primary hover:underline mt-4 inline-block">
            Back to Legal
          </Link>
        </main>
        <SecondaryFooter />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead 
        title={document.title}
        description={`${document.title} for Senseible platform. Effective from ${document.effectiveDate}.`}
        canonical={`/legal/${slug}`}
      />
      <MinimalNav />
      
      <main className="container max-w-3xl mx-auto px-6 py-24 sm:py-32 flex-1">
        <Link to="/legal" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-12">
          <ArrowLeft className="w-4 h-4" />
          All Legal Documents
        </Link>
        
        <article className="animate-fade-in">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground mb-4">
            {document.title}
          </h1>
          
          <div className="flex gap-4 text-sm text-muted-foreground mb-12">
            <span>Effective: {document.effectiveDate}</span>
            <span>Updated: {document.lastUpdated}</span>
          </div>
          
          <div className="space-y-8">
            {document.sections.map((section, index) => (
              <section key={index} className="prose prose-lg max-w-none">
                <h2 className="text-xl font-medium text-foreground mb-4">{section.title}</h2>
                <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {section.content}
                </div>
              </section>
            ))}
          </div>
        </article>
      </main>
      
      <SecondaryFooter />
    </div>
  );
};

export default Legal;
