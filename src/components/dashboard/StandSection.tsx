import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Upload, ShieldCheck, FileBarChart, Shield, Coins } from 'lucide-react';
import type { EmissionsSummary } from '@/hooks/useEmissions';
import { SAMPLE_BILL_ENABLED } from '@/lib/sampleBill';

// Where the account stands: the verified total and its scopes, the evidence
// score and credibility, the one next action, and the everyday actions. It
// carries what the Emissions Overview, Evidence score card and Quick Actions
// showed, with the same figures and links.

interface Props {
  summary: EmissionsSummary;
  recordCount: number;
  /** Documents uploaded to this workspace. */
  documentCount?: number;
  /** Documents read with nothing counted yet (no emission record). */
  uncountedDocs?: number;
  unverifiedCount: number;
  /** Months with no electricity bill between the first and last on record (yyyy-mm). */
  missingMonths?: string[];
  /** The biggest lever from the business's own records (intelligentActions). */
  topAction?: { title: string; cta: { label: string; to: string } } | null;
  /** Account id, so the first-record steps tick over once per person. */
  userId?: string | null;
  /** A one-time proof moment, shown across the bottom of the frame. */
  moment?: ReactNode;
  hasVerifiedData: boolean;
  verificationScore: number;
  latestStatus: 'verified' | 'needs_review' | 'pending' | null;
  credibilityScore?: number;
  credibilityGrade?: string;
}

const fmt = (kg: number) => {
  const v = Number.isFinite(kg) && kg > 0 ? kg : 0;
  if (v >= 1000) { const t = v / 1000; return { value: t.toLocaleString('en-IN', { maximumFractionDigits: t < 100 ? 2 : 1 }), unit: 't CO₂e' }; }
  return { value: v.toLocaleString('en-IN', { maximumFractionDigits: v < 10 ? 1 : 0 }), unit: 'kg CO₂e' };
};

const SCOPES = [
  { key: 'scope1' as const, label: 'Scope 1', plain: 'Direct', color: 'var(--scope-1, #1a7f55)' },
  { key: 'scope2' as const, label: 'Scope 2', plain: 'Energy', color: 'var(--scope-2, #2a78d6)' },
  { key: 'scope3' as const, label: 'Scope 3', plain: 'Value chain', color: 'var(--scope-3, #c97a00)' },
];

