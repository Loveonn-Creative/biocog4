import { Link } from 'react-router-dom';
import { ArrowRight, LayoutDashboard, ShieldCheck, FileText } from 'lucide-react';
import { useEmissions } from '@/hooks/useEmissions';
import { useDocuments } from '@/hooks/useDocuments';
import { verifyListState } from '@/lib/emissionLedger';

/**
 * Signed-in home, below the upload hero: one strip with the next step
 * instead of the marketing story. Reads stored records only.
 */
export function SignedInNextStep() {
  const { emissions, isLoading: emissionsLoading } = useEmissions();
  const { documents, isLoading: docsLoading } = useDocuments();
  const { pending } = verifyListState(emissions);
  const latest = documents[0];
  const loading = emissionsLoading || docsLoading;

  const card = 'group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

  return (
    <section aria-label="Your next step" className="relative z-10 w-full border-t border-border bg-background px-4 py-8">
      <div className="mx-auto grid max-w-4xl gap-3 sm:grid-cols-3">
        <Link to="/verify" className={card}>
          <ShieldCheck className={`h-5 w-5 shrink-0 ${pending.length > 0 ? 'text-warning' : 'text-primary'}`} />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-foreground">
              {loading ? 'Verification' : pending.length > 0 ? `${pending.length} ${pending.length === 1 ? 'record' : 'records'} to verify` : 'All records verified'}
            </span>
            <span className="block text-xs text-muted-foreground">{pending.length > 0 ? 'Verify to use them in reports and finance' : 'Open Verify'}</span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </Link>

        <Link to="/history" className={card}>
          <FileText className="h-5 w-5 shrink-0 text-primary" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-foreground">
              {loading ? 'Latest invoice' : latest ? (latest.vendor || latest.document_type || 'Latest invoice') : 'No invoices yet'}
            </span>
            <span className="block text-xs text-muted-foreground">
              {latest ? `Added ${new Date(latest.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · History` : 'Upload one above'}
            </span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </Link>

        <Link to="/dashboard" className={`${card} bg-primary text-primary-foreground hover:bg-primary/90 hover:border-primary`}>
          <LayoutDashboard className="h-5 w-5 shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Open dashboard</span>
            <span className="block text-xs opacity-80">Totals, reports and finance</span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </section>
  );
}

export default SignedInNextStep;
