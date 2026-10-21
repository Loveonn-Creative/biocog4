import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { accountKey, ACCOUNT_STALE_MS } from "@/lib/queryClient";
import type { InsightRecord, Plan, RecordKind } from "../../supabase/functions/_shared/financeInsights";

// Finance insights: an opt-in switch (profiles.trust_layer_prefs.finance_insights,
// so it follows the account) and two database functions that return only the
// caller's own records, by plan (my_finance_insights, my_private_records).
// Until the migration is applied the functions do not exist; the hooks then
// report "not ready" and the page shows an empty state, never an error.

type Rpc = (fn: string) => PromiseLike<{ data: unknown; error: { code?: string; message?: string } | null }>;
const rpc = (fn: string) => (supabase.rpc as unknown as Rpc).call(supabase, fn);
const missing = (e: { code?: string; message?: string } | null) => !!e && (e.code === "PGRST202" || e.code === "42883" || /my_(finance_insights|private_records)/.test(e.message ?? ""));

const PREF = "finance_insights";
type Prefs = Record<string, unknown>;

export interface FinanceInsightsData { ready: boolean; enabled: boolean; plan: Plan; records: InsightRecord[] }
export interface PrivateRecord { id: string; kind: RecordKind; read: boolean; period_from: string | null; period_to: string | null; financial_year: string | null; created_at: string }

export function useFinanceInsightsSwitch() {
  const { user } = useSession();
  const qc = useQueryClient();
  const key = accountKey(user?.id, "trust_layer_prefs");
  const prefs = useQuery({
    queryKey: key,
    enabled: !!user?.id,
    staleTime: ACCOUNT_STALE_MS,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("trust_layer_prefs").eq("id", user!.id).single();
      if (error) throw error;
      return ((data?.trust_layer_prefs as Prefs | null) ?? {}) as Prefs;
    },
  });
  const on = prefs.data?.[PREF] === true;
  const setOn = useCallback(async (value: boolean) => {
    if (!user?.id) return false;
    const before = qc.getQueryData<Prefs>(key) ?? {};
    qc.setQueryData(key, { ...before, [PREF]: value });
    try {
      // Read-modify-write so the other switches stored there are kept.
      const { data, error } = await supabase.from("profiles").select("trust_layer_prefs").eq("id", user.id).single();
      if (error) throw error;
      const next = { ...((data?.trust_layer_prefs as Prefs | null) ?? {}), [PREF]: value };
      const { error: upd } = await supabase.from("profiles").update({ trust_layer_prefs: next as never }).eq("id", user.id);
      if (upd) throw upd;
      qc.setQueryData(key, next);
      void qc.invalidateQueries({ queryKey: accountKey(user.id, "finance_insights") });
      return true;
    } catch {
      qc.setQueryData(key, before);
      return false;
    }
  }, [user?.id, qc, key]);
  return { on, setOn, loading: prefs.isPending && !!user?.id, signedIn: !!user?.id };
}

export function useFinanceInsights(enabled: boolean) {
  const { user } = useSession();
  return useQuery({
    queryKey: accountKey(user?.id, "finance_insights"),
    enabled: !!user?.id && enabled,
    staleTime: 60_000,
    retry: false,
    queryFn: async (): Promise<FinanceInsightsData> => {
      const { data, error } = await rpc("my_finance_insights");
      if (missing(error)) return { ready: false, enabled: false, plan: "snapshot", records: [] };
      if (error) throw error;
      const d = (data ?? {}) as { enabled?: boolean; plan?: Plan; records?: InsightRecord[] };
      return { ready: true, enabled: !!d.enabled, plan: d.plan ?? "snapshot", records: Array.isArray(d.records) ? d.records : [] };
    },
  });
}

export function usePrivateRecords() {
  const { user } = useSession();
  return useQuery({
    queryKey: accountKey(user?.id, "private_records"),
    enabled: !!user?.id,
    staleTime: 60_000,
    retry: false,
    queryFn: async (): Promise<PrivateRecord[]> => {
      const { data, error } = await rpc("my_private_records");
      if (missing(error)) return [];
      if (error) throw error;
      return Array.isArray(data) ? (data as PrivateRecord[]) : [];
    },
  });
}
