import { useEffect, useMemo, useState, lazy, Suspense } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { Navigation } from '@/components/Navigation';
import { RecordsLoadError } from '@/components/RecordsLoadError';
import { GraceNotice } from '@/components/billing/GraceNotice';
import { NextStep } from '@/components/dashboard/NextStep';
import { KpiStrip } from '@/components/dashboard/KpiStrip';
import { ScopeTrend } from '@/components/dashboard/ScopeTrend';
import { CategoryBreakdown } from '@/components/dashboard/CategoryBreakdown';
import { WhatChanged } from '@/components/dashboard/WhatChanged';
import { UseEvidence } from '@/components/dashboard/UseEvidence';
import { FinanceEvidenceCard } from '@/components/dashboard/FinanceEvidenceCard';
import { RecentDocuments } from '@/components/dashboard/RecentDocuments';
import { EnterpriseAuditLog } from '@/components/enterprise/EnterpriseAuditLog';
import { EnterpriseComplianceLabels } from '@/components/enterprise/EnterpriseComplianceLabels';
import { useEmissions } from '@/hooks/useEmissions';
import { useDocuments } from '@/hooks/useDocuments';
import { useSession } from '@/hooks/useSession';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { usePersonalization } from '@/hooks/usePersonalization';
import { useOrganization } from '@/hooks/useOrganization';
import { useEnterpriseMode } from '@/hooks/useEnterpriseMode';
import { useScope3Visibility } from '@/hooks/useScope3Trail';
import { useCredibility } from '@/hooks/useCredibility';
import { useComplianceLedger } from '@/hooks/useComplianceLedger';
import { useFinanceInsightsSwitch } from '@/hooks/useFinanceInsights';
import { computeFinanceEvidence, type FinanceLedgerRow } from '@/lib/financeEvidence';
import { grossKg } from '@/lib/emissionLedger';
import { nextStep, categoryLabel, type ScopeId } from '@/lib/dashboardView';
import {
  resolveWindow, applyFilters, totals as computeTotals, periodDelta, topCategories, monthlySeries,
  TIME_RANGE_LABELS, type DashboardFilters, type TimeRange,
} from '@/lib/dashboardAnalytics';

const Scope3Preview = lazy(() => import('@/components/scope3/Scope3Preview').then((m) => ({ default: m.Scope3Preview })));
const FinanceInsights = lazy(() => import('@/components/finance/FinanceInsights').then((m) => ({ default: m.FinanceInsights })));

// Decision-first: the one next step, four figures, then the analysis behind
// them (trend, scope, category, what changed), then where the evidence goes.
// Every figure comes from records already loaded by the shared hooks; totals
// count verified records only, as Reports, History and Monetize do.

const RANGES: { id: TimeRange; short: string }[] = [
  { id: '30d', short: '30D' }, { id: '90d', short: '90D' }, { id: '12m', short: '12M' }, { id: 'fy', short: 'FY' }, { id: 'all', short: 'All' },
];

