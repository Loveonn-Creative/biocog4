import { useEmissions } from '@/hooks/useEmissions';
import { RecordsLoadError } from '@/components/RecordsLoadError';
import { useDocuments } from '@/hooks/useDocuments';
import { useSession } from '@/hooks/useSession';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { GraceNotice } from '@/components/billing/GraceNotice';
import { usePersonalization } from '@/hooks/usePersonalization';
import { useOrganization } from '@/hooks/useOrganization';
import { useWorkspace } from '@/hooks/useWorkspace';
import { applyScope, realtimeFilter, scopeKey } from '@/lib/workspaceScope';
import { readOrganizationProfile } from '@/lib/organizationProfile';
import { useNavigate, Link } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { StandSection } from '@/components/dashboard/StandSection';
import { FinancePathways } from '@/components/dashboard/FinancePathways';
import { CategoryTable } from '@/components/dashboard/CategoryTable';
import { useComplianceLedger } from '@/hooks/useComplianceLedger';
import { countGreenInvoices, pathwayChecks } from '@/lib/monetizationPathways';
import { TrendChart } from '@/components/dashboard/TrendChart';
import { RecentDocuments } from '@/components/dashboard/RecentDocuments';
import { FinanceEvidenceCard } from '@/components/dashboard/FinanceEvidenceCard';
import { sumVerifiedKgOncePerEmission } from '@/lib/carbonValue';
import { Helmet } from 'react-helmet-async';
import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2, Loader2, ArrowRight, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useEnterpriseMode } from '@/hooks/useEnterpriseMode';
import { useScope3Visibility } from '@/hooks/useScope3Trail';
import { useFinanceInsightsSwitch } from '@/hooks/useFinanceInsights';

