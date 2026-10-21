import { Link } from 'react-router-dom';
import type { Document } from '@/hooks/useDocuments';

interface RecentDocumentsProps {
  documents: Document[];
}

const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const formatAmount = (amount: number | null) => {
  if (!amount) return '-';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
};

export function RecentDocuments({ documents }: RecentDocumentsProps) {
  return (
    <section aria-labelledby="recent-title" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="recent-title" className="text-lg font-semibold">Recent documents</h2>
        <Link to="/history" className="text-sm font-medium text-primary hover:underline">View all</Link>
      </div>
      {documents.length > 0 ? (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center gap-4 px-5 py-3.5">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{doc.vendor || doc.document_type || 'Document'}</span>
                <span className="block text-[12.5px] text-muted-foreground sm:hidden">{formatDate(doc.created_at)}</span>
              </span>
              <span className="hidden w-24 text-[13px] text-muted-foreground sm:block">{formatDate(doc.created_at)}</span>
              <span className="shrink-0 text-right text-sm tabular-nums">{formatAmount(doc.amount)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-2xl border border-dashed border-border px-5 py-8 text-center">
          <p className="text-sm text-muted-foreground">No documents yet</p>
          <Link to="/" className="mt-2 inline-block text-sm font-medium text-primary hover:underline">Upload your first invoice</Link>
        </div>
      )}
    </section>
  );
}
