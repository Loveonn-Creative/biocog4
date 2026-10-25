import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Building2 } from 'lucide-react';
import { useBuyerRequests } from '@/hooks/useBuyerRequests';
import { useSession } from '@/hooks/useSession';
import { loadSupabase } from '@/integrations/supabase/lazyClient';

/**
 * Requests from buyers on the enterprise pilot, matched to this account by
 * email or GSTIN. Renders nothing when there are none, or before the pilot
 * migration exists, so MSME dashboards look exactly as before.
 */
export function BuyerRequestsCard() {
  const { user } = useSession();
  const { rows: all, buyer } = useBuyerRequests();
  const rows = all.filter((r) => r.status !== 'shared');
  // Once the buyer's included reads are used up, it covers more; say so once,
  // so the supplier knows they can also top up themselves.
  const covered = useQuery({
    queryKey: ['buyer-covered-reads', user?.id],
    enabled: !!user?.id && !!buyer,
    queryFn: async () => {
      const supabase = await loadSupabase();
      const db = supabase as unknown as { from: (t: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any
      const { data } = await db.from('invoice_credit_packs').select('id').eq('user_id', user!.id).like('razorpay_order_id', 'enterprise-extra:%').limit(1);
      return (data ?? []).length > 0;
    },
  });
  if (rows.length === 0 && !covered.data) return null;
  return (
    <section className="mb-4 rounded-xl border border-primary/30 bg-primary/5 p-4" aria-label="Requests from buyers">
      <ul className="space-y-2">
        {rows.slice(0, 3).map((r) => (
          <li key={r.request_id} className="flex flex-wrap items-center gap-3 text-sm">
            <Building2 className="h-4 w-4 text-primary shrink-0" />
            <span className="flex-1 min-w-0"><strong>{r.company_name}</strong> wants your {r.period_start.slice(0, 4)}-{r.period_end.slice(2, 4)} emissions{r.buys ? ` for ${r.buys.toLowerCase()}` : ''}.</span>
            <Link to={`/supplier-share/${r.request_id}`} className="inline-flex items-center gap-1 font-medium text-primary">Review and share<ArrowRight className="h-3.5 w-3.5" /></Link>
          </li>
        ))}
      </ul>
      {covered.data && buyer && (
        <p className="mt-2 text-xs text-muted-foreground">You have used the bill reads {buyer} included. They are covering more for now; you can also <Link to="/subscription" className="underline underline-offset-2">top up yourself</Link>.</p>
      )}
    </section>
  );
}
