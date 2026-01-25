import { Link } from 'react-router-dom';
import { SEOHead } from '@/components/SEOHead';
import { MinimalNav } from '@/components/MinimalNav';
import { SecondaryFooter } from '@/components/SecondaryFooter';
import { CarbonParticles } from '@/components/CarbonParticles';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Leaf, 
  Plug, 
  Landmark,
  ArrowRight,
  Shield,
  Globe,
  TrendingUp,
  CheckCircle2,
  Handshake,
  BarChart3
} from 'lucide-react';

const PARTNER_TYPES = [
  {
    id: 'carbon-buyers',
    title: 'Carbon Credit Buyers',
    description: 'Access verified MSME carbon credits directly from the source. High-quality, transparent, and traceable.',
    icon: Leaf,
    benefits: [
      'Pre-verified credits with AI-powered MRV',
      'Direct access to MSME credit supply',
      'Transparent pricing and provenance',
      'SDG-aligned project portfolios',
    ],
    cta: 'Explore Credits',
    href: '/marketplace',
    color: 'text-success',
    bgColor: 'bg-success/10',
  },
  {
    id: 'banks',
    title: 'Banks & Financial Institutions',
    description: 'Offer green loans and climate-linked products using verified carbon data from your MSME clients.',
    icon: Landmark,
    benefits: [
      'Verified carbon data for green lending',
      'Risk assessment via carbon metrics',
      'Sustainability-linked loan products',
      'Regulatory compliance support',
    ],
    cta: 'Learn More',
    href: '/climate-finance',
    color: 'text-accent',
    bgColor: 'bg-accent/10',
  },
  {
    id: 'erp',
    title: 'ERP & Accounting Platforms',
    description: 'Integrate carbon tracking into your existing workflows. API-first design for seamless adoption.',
    icon: Plug,
    benefits: [
      'REST API for carbon data',
      'Webhook integrations',
      'White-label reporting',
      'Automated emissions tracking',
    ],
    cta: 'View API Docs',
    href: '/contact',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  {
    id: 'climate-finance',
    title: 'Climate Finance Providers',
    description: 'Deploy capital at scale with verified impact data. Fund MSMEs driving real climate outcomes.',
    icon: TrendingUp,
    benefits: [
      'Impact-verified project pipelines',
      'MRV-backed performance tracking',
      'Portfolio-level analytics',
      'Blended finance structures',
    ],
    cta: 'Partner With Us',
    href: '/contact',
    color: 'text-warning',
    bgColor: 'bg-warning/10',
  },
];

const TRUST_INDICATORS = [
  { label: '400M+', description: 'MSMEs Addressable' },
  { label: '47 sec', description: 'Average MRV Time' },
  { label: '95%+', description: 'Verification Accuracy' },
  { label: 'India First', description: 'Built for Emerging Markets' },
];

const Partners = () => {
  return (
    <div className="relative min-h-screen w-full bg-background overflow-hidden">
      <SEOHead
        title="Partner Program — Carbon Buyers, Banks & ERP Integrations"
        description="Join Senseible's partner ecosystem. Access verified MSME carbon credits, enable green lending, or integrate carbon tracking into your platform."
        canonical="/partners"
        keywords={[
          'carbon credit buyers',
          'green loans India',
          'ERP carbon integration',
          'climate finance partners',
          'MSME carbon marketplace',
        ]}
      />
      
      <CarbonParticles />
      <MinimalNav />

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-20 text-center">
          <Badge variant="secondary" className="mb-4">
            <Handshake className="w-3 h-3 mr-1" />
            Partner Ecosystem
          </Badge>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 max-w-4xl mx-auto">
            Partner with India's 
            <span className="text-gradient-success"> MSME Carbon Network</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Access verified carbon credits, enable green lending, or integrate carbon tracking. 
            Join the infrastructure powering climate action for 400 million MSMEs.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 mb-12">
            <Button size="lg" asChild>
              <Link to="/auth?mode=partner">
                Become a Partner
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/marketplace">
                View Marketplace
              </Link>
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {TRUST_INDICATORS.map((item, i) => (
              <div key={i} className="text-center">
                <p className="text-2xl md:text-3xl font-bold text-foreground">{item.label}</p>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Partner Types */}
        <section className="container mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Choose Your Partnership</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We offer tailored partnerships for different climate ecosystem participants. 
              Find the right fit for your organization.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {PARTNER_TYPES.map((type) => {
              const Icon = type.icon;
              return (
                <Card key={type.id} className="relative overflow-hidden hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className={`w-12 h-12 rounded-xl ${type.bgColor} flex items-center justify-center mb-4`}>
                        <Icon className={`w-6 h-6 ${type.color}`} />
                      </div>
                    </div>
                    <CardTitle className="text-xl">{type.title}</CardTitle>
                    <CardDescription className="text-base">
                      {type.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 mb-6">
                      {type.benefits.map((benefit, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                    <Button variant="outline" className="w-full" asChild>
                      <Link to={type.href}>
                        {type.cta}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Why Partner Section */}
        <section className="container mx-auto px-4 py-16 bg-secondary/30">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Why Partner with Senseible?</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                We're building the infrastructure layer for MSME carbon. 
                Here's what makes us different.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <Card className="text-center">
                <CardContent className="pt-6">
                  <Shield className="w-10 h-10 mx-auto mb-4 text-primary" />
                  <h3 className="font-semibold mb-2">MRV-Grade Verification</h3>
                  <p className="text-sm text-muted-foreground">
                    AI-powered verification that meets international standards. 
                    CBAM-ready, CCTS-aligned.
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardContent className="pt-6">
                  <Globe className="w-10 h-10 mx-auto mb-4 text-accent" />
                  <h3 className="font-semibold mb-2">India-First, Global-Ready</h3>
                  <p className="text-sm text-muted-foreground">
                    Built for India's unique MSME landscape, 
                    designed for emerging market expansion.
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardContent className="pt-6">
                  <BarChart3 className="w-10 h-10 mx-auto mb-4 text-success" />
                  <h3 className="font-semibold mb-2">Real-Time Intelligence</h3>
                  <p className="text-sm text-muted-foreground">
                    Live carbon data streams. Portfolio analytics. 
                    Impact tracking at scale.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-20 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-4">Ready to Partner?</h2>
            <p className="text-muted-foreground mb-8">
              Let's discuss how we can work together to accelerate climate action. 
              Custom pricing available for enterprise partners.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button size="lg" asChild>
                <Link to="/contact">
                  Contact Sales
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="mailto:partners@senseible.earth">
                  partners@senseible.earth
                </a>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SecondaryFooter />
    </div>
  );
};

export default Partners;
