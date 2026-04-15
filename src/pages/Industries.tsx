import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { SEOHead } from '@/components/SEOHead';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Factory, Truck, Building2, Car, Shirt, FlaskConical, 
  HardHat, ArrowRight, Check, Leaf, TrendingDown, 
  DollarSign, FileText, Shield, Zap, AlertTriangle, Globe, Calculator
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCountryConfig } from '@/lib/countryConfig';
interface IndustryData {
  id: string;
  name: string;
  icon: typeof Factory;
  tagline: string;
  description: string;
  scope1Sources: string[];
  scope2Sources: string[];
  scope3Sources: string[];
  reductionStrategies: string[];
  caseStudy?: {
    company: string;
    reduction: string;
    savings: string;
    timeframe: string;
  };
  keywords: string[];
}

const industries: IndustryData[] = [
  {
    id: 'textile',
    name: 'Textile Manufacturing',
    icon: Shirt,
    tagline: 'Sustainable Fashion Starts with Data',
    description: 'India\'s textile sector accounts for 12% of export earnings. With EU CBAM on the horizon, carbon transparency is becoming essential for international competitiveness.',
    scope1Sources: [
      'Diesel generators and boilers',
      'On-site fuel combustion for dyeing',
      'Company-owned transportation',
      'Fugitive emissions from chemicals'
    ],
    scope2Sources: [
      'Electricity for spinning mills',
      'Power for weaving looms',
      'Cooling and heating systems',
      'Lighting and machinery'
    ],
    scope3Sources: [
      'Raw cotton and fiber procurement',
      'Chemical dyes and auxiliaries',
      'Packaging materials',
      'Freight and logistics',
      'Employee commuting',
      'Waste treatment'
    ],
    reductionStrategies: [
      'Solar rooftop installations (40-60% electricity reduction)',
      'Energy-efficient motors and VFDs',
      'Water recycling in dyeing processes',
      'Sustainable fiber sourcing',
      'LED lighting retrofits'
    ],
    caseStudy: {
      company: 'Mid-size Tirupur Exporter',
      reduction: '35%',
      savings: '₹18L/year',
      timeframe: '18 months'
    },
    keywords: ['textile carbon footprint', 'garment emissions', 'sustainable fashion', 'tirupur exports', 'EU CBAM textile']
  },
  {
    id: 'chemical',
    name: 'Chemical Industry',
    icon: FlaskConical,
    tagline: 'Precision Chemistry, Precise Emissions',
    description: 'Chemical manufacturing is energy-intensive with complex process emissions. Accurate MRV is critical for compliance and green financing.',
    scope1Sources: [
      'Process emissions from reactions',
      'On-site fuel combustion',
      'Flaring and venting',
      'Fugitive emissions from storage'
    ],
    scope2Sources: [
      'Electricity for reactors and pumps',
      'Steam generation',
      'Cooling systems',
      'Laboratory equipment'
    ],
    scope3Sources: [
      'Raw material procurement',
      'Catalyst and auxiliary chemicals',
      'Packaging and containers',
      'Product distribution',
      'Waste disposal and treatment'
    ],
    reductionStrategies: [
      'Process optimization and catalyst efficiency',
      'Heat recovery systems',
      'Green chemistry alternatives',
      'Renewable energy procurement',
      'Closed-loop cooling systems'
    ],
    keywords: ['chemical industry emissions', 'process emissions', 'green chemistry', 'chemical manufacturing carbon']
  },
  {
    id: 'steel',
    name: 'Steel Production',
    icon: HardHat,
    tagline: 'Green Steel for a Net-Zero Future',
    description: 'Steel is one of the hardest-to-abate sectors. Early movers on carbon accounting will access premium markets and green financing.',
    scope1Sources: [
      'Blast furnace operations',
      'Coal and coke combustion',
      'Direct reduction processes',
      'On-site transport and handling'
    ],
    scope2Sources: [
      'Electric arc furnaces',
      'Rolling mill electricity',
      'Compressed air systems',
      'Material handling equipment'
    ],
    scope3Sources: [
      'Iron ore and coal procurement',
      'Limestone and fluxes',
      'Scrap metal sourcing',
      'Product transportation',
      'End-of-life recycling'
    ],
    reductionStrategies: [
      'Electric arc furnace transition',
      'Hydrogen-based direct reduction',
      'Scrap utilization optimization',
      'Energy efficiency in rolling mills',
      'Carbon capture readiness'
    ],
    caseStudy: {
      company: 'Secondary Steel Manufacturer',
      reduction: '22%',
      savings: '₹1.2Cr/year',
      timeframe: '24 months'
    },
    keywords: ['green steel', 'steel emissions', 'blast furnace carbon', 'electric arc furnace', 'steel decarbonization']
  },
  {
    id: 'logistics',
    name: 'Logistics & Transportation',
    icon: Truck,
    tagline: 'Move Goods, Not Carbon',
    description: 'Fleet emissions are highly trackable through fuel invoices. Logistics companies can unlock significant savings through route optimization and fleet electrification.',
    scope1Sources: [
      'Diesel/petrol vehicle fleet',
      'CNG and LPG vehicles',
      'Refrigeration units',
      'Warehouse generators'
    ],
    scope2Sources: [
      'Warehouse electricity',
      'Electric vehicle charging',
      'Office and facility power',
      'Cold storage systems'
    ],
    scope3Sources: [
      'Third-party carriers',
      'Packaging materials',
      'Vehicle maintenance',
      'Employee commuting',
      'Business travel'
    ],
    reductionStrategies: [
      'Route optimization algorithms',
      'Fleet electrification roadmap',
      'Driver training for fuel efficiency',
      'Load optimization',
      'Solar-powered warehouses'
    ],
    keywords: ['logistics emissions', 'fleet carbon', 'transportation sustainability', 'green logistics', 'supply chain emissions']
  },
  {
    id: 'construction',
    name: 'Construction & Real Estate',
    icon: Building2,
    tagline: 'Build Green, Build Value',
    description: 'Embodied carbon in construction is receiving increased scrutiny. Green building certifications drive premium valuations and tenant demand.',
    scope1Sources: [
      'On-site diesel equipment',
      'Construction vehicles',
      'Generator usage',
      'Concrete production'
    ],
    scope2Sources: [
      'Site electricity consumption',
      'Tower crane operations',
      'Temporary facilities',
      'Lighting and ventilation'
    ],
    scope3Sources: [
      'Cement and concrete',
      'Steel and aluminum',
      'Glass and ceramics',
      'Material transportation',
      'Waste disposal'
    ],
    reductionStrategies: [
      'Low-carbon cement alternatives',
      'Prefabricated components',
      'Material efficiency design',
      'Renewable energy on-site',
      'Waste reduction and recycling'
    ],
    keywords: ['embodied carbon', 'construction emissions', 'green building', 'sustainable construction', 'real estate sustainability']
  },
  {
    id: 'automobile',
    name: 'Automobile Manufacturing',
    icon: Car,
    tagline: 'Drive the Transition',
    description: 'Auto manufacturers face pressure from both regulation and OEMs demanding supply chain transparency. Early carbon accounting creates competitive advantage.',
    scope1Sources: [
      'Paint shop operations',
      'On-site fuel combustion',
      'Welding and fabrication',
      'Testing and quality control'
    ],
    scope2Sources: [
      'Assembly line electricity',
      'HVAC systems',
      'Paint booth ventilation',
      'Compressed air'
    ],
    scope3Sources: [
      'Component procurement',
      'Raw materials (steel, aluminum, plastics)',
      'Tier 2/3 supplier emissions',
      'Vehicle logistics',
      'End-of-life vehicle recycling'
    ],
    reductionStrategies: [
      'Renewable energy PPAs',
      'Energy-efficient paint processes',
      'Supplier engagement programs',
      'Lightweighting initiatives',
      'Closed-loop material systems'
    ],
    keywords: ['automotive emissions', 'car manufacturing carbon', 'auto supply chain', 'EV transition', 'automotive sustainability']
  }
];

