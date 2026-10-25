import { useQuery } from '@tanstack/react-query';
import { untypedRpc } from '@/hooks/useOrganization';
import { useSession } from '@/hooks/useSession';
import { accountKey, ACCOUNT_STALE_MS } from '@/lib/queryClient';

export interface BuyerRequest { request_id: string; company_name: string; buys: string | null; period_start: string; period_end: string; status: string }

/**
 * Requests from enterprise buyers addressed to this account (by email or
 * GSTIN). Empty for everyone else, and before the enterprise migration exists.
 */
export function useBuyerRequests() {
  const { user } = useSession();
  const q = useQuery({
    queryKey: accountKey(user?.id, 'buyer_requests'),
    enabled: !!user?.id,
    staleTime: ACCOUNT_STALE_MS,
    queryFn: async () => {
      const { data, error } = await untypedRpc('my_supplier_requests');
      return error ? [] : ((data ?? []) as BuyerRequest[]);
    },
  });
  const rows = q.data ?? [];
  return { rows, buyer: rows[0]?.company_name ?? null };
}
