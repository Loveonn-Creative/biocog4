import type { CategoryRow } from '@/lib/dashboardAnalytics';

// Where the emissions sit: the filtered view (share and records) beside the
// all-time verified total per category, in one table.

const kg = (v: number) => {
  if (v >= 1000) return `${(v / 1000).toLocaleString('en-IN', { maximumFractionDigits: 2 })} t`;
  return `${Math.round(v).toLocaleString('en-IN')} kg`;
};

export function CategoryTable({ inView, allTime }: { inView: CategoryRow[]; allTime: Record<string, number> }) {
  const names = [...new Set([...inView.map((c) => c.category), ...Object.keys(allTime)])]
    .sort((a, b) => (allTime[b] ?? 0) - (allTime[a] ?? 0) || (inView.find((c) => c.category === b)?.co2Kg ?? 0) - (inView.find((c) => c.category === a)?.co2Kg ?? 0));
  return (
    <section aria-labelledby="sit-title" className="min-w-0 rounded-2xl border border-border bg-card p-5">
      <h3 id="sit-title" className="text-[15px] font-semibold">Where the emissions sit</h3>
      {names.length === 0 ? (
        <p className="mt-3 text-[13px] text-muted-foreground">No categories to rank under the current filters.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-[13.5px] tabular-nums">
            <thead>
              <tr className="text-right text-xs text-muted-foreground">
                <th className="py-1 text-left font-medium">Category</th>
                <th className="py-1 font-medium">In view</th>
                <th className="py-1 font-medium">All time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-right">
              {names.map((n) => {
                const v = inView.find((c) => c.category === n);
                return (
                  <tr key={n}>
                    <td className="py-2 pr-3 text-left capitalize">{n.replace(/_/g, ' ')}</td>
                    <td className="py-2 pl-3">{v ? <>{kg(v.co2Kg)} <span className="text-muted-foreground">· {v.sharePct.toFixed(1)}% · {v.recordCount} {v.recordCount === 1 ? 'record' : 'records'}</span></> : <span className="text-muted-foreground">–</span>}</td>
                    <td className="py-2 pl-3">{n in allTime ? kg(allTime[n]) : <span className="text-muted-foreground">–</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