// CBAM-exposed industry IDs
const cbamExposedSectors = ['steel', 'chemical'];

// Scope 2 Quick Estimator
const Scope2Estimator = () => {
  const [country, setCountry] = useState('IN');
  const [monthlyKwh, setMonthlyKwh] = useState(10000);
  const config = getCountryConfig(country);
  const annualCo2 = (monthlyKwh * 12 * config.gridFactor) / 1000;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calculator className="h-5 w-5 text-primary" />
          Scope 2 Quick Estimator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Country</Label>
            <select value={country} onChange={e => setCountry(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
              {['IN','PH','ID','BD','PK','SG','VN','TH','MY','LK'].map(c => {
                const cc = getCountryConfig(c);
                return <option key={c} value={c}>{cc.name}</option>;
              })}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Monthly kWh</Label>
            <Input type="number" value={monthlyKwh} onChange={e => setMonthlyKwh(Number(e.target.value))} />
          </div>
        </div>
        <div className="p-3 bg-background rounded-lg text-center">
          <div className="text-2xl font-bold text-primary">{annualCo2.toFixed(1)} tCO₂e/year</div>
          <div className="text-xs text-muted-foreground">Grid factor: {config.gridFactor} kgCO₂/kWh ({config.name})</div>
        </div>
        <Button variant="outline" size="sm" className="w-full" asChild>
          <Link to="/">Upload invoices for full Scope 1+2+3 <ArrowRight className="h-3 w-3 ml-1" /></Link>
        </Button>
      </CardContent>
    </Card>
  );
};

// CBAM Readiness Score
const CBAMReadiness = ({ industryId }: { industryId: string }) => {
  const checks = [
    { label: 'Emission intensity per tonne calculated', key: 'intensity' },
    { label: 'EU importer identified for CBAM declarations', key: 'importer' },
    { label: 'Monitoring plan documented', key: 'monitoring' },
    { label: 'Quarterly reporting process established', key: 'reporting' },
    { label: 'Domestic carbon price deduction assessed', key: 'deduction' },
  ];
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const score = Object.values(checked).filter(Boolean).length;
  const pct = Math.round((score / checks.length) * 100);

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="h-5 w-5 text-amber-600" />
          CBAM Readiness Score
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Your readiness</span>
          <Badge variant={pct >= 60 ? 'default' : 'destructive'}>{pct}%</Badge>
        </div>
        <ul className="space-y-2">
          {checks.map(c => (
            <li key={c.key} className="flex items-center gap-2 text-sm cursor-pointer" onClick={() => setChecked(p => ({ ...p, [c.key]: !p[c.key] }))}>
              <div className={cn('w-4 h-4 rounded border flex items-center justify-center', checked[c.key] ? 'bg-primary border-primary' : 'border-border')}>
                {checked[c.key] && <Check className="h-3 w-3 text-primary-foreground" />}
              </div>
              {c.label}
            </li>
          ))}
        </ul>
        <Button size="sm" className="w-full" asChild>
          <Link to="/cbam-calculator">Full CBAM Calculator <ArrowRight className="h-3 w-3 ml-1" /></Link>
        </Button>
      </CardContent>
    </Card>
  );
};

