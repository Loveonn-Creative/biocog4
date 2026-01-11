import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Share2, Copy, Check } from "lucide-react";
import { useState } from "react";
import { MinimalNav } from "@/components/MinimalNav";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { getArticleBySlug, getRelatedArticles } from "@/data/cmsContent";
import { toast } from "sonner";

const CMSArticle = () => {
  const { slug } = useParams<{ slug: string }>();
  const [copied, setCopied] = useState(false);
  
  const article = slug ? getArticleBySlug(slug) : undefined;
  const relatedArticles = article ? getRelatedArticles(article.id) : [];
  
  if (!article) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <MinimalNav />
        <main className="container max-w-3xl mx-auto px-6 py-24 flex-1">
          <h1 className="text-2xl font-semibold">Article not found</h1>
          <Link to="/climate-intelligence" className="text-primary hover:underline mt-4 inline-block">
            Back to Climate Intelligence
          </Link>
        </main>
        <Footer />
      </div>
    );
  }
  
  const handleCopyLink = async () => {
    const url = window.location.href;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead 
        title={article.title}
        description={article.content.substring(0, 160)}
        canonical={`/climate-intelligence/${slug}`}
        type="article"
        article={{
          publishedTime: article.createdAt,
          tags: article.tags
        }}
      />
      <MinimalNav />
      
      <main className="container max-w-3xl mx-auto px-6 py-24 sm:py-32 flex-1">
        <Link to="/climate-intelligence" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-12">
          <ArrowLeft className="w-4 h-4" />
          Climate Intelligence
        </Link>
        
        <article className="animate-fade-in">
          <span className="inline-block text-sm font-medium text-primary bg-primary/10 px-3 py-1 rounded-full mb-4">
            {article.subtitle}
          </span>
          
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground mb-6 leading-tight">
            {article.title}
          </h1>
          
          {/* Share button */}
          <div className="flex items-center gap-4 mb-8 pb-8 border-b border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="gap-2"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy link'}
            </Button>
          </div>
          
          {/* Content */}
          <div className="prose prose-lg max-w-none">
            <div className="text-foreground/80 whitespace-pre-wrap leading-relaxed text-lg">
              {article.content}
            </div>
          </div>
          
          {/* Tags */}
          <div className="mt-12 pt-8 border-t border-border">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Related topics</h3>
            <div className="flex flex-wrap gap-2">
              {article.tags.map((tag) => (
                <span key={tag} className="text-xs bg-secondary text-secondary-foreground px-3 py-1 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          
          {/* Related Articles */}
          {relatedArticles.length > 0 && (
            <div className="mt-12 pt-8 border-t border-border">
              <h3 className="text-lg font-medium text-foreground mb-6">Related Articles</h3>
              <div className="space-y-4">
                {relatedArticles.map((related) => (
                  <Link
                    key={related.id}
                    to={`/climate-intelligence/${related.slug}`}
                    className="block p-4 rounded-lg border border-border hover:border-primary/50 transition-colors"
                  >
                    <h4 className="font-medium text-foreground hover:text-primary transition-colors">
                      {related.title}
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">{related.subtitle}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </article>
      </main>
      
      <Footer />
    </div>
  );
};

export default CMSArticle;
