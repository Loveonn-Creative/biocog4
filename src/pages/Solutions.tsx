import { useParams, Link, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { SEOHead } from '@/components/SEOHead';
import { MinimalNav } from '@/components/MinimalNav';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getSolutionBySlug, getRelatedSolutions } from '@/data/solutionsData';
import { getCountryConfig } from '@/lib/countryConfig';
import { calculateCBAM, DEFAULT_EU_ETS_PRICE, formatEuro } from '@/lib/cbamEngine';
import { useState } from 'react';
import {
  ArrowRight, Check, Calculator, ClipboardList, DollarSign,
  Globe, Factory, ChevronRight, HelpCircle,
  Zap, Shield, TrendingDown, FileText
} from 'lucide-react';

// Mini CBAM Estimator Component
const CBAMEstimator = ({ countryCode }: { countryCode: string }) => {
  const [tonnage, setTonnage] = useState(1000);
  const [result, setResult] = useState<{ cost2026: number; cost2034: number } | null>(null);

  const estimate = () => {
    try {
      const r = calculateCBAM({
        sectorId: 'steel', productionRouteId: 'bf-bof', countryCode,
        supplierName: '', tonnage, actualEmissionsIntensity: null,
        carbonPricePaid: null, euEtsPrice: DEFAULT_EU_ETS_PRICE,
      });
      setResult({
        cost2026: r.yearlyResults[0]?.netCbamCost || 0,
        cost2034: r.yearlyResults[r.yearlyResults.length - 1]?.netCbamCost || 0,
      });
    } catch { setResult(null); }
  };

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calculator className="h-5 w-5 text-primary" />
          Quick CBAM Cost Estimator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Annual Export Tonnage (steel)</Label>
          <Input type="number" value={tonnage} onChange={e => setTonnage(Number(e.target.value))} />
        </div>
        <Button onClick={estimate} className="w-full">Estimate CBAM Cost</Button>
        {result && (
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3 bg-background rounded-lg text-center">
              <div className="text-xl font-bold text-primary">{formatEuro(result.cost2026)}</div>
              <div className="text-xs text-muted-foreground">2026 (2.5% phase-in)</div>
            </div>
            <div className="p-3 bg-background rounded-lg text-center">
              <div className="text-xl font-bold text-destructive">{formatEuro(result.cost2034)}</div>
              <div className="text-xs text-muted-foreground">2034 (100% liability)</div>
            </div>
          </div>
        )}
        <p className="text-xs text-muted-foreground">Based on BF-BOF steel route. <Link to="/cbam-calculator" className="text-primary underline">Use full calculator</Link> for custom routes.</p>
      </CardContent>
    </Card>
  );
};

// Mini Scope Estimator
const ScopeEstimator = ({ countryCode }: { countryCode: string }) => {
  const config = getCountryConfig(countryCode);
  const [monthlyKwh, setMonthlyKwh] = useState(5000);
  const annualCo2 = (monthlyKwh * 12 * config.gridFactor) / 1000;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="h-5 w-5 text-primary" />
          Scope 2 Quick Estimator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Monthly Electricity (kWh)</Label>
          <Input type="number" value={monthlyKwh} onChange={e => setMonthlyKwh(Number(e.target.value))} />
        </div>
        <div className="p-4 bg-background rounded-lg text-center">
          <div className="text-2xl font-bold text-primary">{annualCo2.toFixed(1)} tCO₂e/year</div>
          <div className="text-xs text-muted-foreground">
            Using {config.name} grid factor: {config.gridFactor} kgCO₂/kWh
          </div>
        </div>
        <Button variant="outline" className="w-full" asChild>
          <Link to="/">Upload invoices for full Scope 1+2+3 calculation</Link>
        </Button>
      </CardContent>
    </Card>
  );
};

// Audit Readiness Checklist
const AuditChecklist = () => {
  const items = [
    'Electricity bills (last 12 months)',
    'Fuel purchase invoices (diesel, LPG, CNG)',
    'Raw material purchase orders',
    'Freight and logistics receipts',
    'Water consumption records',
  ];
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClipboardList className="h-5 w-5 text-primary" />
          Audit Readiness Checklist
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              <div className="w-5 h-5 rounded border border-border flex items-center justify-center">
                <Check className="h-3 w-3 text-muted-foreground" />
              </div>
              {item}
            </li>
          ))}
        </ul>
        <Button className="w-full mt-4" asChild>
          <Link to="/">Start Free Carbon Audit <ArrowRight className="h-4 w-4 ml-2" /></Link>
        </Button>
      </CardContent>
    </Card>
  );
};

// Green Finance Score
const FinanceScore = ({ countryCode }: { countryCode: string }) => {
  const config = getCountryConfig(countryCode);
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <DollarSign className="h-5 w-5 text-primary" />
          Green Finance Eligibility
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="p-4 bg-background rounded-lg">
          <div className="text-sm font-medium mb-2">Available in {config.name}:</div>
          <ul className="space-y-1.5">
            {config.frameworks.map((fw, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <Check className="h-3 w-3 text-primary" />
                {fw} aligned reporting
              </li>
            ))}
          </ul>
        </div>
        <Button className="w-full" asChild>
          <Link to="/climate-finance">Check Eligibility <ArrowRight className="h-4 w-4 ml-2" /></Link>
        </Button>
      </CardContent>
    </Card>
  );
};

