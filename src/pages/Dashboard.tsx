import { useEmissions } from '@/hooks/useEmissions';
import { useDocuments } from '@/hooks/useDocuments';
import { useSession } from '@/hooks/useSession';
import { useNavigate } from 'react-router-dom';
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

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, sessionId, isLoading: sessionLoading } = useSession();
  const { summary, emissions, isLoading: emissionsLoading, getUnverifiedEmissions, getVerifiedEmissions } = useEmissions();
  const { documents, isLoading: docsLoading } = useDocuments();
  const [verificationScore, setVerificationScore] = useState(0);
  const [latestStatus, setLatestStatus] = useState<'verified' | 'needs_review' | 'pending' | null>(null);
  const [eligibleCredits, setEligibleCredits] = useState(0);

  const isLoading = sessionLoading || emissionsLoading || docsLoading;
  const unverifiedEmissions = getUnverifiedEmissions();
  const verifiedEmissions = getVerifiedEmissions();

  useEffect(() => {
    fetchVerificationData();
  }, [sessionId, user?.id]);

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
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground mb-2">
            Carbon Dashboard
          </h1>
          <p className="text-muted-foreground">
            Track your emissions, verify data, and unlock monetization opportunities.
          </p>
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
