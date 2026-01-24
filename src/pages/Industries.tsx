import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Navigation } from '@/components/Navigation';
import { SecondaryFooter } from '@/components/SecondaryFooter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Factory, Truck, Building2, Car, Shirt, FlaskConical, 
  HardHat, ArrowRight, Check, Leaf, TrendingDown, 
  DollarSign, FileText, Shield, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
      <Helmet>
        <title>{activeIndustry.name} Carbon Accounting — Senseible Industry Solutions</title>
        <meta 
          name="description" 
          content={`AI-powered carbon MRV for ${activeIndustry.name.toLowerCase()}. Track Scope 1, 2, 3 emissions. Access green loans and CBAM compliance. Built for Indian MSMEs.`} 
        />
        <meta name="keywords" content={activeIndustry.keywords.join(', ')} />
        <link rel="canonical" href={`https://senseible.earth/industries/${activeIndustry.id}`} />
        <meta property="og:title" content={`${activeIndustry.name} Carbon Accounting — Senseible`} />
        <meta property="og:description" content={activeIndustry.tagline} />
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

      <SecondaryFooter />
    </div>
  );
};

export default Industries;
