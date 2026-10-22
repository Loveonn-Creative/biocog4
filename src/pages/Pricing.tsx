import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { CarbonParticles } from '@/components/CarbonParticles';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { 
  Check, Sparkles, Zap, Crown, Building2, ArrowRight,
  Brain, Loader2, Briefcase, Phone
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSession } from '@/hooks/useSession';
import { useRazorpay } from '@/hooks/useRazorpay';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';
import { SubscriptionStatusBanner } from '@/components/SubscriptionStatusBanner';
import { PlanMeter } from '@/components/pricing/PlanMeter';
import { LAUNCH_ENDS_LABEL, MAX_SAVING_PERCENT, TIER_PRICES, yearlySaving } from '@/lib/pricing/pricingMath';
import { launchWindowOpen } from '@/lib/pricing/launchWindow';
import type { PlanTier } from '../../supabase/functions/_shared/planLimits';
import type { PaymentMethod } from '../../supabase/functions/_shared/checkoutTotals';
import type { CheckoutPlan } from '@/components/pricing/CheckoutSummary';

// Below the fold: loaded after the plans are on screen.
const CheckoutSummary = lazy(() => import('@/components/pricing/CheckoutSummary'));
const CustomScopeEstimator = lazy(() => import('@/components/pricing/CustomScopeEstimator').then((m) => ({ default: m.CustomScopeEstimator })));
const AddonBuilder = lazy(() => import('@/components/pricing/AddonBuilder'));

interface PricingTier {
  id: string;
  name: string;
  icon: typeof Sparkles;
  tagline: string;
  /** null = custom priced (shown as "Custom pricing", no figure). */
  price: number | null;
  originalPrice?: number;
  period: string;
  subtext?: string;
  cta: string;
  ctaVariant: 'default' | 'outline' | 'secondary';
  popular?: boolean;
  features: string[];
}

interface PartnerTier {
  id: string;
  name: string;
  icon: typeof Briefcase;
  tagline: string;
  priceLabel: string;
  cta: string;
  ctaVariant: 'default' | 'outline' | 'secondary';
  popular?: boolean;
  features: string[];
}

