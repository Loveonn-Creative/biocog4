import { Link } from 'react-router-dom';
import type { Document } from '@/hooks/useDocuments';
import { money, shortDate } from '@/lib/dashboardView';

// The latest uploads, newest first; the full list and each calculation are in History.

export function RecentDocuments({ documents, loading }: { documents: Document[]; loading?: boolean }) {
  return (
    <section aria-labelledby="recent-title" className="min-w-0 rounded-xl border border-border bg-card p-4 md:p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="recent-title" className="text-[15px] font-semibold">Latest uploads</h2>
        <Link to="/history" className="text-[12.5px] font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">History</Link>
      </div>
      {loading && documents.length === 0 ? (
        <div className="mt-3 space-y-2" aria-label="Loading uploads">
          {[0, 1, 2].map((i) => <div key={i} className="h-9 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />)}
        </div>
      ) : documents.length === 0 ? (
        <p className="mt-3 text-[13.5px] text-muted-foreground">No uploads yet.</p>
      ) : (
        <ul className="mt-2 divide-y divide-border">
          {documents.map((d) => (
            <li key={d.id} className="flex items-baseline justify-between gap-3 py-2.5">
              <span className="min-w-0">
                <span className="block truncate text-[13.5px] font-medium">{d.vendor || 'Unnamed supplier'}</span>
                <span className="block text-[12px] text-muted-foreground">{shortDate(d.invoice_date) || `Uploaded ${shortDate(d.created_at)}`}</span>
              </span>
              <span className="shrink-0 text-[13.5px] tabular-nums">{money(d.amount, d.currency)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
