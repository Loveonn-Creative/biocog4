import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { untypedRpc } from '@/hooks/useOrganization';
import { useSession } from '@/hooks/useSession';
import { accountKey, ACCOUNT_STALE_MS } from '@/lib/queryClient';

export interface EnterpriseAccess {
  organizationId: string;
  companyName: string;
  supplierLimit: number;
}

/**
 * Enterprise access granted by Senseible staff (enterprise_access). Not the
 * profile "Enterprise Mode" toggle, which only changes how an MSME's own
 * records are shown. Until the pilot migration is applied the RPC is missing
 * and this returns null, so nothing changes for anyone.
 */
export function useEnterpriseAccess() {
  const { user } = useSession();
  const qc = useQueryClient();
  const key = accountKey(user?.id, 'enterprise_access');

  const query = useQuery({
    queryKey: key,
    enabled: !!user?.id,
    staleTime: ACCOUNT_STALE_MS,
    queryFn: async (): Promise<{ access: EnterpriseAccess | null; claimable: boolean }> => {
      const { data, error } = await untypedRpc('my_enterprise');
      if (error) return { access: null, claimable: false };
      const rows = (data ?? []) as Array<{ organization_id: string | null; company_name: string; supplier_limit: number; claimable: boolean }>;
      const member = rows.find((r) => r.organization_id && !r.claimable);
      if (member) return { access: { organizationId: member.organization_id!, companyName: member.company_name, supplierLimit: member.supplier_limit }, claimable: false };
      return { access: null, claimable: rows.some((r) => r.claimable) };
    },
  });

  // First sign-in with the granted email: create the enterprise organisation once.
  const claimable = !!query.data?.claimable;
  useEffect(() => {
    if (!claimable) return;
    let cancelled = false;
    void untypedRpc('claim_enterprise_access').then(({ error }) => {
      if (!cancelled && !error) void qc.invalidateQueries({ queryKey: key });
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- key follows user id
  }, [claimable]);

  return { access: query.data?.access ?? null, isLoading: !!user?.id && (query.isPending || claimable) };
}