const Pricing = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: sessionLoading } = useSession();
  const { initiatePayment, isLoading: isPaymentLoading } = useRazorpay();
  const { tier: premiumTier, refreshTier } = usePremiumStatus();
  // A guest has no plan yet: no card is "Current Plan" for them, so the free card stays a sign-up.
  const currentTier = isAuthenticated ? premiumTier : null;
  const { activeContext, isLoading: contextLoading } = useOrganization();
  
  // Wait for context to load before determining pricing view
  const isPartnerContext = !contextLoading && activeContext?.context_type === 'partner';
  
  const [processingTier, setProcessingTier] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'yearly' | 'monthly'>('yearly');
  const [pendingMonthlyTier, setPendingMonthlyTier] = useState<string | null>(null);
  // Plan waiting for the payment-method choice (UPI vs card) before checkout.
  const [checkout, setCheckout] = useState<{ plan: CheckoutPlan; cycle: 'yearly' | 'monthly' } | null>(null);
  // The plan the meter recommends (or the visitor picks on a phone): ringed on
  // desktop, shown on phones, and used by the add-on estimate.
  // A link can open on one plan (/pricing?plan=scale#plans); visitors can still pick any other.
  const [searchParams] = useSearchParams();
  const [focusPlan, setFocusPlan] = useState<PlanTier>(() => {
    const p = searchParams.get('plan');
    return p === 'snapshot' || p === 'essential' || p === 'pro' || p === 'scale' ? p : 'essential';
  });
  // The meter suggests a plan when it first renders; a plan named in the link wins over that first suggestion.
  const planFromLink = useRef(searchParams.has('plan'));
  const onRecommend = useCallback((p: PlanTier) => {
    if (planFromLink.current) { planFromLink.current = false; return; }
    setFocusPlan(p);
  }, []);
  const [hoverCol, setHoverCol] = useState<string | null>(null);
  const [cmpPlan, setCmpPlan] = useState<'snapshot' | 'essential' | 'pro' | 'scale'>('pro');
  
  // Partner-specific tiers
  const partnerTiers: PartnerTier[] = [
    {
      id: 'pay-as-you-go',
      name: 'Pay As You Go',
      icon: Briefcase,
      tagline: 'Pay per credit',
      priceLabel: 'Per transaction',
      cta: 'Get Started',
      ctaVariant: 'outline',
      features: [
        'Access verified carbon credits',
        'Per-credit transaction fees',
        'Basic compliance signals',
        'Standard verification',
        'Email support',
        'Download audit packs',
      ],
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      icon: Building2,
      tagline: 'Built around your team',
      priceLabel: 'Custom pricing',
      cta: 'Contact Sales',
      ctaVariant: 'default',
      popular: true,
      features: [
        'Unlimited credit access',
        'Priority verification queue',
        'Full compliance dashboard (CBAM, EU Taxonomy, PCAF)',
        'API integrations (custom build)',
        'Real-time alerts & signals',
        'Dedicated account manager',
        'Custom reporting',
        'SLA guarantee',
      ],
    },
    {
      id: 'api',
      name: 'API Access',
      icon: Zap,
      tagline: 'For ERPs & Platforms',
      priceLabel: 'Volume-based',
      cta: 'Request API Docs',
      ctaVariant: 'secondary',
      features: [
        'RESTful API access (custom build)',
        'Webhook integrations (custom build)',
        'Bulk verification endpoints',
        'White-label options',
        'Technical onboarding',
        'Developer support',
      ],
    },
  ];

  const handlePartnerAction = (tierId: string) => {
    if (tierId === 'pay-as-you-go') {
      navigate('/marketplace');
    } else {
      navigate('/contact');
    }
  };

  const handleSubscribe = async (tierId: string, forceCycle?: 'yearly' | 'monthly') => {
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

    const cycle = forceCycle ?? billingCycle;

    // Auto-redirect-to-yearly: if user clicked while monthly is selected, show inline upsell
    if (cycle === 'monthly' && (tierId === 'essential' || tierId === 'pro') && !forceCycle) {
      setPendingMonthlyTier(tierId);
      return;
    }

    // Check authentication
    if (!isAuthenticated || !user) {
      toast.info('Please sign in to subscribe');
      // Come back to this plan's checkout after signing in (Auth honours ?next=).
      navigate(`/auth?next=${encodeURIComponent(`/pricing?plan=${tierId}&buy=${cycle}`)}`, { state: { returnTo: '/pricing', selectedTier: tierId, billingCycle: cycle } });
      return;
    }

    // Already on this tier
    if (currentTier === tierId) {
      toast.info(`You're already on the ${tierId.charAt(0).toUpperCase() + tierId.slice(1)} plan`);
      return;
    }

    // One checkout at a time: a click while Checkout is open must not start a second order.
    if (isPaymentLoading) return;

    // Paid list plans: choose UPI or card first (CheckoutSummary), then pay.
    setPendingMonthlyTier(null);
    if (tierId === 'essential' || tierId === 'pro') {
      setCheckout({ plan: tierId, cycle });
      return;
    }
  };

  // A "Buy now" link (/pricing?plan=essential&buy=yearly, from the ad pages or
  // the sign-in return) opens that plan's checkout once the session is known.
  const buyFromLink = useRef<{ plan: string; cycle: 'yearly' | 'monthly' } | null>(
    (searchParams.get('plan') === 'essential' || searchParams.get('plan') === 'pro') && (searchParams.get('buy') === 'yearly' || searchParams.get('buy') === 'monthly')
      ? { plan: searchParams.get('plan') as string, cycle: searchParams.get('buy') as 'yearly' | 'monthly' }
      : null,
  );
  useEffect(() => {
    const link = buyFromLink.current;
    if (!link || sessionLoading) return;
    buyFromLink.current = null;
    setBillingCycle(link.cycle);
    void handleSubscribe(link.plan, link.cycle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionLoading]);

  const payWith = async (method: PaymentMethod) => {
    if (!checkout || !user || isPaymentLoading) return;
    const { plan: tierId, cycle } = checkout;
    setProcessingTier(tierId);
    try {
      await initiatePayment({
        tier: tierId,
        billingCycle: cycle,
        paymentMethod: method,
        userId: user.id,
        userEmail: user.email || '',
        onSuccess: async () => {
          // Refresh tier from database (useRazorpay already confirmed it to the customer)
          await refreshTier();
          navigate('/dashboard');
        },
        // useRazorpay has already told the customer what happened (with the
        // payment reference where money may have moved); no second toast.
        onFailure: () => {},
      });
    } finally {
      setProcessingTier(null);
      setCheckout(null);
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

  // Pricing matrix (src/lib/pricing/pricingMath.ts): yearly = headline /mo
  // equivalent (billed annually); monthly = full /mo.

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
      tagline: billingCycle === 'yearly' ? 'Best Value · Billed Yearly' : 'Billed Monthly',
      price: TIER_PRICES.essential[billingCycle],
      originalPrice: billingCycle === 'yearly' ? TIER_PRICES.essential.monthly : undefined,
      period: '/month',
      subtext: billingCycle === 'yearly'
        ? `Billed ₹${yearlySaving('essential').billedYearly.toLocaleString('en-IN')}/yr. Save ₹${yearlySaving('essential').perYear.toLocaleString('en-IN')}.`
        : `Switch to yearly to save ${yearlySaving('essential').percent}%.`,
      cta: 'Unlock Savings',
      ctaVariant: 'default',
      features: [
        'Everything in Snapshot',
        'Full GST→Carbon Automation',
        'Verified Climate Score',
        'Green Loan Signal',
        'Monthly Cash Flow',
        'AI Savings Insights',
        '3 Team Members',
        'Email Support',
      ],
    },
    {
      id: 'pro',
      name: 'Biocog Pro',
      icon: Crown,
      tagline: billingCycle === 'yearly' ? 'Most Popular · Billed Yearly' : 'Billed Monthly',
      price: TIER_PRICES.pro[billingCycle],
      originalPrice: billingCycle === 'yearly' ? TIER_PRICES.pro.monthly : undefined,
      period: '/month',
      subtext: billingCycle === 'yearly'
        ? `Billed ₹${yearlySaving('pro').billedYearly.toLocaleString('en-IN')}/yr. Save ₹${yearlySaving('pro').perYear.toLocaleString('en-IN')}.`
        : `Switch to yearly to save ${yearlySaving('pro').percent}%.`,
      cta: 'Get finance-ready',
      ctaVariant: 'default',
      popular: true,
      features: [
        'Everything in Essential',
        'Monetization Signal',
        'Government Incentives Finder',
        'Automated ESG Reports (PDF)',
        'Bank-grade Verification Ledger',
        'Predictive AI Models',
        'Green Financing Readiness',
        'Lender-ready View',
        '10 Team Members',
        'WhatsApp Chat + Email Support',
        'Biocog Intelligence',
        'AI ESG Head',
        'All Reporting Frameworks',
        'Eligible for add-ons and limited custom builds',
      ],
    },
    {
      id: 'scale',
      name: 'Biocog Scale',
      icon: Building2,
      tagline: 'For larger teams',
      price: null,
      period: '',
      subtext: 'Custom workflows and larger teams. Contact us for a quote.',
      cta: 'Talk to Sales',
      ctaVariant: 'secondary',
      features: [
        'Everything in Pro',
        'Credit Monetization Setup',
        'Financing Ecosystem Access',
        'Full Finance Exports',
        'Real-time MRV Pipeline',
        'Multi-entity Support',
        'Biocog Superintelligence',
        'API & integrations (custom build)',
        'SBTi-ready Projections',
        'Dedicated Onboarding',
        'Priority SLA',
        'Team seats sized to your quote',
      ],
    },
  ];

  const comparisonFeatures = [
    { name: 'GST → Carbon Automation', snapshot: 'Limited', essential: true, pro: true, scale: true },
    { name: 'Green Loan Signal', snapshot: false, essential: true, pro: 'Priority', scale: 'Financing ecosystem access' },
    { name: 'Government Incentives Finder', snapshot: false, essential: false, pro: true, scale: true },
    { name: 'ESG Score', snapshot: 'Basic', essential: 'Verified', pro: 'Verified', scale: 'Certified' },
    { name: 'Monetization Signal', snapshot: false, essential: false, pro: true, scale: true },
    { name: 'Credit Monetization Setup', snapshot: false, essential: false, pro: false, scale: true },
    { name: 'Reports', snapshot: 'Preview', essential: 'Basic', pro: 'Automated', scale: 'Custom' },
    { name: 'Support', snapshot: 'Help Center', essential: 'Email', pro: 'WhatsApp chat + Email', scale: 'Dedicated' },
    { name: 'Add-ons & custom builds', snapshot: false, essential: false, pro: 'Add-ons + limited custom build', scale: 'Custom build' },
    { name: 'Team Members', snapshot: '1', essential: '3', pro: '10', scale: 'Per quote' },
  ];

  const faqs = [
    {
      q: 'Do I need climate knowledge to use this?',
      a: 'No. Upload your invoices; Senseible works out the emissions, maps them to each framework and drafts the report.',
    },
    {
      q: 'Is this built for small businesses?',
      a: 'Yes. Senseible is built for MSMEs: upload your bills, no consultant or setup needed.',
    },
    {
      q: 'Can I actually earn money from this?',
      a: 'Pro shows financing readiness signals from your verified data. Scale adds financing ecosystem access and monetization setup with our team. Lenders, schemes and buyers decide; financing is never guaranteed.',
    },
    {
      q: 'Can I switch plans anytime?',
      a: 'Yes. Upgrade or downgrade whenever you like. Your records stay saved when you change plans.',
    },
    {
      q: 'What happens if I stay on the free plan?',
      a: 'Snapshot is free forever, with basic emission tracking and an ESG score. Pro gets your records ready for green finance; Scale adds credit monetization setup.',
    },
    {
      q: 'How is this different from hiring ESG consultants?',
      a: 'Your invoices are read and calculated in minutes, at a plan price instead of a consulting fee, and the platform is available whenever you need it. For complex scopes, our team can still review the work with you.',
    },
  ];

  const partnerFaqs = [
    {
      q: 'How do I access verified MSME carbon data?',
      a: 'The marketplace gives you anonymised, combined carbon data from thousands of MSMEs. Every record has passed Senseible\'s verification checks.',
    },
    {
      q: 'What compliance standards do you support?',
      a: 'We provide signals for EU CBAM, EU Taxonomy, PCAF, India CCTS, and BRSR. Our compliance dashboard shows real-time status for each framework.',
    },
    {
      q: 'Can I integrate with my existing systems?',
      a: 'API and webhook integrations are custom built to each enterprise\'s requirements. Tell us your stack on the Enterprise page and we will scope them with you.',
    },
    {
      q: 'How is pricing calculated for pay-as-you-go?',
      a: 'Fees depend on how many credits you buy and how much checking each one needs. Ask us about discounts on larger purchases.',
    },
    {
      q: 'Do you provide audit packs for due diligence?',
      a: 'Yes. Every credit purchase includes downloadable audit packs with verification methodology, data sources, and compliance mappings.',
    },
  ];

  const formatCurrency = (n: number) => new Intl.NumberFormat('en-IN', { 
    style: 'currency', 
    currency: 'INR', 
    maximumFractionDigits: 2 
  }).format(n);

  return (
    <div className="relative min-h-screen w-full bg-background pb-16 md:pb-0">
      <Helmet>
      </Helmet>
      <CarbonParticles />
      <Navigation />

      <main className="relative z-10">
        <div className="pt-6">
          <SubscriptionStatusBanner />
        </div>
        {/* Hero Section */}
        <section className="container mx-auto px-4 pt-12 pb-16 text-center">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
              {isPartnerContext ? (
                <>
                  Partner Access
                  <br />
                  <span className="text-gradient-success">Built for Scale</span>
                </>
              ) : (
                <>
                  Earn from your Climate Data
                  <br />
                  <span className="text-gradient-success">starting with one invoice</span>
                </>
              )}
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              {isPartnerContext 
                ? 'Access verified MSME carbon data, compliance signals, and credits. Flexible pricing for banks, buyers, and platforms.'
                : 'Start free with 10 invoice scans a month. Upgrade when you need more. No consultant needed.'
              }
            </p>
            <Button size="lg" asChild>
              <Link to={isPartnerContext ? "/contact" : "/auth"}>
                {isPartnerContext ? 'Contact Sales' : 'Start Free'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
            {!isPartnerContext && <PlanMeter onRecommend={onRecommend} />}
          </div>
        </section>

        {/* Partner Pricing Cards */}
        {isPartnerContext ? (
          <section className="container mx-auto px-4 pb-16">
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {partnerTiers.map((tier, idx) => (
                <Card 
                  key={tier.id}
                  className={cn(
                    "relative overflow-hidden transition-all duration-300 hover:shadow-lg animate-fade-in",
                    tier.popular && "border-primary shadow-lg ring-2 ring-primary/20"
                  )}
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  {tier.popular && (
                    <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-xs font-medium rounded-bl-lg rounded-tr-lg">
                      Recommended
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
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold">{tier.priceLabel}</span>
                      </div>
                    </div>

                    {/* CTA Button */}
                    <Button 
                      variant={tier.ctaVariant}
                      className={cn(
                        "w-full mb-4",
                        tier.popular && "bg-primary hover:bg-primary/90"
                      )}
                      onClick={() => handlePartnerAction(tier.id)}
                    >
                      {tier.id === 'enterprise' && <Phone className="h-4 w-4 mr-2" />}
                      {tier.cta}
                    </Button>

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
            
            {/* Partner CTA */}
            <div className="max-w-2xl mx-auto text-center mt-12">
              <Card className="bg-gradient-to-r from-primary/5 to-success/5 border-primary/20">
                <CardContent className="p-8">
                  <Building2 className="h-12 w-12 mx-auto mb-4 text-primary" />
                  <h2 className="text-2xl font-bold mb-2">Need Custom Integration?</h2>
                  <p className="text-muted-foreground mb-6">
                    Banks, ERPs and enterprise buyers can discuss white-label options, integrations and custom compliance workflows with us.
                  </p>
                  <Button size="lg" asChild>
                    <Link to="/contact">
                      Schedule a Call
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </section>
        ) : (
          /* MSME Pricing Cards */
          <section id="plans" className="container mx-auto px-4 pb-16 scroll-mt-20">
            {/* Yearly / Monthly toggle */}
            <div className="flex flex-col items-center mb-8">
              {launchWindowOpen() && (
                <p className="pr-launch mb-4 inline-flex max-w-full items-center gap-2 rounded-full border border-warning/40 bg-warning/10 px-3.5 py-1.5 text-xs font-medium sm:text-sm">
                  <span className="pr-launch-dot h-2 w-2 shrink-0 rounded-full bg-warning" aria-hidden="true" />
                  <span>Launch prices change on <strong>{LAUNCH_ENDS_LABEL}</strong>. Start before then and yours won't.</span>
                </p>
              )}
              <div className="inline-flex items-center rounded-full border bg-background p-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => setBillingCycle('yearly')}
                  className={cn(
                    "whitespace-nowrap px-3 sm:px-5 py-2 text-xs sm:text-sm font-medium rounded-full transition-all",
                    billingCycle === 'yearly'
                      ? "bg-primary text-primary-foreground shadow"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  aria-pressed={billingCycle === 'yearly'}
                >
                  Billed Yearly
                  <span className={cn("ml-1.5 sm:ml-2 px-1.5 py-0.5 text-[10px] rounded-full font-semibold align-middle", billingCycle === 'yearly' ? "bg-primary-foreground/20 text-primary-foreground" : "bg-success/15 text-success")}>
                    SAVE UP TO {MAX_SAVING_PERCENT}%
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('monthly')}
                  className={cn(
                    "whitespace-nowrap px-3 sm:px-5 py-2 text-xs sm:text-sm font-medium rounded-full transition-all",
                    billingCycle === 'monthly'
                      ? "bg-primary text-primary-foreground shadow"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  aria-pressed={billingCycle === 'monthly'}
                >
                  Billed Monthly
                </button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {billingCycle === 'yearly'
                  ? 'Best value: one annual payment, lowest per-month rate.'
                  : 'Higher per-month rate. Switch to yearly to unlock the launch price.'}
              </p>
            </div>

            {/* Phones: one plan at a time, starting with the one the meter recommends. */}
            <div className="md:hidden mb-4 grid grid-cols-4 gap-1 rounded-full border bg-background p-1" role="tablist" aria-label="Plans">
              {tiers.map((tier) => (
                <button key={tier.id} type="button" role="tab" aria-selected={focusPlan === tier.id}
                  onClick={() => setFocusPlan(tier.id as PlanTier)}
                  className={cn("rounded-full py-2 text-xs font-medium transition-colors", focusPlan === tier.id ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
                  {tier.name.replace('Biocog ', '')}
                </button>
              ))}
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
              {tiers.map((tier, idx) => (
                <Card 
                  key={tier.id}
                  className={cn(
                    "relative overflow-visible transition-all duration-300 hover:shadow-lg animate-fade-in",
                    tier.popular && "border-primary shadow-lg ring-2 ring-primary/20",
                    focusPlan !== tier.id && "hidden md:block"
                  )}
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  {/* Hand-drawn ring around the plan the meter recommends (desktop). */}
                  <svg className={cn("pr-ring hidden md:block", focusPlan === tier.id && "pr-ring-on")} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                    <path pathLength={1} d="M8 6 C 30 1, 75 1, 94 7 S 99 60, 96 90 S 50 99, 10 95 S 1 45, 5 14" />
                  </svg>
                  {focusPlan === tier.id && <span className="pr-fit hidden md:inline-flex">Fits your volume</span>}
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
                      {tier.originalPrice && tier.price !== null && (
                        <div className="flex items-center gap-2 mb-1">
                          <span className="pr-strike relative text-sm text-muted-foreground">
                            {formatCurrency(tier.originalPrice)}
                            <svg viewBox="0 0 60 12" preserveAspectRatio="none" aria-hidden="true"><path pathLength={1} d="M2 8 C 15 3, 35 10, 58 4" /></svg>
                            <span className="sr-only"> (was)</span>
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-success/10 text-success text-xs font-medium">
                            {Math.round((1 - tier.price / tier.originalPrice) * 100)}% OFF
                          </span>
                        </div>
                      )}
                      <div className="flex items-baseline gap-1">
                        {tier.price === null ? (
                          <span className="text-3xl font-bold">Custom pricing</span>
                        ) : (
                          <>
                            <span className="text-3xl font-bold">{formatCurrency(tier.price)}</span>
                            <span className="text-sm text-muted-foreground">{tier.period}</span>
                          </>
                        )}
                      </div>
                      {billingCycle === 'yearly' && (tier.id === 'essential' || tier.id === 'pro') && (
                        <p className="pr-save mt-2 inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
                          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true"><path pathLength={1} d="M2 11 C 5 4, 9 4, 13 8 M10 4 l3 4 -4 1" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          You keep {formatCurrency(yearlySaving(tier.id).perYear)} a year ({yearlySaving(tier.id).percent}%)
                        </p>
                      )}
                    </div>

                    {/* Inline upsell when monthly was clicked for a paid tier */}
                    {pendingMonthlyTier === tier.id ? (
                      <div className="mb-4 p-3 rounded-lg border border-success/40 bg-success/5">
                        <p className="text-xs font-medium mb-2">
                          Switch to yearly and save{' '}
                          <span className="text-success font-bold">
                            ₹{yearlySaving(tier.id as 'essential' | 'pro').perYear.toLocaleString('en-IN')}
                          </span>
                          ?
                        </p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              setBillingCycle('yearly');
                              handleSubscribe(tier.id, 'yearly');
                            }}
                          >
                            Yes, switch & save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleSubscribe(tier.id, 'monthly')}
                          >
                            Continue monthly
                          </Button>
                        </div>
                      </div>
                    ) : (
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
                          isPaymentLoading ||
                          currentTier === tier.id
                        }
                      >
                        {getButtonContent(tier)}
                      </Button>
                    )}

                    {/* Subtext */}
                    {tier.subtext && (
                      <p className="text-xs text-muted-foreground text-center mb-4">
                        {tier.subtext}
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
        )}

        {/* Comparison Table - Only for MSME */}
        {!isPartnerContext && (
          <section className="container mx-auto px-4 pb-16">
            <h2 className="text-2xl font-bold text-center mb-8">Compare Plans</h2>

            {/* Phones: one plan at a time, Pro first, so nothing is squeezed. */}
            <div className="md:hidden mx-auto max-w-md">
              <div role="tablist" aria-label="Compare plan" className="grid grid-cols-4 gap-1 rounded-full border border-border bg-secondary/40 p-1 text-sm">
                {(['snapshot', 'essential', 'pro', 'scale'] as const).map((col) => (
                  <button key={col} type="button" role="tab" aria-selected={cmpPlan === col} onClick={() => setCmpPlan(col)}
                    className={cn("h-9 rounded-full font-medium capitalize transition-colors", cmpPlan === col ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}>
                    {col}
                  </button>
                ))}
              </div>
              <ul className={cn("mt-4 divide-y divide-border/60 rounded-2xl border p-1", cmpPlan === 'pro' ? "border-primary/30 bg-primary/5" : "border-border")}>
                {comparisonFeatures.map((feature) => {
                  const v = feature[cmpPlan];
                  return (
                    <li key={feature.name} className="flex items-center justify-between gap-4 px-3 py-3 text-sm">
                      <span className="min-w-0 text-foreground">{feature.name}</span>
                      <span className="shrink-0 text-right max-w-[50%]">
                        {typeof v === 'boolean'
                          ? (v ? <Check className="ml-auto h-4 w-4 text-success" aria-label="Included" /> : <span className="text-muted-foreground" aria-label="Not included">-</span>)
                          : <span className={cn(v === 'Priority' && "text-primary font-medium")}>{v}</span>}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="hidden md:block max-w-5xl mx-auto overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="sticky left-0 z-10 bg-background text-left py-3 px-4 font-medium">Feature</th>
                    {(['snapshot', 'essential', 'pro', 'scale'] as const).map((col) => (
                      <th key={col} onMouseEnter={() => setHoverCol(col)} onMouseLeave={() => setHoverCol(null)}
                        className={cn("text-center py-3 px-4 font-medium capitalize transition-colors", col === 'pro' && "bg-primary/5 border-x border-primary/20", hoverCol === col && "bg-primary/10")}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((feature, idx) => (
                    <tr key={idx} className="border-b border-border/50">
                      <td className="sticky left-0 z-10 bg-background py-3 px-4 text-sm">{feature.name}</td>
                      {['snapshot', 'essential', 'pro', 'scale'].map((tier) => (
                        <td 
                          key={tier} 
                          onMouseEnter={() => setHoverCol(tier)} onMouseLeave={() => setHoverCol(null)}
                          className={cn(
                            "py-3 px-4 text-center text-sm transition-colors",
                            tier === 'pro' && "bg-primary/5 border-x border-primary/20",
                            hoverCol === tier && "bg-primary/10"
                          )}
                        >
                          {typeof feature[tier as keyof typeof feature] === 'boolean' ? (
                            feature[tier as keyof typeof feature] ? (
                              <Check className="pr-tick h-4 w-4 text-success mx-auto" style={{ animationDelay: `${idx * 60}ms` }} aria-label="Included" />
                            ) : (
                              <span className="text-muted-foreground" aria-label="Not included">-</span>
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
        )}

        {/* Add-ons - Only for MSME: published prices, a working estimate. */}
        {!isPartnerContext && (
          <section className="container mx-auto px-4 pb-16" aria-labelledby="addons-title">
            <div className="max-w-5xl mx-auto">
              <h2 id="addons-title" className="text-2xl font-bold text-center mb-2">Add-ons & Extras</h2>
              <p className="text-center text-sm text-muted-foreground mb-8">Add what you need to the {focusPlan === 'scale' ? 'Scale' : focusPlan.charAt(0).toUpperCase() + focusPlan.slice(1)} plan and see the total.</p>
              <Suspense fallback={<div className="h-80" />}>
                <AddonBuilder plan={focusPlan} cycle={billingCycle} />
              </Suspense>
            </div>
          </section>
        )}

        {!isPartnerContext && (
          <Suspense fallback={<div className="h-96" />}>
            <CustomScopeEstimator />
          </Suspense>
        )}

        {/* FAQ */}
        <section className="container mx-auto px-4 pb-16">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
            <Accordion type="single" collapsible className="w-full">
              {(isPartnerContext ? partnerFaqs : faqs).map((faq, idx) => (
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
                  Start with one invoice. Your first emission snapshot is free.
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
                      Why we built Senseible
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
      
      {checkout && (
        <Suspense fallback={null}>
          <CheckoutSummary
            open
            plan={checkout.plan}
            cycle={checkout.cycle}
            busy={isPaymentLoading || processingTier !== null}
            onOpenChange={(o) => { if (!o) setCheckout(null); }}
            onPay={payWith}
          />
        </Suspense>
      )}

      <Footer />
    </div>
  );
};

export default Pricing;
