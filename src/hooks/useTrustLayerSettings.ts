import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from './useSession';
import { usePremiumStatus } from './usePremiumStatus';

export type TrustFeatureKey =
  | 'proof_graph'
  | 'auto_validation'
  | 'peer_benchmark'
  | 'monetization_preview'
  | 'audit_trail_export'
  | 'dispute_simulation'
  | 'data_connectors'
  | 'greenwashing_explainer';

const TRUST_FEATURES: { key: TrustFeatureKey; label: string; description: string }[] = [
  { key: 'proof_graph', label: 'Proof Graph', description: 'Visual chain showing how your carbon value is derived' },
  { key: 'auto_validation', label: 'Auto-Validation', description: 'Pre-check flags missing docs and greenwashing risk before submission' },
  { key: 'peer_benchmark', label: 'Peer Benchmark', description: 'Compare your emissions against sector averages' },
  { key: 'monetization_preview', label: 'Monetization Preview', description: 'See potential carbon credit value before verification' },
  { key: 'audit_trail_export', label: 'Audit Trail Export', description: 'One-click investor-ready export with proof chain' },
  { key: 'dispute_simulation', label: 'Dispute Simulation', description: 'See what holds and breaks if auditor challenges' },
  { key: 'data_connectors', label: 'Data Connectors', description: 'IoT, ERP, and Tally integration panel' },
  { key: 'greenwashing_explainer', label: 'Greenwashing Explainer', description: 'Detailed breakdown of risk triggers' },
];

const STORAGE_KEY = 'senseible_trust_layer_prefs';

const DEFAULT_PREFS: Record<TrustFeatureKey, boolean> = {
  proof_graph: false,
  auto_validation: false,
  peer_benchmark: false,
  monetization_preview: false,
  audit_trail_export: false,
  dispute_simulation: false,
  data_connectors: false,
  greenwashing_explainer: false,
};

export function useTrustLayerSettings() {
  const { user } = useSession();
  const { isPremium } = usePremiumStatus();
  const [prefs, setPrefs] = useState<Record<TrustFeatureKey, boolean>>(DEFAULT_PREFS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load preferences
  useEffect(() => {
    loadPrefs();
  }, [user?.id]);

  const loadPrefs = async () => {
    if (user?.id) {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('trust_layer_prefs')
          .eq('id', user.id)
          .single();

        if (data?.trust_layer_prefs && typeof data.trust_layer_prefs === 'object') {
          setPrefs({ ...DEFAULT_PREFS, ...(data.trust_layer_prefs as Record<string, boolean>) });
        }
      } catch {
        // Fall back to localStorage
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(stored) });
      }
    } else {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(stored) });
    }
    setIsLoaded(true);
  };

  const savePrefs = useCallback(async (newPrefs: Record<TrustFeatureKey, boolean>) => {
    setPrefs(newPrefs);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs));

    if (user?.id) {
      await supabase
        .from('profiles')
        .update({ trust_layer_prefs: newPrefs as any })
        .eq('id', user.id);
    }
  }, [user?.id]);

  const toggleFeature = useCallback((key: TrustFeatureKey) => {
    const newPrefs = { ...prefs, [key]: !prefs[key] };
    savePrefs(newPrefs);
  }, [prefs, savePrefs]);

  const isEnabled = useCallback((key: TrustFeatureKey): boolean => {
    if (!isPremium) return false;
    return prefs[key] ?? false;
  }, [prefs, isPremium]);

  return {
    prefs,
    isEnabled,
    toggleFeature,
    isPremium,
    isLoaded,
    features: TRUST_FEATURES,
  };
}