function nextAction(p: Props) {
  const u = p.uncountedDocs ?? 0;
  if (p.recordCount === 0 && u > 0) return { message: `${u === 1 ? '1 document was' : `${u} documents were`} read, but nothing in ${u === 1 ? 'it' : 'them'} could be counted yet. History shows what is missing.`, label: 'See what is missing', to: '/history' };
  if (p.recordCount === 0) return { message: 'Upload your first invoice to start tracking carbon emissions.', label: 'Upload invoice', to: '/' };
  if (p.unverifiedCount > 0) return { message: `${p.unverifiedCount} ${p.unverifiedCount === 1 ? 'record is' : 'records are'} waiting for verification. Verify to use them in reports and finance.`, label: 'Verify now', to: '/verify' };
  const gaps = p.missingMonths ?? [];
  if (gaps.length) {
    const name = (ym: string) => new Date(`${ym}-01T00:00:00Z`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    const what = gaps.length === 1 ? `${name(gaps[0])}'s electricity bill is` : `Electricity bills for ${gaps.length} months, from ${name(gaps[0])}, are`;
    return { message: `${what} not uploaded yet. Complete months are what lenders check first.`, label: 'Upload bill', to: '/' };
  }
  if (p.topAction) return { message: p.topAction.title, label: p.topAction.cta.label, to: p.topAction.cta.to };
  if (p.hasVerifiedData) return { message: 'All emissions verified. Generate reports or upload more invoices.', label: 'View reports', to: '/reports' };
  return { message: 'Upload invoices to begin tracking.', label: 'Get started', to: '/' };
}

const Round = ({ to, label, icon: Icon, primary, badge }: { to: string; label: string; icon: typeof Upload; primary?: boolean; badge?: number }) => (
  <Link to={to} className="group relative flex min-w-0 flex-col items-center gap-2 rounded-xl py-1 text-center text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
    <span className={`grid h-12 w-12 place-items-center rounded-full transition-colors ${primary ? 'bg-primary text-primary-foreground group-hover:bg-primary/90' : 'bg-primary/10 text-primary group-hover:bg-primary/15'}`}>
      <Icon className="h-5 w-5" aria-hidden="true" />
    </span>
    <span className="leading-tight">{label}</span>
    {badge ? <span className="absolute right-[calc(50%-34px)] top-0 rounded-full bg-warning px-1.5 text-[11px] font-semibold text-warning-foreground">{badge}</span> : null}
  </Link>
);

// Which first-record steps this person has already seen done (a per-browser
// convenience): a step ticks over with a small check only the first time.
function useStepsSeen(userId: string | null | undefined, done: string[]) {
  const key = userId ? `senseible:steps-seen:${userId}` : null;
  const [fresh, setFresh] = useState<string[]>([]);
  const doneKey = done.join(',');
  useEffect(() => {
    if (!key) return;
    let seen: string[] = [];
    try { seen = JSON.parse(localStorage.getItem(key) ?? '[]'); } catch { /* storage unavailable */ }
    const now = done.filter((d) => !seen.includes(d));
    if (!now.length) return;
    setFresh(now);
    try { localStorage.setItem(key, JSON.stringify([...new Set([...seen, ...done])])); } catch { /* storage unavailable */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- doneKey captures done
  }, [key, doneKey]);
  return fresh;
}

export function StandSection(p: Props) {
  const total = fmt(p.summary.total);
  const action = nextAction(p);
  const steps = [
    { label: 'Bill read', on: (p.documentCount ?? 0) > 0 },
    { label: 'Counted', on: p.recordCount > 0 },
    { label: 'Verified', on: p.hasVerifiedData },
  ];
  const freshSteps = useStepsSeen(p.userId, steps.filter((st) => st.on).map((st) => st.label));
  // No verified evidence yet reads as 0, never a blank.
  const score = p.recordCount > 0 && p.latestStatus !== null ? p.verificationScore : 0;
  return (
    <section aria-label="Where you stand" className="grid overflow-hidden rounded-2xl border border-border bg-card lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-5 p-5 md:p-7">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">Verified emissions</p>
          <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
            <span className="text-4xl font-semibold tracking-tight tabular-nums md:text-5xl">{total.value}</span>
            <span className="text-base text-muted-foreground">{total.unit}</span>
          </p>
        </div>
        {/* One bar shows the shape of the footprint; values sit in the legend. */}
        <div>
          <div className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-muted" role="img"
            aria-label={SCOPES.map((s) => `${s.label} ${fmt(p.summary[s.key]).value} ${fmt(p.summary[s.key]).unit}`).join(', ')}>
            {p.summary.total > 0 && SCOPES.map((s) => p.summary[s.key] > 0 && (
              <span key={s.key} className="h-full min-w-[4px] origin-left motion-safe:animate-grow-x" style={{ flexGrow: p.summary[s.key], background: s.color }} />
            ))}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {SCOPES.map((s) => {
              const f = fmt(p.summary[s.key]);
              return (
                <div key={s.key} className="min-w-0">
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: s.color }} aria-hidden="true" />{s.plain}</p>
                  <p className="text-sm font-semibold tabular-nums">{f.value} <span className="text-xs font-normal text-muted-foreground">{f.unit.split(' ')[0]}</span></p>
                </div>
              );
            })}
          </div>
        </div>
        {/* Before anything is verified, show how far the first bill has come. */}
        {!p.hasVerifiedData && (
          <ol className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" aria-label="Your first record">
            {steps.map((st, i) => (
              <li key={st.label} className={`flex items-center gap-1.5 ${st.on ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                {i > 0 && <span className="h-px w-4 bg-border" aria-hidden="true" />}
                {st.on && freshSteps.includes(st.label)
                  ? <span className="grid h-3.5 w-3.5 place-items-center rounded-full bg-success text-success-foreground motion-safe:animate-[pop-in_0.35s_ease-out_both]" aria-hidden="true"><svg viewBox="0 0 12 12" className="h-2.5 w-2.5"><path d="M2.5 6.2 5 8.5l4.5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
                  : <span className={`h-2 w-2 rounded-full ${st.on ? 'bg-success' : 'border border-border'}`} aria-hidden="true" />}
                {st.label}<span className="sr-only">{st.on ? ' done' : ' not yet'}</span>
              </li>
            ))}
          </ol>
        )}
        <nav aria-label="Actions" className={`grid gap-1 ${p.unverifiedCount > 0 ? 'grid-cols-5' : 'grid-cols-4'}`}>
          <Round to="/" label="Upload invoice" icon={Upload} primary />
          {p.unverifiedCount > 0 && <Round to="/verify" label="Verify" icon={ShieldCheck} badge={p.unverifiedCount} />}
          <Round to="/reports" label="Generate report" icon={FileBarChart} />
          <Round to="/mrv-dashboard" label="MRV" icon={Shield} />
          <Round to="/monetize" label="Monetize" icon={Coins} />
        </nav>
      </div>
      <div className="flex min-w-0 flex-col gap-4 border-t border-border bg-primary/[0.04] p-5 md:p-7 lg:border-l lg:border-t-0">
        <p className="text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">Evidence</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-3xl font-semibold tabular-nums md:text-4xl">{score}%</p>
            <p className="text-xs text-muted-foreground">Evidence score: records passing checks</p>
          </div>
          <div>
            <p className="text-3xl font-semibold md:text-4xl">{p.credibilityScore != null ? <>{p.credibilityGrade} <span className="text-base font-medium text-muted-foreground tabular-nums">{p.credibilityScore}</span></> : <span className="tabular-nums">0</span>}</p>
            <p className="text-xs text-muted-foreground">Credibility</p>
          </div>
        </div>
        <span className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true"><span className="block h-full rounded-full bg-success" style={{ width: `${score}%` }} /></span>
        <div className="mt-auto flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm">{action.message}</p>
          <Link to={action.to} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            {action.label}<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
        {/* A new account with nothing read yet can walk the whole path on a sample first. */}
        {SAMPLE_BILL_ENABLED && p.recordCount === 0 && (p.documentCount ?? 0) === 0 && (
          <Link to="/?sample=1" className="self-start text-sm font-medium text-primary underline-offset-4 hover:underline">See the full path on a sample bill</Link>
        )}
      </div>
      {p.moment && <div className="lg:col-span-2">{p.moment}</div>}
    </section>
  );
}
