import { useParams, Link, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { CarbonParticles } from '@/components/CarbonParticles';
import { MinimalNav } from '@/components/MinimalNav';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Check, X, ArrowRight, Building2, Zap, Globe, 
  FileText, Coins, Shield, Clock, Leaf, ExternalLink
} from 'lucide-react';
import { getCompetitorBySlug, senseibleFeatures, competitorData } from '@/data/competitorData';

const CompetitorComparison = () => {
  const { competitor: competitorSlug } = useParams<{ competitor: string }>();
  
  const competitor = competitorSlug ? getCompetitorBySlug(competitorSlug) : undefined;
  
  // Redirect to index if no valid competitor
  if (!competitor) {
    return <Navigate to="/climate-intelligence" replace />;
  }
  
  const isDisambiguation = competitor.category === 'disambiguation';
  
  const featureLabels: Record<string, { label: string; icon: typeof Check }> = {
    msmeFirst: { label: 'MSME-First Architecture', icon: Building2 },
    gstIntegration: { label: 'GST/Invoice Integration', icon: FileText },
    subMinuteProcessing: { label: 'Sub-Minute Processing', icon: Clock },
    carbonMonetization: { label: 'Carbon Monetization', icon: Coins },
    emergingMarketFocus: { label: 'Emerging Market Focus', icon: Globe },
    autoVerification: { label: 'Automated Verification', icon: Shield },
    mrvToMonetize: { label: 'MRV to Monetize Instant', icon: Zap },
  };

  // Related competitors for discovery
  const relatedCompetitors = competitorData
    .filter(c => c.slug !== competitor.slug && c.category === competitor.category)
    .slice(0, 4);

  return (
    <div className="relative min-h-screen w-full bg-background pb-16 md:pb-0">
      <Helmet>
        <title>Senseible vs {competitor.name} — Carbon Accounting Comparison 2026</title>
        <meta name="description" content={`Compare Senseible vs ${competitor.name}. ${competitor.description.substring(0, 120)}...`} />
        <meta name="keywords" content={`senseible vs ${competitor.name.toLowerCase()}, ${competitor.name.toLowerCase()} alternative, carbon accounting comparison, ESG platform comparison, MRV comparison`} />
        <link rel="canonical" href={`https://senseible.earth/vs/${competitor.slug}`} />
        
        {/* Open Graph */}
        <meta property="og:title" content={`Senseible vs ${competitor.name} — Which is Better for Carbon Accounting?`} />
        <meta property="og:description" content={competitor.description} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://senseible.earth/vs/${competitor.slug}`} />
        
        {/* Comparison Schema */}
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": `Senseible vs ${competitor.name}: Carbon Accounting Comparison`,
          "description": competitor.description,
          "author": {
            "@type": "Organization",
            "name": "Senseible"
          },
          "publisher": {
            "@type": "Organization",
            "name": "Senseible",
            "url": "https://senseible.earth"
          },
          "datePublished": "2026-01-30",
          "dateModified": "2026-01-30",
          "mainEntityOfPage": `https://senseible.earth/vs/${competitor.slug}`,
          "about": {
            "@type": "SoftwareApplication",
            "name": competitor.name,
            "applicationCategory": "Carbon Accounting Software"
          }
        })}</script>
      </Helmet>
      
      <CarbonParticles />
      <MinimalNav />

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="container mx-auto px-4 pt-12 pb-8">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="outline" className="mb-4">
              {isDisambiguation ? 'Brand Clarification' : 'Platform Comparison'}
            </Badge>
            
            <h1 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">
              Senseible vs {competitor.name}
            </h1>
            
            {isDisambiguation ? (
              <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
                <strong>Important:</strong> Senseible (carbon MRV) is NOT {competitor.name} (options trading). 
                Different platforms, different industries.
              </p>
            ) : (
              <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
                A factual comparison of leading carbon accounting and ESG platforms. 
                Senseible is built for MSMEs in emerging markets with instant MRV-to-monetization.
              </p>
            )}
          </div>
        </section>

        {/* Context Banner */}
        <section className="container mx-auto px-4 pb-8">
          <div className="max-w-4xl mx-auto">
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  This page is part of Senseible's structured comparison library, created to answer high-intent 
                  search queries comparing leading carbon accounting, ESG, MRV, and sustainability platforms. 
                  The objective is to surface factual differences in scope, architecture, automation depth, 
                  MSME readiness, verification capability, and monetization pathways.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Quick Comparison */}
        <section className="container mx-auto px-4 pb-12">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Senseible Card */}
              <Card className="border-primary">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">Senseible</CardTitle>
                    <Badge className="bg-primary text-primary-foreground">Recommended</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    AI-powered carbon MRV for 400M+ MSMEs
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Founded</span>
                      <p className="font-medium">2024</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">HQ</span>
                      <p className="font-medium">India</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Target</span>
                      <p className="font-medium">MSMEs</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Pricing</span>
                      <p className="font-medium">Free to ₹4,999/mo</p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    {Object.entries(featureLabels).map(([key, { label, icon: Icon }]) => (
                      <div key={key} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-success shrink-0" />
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Competitor Card */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">{competitor.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {competitor.description.substring(0, 80)}...
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Founded</span>
                      <p className="font-medium">{competitor.founded}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">HQ</span>
                      <p className="font-medium">{competitor.headquarters}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Target</span>
                      <p className="font-medium">{competitor.targetMarket}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Pricing</span>
                      <p className="font-medium">{competitor.pricing}</p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    {Object.entries(featureLabels).map(([key, { label }]) => {
                      const hasFeature = competitor.features[key as keyof typeof competitor.features];
                      return (
                        <div key={key} className="flex items-center gap-2 text-sm">
                          {hasFeature ? (
                            <Check className="h-4 w-4 text-success shrink-0" />
                          ) : (
                            <X className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                          <span className={!hasFeature ? 'text-muted-foreground' : ''}>{label}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Detailed Analysis */}
        <section className="container mx-auto px-4 pb-12">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* About Competitor */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  About {competitor.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  {competitor.description}
                </p>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-2">Strengths</h4>
                    <ul className="space-y-1">
                      {competitor.strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Limitations</h4>
                    <ul className="space-y-1">
                      {competitor.limitations.map((l, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <X className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">{l}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Senseible Advantage */}
            <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Leaf className="h-5 w-5 text-primary" />
                  Why Choose Senseible Over {competitor.name}?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-foreground font-medium">
                  {competitor.senseibleAdvantage}
                </p>
                
                <div className="grid sm:grid-cols-2 gap-4 pt-4">
                  {Object.entries(senseibleFeatures).slice(0, 4).map(([key, description]) => (
                    <div key={key} className="flex items-start gap-3 p-3 rounded-lg bg-background border">
                      <Check className="h-5 w-5 text-success shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">{featureLabels[key]?.label}</p>
                        <p className="text-xs text-muted-foreground mt-1">{description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* CTA */}
            <div className="text-center py-8">
              <h3 className="text-2xl font-bold mb-4">
                Ready to Try Senseible?
              </h3>
              <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
                Start free. Get verified carbon data in under 47 seconds. 
                No consultants, no complex setups.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" asChild>
                  <Link to="/auth">
                    Start Free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link to="/pricing">
                    View Pricing
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Related Comparisons */}
        {relatedCompetitors.length > 0 && (
          <section className="container mx-auto px-4 pb-16">
            <div className="max-w-4xl mx-auto">
              <h3 className="text-xl font-semibold mb-6">More Comparisons</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {relatedCompetitors.map((c) => (
                  <Link 
                    key={c.slug} 
                    to={`/vs/${c.slug}`}
                    className="flex items-center justify-between p-4 rounded-lg border hover:border-primary/50 hover:bg-muted/30 transition-colors"
                  >
                    <div>
                      <p className="font-medium">Senseible vs {c.name}</p>
                      <p className="text-sm text-muted-foreground capitalize">{c.category}</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default CompetitorComparison;
