import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Tag, ChevronRight } from "lucide-react";
import { memo, useMemo } from "react";
import { MinimalNav } from "@/components/MinimalNav";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { FormattedContent } from "@/components/FormattedContent";
import { SocialShare } from "@/components/SocialShare";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { getArticleBySlug, getRelatedArticles, getArticlesByCategory, cmsCategories } from "@/data/cmsContent";

const CMSArticle = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  
  const article = useMemo(() => slug ? getArticleBySlug(slug) : undefined, [slug]);
  const relatedArticles = useMemo(() => article ? getRelatedArticles(article.id, 4) : [], [article]);
  const categoryArticles = useMemo(() => {
    if (!article) return [];
    return getArticlesByCategory(article.category)
      .filter(a => a.id !== article.id)
      .slice(0, 6);
  }, [article]);
  
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
  
  const handleTagClick = (tag: string) => {
    navigate(`/climate-intelligence?search=${encodeURIComponent(tag)}`);
  };
  
  const handleCategoryClick = () => {
    navigate(`/climate-intelligence?category=${encodeURIComponent(article.category)}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead 
        title={article.title}
        description={article.content.substring(0, 160).replace(/\*\*/g, '')}
        canonical={`/climate-intelligence/${slug}`}
        type="article"
        article={{
          publishedTime: article.createdAt,
          tags: article.tags
        }}
      />
      <MinimalNav />
      
      <main className="container max-w-4xl mx-auto px-6 py-24 sm:py-32 flex-1">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8 flex-wrap">
          <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          <ChevronRight className="w-4 h-4" />
          <Link to="/climate-intelligence" className="hover:text-foreground transition-colors">Climate Intelligence</Link>
          <ChevronRight className="w-4 h-4" />
          <button 
            onClick={handleCategoryClick}
            className="hover:text-foreground transition-colors text-left"
          >
            {article.subtitle}
          </button>
        </nav>
        
        <article className="animate-fade-in">
          {/* Category badge */}
          <button 
            onClick={handleCategoryClick}
            className="inline-block text-sm font-medium text-primary bg-primary/10 px-3 py-1 rounded-full mb-4 hover:bg-primary/20 transition-colors"
          >
            {article.subtitle}
          </button>
          
          {/* Title */}
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground mb-6 leading-tight">
            {article.title}
          </h1>
          
          {/* Meta info */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {new Date(article.createdAt).toLocaleDateString('en-IN', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </span>
            <span className="flex items-center gap-1.5">
              <Tag className="w-4 h-4" />
              {article.tags.length} topics
            </span>
          </div>
          
          {/* Share section */}
          <div className="mb-8 pb-8 border-b border-border">
            <SocialShare 
              title={article.title}
              description={article.content.substring(0, 200).replace(/\*\*/g, '')}
              compact
            />
          </div>
          
          {/* Content - Properly formatted */}
          <div className="prose prose-lg max-w-none">
            <FormattedContent 
              content={article.content} 
              className="text-lg leading-relaxed"
            />
          </div>
          
          {/* Tags - Clickable */}
          <div className="mt-12 pt-8 border-t border-border">
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Related topics
            </h3>
            <div className="flex flex-wrap gap-2">
              {article.tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleTagClick(tag)}
                  className="text-sm bg-secondary text-secondary-foreground px-3 py-1.5 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
          
          {/* Full Share options */}
          <div className="mt-8 pt-8 border-t border-border">
            <SocialShare 
              title={article.title}
              description={article.content.substring(0, 200).replace(/\*\*/g, '')}
            />
          </div>
          
          {/* Newsletter */}
          <div className="mt-12">
            <NewsletterSignup />
          </div>
          
          {/* Related Articles */}
          {relatedArticles.length > 0 && (
            <div className="mt-12 pt-8 border-t border-border">
              <h3 className="text-lg font-medium text-foreground mb-6">Related Articles</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {relatedArticles.map((related) => (
                  <RelatedArticleCard key={related.id} article={related} />
                ))}
              </div>
            </div>
          )}
          
          {/* More from category */}
          {categoryArticles.length > 0 && (
            <div className="mt-12 pt-8 border-t border-border">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-foreground">
                  More in {article.subtitle}
                </h3>
                <button 
                  onClick={handleCategoryClick}
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  View all <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3">
                {categoryArticles.map((catArticle) => (
                  <Link
                    key={catArticle.id}
                    to={`/climate-intelligence/${catArticle.slug}`}
                    className="block p-3 rounded-lg hover:bg-secondary/50 transition-colors"
                  >
                    <p className="font-medium text-foreground hover:text-primary transition-colors line-clamp-2">
                      {catArticle.title}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </article>
        
        {/* Back button */}
        <div className="mt-12 pt-8 border-t border-border">
          <Link 
            to="/climate-intelligence" 
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Climate Intelligence
          </Link>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

const RelatedArticleCard = memo(({ article }: { article: { id: string; slug: string; title: string; subtitle: string } }) => (
  <Link
    to={`/climate-intelligence/${article.slug}`}
    className="block p-4 rounded-lg border border-border hover:border-primary/50 transition-colors"
  >
    <span className="text-xs text-primary font-medium">{article.subtitle}</span>
    <h4 className="font-medium text-foreground hover:text-primary transition-colors mt-1 line-clamp-2">
      {article.title}
    </h4>
  </Link>
));

RelatedArticleCard.displayName = 'RelatedArticleCard';

export default CMSArticle;
