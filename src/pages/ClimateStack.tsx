import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, ArrowRight } from "lucide-react";
import { MinimalNav } from "@/components/MinimalNav";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { getFeaturedArticles, searchArticles, cmsCategories, type CMSArticle } from "@/data/cmsContent";

const ClimateStack = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const featuredArticles = getFeaturedArticles(15);
  
  const displayedArticles = searchQuery 
    ? searchArticles(searchQuery) 
    : featuredArticles;

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
          <div className="text-center mb-16">
            <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-foreground mb-4">
              Climate Intelligence Core
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              Expert answers to carbon, ESG, and climate finance questions. Built for MSMEs navigating sustainability.
            </p>
          </div>
          
          {/* Search */}
          <div className="max-w-xl mx-auto mb-16">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search carbon accounting, CBAM, emissions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 text-base"
              />
            </div>
          </div>
          
          {/* Articles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedArticles.map((article, index) => (
              <ArticleCard key={article.id} article={article} index={index} />
            ))}
          </div>
          
          {displayedArticles.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No articles found for "{searchQuery}"</p>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

const ArticleCard = ({ article, index }: { article: CMSArticle; index: number }) => {
  const preview = article.content.substring(0, 150) + '...';
  
  return (
    <Link
      to={`/climate-intelligence/${article.slug}`}
      className="group block p-6 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-lg transition-all duration-300"
      style={{ animationDelay: `${index * 50}ms` }}
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
};

export default ClimateStack;
