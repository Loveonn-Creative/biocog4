import { useEmissions } from '@/hooks/useEmissions';
import { useDocuments } from '@/hooks/useDocuments';
import { useSession } from '@/hooks/useSession';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useNavigate, Link } from 'react-router-dom';
import { CarbonParticles } from '@/components/CarbonParticles';
import { Navigation } from '@/components/Navigation';
import { EmissionsSummary } from '@/components/dashboard/EmissionsSummary';
import { TrendChart } from '@/components/dashboard/TrendChart';
import { RecentDocuments } from '@/components/dashboard/RecentDocuments';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { MonetizationPanel } from '@/components/dashboard/MonetizationPanel';
import { VerificationStatusCard } from '@/components/dashboard/VerificationStatusCard';
import { Helmet } from 'react-helmet-async';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2, Loader2, Sparkles, Zap, Crown, Building2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

const tierIcons = {
  snapshot: Sparkles,
  essential: Zap,
  basic: Zap,
  pro: Crown,
  scale: Building2,
};

const tierLabels: Record<string, string> = {
  snapshot: 'Snapshot',
  essential: 'Essential',
  basic: 'Essential',
  pro: 'Pro',
  scale: 'Scale',
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, sessionId, isLoading: sessionLoading } = useSession();
  const { tier, isPremium } = usePremiumStatus();
  const { summary, emissions, isLoading: emissionsLoading, getUnverifiedEmissions, getVerifiedEmissions, refetch } = useEmissions();
  const { documents, isLoading: docsLoading } = useDocuments();
  const [verificationScore, setVerificationScore] = useState(0);
  const [latestStatus, setLatestStatus] = useState<'verified' | 'needs_review' | 'pending' | null>(null);
  const [eligibleCredits, setEligibleCredits] = useState(0);

  const [isResetting, setIsResetting] = useState(false);

  const isLoading = sessionLoading || emissionsLoading || docsLoading;
  const unverifiedEmissions = getUnverifiedEmissions();
  const verifiedEmissions = getVerifiedEmissions();
  const isGuestUser = !user && sessionId;

  useEffect(() => {
    fetchVerificationData();
  }, [sessionId, user?.id]);

  const resetAllData = async () => {
    if (!sessionId) return;
    
    setIsResetting(true);
    try {
      // Delete in order: verifications -> emissions -> documents (due to foreign keys)
      await supabase.from('carbon_verifications').delete().eq('session_id', sessionId);
      await supabase.from('emissions').delete().eq('session_id', sessionId);
      await supabase.from('documents').delete().eq('session_id', sessionId);
      
      toast.success('All data cleared. Start fresh with a new upload!');
      
      // Refetch data
      refetch();
      fetchVerificationData();
      setVerificationScore(0);
      setLatestStatus(null);
      setEligibleCredits(0);
    } catch (error) {
      console.error('Error resetting data:', error);
      toast.error('Failed to reset data. Please try again.');
    } finally {
      setIsResetting(false);
    }
  };

  const fetchVerificationData = async () => {
    try {
      let query = supabase
        .from('carbon_verifications')
        .select('verification_score, verification_status, ai_analysis')
        .order('created_at', { ascending: false })
        .limit(1);

      if (user?.id) {
        query = query.eq('user_id', user.id);
      } else if (sessionId) {
        query = query.eq('session_id', sessionId);
      }

      const { data } = await query;
      if (data && data[0]) {
        setVerificationScore(Math.round((data[0].verification_score || 0) * 100));
        setLatestStatus(data[0].verification_status as any);
        setEligibleCredits((data[0].ai_analysis as any)?.creditEligibility?.eligibleCredits || 0);
      }
    } catch (err) {
      console.error('Error fetching verification data:', err);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-background overflow-hidden pb-16 md:pb-0">
      <Helmet>
        <title>Dashboard — Senseible Carbon MRV</title>
        <meta name="description" content="View your carbon emissions summary, trends, and monetization opportunities." />
      </Helmet>
      
      <CarbonParticles />
      <Navigation onSignOut={() => navigate('/')} />

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-4 py-8">
        {/* Welcome Section - Personalized */}
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-8">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-foreground">
                {user ? `Welcome back${summary.total > 0 ? '!' : ', let\'s get started'}` : 'Carbon Dashboard'}
              </h1>
              {user && (
                <Badge 
                  variant="secondary" 
                  className="flex items-center gap-1 text-xs"
                >
                  {(() => {
                    const TierIcon = tierIcons[tier] || Sparkles;
                    return <TierIcon className="w-3 h-3" />;
                  })()}
                  {tierLabels[tier] || 'Snapshot'}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              Track your emissions, verify data, and unlock monetization opportunities.
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Upgrade CTA for free users */}
            {user && tier === 'snapshot' && (
              <Button variant="outline" size="sm" asChild className="gap-2">
                <Link to="/pricing">
                  <Zap className="w-4 h-4" />
                  Upgrade
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </Button>
            )}

            {/* Reset Data Button - Only for guest users */}
            {isGuestUser && (documents.length > 0 || emissions.length > 0) && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
                    disabled={isResetting}
                  >
                  {isResetting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Reset Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset all data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all your uploaded documents, emissions data, and verifications. 
                    This action cannot be undone. You can start fresh with new uploads.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={resetAllData}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Yes, reset everything
                  </AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-pulse text-muted-foreground">Loading your data...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Summary & Trend */}
            <div className="lg:col-span-2 space-y-6">
              {/* Verification Status Card - Prominent at top */}
              <VerificationStatusCard
                verificationScore={verificationScore}
                totalEmissions={summary.total}
                unverifiedCount={unverifiedEmissions.length}
                hasVerifiedData={verifiedEmissions.length > 0}
                latestStatus={latestStatus}
                eligibleCredits={eligibleCredits}
              />
              <EmissionsSummary summary={summary} />
              <TrendChart data={summary.monthlyTrend} />
            </div>

            {/* Right Column - Actions & Recent */}
            <div className="space-y-6">
              <QuickActions 
                unverifiedCount={unverifiedEmissions.length}
                totalEmissions={summary.total}
              />
              <MonetizationPanel 
                totalCO2={summary.total}
                hasVerifiedData={verifiedEmissions.length > 0}
              />
              <RecentDocuments documents={documents.slice(0, 5)} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
