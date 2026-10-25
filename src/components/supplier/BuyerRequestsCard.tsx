import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Building2 } from 'lucide-react';
import { untypedRpc } from '@/hooks/useOrganization';
import { useSession } from '@/hooks/useSession';
import { accountKey, ACCOUNT_STALE_MS } from '@/lib/queryClient';

interface Row { request_id: string; company_name: string; buys: string | null; period_start: string; period_end: string; status: string }

/**
 * Requests from buyers on the enterprise pilot, matched to this account by
 * email or GSTIN. Renders nothing when there are none, or before the pilot
 * migration exists, so MSME dashboards look exactly as before.
 */
export function BuyerRequestsCard() {
  const { user } = useSession();
  const q = useQuery({
    queryKey: accountKey(user?.id, 'buyer_requests'),
    enabled: !!user?.id,
    staleTime: ACCOUNT_STALE_MS,
    queryFn: async () => {
      const { data, error } = await untypedRpc('my_supplier_requests');
      if (error) return [] as Row[];
      return ((data ?? []) as Row[]).filter((r) => r.status !== 'shared');
    },
  });
  const rows = q.data ?? [];
  if (rows.length === 0) return null;
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
    </section>
  );
}