const Skeleton = () => (
  <div className="space-y-4" aria-label="Loading your records">
    <div className="h-20 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      {[0, 1, 2, 3].map((i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />)}
    </div>
    <div className="h-72 animate-pulse rounded-xl bg-muted motion-reduce:animate-none" />
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, isLoading: sessionLoading } = useSession();
  const { tier } = usePremiumStatus();
  const { greeting, isPersonalized } = usePersonalization();
  const { activeContext } = useOrganization();
  const { isEnterprise } = useEnterpriseMode();
  const scope3 = useScope3Visibility();
  const financeSwitch = useFinanceInsightsSwitch();
  const { summary, emissions, isLoading: emissionsLoading, refetch, error: emissionsError } = useEmissions();
  const { documents, isLoading: docsLoading } = useDocuments();
  const { entries } = useComplianceLedger();
  const { credibility, isLoading: credibilityLoading } = useCredibility();

  const isPartner = activeContext?.context_type === 'partner';
  useEffect(() => {
    if (isPartner) {
      toast.info('This dashboard is for MSMEs. Redirecting to Partner Dashboard.');
      navigate('/partner-dashboard');
    }
  }, [isPartner, navigate]);

  const [range, setRange] = useState<TimeRange>('12m');
  const [category, setCategory] = useState('all');
  const [shown, setShown] = useState<Set<ScopeId>>(() => new Set([1, 2, 3]));
  const toggleScope = (s: ScopeId) => setShown((prev) => {
    const next = new Set(prev);
    if (next.has(s)) { if (next.size > 1) next.delete(s); } else next.add(s);
    return next;
  });

  const view = useMemo(() => {
    const win = resolveWindow(range);
    const filters: DashboardFilters = { range, scope: 'all', status: 'verified', category };
    const rows = applyFilters(emissions, filters, win);
    const unverified = emissions.filter((e) => e.verified !== true);
    return {
      totals: computeTotals(rows),
      delta: periodDelta(emissions, filters, win),
      series: monthlySeries(rows, win, 'en-IN'),
      // Categories ignore the category filter so another can be picked.
      categories: topCategories(applyFilters(emissions, { ...filters, category: 'all' }, win), Infinity),
      unverifiedCount: unverified.length,
      unverifiedKg: unverified.reduce((t, e) => t + grossKg(e.co2_kg), 0),
      needsDetail: unverified.filter((e) => e.activity_data === null || e.activity_data === undefined || e.emission_factor === null || e.emission_factor === undefined).length,
      hasVerified: emissions.some((e) => e.verified === true),
    };
  }, [emissions, range, category]);

  const evidence = useMemo(() => computeFinanceEvidence(entries as unknown as FinanceLedgerRow[]).summary, [entries]);
  const step = nextStep({
    totalRecords: emissions.length,
    unverified: view.unverifiedCount,
    needsDetail: view.needsDetail,
    verifiedInvoices: evidence.invoices,
    monthsCovered: evidence.monthsCovered,
  });
  const invoicesInEur = useMemo(() => documents.some((d) => (d.currency || '').toUpperCase() === 'EUR'), [documents]);

  if (isPartner) return null;
  const firstLoad = sessionLoading || (emissionsLoading && emissions.length === 0);
  const rangeLabel = TIME_RANGE_LABELS[range];

  return (
    <div className="min-h-screen w-full bg-background pb-16 md:pb-0">
      <Helmet>
        <title>Dashboard | Senseible Carbon MRV</title>
        <meta name="description" content="Your verified emissions, what changed, and the next step to finance-ready evidence." />
      </Helmet>
      <Navigation onSignOut={() => navigate('/')} />
      {emissionsError && <RecordsLoadError onRetry={() => void refetch()} />}

      <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-8">
        <GraceNotice className="mb-4" />

        <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="truncate text-[22px] font-semibold tracking-tight md:text-2xl">{isPersonalized ? greeting : 'Overview'}</h1>
            {user && tier === 'snapshot' && (
              <Link to="/pricing" className="mt-1 inline-flex items-center gap-1 text-[13px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                Compare plans<ArrowRight className="h-3 w-3" aria-hidden="true" />
              </Link>
            )}
          </div>
          {emissions.length > 0 && (
            <div role="group" aria-label="Time range" className="inline-flex shrink-0 self-start rounded-lg border border-border bg-card p-0.5 sm:self-auto">
              {RANGES.map((r) => (
                <button key={r.id} type="button" aria-pressed={range === r.id} title={TIME_RANGE_LABELS[r.id]} onClick={() => setRange(r.id)}
                  className={`min-w-[2.75rem] rounded-md px-2.5 py-1.5 text-[12.5px] font-medium tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${range === r.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                  {r.short}
                </button>
              ))}
            </div>
          )}
        </header>

        {firstLoad ? <Skeleton /> : (
          <div className="space-y-4 md:space-y-5">
            <NextStep step={step} />

            {emissions.length > 0 && (
              <>
                <KpiStrip
                  rangeLabel={category === 'all' ? rangeLabel : `${categoryLabel(category)} · ${rangeLabel}`}
                  totals={view.totals}
                  delta={view.delta}
                  unverifiedCount={view.unverifiedCount}
                  unverifiedKg={view.unverifiedKg}
                  credibility={credibility}
                  credibilityLoading={credibilityLoading}
                  monthsCovered={evidence.monthsCovered}
                  invoices={evidence.invoices}
                  periodStart={evidence.periodStart}
                  periodEnd={evidence.periodEnd}
                />

                <ScopeTrend
                  series={view.series}
                  totals={view.totals}
                  shown={shown}
                  onToggleScope={toggleScope}
                  filterLabel={category === 'all' ? null : categoryLabel(category)}
                  onClearFilter={() => setCategory('all')}
                />

                <div className="grid gap-4 md:gap-5 lg:grid-cols-2">
                  {view.categories.length > 0
                    ? <CategoryBreakdown rows={view.categories} selected={category} onSelect={setCategory} />
                    : <section className="rounded-xl border border-border bg-card p-4 text-[13.5px] text-muted-foreground md:p-5">No verified records in this period to break down.</section>}
                  <WhatChanged emissions={emissions} documents={documents} />
                </div>
              </>
            )}

            <div className="grid items-start gap-4 md:gap-5 lg:grid-cols-3">
              {emissions.length > 0 && <UseEvidence hasVerified={view.hasVerified} invoicesInEur={invoicesInEur} />}
              {user && <FinanceEvidenceCard />}
              {(documents.length > 0 || docsLoading) && <RecentDocuments documents={documents.slice(0, 5)} loading={docsLoading} />}
            </div>

            {user && financeSwitch.on && (
              <Suspense fallback={null}><FinanceInsights /></Suspense>
            )}

            {isEnterprise && emissions.length > 0 && (
              <div className="grid gap-4 md:gap-5 lg:grid-cols-2">
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
