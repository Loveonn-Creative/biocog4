import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { useFinanceInsights } from "@/hooks/useFinanceInsights";
import { FinanceInsightsView } from "@/components/finance/FinanceInsightsView";
import type { Plan } from "../../../supabase/functions/_shared/financeInsights";

/**
 * Dashboard section, shown only while the Finance insights switch is on. The
 * plan comes from the database function, which also decides what data is
 * sent; the browser's plan is used only until that answer arrives.
 */
export function FinanceInsights() {
  const { tier } = usePremiumStatus();
  const q = useFinanceInsights(true);
  if (q.isPending) return <div className="h-40 animate-pulse rounded-2xl border border-border bg-card motion-reduce:animate-none" aria-label="Loading finance insights" />;
  if (q.isError) return <p className="rounded-xl border border-border px-4 py-3 text-[13.5px] text-muted-foreground">Finance insights could not load. Refresh to try again.</p>;
  const d = q.data!;
  const plan: Plan = d.ready ? d.plan : (tier as Plan);
  return <FinanceInsightsView plan={plan} records={d.records} ready={d.ready} />;
}
