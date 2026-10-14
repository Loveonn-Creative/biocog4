import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/hooks/useSession';
import { RECORDS_KEY, RECORDS_STALE_MS } from '@/lib/queryClient';
import { EMPTY_SCOPE2, summariseScope2, type Scope2Summary } from '@/lib/scope2Summary';

// Scope 2 engine results (pending migration 20261021100000). Until it is
// applied the tables do not exist and the summary reports enabled: false, so
// nothing is shown. Rows are the signed-in owner's only (RLS).
const MISSING = new Set(['42P01', 'PGRST205', 'PGRST202', '42703']);

export const SCOPE2_KEY = 'scope2';

export function useScope2Summary() {
  const { user } = useSession();
  return useQuery({
    queryKey: [RECORDS_KEY, SCOPE2_KEY, user?.id ?? null],
    enabled: !!user?.id,
    staleTime: RECORDS_STALE_MS,
    queryFn: async (): Promise<Scope2Summary> => {
      const from = (t: string) => supabase.from(t as never);
      // One probe first: before the migration this is the only request made.
      const totals = await from('scope2_totals').select('reporting_year, method, kwh, kg, unresolved_kwh, instrument_kwh');
      if (totals.error && MISSING.has((totals.error as { code?: string }).code ?? '')) return EMPTY_SCOPE2;
      const [calcs, acts, ins, alloc] = await Promise.all([
        from('electricity_calculations').select('reporting_year, method, warnings').eq('is_current', true),
        from('electricity_activities').select('status, reasons'),
        from('electricity_instruments').select('id, type, scheme, certificate_ref, mwh, generation_country, vintage_start, vintage_end, kg_per_kwh, retired, beneficiary_confirmed, evidence_document_id'),
        from('electricity_allocations').select('instrument_id, kwh').eq('is_current', true),
      ]);
      const err = (totals.error ?? calcs.error ?? acts.error ?? ins.error ?? alloc.error) as { code?: string } | null;
      if (err && MISSING.has(err.code ?? '')) return EMPTY_SCOPE2;
      if (err) throw err;
      return summariseScope2({
        totals: (totals.data ?? []) as Record<string, unknown>[], calculations: (calcs.data ?? []) as Record<string, unknown>[],
        activities: (acts.data ?? []) as Record<string, unknown>[], instruments: (ins.data ?? []) as Record<string, unknown>[],
        allocations: (alloc.data ?? []) as Record<string, unknown>[],
      });
    },
  });
}
