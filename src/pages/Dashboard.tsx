import { useEmissions } from '@/hooks/useEmissions';
import { useDocuments } from '@/hooks/useDocuments';
import { useSession } from '@/hooks/useSession';
import { useNavigate, Link } from 'react-router-dom';
import { CarbonParticles } from '@/components/CarbonParticles';
import { EmissionsSummary } from '@/components/dashboard/EmissionsSummary';
import { TrendChart } from '@/components/dashboard/TrendChart';
import { RecentDocuments } from '@/components/dashboard/RecentDocuments';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { MonetizationPanel } from '@/components/dashboard/MonetizationPanel';
import { Helmet } from 'react-helmet-async';
import senseibleLogo from '@/assets/senseible-logo.png';
import { Button } from '@/components/ui/button';
import { LogOut, User } from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, signOut, isLoading: sessionLoading } = useSession();
  const { summary, emissions, isLoading: emissionsLoading, getUnverifiedEmissions } = useEmissions();
  const { documents, isLoading: docsLoading } = useDocuments();

  const isLoading = sessionLoading || emissionsLoading || docsLoading;
  const unverifiedEmissions = getUnverifiedEmissions();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="relative min-h-screen w-full bg-background overflow-hidden">
      <Helmet>
        <title>Dashboard — Senseible Carbon MRV</title>
        <meta name="description" content="View your carbon emissions summary, trends, and monetization opportunities." />
      </Helmet>
      
      <CarbonParticles />

      {/* Header */}
      <header className="relative z-10 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={senseibleLogo} alt="Senseible" className="h-7 w-auto dark:invert" />
          </Link>
          
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/dashboard" className="text-foreground font-medium">Dashboard</Link>
            <Link to="/history" className="hover:text-foreground transition-colors">History</Link>
            <Link to="/verify" className="hover:text-foreground transition-colors">Verify</Link>
            <Link to="/monetize" className="hover:text-foreground transition-colors">Monetize</Link>
            <Link to="/reports" className="hover:text-foreground transition-colors">Reports</Link>
          </nav>

          <div className="flex items-center gap-3">
            {isAuthenticated && user && (
              <>
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  {user.email}
                </span>
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            )}
            {!isAuthenticated && (
              <Button variant="outline" size="sm" onClick={() => navigate('/auth')}>
                <User className="h-4 w-4 mr-2" />
                Sign In
              </Button>
            )}
          </div>
        </div>
      </header>

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
                hasVerifiedData={emissions.some(e => e.verified)}
              />
              <RecentDocuments documents={documents.slice(0, 5)} />
            </div>
          </div>
        )}
      </main>

      {/* Mobile Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-sm">
        <div className="flex justify-around py-3">
          <Link to="/" className="flex flex-col items-center text-xs text-muted-foreground">
            <span className="text-lg mb-1">📤</span>
            Upload
          </Link>
          <Link to="/dashboard" className="flex flex-col items-center text-xs text-foreground">
            <span className="text-lg mb-1">📊</span>
            Dashboard
          </Link>
          <Link to="/verify" className="flex flex-col items-center text-xs text-muted-foreground">
            <span className="text-lg mb-1">✓</span>
            Verify
          </Link>
          <Link to="/monetize" className="flex flex-col items-center text-xs text-muted-foreground">
            <span className="text-lg mb-1">💰</span>
            Monetize
          </Link>
        </div>
      </nav>
    </div>
  );
};

export default Dashboard;
