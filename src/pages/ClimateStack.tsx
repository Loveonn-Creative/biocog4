import { useState, useMemo, useCallback, memo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Search, ArrowRight, Filter, X, Scale } from "lucide-react";
import { MinimalNav } from "@/components/MinimalNav";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getFeaturedArticles, searchArticles, getArticlesByCategory, cmsCategories, cmsArticles, type CMSArticle } from "@/data/cmsContent";
import { extractPreview } from "@/lib/formatContent";
import { competitorData } from "@/data/competitorData";

const ClimateStack = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const initialCategory = searchParams.get('category') || '';
  
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [showAllArticles, setShowAllArticles] = useState(false);
  
  const displayedArticles = useMemo(() => {
    if (searchQuery) {
      return searchArticles(searchQuery);
    }
    if (selectedCategory) {
      return getArticlesByCategory(selectedCategory);
    }
    return showAllArticles ? cmsArticles : getFeaturedArticles(15);
  }, [searchQuery, selectedCategory, showAllArticles]);
  
  const handleSearch = useCallback((value: string) => {
    setSearchQuery(value);
    setSelectedCategory('');
    if (value) {
      setSearchParams({ search: value });
    } else {
      setSearchParams({});
    }
  }, [setSearchParams]);
  
  const handleCategorySelect = useCallback((categoryId: string) => {
    setSelectedCategory(categoryId === selectedCategory ? '' : categoryId);
    setSearchQuery('');
    if (categoryId && categoryId !== selectedCategory) {
      setSearchParams({ category: categoryId });
    } else {
      setSearchParams({});
    }
  }, [selectedCategory, setSearchParams]);
  
  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedCategory('');
    setSearchParams({});
  }, [setSearchParams]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead 
        title="Climate Intelligence Core - Carbon & ESG Knowledge Hub"
        description="Expert answers to carbon accounting, ESG compliance, CBAM, Scope 1-2-3 emissions, and climate finance questions for MSMEs across India and emerging markets."
        canonical="/climate-intelligence"
      />
      <MinimalNav />
      
      <main className="container max-w-6xl mx-auto px-6 py-24 sm:py-32 flex-1">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-12">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        
        <div className="animate-fade-in">
          {/* Hero */}
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-foreground mb-4">
              Climate Intelligence Core
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              Expert answers to carbon, ESG, and climate finance questions. Built for MSMEs navigating sustainability.
            </p>
          </div>
          
          {/* Search */}
          <div className="max-w-xl mx-auto mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search carbon accounting, CBAM, emissions..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-12 h-12 text-base"
              />
              {(searchQuery || selectedCategory) && (
                <button
                  onClick={clearFilters}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
          
          {/* Category filters */}
          <div className="flex flex-wrap gap-2 justify-center mb-12">
            {cmsCategories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                size="sm"
                onClick={() => handleCategorySelect(category.id)}
                className="gap-2"
              >
                <Filter className="w-3 h-3" />
                {category.name}
              </Button>
            ))}
          </div>
          
          {/* Results count */}
          {(searchQuery || selectedCategory) && (
            <div className="text-center mb-8">
              <p className="text-sm text-muted-foreground">
                {displayedArticles.length} article{displayedArticles.length !== 1 ? 's' : ''} found
                {searchQuery && ` for "${searchQuery}"`}
                {selectedCategory && ` in ${cmsCategories.find(c => c.id === selectedCategory)?.name}`}
              </p>
            </div>
          )}
          
          {/* Competitor Comparisons Section */}
          {!searchQuery && !selectedCategory && (
            <div className="mb-12">
              <div className="flex items-center gap-2 mb-6">
                <Scale className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Platform Comparisons</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {competitorData.slice(0, 8).map((competitor) => (
                  <Link
                    key={competitor.slug}
                    to={`/vs/${competitor.slug}`}
                    className="group p-4 rounded-lg border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all"
                  >
                    <p className="text-xs text-muted-foreground mb-1 capitalize">{competitor.category}</p>
                    <p className="font-medium text-sm group-hover:text-primary transition-colors">
                      Senseible vs {competitor.name}
                    </p>
                  </Link>
                ))}
              </div>
              <div className="text-center mt-4">
                <Link to="/vs/sensibull" className="text-sm text-primary hover:underline">
                  View all comparisons →
                </Link>
              </div>
            </div>
          )}
          
          {/* Articles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedArticles.map((article, index) => (
              <ArticleCard key={article.id} article={article} index={index} />
            ))}
          </div>
          
          {displayedArticles.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No articles found for "{searchQuery}"</p>
              <Button variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
            </div>
          )}
          
          {/* Show all button */}
          {!searchQuery && !selectedCategory && !showAllArticles && cmsArticles.length > 15 && (
            <div className="text-center mt-12">
              <Button 
                variant="outline" 
                onClick={() => setShowAllArticles(true)}
                className="gap-2"
              >
                View all {cmsArticles.length} articles
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}
          
          {/* Newsletter */}
          <div className="mt-16 max-w-xl mx-auto">
            <NewsletterSignup />
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

const ArticleCard = memo(({ article, index }: { article: CMSArticle; index: number }) => {
  const preview = useMemo(() => extractPreview(article.content, 120), [article.content]);
  
  return (
    <Link
      to={`/climate-intelligence/${article.slug}`}
      className="group block p-6 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-lg transition-all duration-300 animate-fade-in"
      style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
    >
      <span className="inline-block text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded mb-3">
        {article.subtitle}
      </span>
      
      <h2 className="text-lg font-medium text-foreground group-hover:text-primary transition-colors mb-2 line-clamp-2">
        {article.title}
      </h2>
      
      <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
        {preview}
      </p>
      
      <span className="inline-flex items-center gap-1 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
        Read more <ArrowRight className="w-4 h-4" />
      </span>
    </Link>
  );
});

ArticleCard.displayName = 'ArticleCard';

export default ClimateStack;
