import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import type { CredibilityResult } from '@/lib/credibilityScore';
import type { PeriodDelta, ScopeTotals } from '@/lib/dashboardAnalytics';
import { formatCo2, SCOPES, shortDate } from '@/lib/dashboardView';

// Four figures, each answering one question: how much (verified, in the
// window), what is waiting, how far the evidence can be trusted, and how much
// of the year it covers. Only the first follows the time range; the other
// three describe the account as it stands.

interface Props {
  rangeLabel: string;
  totals: ScopeTotals;
  delta: PeriodDelta;
  unverifiedCount: number;
  unverifiedKg: number;
  credibility: CredibilityResult | null;
  credibilityLoading: boolean;
  monthsCovered: number;
  invoices: number;
  periodStart: string | null;
  periodEnd: string | null;
}

const Tile = ({ label, children, foot }: { label: string; children: React.ReactNode; foot?: React.ReactNode }) => (
  <div className="flex min-w-0 flex-col justify-between gap-3 rounded-xl border border-border bg-card p-4 md:p-5">
    <p className="text-[12px] font-medium uppercase tracking-[0.06em] text-muted-foreground">{label}</p>
    <div className="min-w-0">{children}</div>
    {foot && <div className="min-h-[1.25rem] text-[12.5px] text-muted-foreground">{foot}</div>}
  </div>
);

const Big = ({ value, unit }: { value: string; unit?: string }) => (
  <p className="flex flex-wrap items-baseline gap-x-1.5 leading-none">
    <span className="text-[26px] font-semibold tabular-nums tracking-tight text-foreground md:text-[30px]">{value}</span>
    {unit && <span className="text-[13px] font-medium text-muted-foreground">{unit}</span>}
  </p>
);

export function KpiStrip(p: Props) {
  const total = formatCo2(p.totals.total);
  const pending = formatCo2(p.unverifiedKg);
  const change = p.delta.comparable && p.delta.changePct !== null ? p.delta.changePct : null;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      <Tile
        label="Verified emissions"
        foot={change !== null ? (
          <span className="inline-flex items-center gap-1">
            {change >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /> : <ArrowDownRight className="h-3.5 w-3.5" aria-hidden="true" />}
            <span className="font-medium tabular-nums text-foreground">{Math.abs(change).toLocaleString('en-IN', { maximumFractionDigits: change !== 0 && Math.abs(change) < 10 ? 1 : 0 })}%</span>
            <span>{change >= 0 ? 'up' : 'down'} on the period before</span>
          </span>
        ) : <span>{p.rangeLabel}</span>}
      >
        <Big value={total.value} unit={total.unit} />
        {p.totals.total > 0 && (
          <div className="mt-3 flex h-1.5 w-full gap-0.5 overflow-hidden rounded-full" role="img"
            aria-label={SCOPES.map((s) => `${s.label} ${Math.round((p.totals[`scope${s.id}` as const] / p.totals.total) * 100)}%`).join(', ')}>
            {SCOPES.map((s) => {
              const v = p.totals[`scope${s.id}` as const];
              return v > 0 ? <span key={s.id} style={{ flexGrow: v, background: s.color }} /> : null;
            })}
          </div>
        )}
      </Tile>

      <Tile
        label="Waiting to verify"
        foot={p.unverifiedCount > 0
          ? <span>{p.unverifiedKg > 0 ? <><span className="tabular-nums">{pending.value} {pending.unit}</span> not yet counted</> : 'No figure yet'} · <Link to="/verify" className="font-medium text-foreground underline-offset-4 hover:underline">Verify</Link></span>
          : <span>Nothing waiting</span>}
      >
        <Big value={p.unverifiedCount.toLocaleString('en-IN')} unit={p.unverifiedCount === 1 ? 'record' : 'records'} />
      </Tile>

      <Tile
        label="Evidence quality"
        foot={p.credibility
          ? <span><span className="tabular-nums">{p.credibility.counts.completeInvoices.toLocaleString('en-IN')} of {p.credibility.counts.invoices.toLocaleString('en-IN')}</span> invoices complete</span>
          : <span>{p.credibilityLoading ? '' : 'Starts with your first verification'}</span>}
      >
        {p.credibility ? (
          <details className="group">
            <summary className="flex cursor-pointer list-none items-baseline gap-2 [&::-webkit-details-marker]:hidden">
              <Big value={p.credibility.grade} />
              <span className="text-[13px] tabular-nums text-muted-foreground">{p.credibility.score}/100</span>
              <span className="text-[12px] text-muted-foreground underline-offset-4 group-open:hidden hover:underline">Why</span>
            </summary>
            <dl className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 text-[12.5px]">
              <dt className="text-muted-foreground">Verification checks · 35%</dt><dd className="tabular-nums">{Math.round(p.credibility.breakdown.verificationAvg)}</dd>
              <dt className="text-muted-foreground">Invoice details complete · 30%</dt><dd className="tabular-nums">{Math.round(p.credibility.breakdown.dataCompleteness)}</dd>
              <dt className="text-muted-foreground">Green purchases · 20%</dt><dd className="tabular-nums">{Math.round(p.credibility.breakdown.greenRatio)}</dd>
              <dt className="text-muted-foreground">Verified invoice history · 15%</dt><dd className="tabular-nums">{Math.round(p.credibility.breakdown.historyDepth)}</dd>
            </dl>
          </details>
        ) : p.credibilityLoading ? <div className="h-[30px] w-16 animate-pulse rounded bg-muted motion-reduce:animate-none" /> : <Big value="–" />}
      </Tile>

      <Tile
        label="Months covered"
        foot={p.invoices > 0
          ? <span>{shortDate(p.periodStart)} to {shortDate(p.periodEnd)}</span>
          : <span>No verified invoices yet</span>}
      >
        <Big value={p.monthsCovered.toLocaleString('en-IN')} unit={`${p.monthsCovered === 1 ? 'month' : 'months'} · ${p.invoices.toLocaleString('en-IN')} ${p.invoices === 1 ? 'invoice' : 'invoices'}`} />
      </Tile>
    </div>
  );
}
