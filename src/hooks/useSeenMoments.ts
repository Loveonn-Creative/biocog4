import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/hooks/useSession';
import { accountKey, ACCOUNT_STALE_MS } from '@/lib/queryClient';

// Proof moments already shown, kept on the account (profiles.trust_layer_prefs.moments_seen)
// so a moment never repeats on another device. Shares the prefs query with the
// Finance insights switch. Kill switch: VITE_PROOF_MOMENTS=off.

export const PROOF_MOMENTS_OFF = import.meta.env.VITE_PROOF_MOMENTS === 'off';
type Prefs = Record<string, unknown>;

export function useSeenMoments() {
  const { user } = useSession();
  const qc = useQueryClient();
  const key = accountKey(user?.id, 'trust_layer_prefs');
  const prefs = useQuery({
    queryKey: key,
    enabled: !!user?.id,
    staleTime: ACCOUNT_STALE_MS,
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('trust_layer_prefs').eq('id', user!.id).single();
      if (error) throw error;
      return ((data?.trust_layer_prefs as Prefs | null) ?? {}) as Prefs;
    },
  });
  const seen = Array.isArray(prefs.data?.moments_seen) ? (prefs.data!.moments_seen as string[]) : [];
  const markSeen = useCallback(async (id: string) => {
    if (!user?.id) return;
    const before = qc.getQueryData<Prefs>(key) ?? {};
    const list = Array.isArray(before.moments_seen) ? (before.moments_seen as string[]) : [];
    qc.setQueryData(key, { ...before, moments_seen: [...new Set([...list, id])] });
    try {
      // Read-modify-write so the other switches stored there are kept.
      const { data, error } = await supabase.from('profiles').select('trust_layer_prefs').eq('id', user.id).single();
      if (error) throw error;
      const cur = ((data?.trust_layer_prefs as Prefs | null) ?? {}) as Prefs;
      const curList = Array.isArray(cur.moments_seen) ? (cur.moments_seen as string[]) : [];
      const next = { ...cur, moments_seen: [...new Set([...curList, id])] };
      const { error: upd } = await supabase.from('profiles').update({ trust_layer_prefs: next as never }).eq('id', user.id);
      if (upd) throw upd;
      qc.setQueryData(key, next);
    } catch {
      // Keep it hidden for this visit even if saving failed; it may show once more later.
    }
  }, [user?.id, qc, key]);
  // Until prefs load, report not ready so nothing flashes and then disappears.
  return { seen, ready: !prefs.isPending && !prefs.isError, markSeen };
}
