import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useSession } from '@/hooks/useSession';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Crown, Sparkles, Zap, Building2, ArrowRight, Check, 
  Loader2, FileText, Upload, Brain, Shield
} from 'lucide-react';

const tiers = [
  { id: 'snapshot', name: 'Snapshot', icon: Sparkles, price: 0, color: 'bg-muted' },
  { id: 'basic', name: 'Basic', icon: Zap, price: 499, color: 'bg-blue-500/10' },
  { id: 'pro', name: 'Pro', icon: Crown, price: 4999, color: 'bg-primary/10' },
  { id: 'scale', name: 'Scale', icon: Building2, price: 15000, color: 'bg-amber-500/10' },
];

const usageLimits: Record<string, { invoices: number; reports: number; teamMembers: number }> = {
  snapshot: { invoices: 10, reports: 1, teamMembers: 1 },
  basic: { invoices: 100, reports: 5, teamMembers: 3 },
  pro: { invoices: 1000, reports: 50, teamMembers: 10 },
  scale: { invoices: 10000, reports: 500, teamMembers: 100 },
};

const Subscription = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: sessionLoading } = useSession();
  const { tier, isPremium } = usePremiumStatus();
  
  const [usage, setUsage] = useState({ invoices: 0, reports: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!sessionLoading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, sessionLoading, navigate]);

  // Fetch usage and subscription data
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;

      try {
        // Get document count
        const { count: docCount } = await supabase
          .from('documents')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        // Get report count
        const { count: reportCount } = await supabase
          .from('reports')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        // Get subscription history
        const { data: subs } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        setUsage({
          invoices: docCount || 0,
          reports: reportCount || 0,
        });
        setSubscriptions(subs || []);
      } catch (error) {
        console.error('Error fetching subscription data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  const limits = usageLimits[tier];
  const currentTier = tiers.find(t => t.id === tier) || tiers[0];
  const TierIcon = currentTier.icon;

  if (sessionLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      <Helmet>
        <title>Subscription — Senseible</title>
        <meta name="description" content="Manage your Senseible subscription and billing." />
      </Helmet>

      <Navigation />

      <main className="container max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Subscription</h1>
          <p className="text-muted-foreground">Manage your plan and usage</p>
        </div>

        <div className="grid gap-6">
          {/* Current Plan */}
          <Card className={`${currentTier.color} border-2`}>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-4 rounded-2xl bg-background shadow-sm">
                    <TierIcon className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      Biocog {currentTier.name}
                      {isPremium && (
                        <Badge className="bg-success text-success-foreground">Active</Badge>
                      )}
                    </h2>
                    <p className="text-muted-foreground">
                      {tier === 'snapshot' ? (
                        'Free forever'
                      ) : (
                        `₹${currentTier.price.toLocaleString('en-IN')}/month`
                      )}
                    </p>
                  </div>
                </div>
                <Button asChild>
                  <Link to="/pricing">
                    {tier === 'snapshot' ? 'Upgrade Plan' : 'Change Plan'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Usage Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Usage This Month</CardTitle>
              <CardDescription>Your current usage against plan limits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Invoice Scans
                  </span>
                  <span className="font-medium">
                    {usage.invoices} / {limits.invoices}
                  </span>
                </div>
                <Progress value={(usage.invoices / limits.invoices) * 100} />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Reports Generated
                  </span>
                  <span className="font-medium">
                    {usage.reports} / {limits.reports}
                  </span>
                </div>
                <Progress value={(usage.reports / limits.reports) * 100} />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Brain className="w-4 h-4" />
                    AI ESG Head
                  </span>
                  <span className="font-medium">
                    {tier === 'snapshot' ? 'Trial' : tier === 'basic' ? 'Limited' : 'Unlimited'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Plan Features */}
          <Card>
            <CardHeader>
              <CardTitle>Your Plan Features</CardTitle>
              <CardDescription>What's included in Biocog {currentTier.name}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="grid sm:grid-cols-2 gap-3">
                {[
                  `${limits.invoices} invoice scans/month`,
                  `${limits.reports} ESG reports/month`,
                  `${limits.teamMembers} team member${limits.teamMembers > 1 ? 's' : ''}`,
                  tier !== 'snapshot' && 'Verified Climate Score',
                  tier !== 'snapshot' && 'Green Loan Eligibility',
                  isPremium && 'Carbon Monetization',
                  isPremium && 'AI ESG Head',
                  tier === 'pro' || tier === 'scale' ? 'Priority Support' : 'Help Center',
                ].filter(Boolean).map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-success" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Subscription History */}
          {subscriptions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>Your recent transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {subscriptions.slice(0, 5).map((sub) => (
                    <div 
                      key={sub.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div>
                        <p className="font-medium">Biocog {sub.tier}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(sub.created_at).toLocaleDateString('en-IN', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">₹{sub.amount?.toLocaleString('en-IN')}</p>
                        <Badge 
                          variant={sub.status === 'active' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {sub.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upgrade CTA for free users */}
          {tier === 'snapshot' && (
            <Card className="bg-gradient-to-br from-primary/5 to-success/5 border-primary/20">
              <CardContent className="p-6 text-center">
                <Crown className="w-12 h-12 mx-auto mb-4 text-primary" />
                <h3 className="text-lg font-bold mb-2">Ready to unlock more?</h3>
                <p className="text-muted-foreground mb-4">
                  Upgrade to Pro and start monetizing your carbon data
                </p>
                <Button asChild>
                  <Link to="/pricing">
                    View Plans
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default Subscription;
