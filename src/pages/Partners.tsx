import { Link } from 'react-router-dom';
import { SEOHead } from '@/components/SEOHead';
import partnersOg from '@/assets/og/partners.jpg';
import { MinimalNav } from '@/components/MinimalNav';
import { Footer } from '@/components/Footer';
import { CarbonParticles } from '@/components/CarbonParticles';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Handshake } from 'lucide-react';
import { FlowLanes, FlipReasons, type PartnerType } from '@/components/partners/PartnerVisuals';
import { COUNTRY_CONFIGS } from '@/lib/countryConfig';

const PARTNER_TYPES: PartnerType[] = [
  {
    id: 'carbon-buyers',
    title: 'Carbon Credit Buyers',
    description: 'Access verified MSME carbon credits directly from the source. High-quality, transparent, and traceable.',
    flow: { label: 'Verified credit records' },
    benefits: [
      // Issuance and validation belong to the crediting programme; the platform supplies the MRV record.
      'MRV records behind each listing, hashed to their source documents',
      'Direct access to MSME credit supply',
      'Transparent pricing and provenance',
      'SDG-aligned project portfolios',
    ],
    cta: 'Explore Credits',
    href: '/marketplace',
  },
  {
    id: 'banks',
    title: 'Banks & Financial Institutions',
    description: 'Offer green loans and climate-linked products using verified carbon data from your MSME clients.',
    flow: { label: 'Verified baselines', back: 'Green loans' },
    benefits: [
      'Verified carbon data for green lending',
      'Risk assessment via carbon metrics',
      'Sustainability-linked loan products',
      'Regulatory compliance support',
    ],
    cta: 'Learn More',
    href: '/climate-finance',
  },
  {
    id: 'erp',
    title: 'ERP & Accounting Platforms',
    description: 'Integrate carbon tracking into your existing workflows. API-first design for seamless adoption.',
    flow: { label: 'Carbon data by API' },
    benefits: [
      // Same status as the API on /enterprise (src/data/enterpriseCapabilities.ts).
      { text: 'REST API for carbon data', status: 'custom' },
      { text: 'Webhook integrations', status: 'custom' },
      'White-label reporting',
      'Automated emissions tracking',
    ],
    cta: 'View API Docs',
    href: '/contact',
  },
  {
    id: 'climate-finance',
    title: 'Climate Finance Providers',
    description: 'Deploy capital at scale with verified impact data. Fund MSMEs driving real climate outcomes.',
    flow: { label: 'Impact data', back: 'Capital' },
    benefits: [
      'Impact-verified project pipelines',
      'MRV-backed performance tracking',
      'Portfolio-level analytics',
      'Blended finance structures',
    ],
    cta: 'Partner With Us',
    href: '/contact',
  },
];

const TRUST_INDICATORS = [
  { label: 'Scope 1-3', description: 'GHG Protocol aligned' },
  { label: 'SHA-256', description: 'Evidence hash per document' },
  // Counted from the grid factors the platform actually carries.
  { label: String(Object.keys(COUNTRY_CONFIGS).length), description: 'Countries with local grid factors' },
  { label: 'Built in India', description: 'For emerging markets' },
];

const Partners = () => {
  return (
    <div className="pt-anim relative min-h-screen w-full bg-background overflow-hidden">
      <SEOHead
        title="Partner Program | Carbon Buyers, Banks & ERP Integrations"
        description="Join Senseible's partner ecosystem. Access verified MSME carbon credits, enable green lending, or integrate carbon tracking into your platform."
        canonical="/partners"
        image={`https://senseible.earth${partnersOg}`}
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
            Join the infrastructure powering climate action for MSMEs.
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

          <div className="max-w-5xl mx-auto">
            <FlowLanes types={PARTNER_TYPES} />
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

            <FlipReasons reasons={[
              { title: 'MRV-Grade Verification', body: 'AI-powered verification following the GHG Protocol and ISO 14064-1 methods. CBAM-ready, CCTS-aligned.', mark: 'M20 5 L32 10 V19 C32 27 26 33 20 35 C14 33 8 27 8 19 V10 Z M14 20 L18 24 L26 15' },
              { title: 'India-First, Global-Ready', body: "Built for India's unique MSME landscape, designed for emerging market expansion.", mark: 'M20 5 A15 15 0 1 0 20.01 5 M5 20 H35 M20 5 C13 12 13 28 20 35 M20 5 C27 12 27 28 20 35' },
              { title: 'Real-Time Intelligence', body: 'Live carbon data streams. Portfolio analytics. Impact tracking at scale.', note: 'Live data streams from connected meters and systems are built to your requirements (Custom).', mark: 'M4 22 H12 L16 12 L22 30 L26 18 L29 22 H36' },
            ]} />
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

      <Footer />
    </div>
  );
};

export default Partners;
