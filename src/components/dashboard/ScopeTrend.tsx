import { useMemo, useState } from 'react';
import type { ScopeTotals, SeriesPoint } from '@/lib/dashboardAnalytics';
import { axisCo2, co2Text, formatCo2, niceMax, SCOPES, type ScopeId } from '@/lib/dashboardView';

// Monthly verified emissions stacked by scope, with a readout instead of a
// floating tooltip (works the same on touch and keyboard, never overflows a
// phone screen). The scope list beside it is the legend and the filter.

interface Props {
  series: SeriesPoint[];
  totals: ScopeTotals;
  shown: Set<ScopeId>;
  onToggleScope: (s: ScopeId) => void;
  filterLabel?: string | null;
  onClearFilter?: () => void;
}

const key = (s: ScopeId) => `scope${s}` as const;

export function ScopeTrend({ series, totals, shown, onToggleScope, filterLabel, onClearFilter }: Props) {
  const visible = SCOPES.filter((s) => shown.has(s.id));
  const monthTotal = (p: SeriesPoint) => visible.reduce((t, s) => t + p[key(s.id)], 0);
  const max = niceMax(Math.max(0, ...series.map(monthTotal)));
  const lastWithData = useMemo(() => {
    for (let i = series.length - 1; i >= 0; i--) if (SCOPES.some((s) => series[i][key(s.id)] > 0)) return i;
    return series.length - 1;
  }, [series]);
  const [active, setActive] = useState<number | null>(null);
  const idx = active ?? lastWithData;
  const point = series[idx];
  // Phones label every third month; wider screens every month (every other past a year).
  const every = series.length > 12 ? 2 : 1;
  const shownTotal = visible.reduce((t, s) => t + totals[key(s.id)], 0);

  return (
    <section aria-labelledby="trend-title" className="grid gap-4 rounded-xl border border-border bg-card p-4 md:p-5 lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-6">
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="trend-title" className="text-[15px] font-semibold">Monthly emissions</h2>
          {filterLabel && (
            <button type="button" onClick={onClearFilter} className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-0.5 text-[12px] hover:bg-secondary">
              {filterLabel}<span aria-hidden="true" className="text-muted-foreground">×</span><span className="sr-only">Clear filter</span>
            </button>
          )}
        </div>

        {/* Readout for the month in focus (latest month with data by default). */}
        <div className="mt-2 min-h-[2.75rem]" aria-live="polite">
          {point && (
            <>
              <p className="text-[13px] text-muted-foreground">{point.month}</p>
              <p className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-[13px]">
                <span className="text-[15px] font-semibold tabular-nums text-foreground">{co2Text(monthTotal(point))}</span>
                {visible.map((s) => point[key(s.id)] > 0 && (
                  <span key={s.id} className="inline-flex items-center gap-1 tabular-nums text-muted-foreground">
                    <span aria-hidden="true" className="h-2 w-2 rounded-[2px]" style={{ background: s.color }} />{s.label} {co2Text(point[key(s.id)])}
                  </span>
                ))}
              </p>
            </>
          )}
        </div>

        {max > 0 ? (
          <div className="mt-3 grid grid-cols-[2.75rem_minmax(0,1fr)] gap-2">
            <div className="relative h-44 text-right text-[11px] tabular-nums text-muted-foreground" aria-hidden="true">
              <span className="absolute right-0 top-0 -translate-y-1/2">{axisCo2(max)}</span>
              <span className="absolute right-0 top-1/2 -translate-y-1/2">{axisCo2(max / 2)}</span>
              <span className="absolute bottom-0 right-0 translate-y-1/2">0</span>
            </div>
            <div className="min-w-0">
              <div className="relative h-44" onMouseLeave={() => setActive(null)}>
                <div aria-hidden="true" className="absolute inset-0 flex flex-col justify-between">
                  <span className="border-t border-dashed border-border" /><span className="border-t border-dashed border-border" /><span className="border-t border-border" />
                </div>
                <ol className="relative flex h-full items-end gap-[3px] sm:gap-1.5">
                  {series.map((p, i) => {
                    const t = monthTotal(p);
                    return (
                      <li key={p.month} className="flex h-full min-w-0 flex-1 items-end">
                        <button
                          type="button"
                          onMouseEnter={() => setActive(i)}
                          onFocus={() => setActive(i)}
                          onBlur={() => setActive(null)}
                          onClick={() => setActive(i)}
                          aria-label={`${p.month}: ${co2Text(t)}`}
                          className={`group flex h-full w-full flex-col justify-end rounded-t-[4px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring ${i === idx ? 'bg-secondary' : 'hover:bg-secondary/60'}`}
                        >
                          <span className="flex w-full origin-bottom flex-col-reverse gap-[2px] transition-transform duration-500 motion-reduce:transition-none" style={{ height: `${(t / max) * 100}%` }}>
                            {visible.map((s) => {
                              const v = p[key(s.id)];
                              return v > 0 ? <span key={s.id} className="block w-full first:rounded-b-none last:rounded-t-[3px]" style={{ flexGrow: v, background: s.color }} /> : null;
                            })}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </div>
              <ol aria-hidden="true" className="mt-1.5 flex gap-[3px] text-[11px] text-muted-foreground sm:gap-1.5">
                {series.map((p, i) => (
                  <li key={p.month} className={`min-w-0 flex-1 whitespace-nowrap text-center ${i === idx ? 'font-medium text-foreground' : ''} ${i === idx ? '' : `${i % 3 === 0 ? '' : 'invisible'} ${i % every === 0 ? 'sm:visible' : 'sm:invisible'}`}`}>{p.month.split(' ')[0]}</li>
                ))}
              </ol>
            </div>
          </div>
        ) : (
          <p className="mt-3 rounded-lg border border-dashed border-border px-4 py-8 text-center text-[13.5px] text-muted-foreground">No verified emissions in this period.</p>
        )}

        <table className="sr-only">
          <caption>Monthly verified emissions by scope, kg CO₂e</caption>
          <thead><tr><th>Month</th>{SCOPES.map((s) => <th key={s.id}>{s.label}</th>)}</tr></thead>
          <tbody>{series.map((p) => <tr key={p.month}><td>{p.month}</td>{SCOPES.map((s) => <td key={s.id}>{Math.round(p[key(s.id)])}</td>)}</tr>)}</tbody>
        </table>
      </div>

      {/* Scope split for the period: legend, share and filter in one. */}
      <div className="min-w-0 border-t border-border pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
        <p className="text-[12px] font-medium uppercase tracking-[0.06em] text-muted-foreground">By scope</p>
        <ul className="mt-3 space-y-1">
          {SCOPES.map((s) => {
            const v = totals[key(s.id)];
            const on = shown.has(s.id);
            const share = shownTotal > 0 && on ? Math.round((v / shownTotal) * 100) : null;
            const f = formatCo2(v);
            return (
              <li key={s.id}>
                <button type="button" aria-pressed={on} onClick={() => onToggleScope(s.id)}
                  className={`w-full rounded-lg px-2 py-2 text-left transition-colors hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${on ? '' : 'opacity-45'}`}>
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="inline-flex min-w-0 items-center gap-2 text-[13.5px] font-medium">
                      <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: s.color }} />{s.label}
                    </span>
                    <span className="shrink-0 text-[13.5px] tabular-nums">{f.value} <span className="text-[11.5px] text-muted-foreground">{f.unit.split(' ')[0]}</span></span>
                  </span>
                  <span className="mt-0.5 flex items-baseline justify-between gap-2 pl-[1.125rem] text-[12px] text-muted-foreground">
                    <span className="truncate">{s.plain}</span>
                    <span className="shrink-0 tabular-nums">{share === null ? (on ? '' : 'Hidden') : `${share}%`}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
