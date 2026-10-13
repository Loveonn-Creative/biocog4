import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { MinimalNav } from "@/components/MinimalNav";
import { Footer } from "@/components/Footer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Lock, Sparkles, FileText, Upload, Check, Loader2 } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { useWorkspace } from "@/hooks/useWorkspace";
import { applyScope, scopeKey } from "@/lib/workspaceScope";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import {
  SECTOR_BENCHMARKS,
  baselineFromUsage,
  calculateFeasibility,
  sbtiPace,
  estimatedCutKg,
  earnedBadges,
  targetDateFor,
  timelineFromGoal,
  formatCo2,
  formatParam,
  cleanAssumptions,
  type FeasibilityResult,
  type BadgeKey,
  type AssumptionValues,
} from "@/lib/netZeroEngine";
import { SummitTrail, CarbonBudget, BadgeShelf, PathwayChart, ScopeDonut, Burst } from "@/components/netzero/GameParts";
import { AssumptionField } from "@/components/netzero/AssumptionField";

const STEPS = [
  { id: 'baseline', label: 'Baseline' },
  { id: 'goal', label: 'Set Goal' },
  { id: 'roadmap', label: 'Roadmap' },
  { id: 'execute', label: 'Execute' },
  { id: 'report', label: 'Report' },
];

const TARGETS = ['20', '30', '50', '75'];
const TIMELINES = [
  { v: '12', label: '12 months' },
  { v: '36', label: '3 years' },
  { v: '60', label: 'By 2030' },
];

type TaskStatus = 'pending' | 'in-progress' | 'done';

