import { useParams, Link, useNavigate, Navigate } from "react-router-dom";
import { ArrowLeft, Calendar, Tag, ChevronRight } from "lucide-react";
import { memo, useEffect, useMemo, useState } from "react";
import { MinimalNav } from "@/components/MinimalNav";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { articleMeta, extractFaqs } from "@/lib/seo/articleSeo";
import { articleRedirects } from "@/data/articleRedirects";
import { PAGE_REVIEWS, REVIEWERS } from "@/lib/seo/seoMeta";
import { FormattedContent } from "@/components/FormattedContent";
import { SocialShare } from "@/components/SocialShare";
import { articleFunnel, FUNNEL_LABEL } from "@/data/articleFunnel";
import { getArticleBySlug, getArticlesByCategory } from "@/data/articleIndex";
import { loadArticleBody } from "@/data/articleBody";
import { relatedArticles as relatedFor } from "@/data/articleRelated";

const CMSArticle = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  
  const article = useMemo(() => slug ? getArticleBySlug(slug) : undefined, [slug]);
  const relatedArticles = useMemo(() => article ? relatedFor(article.slug) : [], [article]);
  // The body loads on its own (one small chunk per article). Until it
  // arrives the prerendered head tags stay in place; a failed load says so
  // and offers a reload (a failed module import is cached by the browser, so
  // only a fresh page load can retry it) instead of showing an empty article.
  const [body, setBody] = useState<string | null>(null);
  const [bodyError, setBodyError] = useState(false);
  useEffect(() => {
    if (!article) return;
    let live = true;
    setBody(null);
    setBodyError(false);
    loadArticleBody(article.slug)
      .then(b => { if (live) setBody(b); })
      .catch(() => { if (live) setBodyError(true); });
    return () => { live = false; };
  }, [article]);
  const categoryArticles = useMemo(() => {
    if (!article) return [];
    return getArticlesByCategory(article.category)
      .filter(a => a.id !== article.id)
      .slice(0, 6);
  }, [article]);
  
  if (!article && slug && articleRedirects[slug]) {
    return <Navigate to={articleRedirects[slug]} replace />;
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <SEOHead title="Article not found" description="This Climate Intelligence article does not exist or has moved." noIndex />
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

  // The link preview comes from ogImageFor() in SEOHead, matching the prerender.
  const meta = body !== null ? articleMeta({ ...article, content: body }) : null;
  // Shown only once a named reviewer has actually reviewed this page.
  const review = PAGE_REVIEWS[`/climate-intelligence/${article.slug}`];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {meta && body !== null && <SEOHead 
        title={meta.title}
        description={meta.description}
        canonical={`/climate-intelligence/${slug}`}
        type="article"
        faqSchema={extractFaqs(body)}
        keywords={article.tags}
        article={{
          publishedTime: article.createdAt,
          modifiedTime: article.updatedAt ?? article.createdAt,
          author: 'Senseible',
          tags: article.tags
        }}
        breadcrumbs={[
          { name: 'Home', url: '/' },
          { name: 'Climate Intelligence', url: '/climate-intelligence' },
          { name: article.subtitle, url: `/climate-intelligence?category=${encodeURIComponent(article.category)}` },
          { name: article.title, url: `/climate-intelligence/${slug}` }
        ]}
      />}
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
          {/* Category badge, then the reader's stage: what this page helps them do */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button 
              onClick={handleCategoryClick}
              className="inline-block text-sm font-medium text-primary bg-primary/10 px-3 py-1 rounded-full hover:bg-primary/20 transition-colors"
            >
              {article.subtitle}
            </button>
            {articleFunnel[article.slug] && (
              <span className="inline-block rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                {FUNNEL_LABEL[articleFunnel[article.slug].stage].stage} · {FUNNEL_LABEL[articleFunnel[article.slug].stage].intent}
              </span>
            )}
          </div>
          
          {/* Title */}
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground mb-6 leading-tight">
            {article.title}
          </h1>
          
          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mb-6">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {article.updatedAt ? 'Updated ' : ''}
              {new Date(article.updatedAt ?? article.createdAt).toLocaleDateString('en-IN', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </span>
            {review && (
              <span>
                Reviewed by {REVIEWERS[review.reviewer].name}, {REVIEWERS[review.reviewer].role}, on{' '}
                {new Date(review.reviewedOn).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Tag className="w-4 h-4" />
              {article.tags.length} topics
            </span>
          </div>
          
          {/* Share section */}
          <div className="mb-8 pb-8 border-b border-border">
            <SocialShare 
              title={article.title}
              description={article.excerpt}
              compact
            />
          </div>
          
          {/* Content - Properly formatted */}
          <div className="prose prose-lg max-w-none">
            {body !== null ? (
              <FormattedContent 
                content={body} 
                className="text-lg leading-relaxed"
              />
            ) : bodyError ? (
              <div role="alert" className="rounded-xl border border-border p-5 not-prose">
                <p className="text-base text-foreground">This article could not be loaded. Check your connection and try again.</p>
                <button type="button" onClick={() => window.location.reload()} className="mt-3 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                  Try again
                </button>
              </div>
            ) : (
              <div aria-busy="true" aria-label="Loading article" className="not-prose space-y-3">
                <p className="text-lg leading-relaxed text-foreground/80">{article.excerpt}</p>
                {[0, 1, 2, 3].map(i => <div key={i} className="h-4 rounded bg-secondary/70 animate-pulse motion-reduce:animate-none" style={{ width: `${92 - i * 9}%` }} />)}
              </div>
            )}
          </div>
          
          {/* Disclaimer */}
          <p className="text-xs text-muted-foreground/70 mt-8 pt-4 border-t border-border/50 leading-relaxed">
            This information may be outdated or contain errors at the time of reading. Please verify critical details independently. 
            Content is reviewed periodically for accuracy but is not guaranteed. For official guidance, consult certified professionals.
          </p>
          
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
              description={article.excerpt}
            />
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
