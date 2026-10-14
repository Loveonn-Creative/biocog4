import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { loadSupabase } from '@/integrations/supabase/lazyClient';

/**
 * Entry to the green loan application. Rendered only once the application
 * backend is live (pending migration 20261023100000 applied), so the page
 * never links to a flow that cannot take submissions.
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
  if (!enabled) return null;
  return (
    <Link to="/green-loan" className={`inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 ${className}`}>
      Prepare a green loan application <ArrowRight className="h-4 w-4" />
    </Link>
  );
}
