import { Link } from 'react-router-dom';
import type { Document } from '@/hooks/useDocuments';

interface RecentDocumentsProps {
  documents: Document[];
  /** Emission rows, to say what happened to each document. */
  emissions?: Array<{ document_id: string | null; verified: boolean }>;
}

const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const formatAmount = (amount: number | null) => {
  if (!amount) return '-';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
};

// One word per document, so a problem shows without opening History.
const STATUS = {
  verified: { label: 'Verified', tone: 'text-success' },
  pending: { label: 'To verify', tone: 'text-warning' },
  missing: { label: 'Needs data', tone: 'text-muted-foreground' },
} as const;

export function RecentDocuments({ documents, emissions = [] }: RecentDocumentsProps) {
  const statusOf = (id: string) => {
    const rows = emissions.filter((e) => e.document_id === id);
    if (!rows.length) return STATUS.missing;
    return rows.every((e) => e.verified) ? STATUS.verified : STATUS.pending;
  };
  return (
    <section aria-labelledby="recent-title" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="recent-title" className="text-lg font-semibold">Recent documents</h2>
        <Link to="/history" className="text-sm font-medium text-primary hover:underline">View all</Link>
      </div>
      {documents.length > 0 ? (
        <ul className="divide-y divide-border border-y border-border">
          {documents.map((doc) => {
            const st = statusOf(doc.id);
            return (
              <li key={doc.id} className="flex items-center gap-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{doc.vendor || doc.document_type || 'Document'}</span>
                  <span className="block text-xs text-muted-foreground sm:hidden">{formatDate(doc.created_at)} · <span className={st.tone}>{st.label}</span></span>
                </span>
                <span className="hidden w-20 text-sm text-muted-foreground sm:block">{formatDate(doc.created_at)}</span>
                <span className={`hidden w-24 text-sm font-medium sm:block ${st.tone}`}>{st.label}</span>
                <span className="shrink-0 text-right text-sm tabular-nums">{formatAmount(doc.amount)}</span>
              </li>
            );
          })}
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
