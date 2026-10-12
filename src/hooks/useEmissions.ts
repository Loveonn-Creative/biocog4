import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from './useSession';
import { useWorkspace } from './useWorkspace';
import { applyScope, ownerColumns, realtimeFilter, scopeKey } from '@/lib/workspaceScope';

import { useRecordsChanged } from '@/lib/recordsEvents';
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

export function useEmissions() {
  const { user, isLoading: sessionLoading } = useSession();
  const { scope, ready } = useWorkspace();
  const key = scopeKey(scope);
  const [emissions, setEmissions] = useState<Emission[]>([]);
  const [summary, setSummary] = useState<EmissionsSummary>({
    scope1: 0,
    scope2: 0,
    scope3: 0,
    total: 0,
    byCategory: {},
    monthlyTrend: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmissions = useCallback(async () => {
    if (!ready) return;

    try {
      setIsLoading(true);
      setError(null);

      const query = applyScope(
        supabase.from('emissions').select('*, documents(invoice_date)').order('created_at', { ascending: false }),
        scope,
      );
      if (!query) {
        setEmissions([]);
        setIsLoading(false);
        return;
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error('Error fetching emissions:', fetchError);
        setError('Failed to load emissions');
      } else {
        // Periods follow the invoice date (upload date when there is none).
        const emissionsData = ((data || []) as Array<Emission & { documents?: { invoice_date: string | null } | null }>)
          .map(({ documents, ...e }) => ({ ...e, activity_date: activityDate(documents?.invoice_date, e.created_at) }) as Emission);
        setEmissions(emissionsData);
        // Signed-in reporting uses only verified rows; retain the guest view.
        calculateSummary(user ? emissionsData.filter(e => e.verified === true) : emissionsData);
      }
    } catch (err) {
      console.error('Emissions fetch error:', err);
      setError('An error occurred');
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- key captures scope
  }, [key, ready, user]);

  const calculateSummary = (rows: Emission[]) => {
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

    setSummary({
      scope1,
      scope2,
      scope3,
      total: scope1 + scope2 + scope3,
      byCategory,
      monthlyTrend
    });
  };

  useEffect(() => {
    fetchEmissions();
  }, [fetchEmissions]);

  // Real-time subscription for emissions updates (filtered by user/session)
  useEffect(() => {
    if (!ready) return;
    const filter = realtimeFilter(scope);
    if (!filter) return;

    const channel = supabase
      .channel('emissions-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'emissions',
          filter,
        },
        (payload) => {
          console.log('Emissions update received:', payload.eventType);
          fetchEmissions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- key captures scope
  }, [key, ready, fetchEmissions]);

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
      setEmissions(prev => [newEmission, ...prev]);
      return newEmission;
    } catch (err) {
      console.error('Save emission error:', err);
      return null;
    }
  };

  const getUnverifiedEmissions = () => emissions.filter(e => !e.verified);
  const getVerifiedEmissions = () => emissions.filter(e => e.verified);

  // Refetch when records change anywhere (verify, delete, upload).
  useRecordsChanged(() => { void fetchEmissions(); });

  return {
    emissions,
    summary,
    isLoading: isLoading || sessionLoading || !ready,
    error,
    refetch: fetchEmissions,
    saveEmission,
    getUnverifiedEmissions,
    getVerifiedEmissions
  };
}
