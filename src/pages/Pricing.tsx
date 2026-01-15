import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { CarbonParticles } from '@/components/CarbonParticles';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { 
  Check, Sparkles, Zap, Crown, Building2, ArrowRight,
  MessageCircle, FileText, Shield, Brain, TrendingUp,
  Users, Phone, Mail, Headphones, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSession } from '@/hooks/useSession';
import { useRazorpay } from '@/hooks/useRazorpay';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { toast } from 'sonner';

interface PricingTier {
  id: string;
  name: string;
  icon: typeof Sparkles;
  tagline: string;
  price: number;
  originalPrice?: number;
  period: string;
  subtext?: string;
  cta: string;
  ctaVariant: 'default' | 'outline' | 'secondary';
  popular?: boolean;
  features: string[];
}

const Pricing = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useSession();
  const { initiatePayment, isLoading: isPaymentLoading, isReady: isRazorpayReady } = useRazorpay();
  const { tier: currentTier, refreshTier } = usePremiumStatus();
  
  const [teamSize, setTeamSize] = useState(50);
  const [processingTier, setProcessingTier] = useState<string | null>(null);
  
  const scaleBasePrice = 15000;
  const perEmployeePrice = 99;
  const scalePrice = scaleBasePrice + (teamSize * perEmployeePrice);

  const handleSubscribe = async (tierId: string) => {
    // Free tier - just navigate to auth
    if (tierId === 'snapshot') {
      navigate('/auth');
      return;
    }

    // Scale tier - contact sales
    if (tierId === 'scale') {
      navigate('/contact');
      return;
    }

    // Check authentication
    if (!isAuthenticated || !user) {
      toast.info('Please sign in to subscribe');
      navigate('/auth', { state: { returnTo: '/pricing', selectedTier: tierId } });
      return;
    }

    // Already on this tier
    if (currentTier === tierId) {
      toast.info(`You're already on the ${tierId.charAt(0).toUpperCase() + tierId.slice(1)} plan`);
      return;
    }

    // Initiate payment
    setProcessingTier(tierId);
    
    try {
      await initiatePayment({
        tier: tierId,
        teamSize: tierId === 'scale' ? teamSize : undefined,
        userId: user.id,
        userEmail: user.email || '',
        onSuccess: async (tier) => {
          // Refresh tier from database
          await refreshTier();
          toast.success(`Welcome to Biocog ${tier.charAt(0).toUpperCase() + tier.slice(1)}!`);
          navigate('/dashboard');
        },
        onFailure: (error) => {
          toast.error(error || 'Payment failed. Please try again.');
        },
      });
    } finally {
      setProcessingTier(null);
    }
  };

  const getButtonContent = (tier: { id: string; cta: string }) => {
    const isCurrentPlan = currentTier === tier.id;
    const isProcessing = processingTier === tier.id;
    
    if (isProcessing) {
      return (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Processing...
        </>
      );
    }
    
    if (isCurrentPlan) {
      return 'Current Plan';
    }
    
    return tier.cta;
  };

  const tiers: PricingTier[] = [
    {
      id: 'snapshot',
      name: 'Biocog Snapshot',
      icon: Sparkles,
      tagline: 'Forever Free',
      price: 0,
      period: 'forever',
      subtext: 'Good for getting started.',
      cta: 'Start Free',
      ctaVariant: 'outline',
      features: [
        'AI Emission Snapshot (Scope 1-3)',
        'Basic ESG Score',
        '10 Invoice Scans/month',
        '90-day Data Backup',
        'Voice AI (Lite)',
        'Help Center Support',
      ],
    },
    {
      id: 'essential',
      name: 'Biocog Essential',
      icon: Zap,
      tagline: 'Launch Price',
      price: 499,
      originalPrice: 1999,
      period: '/month',
      subtext: 'You pay ₹499 to unlock thousands in savings.',
      cta: 'Unlock Savings',
      ctaVariant: 'default',
      features: [
        'Everything in Snapshot',
        'Full GST→Carbon Automation',
        'Verified Climate Score',
        'Green Loan Eligibility Check',
        'Government Incentives Finder',
        'AI Savings Insights',
        '3 Team Members',
        'Email Support',
      ],
    },
    {
      id: 'pro',
      name: 'Biocog Pro',
      icon: Crown,
      tagline: 'Most Popular',
      price: 4999,
      originalPrice: 9999,
      period: '/month',
      subtext: "Biocog Pro doesn't cost money — it makes money.",
      cta: 'Start Earning',
      ctaVariant: 'default',
      popular: true,
      features: [
        'Everything in Basic',
        'Carbon Monetization Setup',
        'Automated ESG Reports (PDF)',
        'Bank-grade Verification Ledger',
        'Predictive AI Models',
        'Priority Green Finance Access',
        '10 Team Members',
        'Phone + Email Support',
        'AI ESG Head',
        'Biocog Superintelligence',
        'All Reporting Frameworks',
      ],
    },
    {
      id: 'scale',
      name: 'Biocog Scale',
      icon: Building2,
      tagline: 'Pay As You Grow',
      price: scalePrice,
      period: '/month',
      subtext: 'Custom workflows and larger teams.',
      cta: 'Talk to Sales',
      ctaVariant: 'secondary',
      features: [
        'Everything in Pro',
        'Real-time MRV Pipeline',
        'Multi-entity Support',
        'API & Integrations',
        'SBTi-ready Projections',
        'Dedicated Onboarding',
        'Priority SLA',
        'Unlimited Team Members',
      ],
    },
  ];

  const comparisonFeatures = [
    { name: 'GST → Carbon Automation', snapshot: 'Limited', essential: true, pro: true, scale: true },
    { name: 'Green Loan Eligibility', snapshot: false, essential: true, pro: 'Priority', scale: 'Priority' },
    { name: 'ESG Score', snapshot: 'Basic', essential: 'Verified', pro: 'Verified', scale: 'Certified' },
    { name: 'Carbon Monetization', snapshot: false, essential: false, pro: true, scale: true },
    { name: 'Reports', snapshot: 'Preview', essential: 'Basic', pro: 'Automated', scale: 'Custom' },
    { name: 'Support', snapshot: 'Help Center', essential: 'Email', pro: 'Phone + Email', scale: 'Dedicated' },
    { name: 'Team Members', snapshot: '1', essential: '3', pro: '10', scale: 'Unlimited' },
  ];

  const addons = [
    { name: 'Extra Invoice Scans', price: '₹49 per 100 scans' },
    { name: 'Custom Dashboard', price: '₹999/month' },
    { name: 'Multi-entity Support', price: '₹1,999/month' },
    { name: 'Expert Climate Audit', price: '₹4,999 one-time' },
    { name: 'Fast-track Verification', price: '₹2,999 per report' },
    { name: 'Real-time Data Streaming', price: '₹1,499/month' },
  ];

  const faqs = [
    {
      q: 'Do I need climate knowledge to use this?',
      a: 'No. Our AI handles all carbon calculations, compliance mapping, and report generation automatically. Just upload invoices.',
    },
    {
      q: 'Is this built for small businesses?',
      a: 'Yes! Senseible is designed specifically for MSMEs. No consultants, no complex setups — just simple, affordable climate action.',
    },
    {
      q: 'Can I actually earn money from this?',
      a: 'Yes. With Pro and Scale plans, you can monetize verified carbon data through credits, green loans, and government incentives.',
    },
    {
      q: 'Can I switch plans anytime?',
      a: 'Absolutely. Upgrade or downgrade whenever you need. Your data stays safe across plan changes.',
    },
    {
      q: 'What happens if I stay on the free plan?',
      a: 'Snapshot is free forever. You get basic emission tracking and ESG scores. Upgrade when you are ready to unlock monetization.',
    },
    {
      q: 'How is this different from hiring ESG consultants?',
      a: '10x faster, 10x cheaper, always available. AI-powered insights replace months of manual work with instant, accurate results.',
    },
  ];

  const formatCurrency = (n: number) => new Intl.NumberFormat('en-IN', { 
    style: 'currency', 
    currency: 'INR', 
    maximumFractionDigits: 0 
  }).format(n);

  return (
    <div className="relative min-h-screen w-full bg-background pb-16 md:pb-0">
      <Helmet>
        <title>Pricing — Senseible</title>
        <meta name="description" content="AI for MSMEs. Start free. Grow as you grow. No consultants. No delays." />
      </Helmet>
      <CarbonParticles />
      <Navigation />

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="container mx-auto px-4 pt-12 pb-16 text-center">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
              Earn from your Climate Data
              <br />
              <span className="text-gradient-success">in 10 Seconds</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              AI for MSMEs. Start free. Grow as you grow. No consultants. No delays.
            </p>
            <Button size="lg" asChild>
              <Link to="/auth">
                Start Free
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="container mx-auto px-4 pb-16">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {tiers.map((tier, idx) => (
              <Card 
                key={tier.id}
                className={cn(
                  "relative overflow-hidden transition-all duration-300 hover:shadow-lg animate-fade-in",
                  tier.popular && "border-primary shadow-lg ring-2 ring-primary/20"
                )}
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                {tier.popular && (
                  <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-xs font-medium rounded-bl-lg">
                    Most Popular
                  </div>
                )}
                <CardContent className="p-6">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className={cn(
                      "p-2 rounded-lg",
                      tier.popular ? "bg-primary/10" : "bg-muted"
                    )}>
                      <tier.icon className={cn(
                        "h-5 w-5",
                        tier.popular ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>
                    <div>
                      <h3 className="font-semibold">{tier.name}</h3>
                      <p className="text-xs text-muted-foreground">{tier.tagline}</p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mb-4">
                    {tier.originalPrice && (
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm line-through text-muted-foreground">
                          {formatCurrency(tier.originalPrice)}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-success/10 text-success text-xs font-medium">
                          {Math.round((1 - tier.price / tier.originalPrice) * 100)}% OFF
                        </span>
                      </div>
                    )}
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold">{formatCurrency(tier.price)}</span>
                      <span className="text-sm text-muted-foreground">{tier.period}</span>
                    </div>
                    {tier.id === 'basic' && (
                      <p className="text-xs text-muted-foreground mt-1">Less than ₹17/day</p>
                    )}
                  </div>

                  {/* Scale Tier Calculator */}
                  {tier.id === 'scale' && (
                    <div className="mb-4 p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium">Team Size</span>
                        <span className="text-sm font-bold">{teamSize} employees</span>
                      </div>
                      <Slider
                        value={[teamSize]}
                        onValueChange={(v) => setTeamSize(v[0])}
                        min={10}
                        max={500}
                        step={10}
                        className="mb-2"
                      />
                      <p className="text-xs text-muted-foreground">
                        Base {formatCurrency(scaleBasePrice)} + {formatCurrency(perEmployeePrice)}/employee
                      </p>
                    </div>
                  )}

                  {/* CTA Button */}
                  <Button 
                    variant={tier.ctaVariant}
                    className={cn(
                      "w-full mb-4",
                      tier.popular && "bg-primary hover:bg-primary/90",
                      currentTier === tier.id && "opacity-60 cursor-default"
                    )}
                    onClick={() => handleSubscribe(tier.id)}
                    disabled={
                      processingTier !== null || 
                      currentTier === tier.id ||
                      (!isRazorpayReady && tier.id !== 'snapshot' && tier.id !== 'scale')
                    }
                  >
                    {getButtonContent(tier)}
                  </Button>

                  {/* Subtext */}
                  {tier.subtext && (
                    <p className="text-xs text-muted-foreground text-center mb-4 italic">
                      "{tier.subtext}"
                    </p>
                  )}

                  {/* Features */}
                  <ul className="space-y-2">
                    {tier.features.map((feature, fidx) => (
                      <li key={fidx} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Comparison Table */}
        <section className="container mx-auto px-4 pb-16">
          <h2 className="text-2xl font-bold text-center mb-8">Compare Plans</h2>
          <div className="max-w-5xl mx-auto overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Feature</th>
                  <th className="text-center py-3 px-4 font-medium">Snapshot</th>
                  <th className="text-center py-3 px-4 font-medium">Essential</th>
                  <th className="text-center py-3 px-4 font-medium bg-primary/5 border-x border-primary/20">Pro</th>
                  <th className="text-center py-3 px-4 font-medium">Scale</th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((feature, idx) => (
                  <tr key={idx} className="border-b border-border/50">
                    <td className="py-3 px-4 text-sm">{feature.name}</td>
                    {['snapshot', 'essential', 'pro', 'scale'].map((tier) => (
                      <td 
                        key={tier} 
                        className={cn(
                          "py-3 px-4 text-center text-sm",
                          tier === 'pro' && "bg-primary/5 border-x border-primary/20"
                        )}
                      >
                        {typeof feature[tier as keyof typeof feature] === 'boolean' ? (
                          feature[tier as keyof typeof feature] ? (
                            <Check className="h-4 w-4 text-success mx-auto" />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )
                        ) : (
                          <span className={cn(
                            feature[tier as keyof typeof feature] === 'Priority' && "text-primary font-medium"
                          )}>
                            {feature[tier as keyof typeof feature] as string}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Add-ons */}
        <section className="container mx-auto px-4 pb-16">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8">Add-ons & Extras</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {addons.map((addon, idx) => (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:border-primary/30 transition-colors"
                >
                  <span className="font-medium">{addon.name}</span>
                  <span className="text-sm text-muted-foreground">{addon.price}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="container mx-auto px-4 pb-16">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, idx) => (
                <AccordionItem key={idx} value={`faq-${idx}`}>
                  <AccordionTrigger className="text-left">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* Final CTA */}
        <section className="container mx-auto px-4 pb-16">
          <div className="max-w-2xl mx-auto text-center">
            <Card className="bg-gradient-to-r from-primary/5 to-success/5 border-primary/20">
              <CardContent className="p-8">
                <Brain className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h2 className="text-2xl font-bold mb-2">Ready to transform your climate data?</h2>
                <p className="text-muted-foreground mb-6">
                  Join thousands of MSMEs already earning from their carbon footprint.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" asChild>
                    <Link to="/auth">
                      Start Free Today
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                  <Button variant="outline" size="lg" asChild>
                    <Link to="/mission">
                      Learn More
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Pricing;
