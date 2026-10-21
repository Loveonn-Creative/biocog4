import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { useFinanceInsights } from "@/hooks/useFinanceInsights";
import { FinanceInsightsView } from "@/components/finance/FinanceInsightsView";
import type { Plan } from "../../../supabase/functions/_shared/financeInsights";

/**
 * Dashboard section, shown only while the Finance insights switch is on and
 * the database functions exist. The plan comes from the database function,
 * which also decides what data is sent; until it answers, nothing renders but
 * a skeleton, and if the functions are not there yet the section stays hidden.
 */
export function FinanceInsights() {
  const { tier } = usePremiumStatus();
  const q = useFinanceInsights(true);
  if (q.isPending) return <div className="h-40 animate-pulse rounded-xl border border-border bg-card motion-reduce:animate-none" aria-label="Loading finance insights" />;
  if (q.isError) return <p className="rounded-xl border border-border bg-card px-4 py-3 text-[13.5px] text-muted-foreground">Finance insights could not load. Refresh to try again.</p>;
  const d = q.data!;
  if (!d.ready) return null;
  const plan: Plan = d.plan ?? (tier as Plan);
  return <FinanceInsightsView plan={plan} records={d.records} />;
}
