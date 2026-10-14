import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { loadSupabase } from '@/integrations/supabase/lazyClient';

/**
 * Entries to green financing: the 2-minute guest check (always available)
 * and the application, linked only once its backend is live (pending
 * migration 20261023100000 applied), so the page never links to a flow that
 * cannot take submissions.
 */
export function GreenLoanEntry({ className = '' }: { className?: string }) {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void loadSupabase()
      .then((s) => s.functions.invoke('finance-application', { body: { action: 'probe' } }))
      .then(({ data }) => { if (!cancelled) setEnabled(data?.enabled === true); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {enabled && (
        <Link to="/green-loan" className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Prepare a green loan application <ArrowRight className="h-4 w-4" />
        </Link>
      )}
      <Link to="/green-loan-check" className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium hover:bg-muted">
        2-minute green loan check
      </Link>
    </div>
  );
}