const NetZero = () => {
  const { isAuthenticated, user } = useSession();
  const { scope, ready: workspaceReady } = useWorkspace();
  const workspaceKey = scopeKey(scope);
  const navigate = useNavigate();
  const { isPremium } = usePremiumStatus();
  const [activeStep, setActiveStep] = useState('baseline');
  // A step change brings the climb back into view when it has scrolled away, so the move to the next level is seen.
  const trailRef = useRef<HTMLElement>(null);
  const firstStep = useRef(true);
  useEffect(() => {
    if (firstStep.current) { firstStep.current = false; return; }
    const el = trailRef.current;
    if (el && el.getBoundingClientRect().top < 0) {
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    }
  }, [activeStep]);

  // Baseline data from platform
  const [baselineData, setBaselineData] = useState<{ scope1: number; scope2: number; scope3: number; total: number } | null>(null);
  const [loadingBaseline, setLoadingBaseline] = useState(true);

  // Goal settings
  const [sectorId, setSectorId] = useState('other');
  const [targetPct, setTargetPct] = useState('30');
  // Without uploaded records the baseline comes from monthly usage the visitor
  // enters (the defaults are an example and say so), at the platform's factors.
  const [monthlyKwh, setMonthlyKwh] = useState(10000);
  const [monthlyDiesel, setMonthlyDiesel] = useState(500);
  const [timeline, setTimeline] = useState('12');
  const [feasibility, setFeasibility] = useState<FeasibilityResult | null>(null);
  // Assumptions the user changed from the defaults, by key. Saved with the goal.
  const [assumptions, setAssumptions] = useState<AssumptionValues>({});

  // Execution tracking, saved to the signed-in account's goal
  const [taskStatuses, setTaskStatuses] = useState<Record<string, TaskStatus>>({});
  const [goalId, setGoalId] = useState<string | null>(null);
  const [goalCreatedAt, setGoalCreatedAt] = useState<string | null>(null);
  const [goalChecked, setGoalChecked] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [reportExportedAt, setReportExportedAt] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState<{ id: string; label: string; n: number } | null>(null);
  const [freshBadge, setFreshBadge] = useState<BadgeKey | null>(null);

  // Load baseline from existing emissions
  useEffect(() => {
    const loadBaseline = async () => {
      if (!workspaceReady) return;
      setLoadingBaseline(true);
      const query = isAuthenticated && user?.id ? applyScope(supabase.from('emissions').select('scope, co2_kg'), scope) : null;
      if (!query) {
        setLoadingBaseline(false);
        return;
      }

      const { data } = await query;

      if (data && data.length > 0) {
        const scope1 = data.filter(e => e.scope === 1).reduce((s, e) => s + Number(e.co2_kg), 0);
        const scope2 = data.filter(e => e.scope === 2).reduce((s, e) => s + Number(e.co2_kg), 0);
        const scope3 = data.filter(e => e.scope === 3).reduce((s, e) => s + Number(e.co2_kg), 0);
        setBaselineData({ scope1, scope2, scope3, total: scope1 + scope2 + scope3 });
      }
      setLoadingBaseline(false);
    };
    loadBaseline();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- workspaceKey captures scope
  }, [isAuthenticated, user?.id, workspaceKey, workspaceReady]);

  // Restore the saved goal, if this account has one. Goals are personal records.
  useEffect(() => {
    if (!isAuthenticated || !user?.id) { setGoalChecked(true); return; }
    let live = true;
    supabase
      .from('net_zero_goals')
      .select('id, sector, target_reduction_pct, target_date, tasks, roadmap, created_at')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!live) return;
        setGoalChecked(true);
        if (error || !data) return;
        setGoalId(data.id);
        setGoalCreatedAt(data.created_at);
        if (data.sector && SECTOR_BENCHMARKS.some(b => b.id === data.sector)) setSectorId(data.sector);
        const pct = String(Math.round(Number(data.target_reduction_pct)));
        if (TARGETS.includes(pct)) setTargetPct(pct);
        if (data.target_date && data.created_at) setTimeline(timelineFromGoal(data.target_date, data.created_at));
        if (Array.isArray(data.tasks)) {
          const restored: Record<string, TaskStatus> = {};
          for (const t of data.tasks as Array<{ id?: string; status?: string }>) {
            if (t?.id && (t.status === 'pending' || t.status === 'in-progress' || t.status === 'done')) restored[t.id] = t.status;
          }
          setTaskStatuses(restored);
        }
        const roadmap = data.roadmap as { reportExportedAt?: string; assumptions?: unknown } | null;
        if (roadmap && !Array.isArray(roadmap) && typeof roadmap.reportExportedAt === 'string') setReportExportedAt(roadmap.reportExportedAt);
        if (roadmap && !Array.isArray(roadmap)) setAssumptions(cleanAssumptions(roadmap.assumptions));
        setSaveState('saved');
      });
    return () => { live = false; };
  }, [isAuthenticated, user?.id]);

  // Calculate feasibility when goal params change
  useEffect(() => {
    const baseline = baselineData && baselineData.total > 0
      ? { scope1Kg: baselineData.scope1, scope2Kg: baselineData.scope2, scope3Kg: baselineData.scope3, totalKg: baselineData.total }
      : baselineFromUsage(monthlyKwh, monthlyDiesel);
    const result = calculateFeasibility(baseline, parseFloat(targetPct) || 30, parseFloat(timeline) || 12, sectorId, assumptions);
    setFeasibility(result);
  }, [sectorId, targetPct, timeline, baselineData, monthlyKwh, monthlyDiesel, assumptions]);

  const baselineTotal = baselineData?.total || 0;
  const hasData = baselineTotal > 0;
  const actions = useMemo(() => feasibility?.recommendedActions ?? [], [feasibility]);
  const completedTasks = actions.filter(a => taskStatuses[a.id] === 'done').length;
  const totalTasks = actions.length || 1;
  const cutKg = feasibility ? estimatedCutKg(feasibility.baselineCo2Kg, actions, taskStatuses) : 0;
  const progressPct = feasibility && feasibility.targetReductionKg > 0 ? Math.min(100, (cutKg / feasibility.targetReductionKg) * 100) : 0;
  const pace = sbtiPace(parseFloat(targetPct) || 30, parseFloat(timeline) || 12);
  const sectorName = SECTOR_BENCHMARKS.find(b => b.id === sectorId)?.name ?? 'Other / General';
  const timelineLabel = timeline === '12' ? 'in 12 months' : timeline === '36' ? 'in 3 years' : 'by 2030';

  const badges = earnedBadges({
    hasBaselineData: hasData, goalSaved: !!goalId, paceMeets: pace.meets,
    doneCount: completedTasks, progressPct, reportExported: !!reportExportedAt,
  });
  // Pop a badge the moment it is earned, not when saved progress first loads.
  const hydrated = goalChecked && !loadingBaseline;
  const prevBadges = useRef<BadgeKey[] | null>(null);
  useEffect(() => {
    if (!hydrated) return;
    if (prevBadges.current) {
      const fresh = badges.find(b => !prevBadges.current!.includes(b));
      if (fresh) setFreshBadge(fresh);
    }
    prevBadges.current = badges;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- compare by content
  }, [badges.join(','), hydrated]);

  const stepDone = new Set<string>([
    ...(hasData ? ['baseline'] : []),
    ...(goalId ? ['goal'] : []),
    ...(goalId && actions.length ? ['roadmap'] : []),
    ...(progressPct >= 100 ? ['execute'] : []),
    ...(reportExportedAt ? ['report'] : []),
  ]);

  // Saves run one after another and read the latest goal id, so two quick
  // saves can never insert two goals.
  const goalIdRef = useRef<string | null>(null);
  goalIdRef.current = goalId;
  const saveQueue = useRef<Promise<unknown>>(Promise.resolve());

  /** Save the goal and task statuses to the account. Shows "Saved" only after the database confirms it. */
  const saveGoal = useCallback((statuses: Record<string, TaskStatus>, extra?: { reportExportedAt?: string }) => {
    const run = saveQueue.current.then(() => saveGoalNow(statuses, extra));
    saveQueue.current = run.catch(() => undefined);
    return run;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- saveGoalNow reads current state each run
  }, [isAuthenticated, user?.id, feasibility, timeline, sectorId, goalCreatedAt, reportExportedAt, assumptions]);

  const saveGoalNow = async (statuses: Record<string, TaskStatus>, extra?: { reportExportedAt?: string }) => {
    if (!isAuthenticated || !user?.id || !feasibility) return false;
    setSaveState('saving');
    const cut = estimatedCutKg(feasibility.baselineCo2Kg, feasibility.recommendedActions, statuses);
    const row = {
      user_id: user.id,
      baseline_co2_kg: feasibility.baselineCo2Kg,
      target_reduction_pct: feasibility.targetReductionPct,
      // Measured from when the goal was first set, so later saves do not move the date.
      target_date: targetDateFor(parseFloat(timeline) || 12, goalCreatedAt ? new Date(goalCreatedAt) : new Date()),
      sector: sectorId,
      roadmap: {
        actions: feasibility.recommendedActions.map(a => a.id),
        ...(extra?.reportExportedAt || reportExportedAt ? { reportExportedAt: extra?.reportExportedAt ?? reportExportedAt } : {}),
        ...(Object.keys(assumptions).length ? { assumptions } : {}),
      },
      tasks: feasibility.recommendedActions.map(a => ({ id: a.id, status: statuses[a.id] || 'pending' })),
      progress_pct: feasibility.targetReductionKg > 0 ? Math.round(Math.min(100, (cut / feasibility.targetReductionKg) * 100)) : 0,
      status: 'active',
      updated_at: new Date().toISOString(),
    };
    const existing = goalIdRef.current;
    const res = existing
      ? await supabase.from('net_zero_goals').update(row).eq('id', existing).select('id').maybeSingle()
      : await supabase.from('net_zero_goals').insert(row).select('id').maybeSingle();
    if (res.error || !res.data?.id) {
      setSaveState('error');
      toast({ title: 'Not saved', description: 'Your progress is kept on this page. Try again in a moment.', variant: 'destructive' });
      return false;
    }
    if (!existing) setGoalCreatedAt(new Date().toISOString());
    goalIdRef.current = res.data.id;
    setGoalId(res.data.id);
    setSaveState('saved');
    return true;
  };

  // Task changes save after a short pause, so quick taps make one write.
  const saveTimer = useRef<number>();
  useEffect(() => () => window.clearTimeout(saveTimer.current), []);

  const toggleTask = (id: string) => {
    const current = taskStatuses[id] || 'pending';
    const next: TaskStatus = current === 'pending' ? 'in-progress' : current === 'in-progress' ? 'done' : 'pending';
    const updated = { ...taskStatuses, [id]: next };
    setTaskStatuses(updated);
    if (next === 'done' && feasibility) {
      const a = actions.find(x => x.id === id)!;
      setCelebrate({ id, label: `−${formatCo2(a.cutKg)}`, n: Date.now() });
    }
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => { void saveGoal(updated); }, 600);
  };

  // An edited assumption changes the roadmap; once it is recalculated, a saved
  // goal saves again after a short pause. A new goal saves them with "Save goal".
  const assumptionsEdited = useRef(false);
  const setAssumption = (key: string, value: number | null) => {
    assumptionsEdited.current = true;
    setAssumptions(prev => {
      const next = { ...prev };
      if (value === null) delete next[key]; else next[key] = value;
      return next;
    });
  };
  const resetAssumptions = () => { assumptionsEdited.current = true; setAssumptions({}); };
  useEffect(() => {
    if (!assumptionsEdited.current || !goalIdRef.current) return;
    assumptionsEdited.current = false;
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => { void saveGoal(taskStatuses); }, 800);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once the edited roadmap is recalculated
  }, [feasibility]);
  const editedCount = Object.keys(assumptions).length;

  const exportReport = async () => {
    if (!feasibility) return;
    try {
      const { downloadNetZeroReport } = await import("@/lib/netZeroReport");
      downloadNetZeroReport({ sectorName, baselineFromRecords: hasData, timelineLabel, feasibility, statuses: taskStatuses, pace, cutKg, progressPct });
      const at = new Date().toISOString();
      setReportExportedAt(at);
      void saveGoal(taskStatuses, { reportExportedAt: at });
    } catch {
      toast({ title: 'Report not created', description: 'Please try again.', variant: 'destructive' });
    }
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Net-Zero Goal Engine",
    "description": "MSME net-zero roadmap builder. Set science-based targets, get AI-powered reduction strategies, and track progress toward net-zero.",
    "url": "https://senseible.earth/net-zero",
    "applicationCategory": "BusinessApplication",
    "provider": { "@type": "Organization", "name": "Senseible", "url": "https://senseible.earth" },
  };

  const chip = (on: boolean) => `rounded-full px-4 py-2 text-sm transition-colors ${on ? "bg-foreground text-background" : "border border-border hover:bg-secondary"}`;
  const nextBtn = "inline-flex items-center gap-1.5 rounded-full bg-foreground text-background px-5 py-2.5 text-sm font-medium";
  const backBtn = "inline-flex items-center rounded-full border border-border px-5 py-2.5 text-sm hover:bg-secondary";
  const stepIndex = STEPS.findIndex(s => s.id === activeStep);

  return (
    <>
      <Helmet>
        <meta name="keywords" content="net zero MSME, MSME decarbonization, net zero roadmap India, carbon reduction tool, SBTi MSME" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>
      <MinimalNav />
      <main className="nz-anim min-h-screen bg-background pt-20 pb-16">
        <div className="container max-w-5xl mx-auto px-4 sm:px-6">
          {/* Hero: where you are on the climb */}
          <header className="text-center">
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Net-Zero Engine</p>
            <h1 className="mt-2 text-3xl sm:text-5xl font-semibold tracking-tight text-foreground [text-wrap:balance]">Your Path to Net-Zero</h1>
            <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
              From baseline to achievement in 5 steps. Deterministic science, AI-augmented decisions.
            </p>
            <dl className="mt-6 inline-grid grid-cols-3 gap-6 sm:gap-10 text-left">
              <div><dt className="text-[11px] uppercase tracking-wider text-muted-foreground">Level</dt><dd className="text-lg font-semibold tabular-nums">{stepIndex + 1} / {STEPS.length}</dd></div>
              <div><dt className="text-[11px] uppercase tracking-wider text-muted-foreground">Cut (est.)</dt><dd className="text-lg font-semibold tabular-nums">{formatCo2(cutKg)}</dd></div>
              <div><dt className="text-[11px] uppercase tracking-wider text-muted-foreground">Badges</dt><dd className="text-lg font-semibold tabular-nums">{badges.length} / 7</dd></div>
            </dl>
          </header>

          {/* The climb doubles as step navigation */}
          <nav ref={trailRef} aria-label="Net-zero steps" className="mt-6 mb-10 px-2 sm:px-6 scroll-mt-16">
            <SummitTrail steps={STEPS} active={activeStep} done={stepDone} onPick={setActiveStep} />
          </nav>

          {!isAuthenticated && (
            <div className="mb-8 rounded-2xl border border-primary/20 bg-primary/5 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-sm text-foreground">Sign in to load your emissions baseline and save net-zero goals.</p>
              <button onClick={() => navigate('/auth?next=%2Fnet-zero')} className={nextBtn}>Sign In to Start <ArrowRight className="w-3.5 h-3.5" /></button>
            </div>
          )}
          {isAuthenticated && saveState !== 'idle' && (
            <p className="mb-6 text-center text-xs text-muted-foreground" aria-live="polite">
              {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Goal and progress saved to your account' : 'Not saved yet'}
            </p>
          )}

          {/* Level 1: baseline */}
          {activeStep === 'baseline' && (
            <section className="space-y-6">
              <div className="rounded-3xl border border-border p-5 sm:p-8">
                <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">Emissions Baseline</h2>
                {loadingBaseline ? (
                  <p className="mt-4 text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Loading your emissions data...</p>
                ) : hasData ? (
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 items-center">
                    <div>
                      <p className="text-4xl font-semibold text-foreground tabular-nums">{formatCo2(baselineTotal)}</p>
                      <p className="text-sm text-muted-foreground mb-5">Total from your verified records</p>
                      <div className="space-y-2.5">
                        {[
                          { label: 'Scope 1 (Direct)', value: baselineData!.scope1, color: 'hsl(var(--primary))' },
                          { label: 'Scope 2 (Electricity)', value: baselineData!.scope2, color: 'hsl(var(--accent))' },
                          { label: 'Scope 3 (Value Chain)', value: baselineData!.scope3, color: 'hsl(var(--warning))' },
                        ].map(s => (
                          <div key={s.label} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ background: s.color }} /><span className="text-muted-foreground">{s.label}</span></div>
                            <span className="font-medium tabular-nums">{formatCo2(s.value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="justify-self-center">
                      <ScopeDonut parts={[
                        { label: 'Scope 1', value: baselineData!.scope1, color: 'hsl(var(--primary))' },
                        { label: 'Scope 2', value: baselineData!.scope2, color: 'hsl(var(--accent))' },
                        { label: 'Scope 3', value: baselineData!.scope3, color: 'hsl(var(--warning))' },
                      ].filter(p => p.value > 0)} />
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 space-y-5">
                    <p className="text-sm text-muted-foreground">No emissions data yet. Upload your first invoice to establish a baseline, or enter your monthly use below. The numbers shown are an example until you change them.</p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block text-sm">
                        <span className="font-medium">Grid electricity per month</span>
                        <span className="mt-1.5 flex items-center gap-2"><input type="number" min={0} inputMode="numeric" value={monthlyKwh} onChange={e => setMonthlyKwh(Math.max(0, Number(e.target.value) || 0))} className="h-11 w-full rounded-xl border border-input bg-background px-3 tabular-nums" /><span className="text-muted-foreground">kWh</span></span>
                      </label>
                      <label className="block text-sm">
                        <span className="font-medium">Diesel per month</span>
                        <span className="mt-1.5 flex items-center gap-2"><input type="number" min={0} inputMode="numeric" value={monthlyDiesel} onChange={e => setMonthlyDiesel(Math.max(0, Number(e.target.value) || 0))} className="h-11 w-full rounded-xl border border-input bg-background px-3 tabular-nums" /><span className="text-muted-foreground">litres</span></span>
                      </label>
                    </div>
                    {feasibility && (
                      <p className="text-sm">
                        Baseline <span className="font-semibold tabular-nums">{formatCo2(feasibility.baselineCo2Kg)}</span> a year
                        <span className="block text-xs text-muted-foreground mt-1">= 12 × ({monthlyKwh.toLocaleString('en-IN')} kWh × 0.710 kgCO2/kWh CEA grid factor + {monthlyDiesel.toLocaleString('en-IN')} L × 2.68 kgCO2/L diesel)</span>
                      </p>
                    )}
                    <button onClick={() => navigate('/')} className={backBtn}><Upload className="w-4 h-4 mr-1.5" />Upload Invoice</button>
                  </div>
                )}
              </div>
              <div className="flex justify-end">
                <button onClick={() => setActiveStep('goal')} className={nextBtn}>Set Reduction Goal <ArrowRight className="w-4 h-4" /></button>
              </div>
            </section>
          )}

          {/* Level 2: goal with live pace check */}
          {activeStep === 'goal' && (
            <section className="space-y-6">
              <div className="rounded-3xl border border-border p-5 sm:p-8">
                <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">Goal Setting</h2>
                <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_1fr]">
                  <div className="space-y-6">
                    <label className="block space-y-1.5">
                      <span className="text-sm font-medium">Your Sector</span>
                      <Select value={sectorId} onValueChange={setSectorId}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {SECTOR_BENCHMARKS.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </label>
                    <fieldset>
                      <legend className="text-sm font-medium mb-2">Reduction Target</legend>
                      <div role="radiogroup" className="flex flex-wrap gap-2">
                        {TARGETS.map(v => <button key={v} role="radio" aria-checked={targetPct === v} onClick={() => setTargetPct(v)} className={chip(targetPct === v)}>{v}% reduction</button>)}
                      </div>
                    </fieldset>
                    <fieldset>
                      <legend className="text-sm font-medium mb-2">Timeline</legend>
                      <div role="radiogroup" className="flex flex-wrap gap-2">
                        {TIMELINES.map(o => <button key={o.v} role="radio" aria-checked={timeline === o.v} onClick={() => setTimeline(o.v)} className={chip(timeline === o.v)}>{o.label}</button>)}
                      </div>
                    </fieldset>
                  </div>
                  <div className="rounded-2xl bg-secondary/40 p-4">
                    <PathwayChart targetPct={parseFloat(targetPct)} months={parseFloat(timeline)} />
                    <p className={`mt-2 text-sm font-medium ${pace.meets ? 'text-primary' : 'text-warning'}`} aria-live="polite">
                      {pace.annualPct}% a year: {pace.meets ? 'meets' : 'below'} the SBTi 1.5°C minimum pace of 4.2% a year
                    </p>
                    <p className="text-xs text-muted-foreground">A pace check for Scope 1 and 2, not an SBTi validation.</p>
                  </div>
                </div>

                {feasibility && (
                  <div className="mt-8 rounded-2xl border border-border p-4">
                    <p className={`text-sm font-medium ${feasibility.isFeasible ? 'text-primary' : 'text-warning'}`}>{feasibility.isFeasible ? 'Feasible' : 'Ambitious'}</p>
                    <p className="text-xs text-muted-foreground">{feasibility.feasibilityNote}</p>
                    <dl className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div><dt className="text-xs text-muted-foreground">Baseline</dt><dd className="text-lg font-semibold tabular-nums">{formatCo2(feasibility.baselineCo2Kg)}</dd></div>
                      <div><dt className="text-xs text-muted-foreground">Target Cut</dt><dd className="text-lg font-semibold tabular-nums text-destructive">−{formatCo2(feasibility.targetReductionKg)}</dd></div>
                      <div><dt className="text-xs text-muted-foreground">Goal</dt><dd className="text-lg font-semibold tabular-nums text-primary">{formatCo2(feasibility.targetCo2Kg)}</dd></div>
                      <div><dt className="text-xs text-muted-foreground">Roadmap cut (est.)</dt><dd className="text-lg font-semibold tabular-nums">{formatCo2(feasibility.totalEstimatedCutKg)}</dd></div>
                    </dl>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap justify-between gap-3">
                <button onClick={() => setActiveStep('baseline')} className={backBtn}>Back</button>
                <div className="flex flex-wrap gap-3">
                  {isAuthenticated && (
                    <button onClick={() => void saveGoal(taskStatuses)} disabled={saveState === 'saving'} className={backBtn}>
                      {goalId ? 'Update saved goal' : 'Lock in this goal'}
                    </button>
                  )}
                  <button onClick={() => setActiveStep('roadmap')} className={nextBtn}>View Roadmap <ArrowRight className="w-4 h-4" /></button>
                </div>
              </div>
            </section>
          )}

          {/* Level 3: roadmap as quests */}
          {activeStep === 'roadmap' && (
            <section className="space-y-6">
              <div className="rounded-3xl border border-border p-5 sm:p-8">
                <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">Reduction Roadmap</h2>
                <p className="mt-1 text-sm text-muted-foreground">Ranked by cut for the effort. Each quest shows its estimated cut and how it is calculated. Open it to replace any assumption with your own figure, from an energy audit or your records, and the cut recalculates.</p>
                {editedCount > 0 && (
                  <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-warning/40 bg-warning/5 px-3 py-2 text-xs">
                    <span>{editedCount} {editedCount === 1 ? 'assumption uses your figure' : 'assumptions use your figures'}{goalId ? '' : '. Save the goal to keep them'}.</span>
                    <button type="button" onClick={resetAssumptions} className="underline underline-offset-2">Reset all to defaults</button>
                  </div>
                )}
                {feasibility && (
                  <ol className="mt-6 grid gap-3 sm:grid-cols-2">
                    {actions.map((action, i) => {
                      const kg = action.cutKg;
                      const share = feasibility.targetReductionKg > 0 ? Math.min(100, (kg / feasibility.targetReductionKg) * 100) : 0;
                      return (
                        <li key={action.id} className="rounded-2xl border border-border p-4">
                          <div className="flex items-start gap-3">
                            <span className={`grid place-items-center h-8 w-8 shrink-0 rounded-full text-xs font-bold ${action.scope === 1 ? 'bg-primary/10 text-primary' : action.scope === 2 ? 'bg-accent/10 text-accent' : 'bg-warning/10 text-warning'}`}>S{action.scope}</span>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-muted-foreground">Quest {i + 1}</p>
                              <p className="text-sm font-medium text-foreground">{action.title}</p>
                            </div>
                          </div>
                          <div className="mt-3 h-1.5 rounded-full bg-secondary overflow-hidden"><div className="h-full rounded-full bg-primary" style={{ width: `${share}%` }} /></div>
                          <p className="mt-2 text-xs text-muted-foreground">−{formatCo2(kg)} est. · {action.effort} effort</p>
                          <details className="mt-2 text-xs">
                            <summary className="cursor-pointer text-foreground underline underline-offset-4">How this is calculated</summary>
                            <p className="mt-2 font-mono text-[11px]">{action.formula} = {Math.round(action.fraction * 1000) / 10}% of Scope {action.scope}</p>
                            {action.params.length > 0 && (
                              <ul className="mt-2 space-y-1">
                                {action.params.map(p => (
                                  <li key={p.label} className="flex flex-wrap gap-x-2">
                                    <span className={`rounded px-1 font-mono text-[10px] uppercase ${p.kind === 'constant' ? 'bg-primary/10 text-primary' : 'bg-warning/15 text-warning'}`}>{p.kind}</span>
                                    {p.kind === 'assumption' && p.key ? (
                                      <div className="mt-1 w-full"><AssumptionField id={`nz-${action.id}-${p.key}`} param={p} onChange={setAssumption} /></div>
                                    ) : (
                                      <span>{p.label}: <span className="font-medium">{formatParam(p)}</span></span>
                                    )}
                                    <span className="w-full text-muted-foreground">{p.source}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                            {action.note && <p className="mt-2 text-muted-foreground">{action.note}</p>}
                          </details>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>

              <div className="rounded-2xl border border-accent/20 bg-accent/5 p-4 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-accent mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Get AI-personalized strategies</p>
                  <p className="text-xs text-muted-foreground mb-2">Our ESG Intelligence engine can analyze your specific data and suggest optimized reduction paths.</p>
                  {isPremium ? (
                    <button onClick={() => navigate('/intelligence')} className={backBtn}>Ask ESG Intelligence</button>
                  ) : (
                    <button onClick={() => navigate('/pricing')} className={backBtn}><Lock className="w-3 h-3 mr-1.5" /> Unlock with Premium</button>
                  )}
                </div>
              </div>

              <div className="flex justify-between">
                <button onClick={() => setActiveStep('goal')} className={backBtn}>Back</button>
                <button onClick={() => setActiveStep('execute')} className={nextBtn}>Start Executing <ArrowRight className="w-4 h-4" /></button>
              </div>
            </section>
          )}

          {/* Level 4: execute, with the carbon budget filling as quests are done */}
          {activeStep === 'execute' && (
            <section className="space-y-6">
              {!isAuthenticated ? (
                <div className="rounded-3xl border border-primary/20 bg-primary/5 p-6 text-center">
                  <Lock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-foreground mb-3">Sign in to track your execution progress and save milestones.</p>
                  <button onClick={() => navigate('/auth?next=%2Fnet-zero')} className={nextBtn}>Sign In</button>
                </div>
              ) : feasibility && (
                <>
                  <div className="rounded-3xl border border-border p-5 sm:p-8">
                    <CarbonBudget baselineKg={feasibility.baselineCo2Kg} targetKg={feasibility.targetCo2Kg} cutKg={cutKg} />
                    <p className="mt-3 text-xs text-muted-foreground">{completedTasks} of {totalTasks} actions completed · Progress: {Math.round(progressPct)}% of the target cut (est.)</p>
                  </div>

                  <div className="rounded-3xl border border-border p-5 sm:p-8">
                    <h2 className="text-lg font-semibold">Execution Checklist</h2>
                    <p className="text-xs text-muted-foreground">Tap a quest to move it from pending to in progress to done.</p>
                    <ul className="mt-4 space-y-2">
                      {actions.map(action => {
                        const status = taskStatuses[action.id] || 'pending';
                        return (
                          <li key={action.id} className="relative">
                            <button
                              onClick={() => toggleTask(action.id)}
                              aria-label={`${action.title}: ${status}`}
                              className={`w-full flex items-center gap-3 p-3 pr-24 rounded-xl border text-left transition-colors ${
                                status === 'done' ? 'bg-primary/5 border-primary/30' : status === 'in-progress' ? 'bg-accent/5 border-accent/30' : 'border-border hover:bg-secondary/50'}`}
                            >
                              <span className={`grid place-items-center w-6 h-6 rounded-full border-2 shrink-0 ${status === 'done' ? 'border-primary bg-primary text-primary-foreground' : status === 'in-progress' ? 'border-accent' : 'border-muted-foreground/30'}`}>
                                {status === 'done' && <Check className="w-3.5 h-3.5" />}
                                {status === 'in-progress' && <span className="h-2 w-2 rounded-full bg-accent" />}
                              </span>
                              <span className="flex-1 min-w-0">
                                <span className={`block text-sm ${status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{action.title}</span>
                                <span className="block text-xs text-muted-foreground">−{formatCo2(action.cutKg)} est. · Scope {action.scope}</span>
                              </span>
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] rounded-full border border-border px-2 py-0.5">{status}</span>
                            </button>
                            {celebrate?.id === action.id && <span key={celebrate.n} className="nz-burst-wrap"><Burst label={celebrate.label} /></span>}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </>
              )}
              <div className="flex justify-between">
                <button onClick={() => setActiveStep('roadmap')} className={backBtn}>Back</button>
                <button onClick={() => setActiveStep('report')} className={nextBtn}>View Report <ArrowRight className="w-4 h-4" /></button>
              </div>
            </section>
          )}

          {/* Level 5: report */}
          {activeStep === 'report' && (
            <section className="space-y-6">
              <div className="rounded-3xl border border-border p-5 sm:p-8 text-center">
                <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">Net-Zero Progress Report</h2>
                <div className="relative mx-auto mt-6 h-32 w-32">
                  <svg viewBox="0 0 42 42" className="h-full w-full -rotate-90" aria-hidden="true">
                    <circle cx="21" cy="21" r="15.9155" fill="none" stroke="hsl(var(--secondary))" strokeWidth="4" />
                    <circle cx="21" cy="21" r="15.9155" fill="none" stroke="hsl(var(--primary))" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${progressPct} ${100 - progressPct}`} className="transition-[stroke-dasharray] duration-700" />
                  </svg>
                  <span className="absolute inset-0 grid place-items-center text-2xl font-semibold text-primary tabular-nums">{Math.round(progressPct)}%</span>
                </div>
                <p className="mt-3 text-lg font-semibold text-foreground">Toward Net-Zero</p>
                <p className="text-sm text-muted-foreground">{completedTasks} actions completed · {formatCo2(cutKg)} estimated reduction</p>

                <dl className="mt-6 grid grid-cols-2 gap-3 max-w-md mx-auto text-left">
                  <div className="p-3 rounded-xl bg-secondary/50"><dt className="text-xs text-muted-foreground">Baseline</dt><dd className="text-sm font-medium">{feasibility ? formatCo2(feasibility.baselineCo2Kg) : '-'}</dd></div>
                  <div className="p-3 rounded-xl bg-secondary/50"><dt className="text-xs text-muted-foreground">Target</dt><dd className="text-sm font-medium">−{targetPct}% {timelineLabel}</dd></div>
                  <div className="p-3 rounded-xl bg-secondary/50"><dt className="text-xs text-muted-foreground">Sector</dt><dd className="text-sm font-medium">{sectorName}</dd></div>
                  <div className="p-3 rounded-xl bg-secondary/50"><dt className="text-xs text-muted-foreground">Roadmap cut (est.)</dt><dd className="text-sm font-medium">{feasibility ? formatCo2(feasibility.totalEstimatedCutKg) : '-'}</dd></div>
                </dl>

                <p className={`mt-6 text-xs ${pace.meets ? 'text-primary' : 'text-muted-foreground'}`}>
                  Pace {pace.annualPct}% a year: {pace.meets ? 'meets' : 'below'} the SBTi 1.5°C minimum of 4.2% a year (a pace check, not an SBTi validation)
                </p>

                <div className="mt-6">
                  {isAuthenticated ? (
                    <button onClick={() => void exportReport()} className={nextBtn}><FileText className="w-4 h-4" /> Export Report</button>
                  ) : (
                    <button onClick={() => navigate('/auth?next=%2Fnet-zero')} className={backBtn}><Lock className="w-3 h-3 mr-1.5" /> Sign in to Export</button>
                  )}
                </div>
              </div>

              <div className="rounded-2xl bg-secondary/40 p-4 text-xs text-muted-foreground">
                <p><strong>Trust Layer:</strong> Built on verified scientific emission factors (IPCC AR6, CEA India Grid Factor, MoEFCC guidelines) and deterministic calculations. AI enhances strategy recommendations; it never replaces core measurement logic. Cuts shown here are planning estimates; a verified reduction shows up in new bills after a change.</p>
              </div>

              <div className="flex justify-start">
                <button onClick={() => setActiveStep('execute')} className={backBtn}>Back</button>
              </div>
            </section>
          )}

          {/* Badges: earned only from real actions */}
          <section aria-labelledby="nz-badges" className="mt-14 rounded-3xl border border-border p-5 sm:p-8">
            <div className="flex items-baseline justify-between gap-4 mb-5">
              <h2 id="nz-badges" className="text-lg font-semibold">Badges</h2>
              <p className="text-xs text-muted-foreground">{badges.length} of 7 earned{!isAuthenticated ? ' · sign in to keep them' : ''}</p>
            </div>
            <BadgeShelf earned={badges} fresh={freshBadge} />
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default NetZero;
