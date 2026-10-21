import { useState } from 'react';
import type { CategoryRow } from '@/lib/dashboardAnalytics';
import { categoryLabel, co2Text } from '@/lib/dashboardView';

// Where the period's emissions come from, largest first. Selecting a row
// narrows the chart and figures above to that category.

const FIRST = 5;

export function CategoryBreakdown({ rows, selected, onSelect }: { rows: CategoryRow[]; selected: string; onSelect: (c: string) => void }) {
  const [all, setAll] = useState(false);
  if (rows.length === 0) return null;
  const max = rows[0].co2Kg || 1;
  const list = all ? rows : rows.slice(0, FIRST);
  return (
    <section aria-labelledby="cat-title" className="min-w-0 rounded-xl border border-border bg-card p-4 md:p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="cat-title" className="text-[15px] font-semibold">Where it comes from</h2>
        <span className="text-[12px] text-muted-foreground">Select to filter</span>
      </div>
      <ul className="mt-3 space-y-0.5">
        {list.map((r) => {
          const on = selected === r.category;
          return (
            <li key={r.category}>
              <button type="button" aria-pressed={on} onClick={() => onSelect(on ? 'all' : r.category)}
                className={`w-full rounded-lg px-2 py-2 text-left transition-colors hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${on ? 'bg-secondary' : ''}`}>
                <span className="flex items-baseline justify-between gap-3 text-[13.5px]">
                  <span className="min-w-0 truncate font-medium">{categoryLabel(r.category)}</span>
                  <span className="shrink-0 tabular-nums">{co2Text(r.co2Kg)}</span>
                </span>
                <span className="mt-1.5 flex items-center gap-3">
                  <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                    <span className="block h-full rounded-full bg-primary/70" style={{ width: `${Math.max(2, (r.co2Kg / max) * 100)}%` }} />
                  </span>
                  <span className="w-[6.5rem] shrink-0 text-right text-[12px] tabular-nums text-muted-foreground">
                    {Math.round(r.sharePct)}% · {r.recordCount.toLocaleString('en-IN')} {r.recordCount === 1 ? 'record' : 'records'}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {rows.length > FIRST && (
        <button type="button" onClick={() => setAll((v) => !v)} className="mt-2 px-2 text-[12.5px] font-medium text-muted-foreground hover:text-foreground">
          {all ? 'Show fewer' : `Show all ${rows.length}`}
        </button>
      )}
    </section>
  );
}
