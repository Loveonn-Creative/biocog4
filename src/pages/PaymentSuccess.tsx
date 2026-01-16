import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, Sparkles, ArrowRight, Upload, 
  Brain, FileText, Zap, PartyPopper 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const tier = searchParams.get('tier') || 'pro';
  const [showConfetti, setShowConfetti] = useState(true);

  const tierNames: Record<string, string> = {
    essential: 'Biocog Essential',
    pro: 'Biocog Pro',
    scale: 'Biocog Scale',
  };

  const tierFeatures: Record<string, string[]> = {
    essential: [
      'Full GST→Carbon Automation',
      'Verified Climate Score',
      'Green Loan Eligibility',
      '3 Team Members',
    ],
    pro: [
      'Carbon Monetization',
      'AI ESG Head (Voice AI)',
      'Automated Reports',
      '10 Team Members',
    ],
    scale: [
      'Real-time MRV Pipeline',
      'API & Integrations',
      'Dedicated Support',
      'Unlimited Teams',
    ],
  };

  useEffect(() => {
    // Trigger confetti celebration
    if (showConfetti) {
      const duration = 3 * 1000;
      const end = Date.now() + duration;

      const colors = ['#22c55e', '#10b981', '#34d399', '#6ee7b7'];

      (function frame() {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: colors,
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: colors,
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        } else {
          setShowConfetti(false);
        }
      })();
    }
  }, [showConfetti]);

  const nextSteps = [
    {
      icon: Upload,
      title: 'Upload Your First Invoice',
      description: 'Start tracking emissions in seconds',
      href: '/dashboard',
    },
    {
      icon: Brain,
      title: 'Chat with AI ESG Head',
      description: 'Get personalized sustainability guidance',
      href: '/intelligence',
    },
    {
      icon: FileText,
      title: 'Generate Reports',
      description: 'Create compliance-ready documentation',
      href: '/reports',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Payment Successful — Welcome to {tierNames[tier]}</title>
      </Helmet>

      <Navigation />

      <main className="container mx-auto px-4 py-12 flex flex-col items-center">
        {/* Success Animation */}
        <div className="relative mb-8">
          <div className={cn(
            "w-24 h-24 rounded-full bg-success/20 flex items-center justify-center",
            "animate-in zoom-in-50 duration-500"
          )}>
            <CheckCircle className="w-12 h-12 text-success animate-in zoom-in-75 duration-700 delay-200" />
          </div>
          <PartyPopper className="absolute -top-2 -right-2 w-8 h-8 text-amber-500 animate-bounce" />
        </div>

        {/* Success Message */}
        <Badge variant="outline" className="mb-4 animate-in fade-in duration-500 delay-300">
          <Sparkles className="h-3 w-3 mr-1" />
          Payment Confirmed
        </Badge>

        <h1 className="text-3xl md:text-4xl font-bold text-center mb-2 animate-in fade-in-up duration-500 delay-400">
          Welcome to {tierNames[tier]}! 🎉
        </h1>

        <p className="text-lg text-muted-foreground text-center max-w-md mb-8 animate-in fade-in-up duration-500 delay-500">
          Your sustainability journey just got supercharged. Here's what you've unlocked:
        </p>

        {/* Features Unlocked */}
        <Card className="max-w-md w-full mb-8 animate-in fade-in-up duration-500 delay-600">
          <CardContent className="p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Features Unlocked
            </h2>
            <ul className="space-y-3">
              {tierFeatures[tier]?.map((feature, idx) => (
                <li key={idx} className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-success shrink-0" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <div className="w-full max-w-2xl mb-8">
          <h2 className="text-lg font-semibold text-center mb-4">What's Next?</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {nextSteps.map((step, idx) => (
              <Link 
                key={idx} 
                to={step.href}
                className={cn(
                  "p-4 rounded-xl border bg-card hover:bg-muted/50 transition-all",
                  "group animate-in fade-in-up duration-500",
                )}
                style={{ animationDelay: `${700 + idx * 100}ms` }}
              >
                <step.icon className="h-8 w-8 text-primary mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="font-medium mb-1">{step.title}</h3>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* CTA Button */}
        <Button size="lg" asChild className="animate-in fade-in-up duration-500 delay-1000">
          <Link to="/dashboard">
            Go to Dashboard
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>

        {/* Support Note */}
        <p className="text-xs text-muted-foreground text-center mt-8 max-w-md">
          A confirmation email has been sent to your inbox. 
          Questions? Contact us at{' '}
          <a href="mailto:impact@senseible.earth" className="text-primary hover:underline">
            impact@senseible.earth
          </a>
        </p>
      </main>
    </div>
  );
};

export default PaymentSuccess;
