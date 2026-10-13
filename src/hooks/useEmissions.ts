import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from './useSession';
import { useWorkspace } from './useWorkspace';
import { applyScope, ownerColumns, realtimeFilter, scopeKey, type WorkspaceScope } from '@/lib/workspaceScope';
import { RECORDS_KEY, RECORDS_STALE_MS } from '@/lib/queryClient';
import { useRealtimeRefresh } from '@/lib/sharedRealtime';

import { grossKg, periodDateOf } from '@/lib/emissionLedger';
import { activityDate } from '../../supabase/functions/_shared/invoiceDate';
export interface Emission {
  id: string;
  document_id: string | null;
  session_id: string | null;
  user_id: string | null;
  scope: number;
  category: string;
  activity_data: number | null;
  activity_unit: string | null;
  emission_factor: number | null;
  co2_kg: number;
  data_quality: string | null;
  verified: boolean | null;
  verification_notes: string | null;
  created_at: string;
  /** Date for periods: the invoice's date when valid, else created_at. */
  activity_date?: string;
}

export interface EmissionsSummary {
  scope1: number;
  scope2: number;
  scope3: number;
  total: number;
  byCategory: Record<string, number>;
  monthlyTrend: Array<{ month: string; scope1: number; scope2: number; scope3: number }>;
}

function calculateSummary(rows: Emission[]): EmissionsSummary {
  // Each emission id once, gross kg only (the rule verify-carbon uses).
  const byId = new Map<string, Emission>();
  for (const e of rows) byId.set(e.id, e);
  const emissionsData = [...byId.values()];
  const sumScope = (n: number) => emissionsData.filter(e => e.scope === n).reduce((sum, e) => sum + grossKg(e.co2_kg), 0);
  const scope1 = sumScope(1);
  const scope2 = sumScope(2);
  const scope3 = emissionsData.filter(e => e.scope !== 1 && e.scope !== 2).reduce((sum, e) => sum + grossKg(e.co2_kg), 0);

  const byCategory: Record<string, number> = {};
  emissionsData.forEach(e => {
    byCategory[e.category] = (byCategory[e.category] || 0) + grossKg(e.co2_kg);
  });

  // Calculate monthly trend (last 6 months)
  const monthlyData: Record<string, { scope1: number; scope2: number; scope3: number }> = {};
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    monthlyData[key] = { scope1: 0, scope2: 0, scope3: 0 };
  }

  emissionsData.forEach(e => {
    const date = new Date(periodDateOf(e));
    const key = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    if (monthlyData[key]) {
      if (e.scope === 1) monthlyData[key].scope1 += grossKg(e.co2_kg);
      else if (e.scope === 2) monthlyData[key].scope2 += grossKg(e.co2_kg);
      else monthlyData[key].scope3 += grossKg(e.co2_kg);
    }
  });

  const monthlyTrend = Object.entries(monthlyData).map(([month, data]) => ({
    month,
    ...data
  }));

  return {
    scope1,
    scope2,
    scope3,
    total: scope1 + scope2 + scope3,
    byCategory,
    monthlyTrend
  };
}

/** Reads every emission row in the current workspace; periods follow the invoice date. */
async function fetchEmissionRows(scope: WorkspaceScope): Promise<Emission[]> {
  const query = applyScope(
    supabase.from('emissions').select('*, documents(invoice_date)').order('created_at', { ascending: false }),
    scope,
  );
  if (!query) return [];
  const { data, error } = await query;
  if (error) {
    console.error('Error fetching emissions:', error);
    throw error;
  }
  // Periods follow the invoice date (upload date when there is none).
  return ((data || []) as Array<Emission & { documents?: { invoice_date: string | null } | null }>)
    .map(({ documents, ...e }) => ({ ...e, activity_date: activityDate(documents?.invoice_date, e.created_at) }) as Emission);
}

export const emissionsQueryKey = (key: string) => [RECORDS_KEY, 'emissions', key] as const;

/**
 * Emissions for the current workspace, shared by every component through the
 * query cache: one request per workspace however many components ask, cached
 * rows shown at once on a return visit while a stale copy refreshes in the
 * background, and refreshed when records change (verify, delete, upload) or
 * a realtime event arrives. The cache is cleared on sign-out or user switch.
 */
export function useEmissions() {
  const { user, isLoading: sessionLoading } = useSession();
  const { scope, ready } = useWorkspace();
  const key = scopeKey(scope);
  const queryKey = emissionsQueryKey(key);
  const qc = useQueryClient();

  const query = useQuery({
    queryKey,
    queryFn: () => fetchEmissionRows(scope),
    enabled: ready,
    staleTime: RECORDS_STALE_MS,
  });
  const emissions = useMemo(() => query.data ?? [], [query.data]);
  // Signed-in reporting uses only verified rows; retain the guest view.
  const summary = useMemo(
    () => calculateSummary(user ? emissions.filter(e => e.verified === true) : emissions),
    [emissions, user],
  );

  useRealtimeRefresh('emissions', ready ? realtimeFilter(scope) : null, queryKey, ready);

  const refetchQuery = query.refetch;
  const refetch = useCallback(async () => { await refetchQuery(); }, [refetchQuery]);

  const saveEmission = async (emissionData: { scope: number; category: string; co2_kg: number; document_id?: string; activity_data?: number; activity_unit?: string; emission_factor?: number; data_quality?: string }): Promise<Emission | null> => {
    try {
      const insertData = {
        ...emissionData,
        ...ownerColumns(scope),
      };

      const { data, error: insertError } = await supabase
        .from('emissions')
        .insert(insertData)
        .select()
        .single();

      if (insertError) {
        console.error('Error saving emission:', insertError);
        return null;
      }

      const newEmission = data as Emission;
      qc.setQueryData<Emission[]>(queryKey, prev => [newEmission, ...(prev ?? [])]);
      return newEmission;
    } catch (err) {
      console.error('Save emission error:', err);
      return null;
    }
  };

  const getUnverifiedEmissions = () => emissions.filter(e => !e.verified);
  const getVerifiedEmissions = () => emissions.filter(e => e.verified);

  return {
    emissions,
    summary,
    // Loading only until the first copy exists; background refreshes keep the rows on screen.
    isLoading: query.isPending || sessionLoading || !ready,
    error: query.isError ? 'Failed to load emissions' : null,
    refetch,
    saveEmission,
    getUnverifiedEmissions,
    getVerifiedEmissions
  };
}