const FinanceInsights = lazy(() => import('@/components/finance/FinanceInsights').then((m) => ({ default: m.FinanceInsights })));
const Scope3Preview = lazy(() => import('@/components/scope3/Scope3Preview').then((m) => ({ default: m.Scope3Preview })));
import { EnterpriseAuditLog } from '@/components/enterprise/EnterpriseAuditLog';
import { EnterpriseComplianceLabels } from '@/components/enterprise/EnterpriseComplianceLabels';
import { useCredibility } from '@/hooks/useCredibility';
import { useProfileIntelligence } from '@/hooks/useProfileIntelligence';
import { AlertTriangle, Info, CheckCircle2, ChevronRight } from 'lucide-react';
import { DashboardFilterBar } from '@/components/dashboard/DashboardFilterBar';
import { DashboardIntelligence } from '@/components/dashboard/DashboardIntelligence';
import { RecordInsights } from '@/components/insights/RecordInsights';
import { useRecordsChanged } from '@/lib/recordsEvents';
import {
  defaultFilters,
  resolveWindow,
  applyFilters,
  totals as computeTotals,
  periodDelta,
  topCategories,
  monthlySeries,
  evidenceCompleteness,
  allCategories,
  type DashboardFilters,
  TIME_RANGE_LABELS,
} from '@/lib/dashboardAnalytics';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, sessionId, isLoading: sessionLoading } = useSession();
  const { tier } = usePremiumStatus();
  const { greeting, tierLabel, tierEmoji, isPersonalized } = usePersonalization();
  const { activeContext } = useOrganization();
  const { scope, ready: workspaceReady, organization } = useWorkspace();
  const workspaceKey = scopeKey(scope);
  const { isEnterprise } = useEnterpriseMode();
  const scope3 = useScope3Visibility();
  const financeSwitch = useFinanceInsightsSwitch();
  const { summary, emissions, isLoading: emissionsLoading, getUnverifiedEmissions, getVerifiedEmissions, refetch, error: emissionsError } = useEmissions();
  const { documents, isLoading: docsLoading } = useDocuments();
  const [verificationScore, setVerificationScore] = useState(0);
  const [latestStatus, setLatestStatus] = useState<'verified' | 'needs_review' | 'pending' | null>(null);
  // Inputs for the pathway checks, read the way Monetize reads them.
  const [verifiedChecks, setVerifiedChecks] = useState({ count: 0, grade: 'D', loaded: false });
  const [pathwayStatuses, setPathwayStatuses] = useState<Record<string, string>>({});
  const { entries: ledgerEntries } = useComplianceLedger();

  const [isResetting, setIsResetting] = useState(false);

  // Full-page loading only on the first load, so refreshes after verify or upload do not blank the page.
  const isLoading = sessionLoading || (emissionsLoading && emissions.length === 0);
  const unverifiedEmissions = getUnverifiedEmissions();
  const verifiedEmissions = getVerifiedEmissions();
  const isGuestUser = !user && sessionId;

  // Profile Intelligence — read from stored records, never localStorage, so the
  // same signals appear on every device the user signs in from.
  const [profileRecord, setProfileRecord] = useState<{
    location: string; sector: string; size: string; exportsToEU: boolean; hasNetZeroTarget: boolean;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!workspaceReady) return;
      const docQuery = user?.id ? applyScope(supabase.from('documents').select('currency').limit(200), scope) : null;
      if (!user?.id || !docQuery) { if (!cancelled) setProfileRecord(null); return; }
      const [profileRes, docRes, goalRes] = await Promise.all([
        supabase.from('profiles').select('location, sector, size').eq('id', user.id).maybeSingle(),
        docQuery,
        supabase.from('net_zero_goals').select('id').eq('user_id', user.id).limit(1),
      ]);
      if (cancelled) return;
      // In an organisation workspace the signals describe the organisation.
      const org = organization ? readOrganizationProfile(organization) : null;
      setProfileRecord({
        location: (org ? org.country : profileRes.data?.location) || 'India',
        sector: (org ? org.sector : profileRes.data?.sector) || 'manufacturing',
        size: (org ? org.size : profileRes.data?.size) || 'small',
        exportsToEU: (docRes.data ?? []).some(d => (d.currency || '').toUpperCase() === 'EUR'),
        hasNetZeroTarget: !org && (goalRes.data ?? []).length > 0,
      });
    };
    load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- workspaceKey captures scope
  }, [user?.id, workspaceKey, workspaceReady, organization]);

  const profileInput = useMemo(() => profileRecord ? {
    ...profileRecord,
    seekingFinance: true,
    totalCO2Kg: summary.total,
    verifiedCount: verifiedEmissions.length,
  } : null, [profileRecord, summary.total, verifiedEmissions.length]);

  // ---- Decision-intelligence layer: filtering and period analysis over the
  // records already loaded. Display only; no factor or methodology is applied.
  const [filters, setFilters] = useState<DashboardFilters>(() => defaultFilters(Boolean(user)));
  // Signing in or out restarts from that state's default (verified-only when signed in).
  useEffect(() => { setFilters(defaultFilters(Boolean(user))); }, [user]);

  const analytics = useMemo(() => {
    const win = resolveWindow(filters.range);
    const rows = applyFilters(emissions, filters, win);
    return {
      rows,
      totals: computeTotals(rows),
      delta: periodDelta(emissions, filters, win),
      categories: topCategories(rows),
      series: monthlySeries(rows, win),
      // Completeness compares verified with all records in view, so it ignores
      // the status filter.
      completeness: evidenceCompleteness(applyFilters(emissions, { ...filters, status: 'all' }, win)),
    };
  }, [emissions, filters]);

  const categoryOptions = useMemo(() => allCategories(emissions), [emissions]);

  const { alerts } = useProfileIntelligence(profileInput);

  // Route protection: redirect partners to their dashboard
  useEffect(() => {
    if (activeContext?.context_type === 'partner') {
      toast.info('This dashboard is for MSMEs. Redirecting to Partner Dashboard.');
      navigate('/partner-dashboard');
    }
  }, [activeContext, navigate]);

  // Initial fetch
  // Refetch when records change anywhere (verify, delete, upload).
  useRecordsChanged(() => { fetchVerificationData(); });
  useEffect(() => {
    fetchVerificationData();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- workspaceKey captures scope
  }, [workspaceKey, workspaceReady]);

  // Real-time subscription for carbon verifications
  useEffect(() => {
    if (!workspaceReady) return;
    // Filtered realtime subscriptions: only this workspace's rows.
    const filter = realtimeFilter(scope);
    if (!filter) return;

    const channel = supabase
      .channel('dashboard-verifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'carbon_verifications',
          filter,
        },
        (payload) => {
          console.log('[Dashboard] Verification update:', payload.eventType);
          fetchVerificationData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'emissions',
          filter,
        },
        (payload) => {
          console.log('[Dashboard] Emission update:', payload.eventType);
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- workspaceKey captures scope
  }, [workspaceKey, workspaceReady, refetch]);

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
    } catch (error) {
      console.error('Error resetting data:', error);
      toast.error('Failed to reset data. Please try again.');
    } finally {
      setIsResetting(false);
    }
  };

  const fetchVerificationData = async () => {
    if (!workspaceReady) return;
    try {
      const query = applyScope(
        supabase
          .from('carbon_verifications')
          .select('verification_score, verification_status, ai_analysis')
          .order('created_at', { ascending: false }),
        scope,
      );
      if (!query) return;

      const { data } = await query;
      // Clear figures from another workspace before showing this one.
      if (!data || data.length === 0) {
        setVerificationScore(0);
        setLatestStatus(null);
      }
      if (data && data.length > 0) {
        setVerificationScore(Math.round((data[0].verification_score || 0) * 100));
        setLatestStatus(data[0].verification_status as any);
      }
      const verifiedRows = (data ?? []).filter((v) => v.verification_status === 'verified');
      const grade = (verifiedRows[0]?.ai_analysis as { creditEligibility?: { qualityGrade?: string } } | null)?.creditEligibility?.qualityGrade || 'D';
      setVerifiedChecks({ count: verifiedRows.length, grade, loaded: true });
      const { data: pathways } = await supabase.from('monetization_pathways').select('pathway_type, status');
      const statuses: Record<string, string> = {};
      (pathways ?? []).forEach((p) => { statuses[p.pathway_type] = p.status; });
      setPathwayStatuses(statuses);
    } catch (err) {
      console.error('Error fetching verification data:', err);
      setVerifiedChecks((v) => ({ ...v, loaded: true }));
    }
  };

  // Same score and inputs as Monetize.
  const { credibility } = useCredibility();

  const PLAN_NAME: Record<string, string> = { snapshot: 'Snapshot', essential: 'Essential', pro: 'Pro', scale: 'Scale' };
  const verifiedKg = sumVerifiedKgOncePerEmission(verifiedEmissions, e => e.id, e => e.co2_kg);
  const checks = pathwayChecks({ verifiedCount: verifiedChecks.count, qualityGrade: verifiedChecks.grade, ledgerCount: ledgerEntries.length, greenInvoiceCount: countGreenInvoices(ledgerEntries as never) });
  // Green-finance readiness is shown on the green-loan row, not repeated as an alert.
  const otherAlerts = alerts.filter((a) => a.id !== 'green_finance').slice(0, 3);

  return (
    <div className="min-h-screen w-full bg-background pb-16 md:pb-0">
      <Helmet>
        <title>Dashboard | Senseible Carbon MRV</title>
        <meta name="description" content="View your carbon emissions summary, trends, and monetization opportunities." />
      </Helmet>

      <Navigation onSignOut={() => navigate('/')} />
      {emissionsError && <RecordsLoadError onRetry={() => void refetch()} />}

      <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-8">
        <GraceNotice className="mb-4" />
        <header className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {isPersonalized ? greeting : user ? 'Welcome back!' : 'Carbon Dashboard'}
              </h1>
              {user && <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">{PLAN_NAME[tier] ?? tierLabel}</span>}
            </div>
            <p className="text-sm text-muted-foreground">Your verified records, what changed, and what you can unlock.</p>
          </div>
          <div className="flex items-center gap-2">
            {user && tier === 'snapshot' && (
              <Button variant="outline" size="sm" asChild className="gap-2">
                <Link to="/pricing"><Zap className="h-4 w-4" />Upgrade<ArrowRight className="h-3 w-3" /></Link>
              </Button>
            )}
            {isGuestUser && (documents.length > 0 || emissions.length > 0) && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={isResetting}>
                    {isResetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Reset Data
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset all data?</AlertDialogTitle>
                    <AlertDialogDescription>This will permanently delete all your uploaded documents, emissions data, and verifications. This action cannot be undone. You can start fresh with new uploads.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={resetAllData} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Yes, reset everything</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </header>

        {isLoading ? (
          <div className="space-y-4" aria-label="Loading your data">
            <div className="h-64 animate-pulse rounded-2xl bg-muted motion-reduce:animate-none" />
            <div className="h-48 animate-pulse rounded-2xl bg-muted motion-reduce:animate-none" />
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            <StandSection
              summary={summary}
              recordCount={emissions.length}
              unverifiedCount={unverifiedEmissions.length}
              hasVerifiedData={verifiedEmissions.length > 0}
              verificationScore={verificationScore}
              latestStatus={emissions.length > 0 ? latestStatus : null}
              credibilityScore={credibility?.score}
              credibilityGrade={credibility?.grade}
            />

            <FinancePathways verifiedTonnes={verifiedKg / 1000} verifiedRecords={verifiedEmissions.length} checks={checks} statuses={pathwayStatuses} loaded={verifiedChecks.loaded} />

            {emissions.length > 0 && (
              <section aria-labelledby="emissions-title" className="flex flex-col gap-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <h2 id="emissions-title" className="text-lg font-semibold">Your emissions</h2>
                  <DashboardFilterBar
                    defaults={defaultFilters(Boolean(user))}
                    filters={filters}
                    categories={categoryOptions}
                    matchedCount={analytics.rows.length}
                    totalCount={emissions.length}
                    onChange={setFilters}
                  />
                </div>
                <DashboardIntelligence range={filters.range} totals={analytics.totals} delta={analytics.delta} completeness={analytics.completeness} />
                <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                  <TrendChart data={analytics.series} rangeLabel={TIME_RANGE_LABELS[filters.range]} />
                  <CategoryTable inView={analytics.categories} allTime={summary.byCategory} />
                </div>
                <RecordInsights emissions={emissions} documents={documents} />
                {otherAlerts.length > 0 && (
                  <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
                    {otherAlerts.map((alert) => {
                      const Icon = alert.severity === 'warning' ? AlertTriangle : alert.severity === 'success' ? CheckCircle2 : Info;
                      const tone = alert.severity === 'warning' ? 'text-warning' : alert.severity === 'success' ? 'text-success' : 'text-primary';
                      const body = (
                        <>
                          <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone}`} aria-hidden="true" />
                          <span className="min-w-0 flex-1 text-sm"><span className="font-medium">{alert.title}</span> <span className="text-muted-foreground">· {alert.message}</span></span>
                          {alert.linkTo && <span className="hidden shrink-0 items-center gap-1 text-sm font-medium text-primary sm:inline-flex">{alert.linkLabel}<ChevronRight className="h-3.5 w-3.5" aria-hidden="true" /></span>}
                        </>
                      );
                      return (
                        <li key={alert.id}>
                          {alert.linkTo
                            ? <Link to={alert.linkTo} className="flex items-start gap-3 px-5 py-3.5 hover:bg-secondary/40">{body}</Link>
                            : <div className="flex items-start gap-3 px-5 py-3.5">{body}</div>}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            )}

            {user && <FinanceEvidenceCard />}

            {financeSwitch.on && (
              <Suspense fallback={null}><FinanceInsights /></Suspense>
            )}

            <RecentDocuments documents={documents.slice(0, 5)} />

            {isEnterprise && emissions.length > 0 && (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <EnterpriseAuditLog />
                <EnterpriseComplianceLabels scope1={summary.scope1} scope2={summary.scope2} scope3={summary.scope3} />
              </div>
            )}

            {scope3.showBasic && (
              <Suspense fallback={null}><Scope3Preview fullAvailable={scope3.fullAvailable} /></Suspense>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
