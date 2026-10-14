import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/hooks/useSession';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useEnterpriseMode } from '@/hooks/useEnterpriseMode';
import { useWorkspace } from '@/hooks/useWorkspace';
import { accountKey, ACCOUNT_STALE_MS, RECORDS_KEY, RECORDS_STALE_MS } from '@/lib/queryClient';
import { applyScope, scopeKey } from '@/lib/workspaceScope';
import type { DataClass, LineStatus } from '../../supabase/functions/_shared/scope3';

// Scope 3 evidence trail visibility. Two display preferences on the profile
// (profiles.trust_layer_prefs, so they follow the account across devices):
//  - scope3_trail: a short preview on the Dashboard, for paid plans, shown
//    only while Enterprise Mode is on (switched in Settings);
//  - scope3_trail_full: the line-by-line trail on the MRV dashboard, for Pro
//    and Scale (switched manually in Profile).
// Display only: numbers always come from persisted, server-written records.

type Prefs = Record<string, unknown>;
const PREF_BASIC = 'scope3_trail';
const PREF_FULL = 'scope3_trail_full';

/** Read-modify-write of the prefs object, so other switches stored there are kept. */
async function writePref(userId: string, key: string, value: boolean): Promise<Prefs> {
  const { data, error } = await supabase.from('profiles').select('trust_layer_prefs').eq('id', userId).single();
  if (error) throw error;
  const next = { ...((data?.trust_layer_prefs as Prefs | null) ?? {}), [key]: value };
  const { error: upd } = await supabase.from('profiles').update({ trust_layer_prefs: next as never }).eq('id', userId);
  if (upd) throw upd;
  return next;
}

export function useScope3Visibility() {
  const { user } = useSession();
  const { tier } = usePremiumStatus();
  const { isEnterprise } = useEnterpriseMode();
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
  const basicAvailable = tier === 'essential' || tier === 'pro' || tier === 'scale';
  const fullAvailable = tier === 'pro' || tier === 'scale';
  const basicOn = prefs.data?.[PREF_BASIC] === true;
  const fullOn = prefs.data?.[PREF_FULL] === true;

  const set = useCallback(async (pref: string, value: boolean) => {
    if (!user?.id) return false;
    const before = qc.getQueryData<Prefs>(key) ?? {};
    qc.setQueryData(key, { ...before, [pref]: value });
    try {
      qc.setQueryData(key, await writePref(user.id, pref, value));
      return true;
    } catch {
      qc.setQueryData(key, before);
      return false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- key follows user id
  }, [user?.id, qc]);

  return {
    isEnterprise,
    basicAvailable, fullAvailable, basicOn, fullOn,
    /** Dashboard preview: paid plan, switched on in Settings, and Enterprise Mode on. */
    showBasic: basicAvailable && basicOn && isEnterprise,
    /** MRV trail: Pro or Scale, switched on in Profile. */
    showFull: fullAvailable && fullOn,
    setBasic: (v: boolean) => set(PREF_BASIC, v),
    setFull: (v: boolean) => set(PREF_FULL, v),
    loading: !!user?.id && prefs.isPending,
  };
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
const MISSING = new Set(['42P01', 'PGRST205', 'PGRST202', '42703']);

export interface Scope3CategoryTotal { category: number; kg: number; lines: number; supplierDataLines: number }
export interface Scope3Supplier {
  key: string; name: string | null; verifiedKg: number; verifiedLines: number; lines: number;
  needsData: number; needsReview: number; primary: number; supplierFactor: number; secondary: number;
  verifiedSpend: number; spend: number;
}
export interface Scope3Summary {
  enabled: boolean;
  totalKg: number;
  categories: Scope3CategoryTotal[];
  suppliers: Scope3Supplier[];
  lines: number;
  verifiedLines: number;
  needsData: number;
  needsReview: number;
}

const n = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));

