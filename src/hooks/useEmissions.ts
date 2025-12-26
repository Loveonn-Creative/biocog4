import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from './useSession';

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
  const { sessionId, user, isLoading: sessionLoading } = useSession();
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
    if (sessionLoading) return;

    try {
      setIsLoading(true);
      setError(null);

      let query = supabase
        .from('emissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (user) {
        query = query.eq('user_id', user.id);
      } else if (sessionId) {
        query = query.eq('session_id', sessionId);
      } else {
        setEmissions([]);
        setIsLoading(false);
        return;
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error('Error fetching emissions:', fetchError);
        setError('Failed to load emissions');
      } else {
        const emissionsData = (data || []) as Emission[];
        setEmissions(emissionsData);
        calculateSummary(emissionsData);
      }
    } catch (err) {
      console.error('Emissions fetch error:', err);
      setError('An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, user, sessionLoading]);

  const calculateSummary = (emissionsData: Emission[]) => {
    const scope1 = emissionsData.filter(e => e.scope === 1).reduce((sum, e) => sum + e.co2_kg, 0);
    const scope2 = emissionsData.filter(e => e.scope === 2).reduce((sum, e) => sum + e.co2_kg, 0);
    const scope3 = emissionsData.filter(e => e.scope === 3).reduce((sum, e) => sum + e.co2_kg, 0);

    const byCategory: Record<string, number> = {};
    emissionsData.forEach(e => {
      byCategory[e.category] = (byCategory[e.category] || 0) + e.co2_kg;
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
      const date = new Date(e.created_at);
      const key = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      if (monthlyData[key]) {
        if (e.scope === 1) monthlyData[key].scope1 += e.co2_kg;
        else if (e.scope === 2) monthlyData[key].scope2 += e.co2_kg;
        else monthlyData[key].scope3 += e.co2_kg;
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

  const saveEmission = async (emissionData: { scope: number; category: string; co2_kg: number; document_id?: string; activity_data?: number; activity_unit?: string; emission_factor?: number; data_quality?: string }): Promise<Emission | null> => {
    try {
      const insertData = {
        ...emissionData,
        session_id: user ? null : sessionId,
        user_id: user?.id || null
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

  return {
    emissions,
    summary,
    isLoading: isLoading || sessionLoading,
    error,
    refetch: fetchEmissions,
    saveEmission,
    getUnverifiedEmissions,
    getVerifiedEmissions
  };
}