// Export Risk Badge
const ExportRiskBadge = ({ industryId }: { industryId: string }) => {
  const isCbam = cbamExposedSectors.includes(industryId);
  return (
    <Card className={cn('border-l-4', isCbam ? 'border-l-destructive' : 'border-l-amber-500')}>
      <CardContent className="p-4 flex items-start gap-3">
        <AlertTriangle className={cn('h-5 w-5 mt-0.5', isCbam ? 'text-destructive' : 'text-amber-500')} />
        <div>
          <div className="font-medium text-sm flex items-center gap-2">
            EU Export Risk
            <Badge variant={isCbam ? 'destructive' : 'outline'} className="text-xs">
              {isCbam ? 'HIGH — CBAM Covered' : 'MEDIUM — Indirect Exposure'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {isCbam
              ? 'This sector is directly covered under EU CBAM. Exporters must provide product-level emission intensity data from 2026.'
              : 'Not directly under CBAM, but EU buyers require Scope 3 data under CSDDD. Prepare carbon reports for supply chain compliance.'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

// Industry Tools section
const IndustryTools = ({ industryId }: { industryId: string }) => (
  <div className="grid md:grid-cols-2 gap-6 mb-8">
    <div className="space-y-6">
      <Scope2Estimator />
      <ExportRiskBadge industryId={industryId} />
    </div>
    <div>
      {cbamExposedSectors.includes(industryId) ? (
        <CBAMReadiness industryId={industryId} />
      ) : (
        <Card className="border-primary/30 bg-primary/5 h-full">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="h-5 w-5 text-primary" />
              Green Finance Eligibility
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Companies with verified carbon data access green financing at 2-4% lower interest rates across emerging markets.</p>
            <ul className="space-y-2">
              {['SIDBI Green Loans (India)', 'Bangladesh Bank 5% Refinance', 'IFC Climate Credit Lines', 'ADB Green Facilities'].map(item => (
                <li key={item} className="flex items-center gap-2 text-sm">
                  <Check className="h-3 w-3 text-primary" />{item}
                </li>
              ))}
            </ul>
            <Button size="sm" className="w-full" asChild>
              <Link to="/climate-finance">Check Eligibility <ArrowRight className="h-3 w-3 ml-1" /></Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  </div>
);

// Map industry IDs to related solution page slugs
const getSolutionLinksForIndustry = (industryId: string): { slug: string; label: string }[] => {
  const sectorMap: Record<string, string> = {
    textile: 'textile',
    chemical: 'chemicals',
    steel: 'steel',
    logistics: 'logistics',
    construction: 'manufacturing',
    automobile: 'manufacturing',
  };
  const sector = sectorMap[industryId] || 'manufacturing';
  const countries = [
    { code: 'india', label: 'India' },
    { code: 'bangladesh', label: 'Bangladesh' },
    { code: 'indonesia', label: 'Indonesia' },
    { code: 'vietnam', label: 'Vietnam' },
    { code: 'philippines', label: 'Philippines' },
  ];
  const regulations = cbamExposedSectors.includes(industryId) ? ['cbam', 'scope3'] : ['carbon-audit', 'scope3'];
  
  return countries.flatMap(c => 
    regulations.map(r => ({
      slug: `${r}-${sector}-${c.code}`,
      label: `${r === 'cbam' ? 'CBAM' : r === 'scope3' ? 'Scope 3' : 'Carbon Audit'} · ${c.label}`,
    }))
  ).slice(0, 6);
};

const Industries = () => {
  const { industry: industrySlug } = useParams();
  const [activeTab, setActiveTab] = useState(industrySlug || 'textile');
  
  const activeIndustry = industries.find(i => i.id === activeTab) || industries[0];

  // SEO structured data
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Industry Carbon Accounting Solutions",
    "description": "Senseible provides AI-powered carbon MRV solutions for MSMEs across industries including textile, chemical, steel, logistics, construction, and automobile manufacturing.",
    "itemListElement": industries.map((ind, idx) => ({
      "@type": "ListItem",
      "position": idx + 1,
      "item": {
        "@type": "Service",
        "name": `${ind.name} Carbon Accounting`,
        "description": ind.description,
        "provider": {
          "@type": "Organization",
          "name": "Senseible"
        }
      }
    }))
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`${activeIndustry.name} Carbon Accounting — Senseible Industry Solutions`}
        description={`AI-powered carbon MRV for ${activeIndustry.name.toLowerCase()}. Track Scope 1, 2, 3 emissions. Access green loans and CBAM compliance. Built for Indian MSMEs.`}
        canonical={`/industries/${activeIndustry.id}`}
        keywords={activeIndustry.keywords}
        breadcrumbs={[
          { name: 'Home', url: '/' },
          { name: 'Industries', url: '/industries' },
          { name: activeIndustry.name, url: `/industries/${activeIndustry.id}` }
        ]}
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>

      <Navigation />

      <main className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <section className="text-center mb-12">
          <Badge variant="outline" className="mb-4">
            <Leaf className="h-3 w-3 mr-1" />
            Industry Solutions
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Carbon Accounting for
            <br />
            <span className="text-gradient-success">Every MSME Industry</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Tailored emission tracking, reporting, and monetization pathways for your sector.
            Built for compliance. Designed for growth.
          </p>
        </section>

        {/* Industry Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex flex-wrap justify-center gap-2 h-auto bg-transparent mb-8">
            {industries.map((ind) => (
              <TabsTrigger 
                key={ind.id} 
                value={ind.id}
                className={cn(
                  "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
                  "px-4 py-2 rounded-lg"
                )}
              >
                <ind.icon className="h-4 w-4 mr-2" />
                {ind.name.split(' ')[0]}
              </TabsTrigger>
            ))}
          </TabsList>

          {industries.map((ind) => (
            <TabsContent key={ind.id} value={ind.id} className="mt-0">
              {/* Industry Header */}
              <Card className="mb-8 overflow-hidden">
                <div className="bg-gradient-to-br from-primary/10 to-success/10 p-8">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-primary/10 rounded-xl">
                      <ind.icon className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">{ind.name}</h2>
                      <p className="text-muted-foreground">{ind.tagline}</p>
                    </div>
                  </div>
                  <p className="text-muted-foreground max-w-3xl">{ind.description}</p>
                </div>
              </Card>

              {/* Scope Breakdown */}
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                {/* Scope 1 */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <div className="p-1.5 bg-red-500/10 rounded">
                        <Zap className="h-4 w-4 text-red-500" />
                      </div>
                      Scope 1 — Direct
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {ind.scope1Sources.map((source, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                          <span>{source}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {/* Scope 2 */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <div className="p-1.5 bg-amber-500/10 rounded">
                        <Zap className="h-4 w-4 text-amber-500" />
                      </div>
                      Scope 2 — Electricity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {ind.scope2Sources.map((source, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                          <span>{source}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {/* Scope 3 */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <div className="p-1.5 bg-blue-500/10 rounded">
                        <Zap className="h-4 w-4 text-blue-500" />
                      </div>
                      Scope 3 — Value Chain
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {ind.scope3Sources.map((source, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                          <span>{source}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Reduction Strategies & Case Study */}
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingDown className="h-5 w-5 text-success" />
                      Reduction Strategies
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {ind.reductionStrategies.map((strategy, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <div className="p-1 bg-success/10 rounded mt-0.5">
                            <Leaf className="h-3 w-3 text-success" />
                          </div>
                          <span className="text-sm">{strategy}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {ind.caseStudy && (
                  <Card className="bg-gradient-to-br from-success/5 to-primary/5">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        Success Story
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        {ind.caseStudy.company}
                      </p>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-3 bg-background rounded-lg">
                          <div className="text-2xl font-bold text-success">{ind.caseStudy.reduction}</div>
                          <div className="text-xs text-muted-foreground">CO2 Reduction</div>
                        </div>
                        <div className="text-center p-3 bg-background rounded-lg">
                          <div className="text-2xl font-bold text-primary">{ind.caseStudy.savings}</div>
                          <div className="text-xs text-muted-foreground">Annual Savings</div>
                        </div>
                        <div className="text-center p-3 bg-background rounded-lg">
                          <div className="text-2xl font-bold">{ind.caseStudy.timeframe}</div>
                          <div className="text-xs text-muted-foreground">Timeframe</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Scope 2 Quick Estimator + CBAM Readiness + Export Risk */}
              <IndustryTools industryId={ind.id} />

              {/* Related Solutions Links */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  Country-Specific Solutions
                </h3>
                <div className="flex flex-wrap gap-2">
                  {getSolutionLinksForIndustry(ind.id).map(link => (
                    <Link key={link.slug} to={`/solutions/${link.slug}`}>
                      <Badge variant="outline" className="hover:bg-primary/10 cursor-pointer">
                        {link.label}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </div>

              {/* CTA Section */}
              <Card className="bg-gradient-to-r from-primary/10 via-success/10 to-primary/10 border-primary/20">
                <CardContent className="p-8 text-center">
                  <h3 className="text-2xl font-bold mb-2">
                    Ready to track your {ind.name.toLowerCase()} emissions?
                  </h3>
                  <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
                    Upload your invoices and get your carbon footprint in under 47 seconds.
                    No expertise required.
                  </p>
                  <div className="flex flex-wrap justify-center gap-4">
                    <Button size="lg" asChild>
                      <Link to="/auth">
                        Start Free
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Link>
                    </Button>
                    <Button size="lg" variant="outline" asChild>
                      <Link to="/pricing">View Pricing</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        {/* Benefits Section */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold text-center mb-8">Why MSMEs Choose Senseible</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { icon: Zap, title: '47-Second Processing', desc: 'From invoice to carbon footprint instantly' },
              { icon: Shield, title: 'CBAM Ready', desc: 'Prepare for EU carbon border requirements' },
              { icon: DollarSign, title: 'Green Financing', desc: 'Access preferential loan rates' },
              { icon: Leaf, title: 'Carbon Credits', desc: 'Monetize verified reductions' },
            ].map((benefit, idx) => (
              <Card key={idx} className="text-center p-6">
                <benefit.icon className="h-10 w-10 mx-auto mb-4 text-primary" />
                <h3 className="font-semibold mb-2">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.desc}</p>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Industries;
