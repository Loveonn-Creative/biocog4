import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/hooks/useSession';
import { accountKey, ACCOUNT_STALE_MS } from '@/lib/queryClient';

/** The account's enterprise-mode switch, read once and shared across pages. */
export function useEnterpriseMode() {
  const { user } = useSession();
  const qc = useQueryClient();
  const key = accountKey(user?.id, 'enterprise_mode');

  const query = useQuery({
    queryKey: key,
    enabled: !!user?.id,
    staleTime: ACCOUNT_STALE_MS,
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('enterprise_mode').eq('id', user!.id).single();
      if (error) {
        console.error('[Enterprise] Error fetching mode:', error);
        return false;
      }
      return ((data as { enterprise_mode?: boolean } | null)?.enterprise_mode ?? false) as boolean;
    },
  });
  const isEnterprise = !!user?.id && !!query.data;

  const toggleEnterprise = useCallback(async () => {
    if (!user?.id) return;
    const newValue = !isEnterprise;
    qc.setQueryData(key, newValue);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ enterprise_mode: newValue } as never)
        .eq('id', user.id);
      if (error) {
        qc.setQueryData(key, !newValue); // rollback
        console.error('[Enterprise] Toggle error:', error);
      }
    } catch (err) {
      qc.setQueryData(key, !newValue);
      console.error('[Enterprise] Toggle error:', err);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- key follows user id
  }, [user?.id, isEnterprise, qc]);

  return { isEnterprise, toggleEnterprise, isLoading: !!user?.id && query.isPending };
}
