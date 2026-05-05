import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "./useSession";
import { usePremiumStatus } from "./usePremiumStatus";

interface Args {
  calculatorSlug: string;
  inputs: unknown;
  results: unknown;
  factorSources?: string[];
  label?: string;
  enabled?: boolean;
  debounceMs?: number;
}

/**
 * Real-time autosave for paid users. Upserts a single "live" run per
 * (user, calculator_slug) — keyed via label "__live__:<slug>".
 * Free users are no-ops; they can still use the manual SaveRunButton.
 */
export const useCalculatorAutosave = ({
  calculatorSlug,
  inputs,
  results,
  factorSources = [],
  label,
  enabled = true,
  debounceMs = 1500,
}: Args) => {
  const { user } = useSession();
  const { isPremium, isLoading } = usePremiumStatus();
  const rowIdRef = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const liveLabel = label || `__live__:${calculatorSlug}`;
  const canRun = enabled && !!user?.id && isPremium && !isLoading && !!results;

  // Find or create the live row once
  useEffect(() => {
    if (!user?.id || !isPremium || isLoading) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("calculator_runs")
        .select("id")
        .eq("user_id", user.id)
        .eq("calculator_slug", calculatorSlug)
        .eq("label", liveLabel)
        .maybeSingle();
      if (!cancelled && data?.id) rowIdRef.current = data.id;
    })();
    return () => { cancelled = true; };
  }, [user?.id, isPremium, isLoading, calculatorSlug, liveLabel]);

  useEffect(() => {
    if (!canRun) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const payload = {
        user_id: user!.id,
        calculator_slug: calculatorSlug,
        label: liveLabel,
        inputs: inputs as never,
        results: results as never,
        factor_sources: factorSources as never,
      };
      if (rowIdRef.current) {
        await supabase.from("calculator_runs").update(payload).eq("id", rowIdRef.current);
      } else {
        const { data } = await supabase.from("calculator_runs").insert(payload).select("id").single();
        if (data?.id) rowIdRef.current = data.id;
      }
    }, debounceMs);
    return () => { if (timer.current) clearTimeout(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRun, JSON.stringify(inputs), JSON.stringify(results)]);
};