const toolComponents: Record<string, React.FC<{ countryCode: string }>> = {
  'cbam-estimator': CBAMEstimator,
  'scope-estimator': ScopeEstimator,
  'audit-checklist': () => <AuditChecklist />,
  'finance-score': FinanceScore,
};

const Solutions = () => {
  const { useCase } = useParams<{ useCase: string }>();
  const solution = useCase ? getSolutionBySlug(useCase) : undefined;

  if (!solution) {
    return <Navigate to="/climate-intelligence" replace />;
  }

  const related = getRelatedSolutions(solution.slug);
  const ToolComponent = toolComponents[solution.embeddedTool];

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": solution.faqs.map(f => ({
      "@type": "Question",
      "name": f.question,
      "acceptedAnswer": { "@type": "Answer", "text": f.answer },
    })),
  };

  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": solution.title,
    "description": solution.painStatement,
    "step": solution.steps.map((s, i) => ({
      "@type": "HowToStep",
      "position": i + 1,
      "name": s.title,
      "text": s.description,
    })),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://senseible.earth" },
      { "@type": "ListItem", "position": 2, "name": "Solutions", "item": "https://senseible.earth/solutions" },
      { "@type": "ListItem", "position": 3, "name": solution.countryName, "item": `https://senseible.earth/solutions/${solution.slug}` },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={solution.title}
        description={solution.metaDescription}
        canonical={`/solutions/${solution.slug}`}
        keywords={solution.keywords}
        breadcrumbs={[
          { name: 'Home', url: '/' },
          { name: 'Solutions', url: '/climate-intelligence' },
          { name: solution.regulationLabel, url: `/solutions/${solution.slug}` },
        ]}
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(howToSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
      </Helmet>

      <MinimalNav />

      <main className="container mx-auto px-4 pt-20 pb-16 max-w-5xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/climate-intelligence" className="hover:text-foreground">Solutions</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">{solution.countryName}</span>
        </nav>

        {/* Hook — Pain Statement */}
        <section className="mb-10">
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="outline"><Globe className="h-3 w-3 mr-1" />{solution.countryName}</Badge>
            <Badge variant="outline"><Factory className="h-3 w-3 mr-1" />{solution.sectorLabel}</Badge>
            <Badge variant="secondary">{solution.regulationLabel}</Badge>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            {solution.regulationLabel} for {solution.sectorLabel} in {solution.countryName}
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
            {solution.painStatement}
          </p>
        </section>

        {/* Tool + Steps Grid */}
        <div className="grid lg:grid-cols-5 gap-8 mb-12">
          {/* Embedded Tool */}
          <div className="lg:col-span-2">
            {ToolComponent && <ToolComponent countryCode={solution.countryCode} />}
          </div>

          {/* Compliance Steps */}
          <div className="lg:col-span-3">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Compliance Steps
            </h2>
            <div className="space-y-4">
              {solution.steps.map((step, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                    {i + 1}
                  </div>
                  <div>
                    <h3 className="font-medium">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cost/Time Breakdown */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-primary" />
            Cost & Time Breakdown
          </h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            {solution.costBreakdown.map((item, i) => (
              <Card key={i}>
                <CardContent className="p-4 text-center">
                  <div className="text-lg font-bold text-primary">{item.value}</div>
                  <div className="text-xs text-muted-foreground">{item.item}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* FAQs */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {solution.faqs.map((faq, i) => (
              <Card key={i}>
                <CardContent className="p-5">
                  <h3 className="font-medium mb-2">{faq.question}</h3>
                  <p className="text-sm text-muted-foreground">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mb-12">
          <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold mb-2">
                Start Your {solution.regulationLabel} Journey
              </h2>
              <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
                Upload your first invoice and get verified emission data in under 47 seconds. No expertise required.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button size="lg" asChild>
                  <Link to="/">
                    Start Free Audit <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to={solution.pillarLink}>Learn More</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Internal Links */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold mb-4">Related Solutions</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {related.map(r => (
              <Link
                key={r.slug}
                to={`/solutions/${r.slug}`}
                className="p-4 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">{r.countryName}</Badge>
                  <Badge variant="secondary" className="text-xs">{r.regulationLabel}</Badge>
                </div>
                <h3 className="text-sm font-medium">{r.sectorLabel}</h3>
              </Link>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 mt-4">
            <Link to={solution.pillarLink} className="text-sm text-primary hover:underline flex items-center gap-1">
              <FileText className="h-3 w-3" /> {solution.regulationLabel} Pillar Page
            </Link>
            {solution.relatedIndustry && (
              <Link to={`/industries/${solution.relatedIndustry}`} className="text-sm text-primary hover:underline flex items-center gap-1">
                <Factory className="h-3 w-3" /> {solution.sectorLabel} Industry Guide
              </Link>
            )}
            {solution.relatedArticle && (
              <Link to={`/climate-intelligence/${solution.relatedArticle}`} className="text-sm text-primary hover:underline flex items-center gap-1">
                <FileText className="h-3 w-3" /> Related Article
              </Link>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Solutions;