/** Verified Scope 3 by category and supplier, from the database views. Runs only when asked. */
export function useScope3Summary(enabled: boolean) {
  const { user } = useSession();
  const { scope, ready } = useWorkspace();
  return useQuery({
    queryKey: [RECORDS_KEY, 'scope3', 'summary', user?.id ?? null, scopeKey(scope)],
    enabled: enabled && !!user?.id && ready,
    staleTime: RECORDS_STALE_MS,
    queryFn: async (): Promise<Scope3Summary> => {
      const cats = applyScope(supabase.from('scope3_category_totals' as never).select('*'), scope);
      const sups = applyScope(supabase.from('scope3_supplier_ledger' as never).select('*'), scope);
      if (!cats || !sups) return { enabled: false, totalKg: 0, categories: [], suppliers: [], lines: 0, verifiedLines: 0, needsData: 0, needsReview: 0 };
      const [c, s] = await Promise.all([cats, sups]);
      const err = (c.error ?? s.error) as { code?: string } | null;
      if (err && MISSING.has(err.code ?? '')) return { enabled: false, totalKg: 0, categories: [], suppliers: [], lines: 0, verifiedLines: 0, needsData: 0, needsReview: 0 };
      if (err) throw err;
      const categories = ((c.data ?? []) as Record<string, unknown>[])
        .map((r) => ({ category: n(r.scope3_category), kg: n(r.verified_kg), lines: n(r.verified_lines), supplierDataLines: n(r.supplier_data_lines) }))
        .sort((a, b) => b.kg - a.kg);
      const suppliers = ((s.data ?? []) as Record<string, unknown>[]).map((r) => ({
        key: String(r.supplier_key), name: (r.supplier_name as string | null) ?? null, verifiedKg: n(r.verified_kg), verifiedLines: n(r.verified_lines),
        lines: n(r.scope3_lines), needsData: n(r.needs_data_lines), needsReview: n(r.needs_review_lines),
        primary: n(r.primary_lines), supplierFactor: n(r.supplier_factor_lines), secondary: n(r.secondary_lines),
        verifiedSpend: n(r.verified_spend), spend: n(r.spend),
      })).sort((a, b) => b.verifiedKg - a.verifiedKg || b.lines - a.lines);
      return {
        enabled: true,
        totalKg: categories.reduce((a, r) => a + r.kg, 0),
        categories, suppliers,
        lines: suppliers.reduce((a, r) => a + r.lines, 0),
        verifiedLines: suppliers.reduce((a, r) => a + r.verifiedLines, 0),
        needsData: suppliers.reduce((a, r) => a + r.needsData, 0),
        needsReview: suppliers.reduce((a, r) => a + r.needsReview, 0),
      };
    },
  });
}

export interface Scope3TrailLine {
  id: string; document_id: string; line_index: number;
  supplier_gstin: string | null; supplier_name: string | null; invoice_number: string | null; invoice_date: string | null;
  description: string; hsn_code: string | null; quantity: number | null; unit: string | null; line_total: number | null;
  source_page: number | null; source_text: string | null; logistics: Record<string, unknown> | null;
  scope: number | null; scope3_category: number | null; classification_method: string; classification_basis: string;
  factor_key: string | null; factor_version: string | null; factor_value: number | null; factor_unit: string | null;
  factor_source: string | null; factor_geography: string | null; factor_material: string | null;
  data_class: DataClass; activity_qty: number | null; activity_unit: string | null; formula: string | null; kg_co2e: number | null;
  status: LineStatus; reasons: string[]; next_action: string | null; checks: Record<string, string>; confidence: string | null;
  method_version: string; calculated_at: string;
  invoice_status: 'counted' | 'duplicate' | 'unidentified'; extraction_sha256: string; document_hash: string; sealed_at: string;
}

/** The current line-by-line trail (Scope 3 lines only), newest invoices first. */
export function useScope3Lines(enabled: boolean) {
  const { user } = useSession();
  const { scope, ready } = useWorkspace();
  return useQuery({
    queryKey: [RECORDS_KEY, 'scope3', 'lines', user?.id ?? null, scopeKey(scope)],
    enabled: enabled && !!user?.id && ready,
    staleTime: RECORDS_STALE_MS,
    queryFn: async (): Promise<{ enabled: boolean; rows: Scope3TrailLine[] }> => {
      const q = applyScope(supabase.from('scope3_trail' as never).select('*').neq('status', 'not_scope3')
        .order('invoice_date', { ascending: false, nullsFirst: false }).order('line_index').limit(300), scope);
      if (!q) return { enabled: false, rows: [] };
      const { data, error } = await q;
      if (error && MISSING.has((error as { code?: string }).code ?? '')) return { enabled: false, rows: [] };
      if (error) throw error;
      return { enabled: true, rows: (data ?? []) as Scope3TrailLine[] };
    },
  });
}
