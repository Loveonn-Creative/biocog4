import { TrendingDown, TrendingUp, Minus, AlertTriangle } from 'lucide-react';
import {
  type PeriodDelta,
  type EvidenceCompleteness,
  type ScopeTotals,
  TIME_RANGE_LABELS,
  type TimeRange,
} from '@/lib/dashboardAnalytics';

// The three readings over the filtered records: movement against the
// equivalent earlier period, the scope mix, and how complete the evidence is.
// Where the emissions sit is in the category table beside the trend.

interface Props {
  range: TimeRange;
  totals: ScopeTotals;
  delta: PeriodDelta;
  completeness: EvidenceCompleteness;
}

const kg = (v: number) => `${Math.round(v).toLocaleString('en-IN')} kg`;
const pct = (v: number) => `${v.toFixed(1)}%`;
const SCOPE_COLOR = ['var(--scope-1, #1a7f55)', 'var(--scope-2, #2a78d6)', 'var(--scope-3, #c97a00)'];

export const DashboardIntelligence = ({ range, totals, delta, completeness }: Props) => {
  const rising = delta.changePct !== null && delta.changePct > 0;
  const flat = delta.changePct !== null && Math.abs(delta.changePct) < 0.5;

  return (
    <div className="grid overflow-hidden rounded-2xl border border-border bg-card md:grid-cols-3">
      <div className="flex min-w-0 flex-col gap-2 border-b border-border p-5 md:border-b-0 md:border-r">
        <p className="text-[13px] text-muted-foreground">Movement vs previous period</p>
        {delta.comparable && delta.changePct !== null ? (
          <>
            <p className="flex items-center gap-2 text-3xl font-semibold tabular-nums">
              {flat ? <Minus className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                : rising ? <TrendingUp className="h-5 w-5 text-warning" aria-hidden="true" />
                : <TrendingDown className="h-5 w-5 text-success" aria-hidden="true" />}
              {delta.changePct > 0 ? '+' : ''}{delta.changePct.toFixed(1)}%
            </p>
            <p className="text-[13px] text-muted-foreground">
              {kg(delta.currentKg)} in {TIME_RANGE_LABELS[range].toLowerCase()}, against {kg(delta.priorKg)} in the equivalent period before it.
            </p>
          </>
        ) : (
          <>
            <p className="text-2xl font-semibold text-muted-foreground">Not comparable</p>
            <p className="text-[13px] text-muted-foreground">No records exist in the equivalent prior period, so a change cannot be stated. Current period: {kg(delta.currentKg)}.</p>
          </>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-2.5 border-b border-border p-5 md:border-b-0 md:border-r">
        <p className="text-[13px] text-muted-foreground">Scope mix in view</p>
        {totals.total > 0 ? (
          ([['Scope 1', totals.scope1], ['Scope 2', totals.scope2], ['Scope 3', totals.scope3]] as const).map(([label, value], i) => (
            <div key={label}>
              <div className="mb-1 flex justify-between gap-2 text-[13px]">
                <span>{label}</span>
                <span className="tabular-nums text-muted-foreground">{kg(value)} · {pct((value / totals.total) * 100)}</span>
              </div>
              <span className="block h-1.5 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full" style={{ width: `${(value / totals.total) * 100}%`, background: SCOPE_COLOR[i] }} /></span>
            </div>
          ))
        ) : (
          <p className="text-[13px] text-muted-foreground">No records match the current filters.</p>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-2 p-5">
        <p className="text-[13px] text-muted-foreground">Evidence completeness</p>
        <p className="flex items-baseline gap-2"><span className="text-3xl font-semibold tabular-nums">{pct(completeness.verifiedPct)}</span><span className="text-[13px] text-muted-foreground">verified</span></p>
        <p className="text-[13px] text-muted-foreground">{completeness.verifiedRecords} of {completeness.totalRecords} records in view carry a completed verification.</p>
        {(completeness.withoutActivityData > 0 || completeness.withoutFactor > 0) && (
          <p className="flex items-start gap-1.5 text-[13px] text-warning">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              {completeness.withoutActivityData > 0 && `${completeness.withoutActivityData} without an activity quantity. `}
              {completeness.withoutFactor > 0 && `${completeness.withoutFactor} without a recorded factor.`}
            </span>
          </p>
        )}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {[1, 2, 3].map((s) => (
            <span key={s} className={`rounded-full border px-2 py-0.5 text-[11.5px] ${completeness.scopesPresent.includes(s) ? 'border-border bg-secondary' : 'border-border text-muted-foreground'}`}>
              Scope {s} {completeness.scopesPresent.includes(s) ? 'present' : 'absent'}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
