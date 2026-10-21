import { usePrivateRecords } from "@/hooks/useFinanceInsights";
import { KIND_LABEL } from "../../../supabase/functions/_shared/financeInsights";

/**
 * Bank statements, tax returns and annual accounts the user uploaded, listed
 * in History so nothing they sent disappears. Files are never offered back:
 * there is no view or download, only what was kept and whether totals were read.
 */
export function PrivateRecords() {
  const q = usePrivateRecords();
  const rows = q.data ?? [];
  if (!rows.length) return null;
  const month = (d: string) => new Date(`${d.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-IN", { month: "short", year: "numeric", timeZone: "UTC" });
  const when = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  return (
    <section aria-labelledby="private-records" className="mb-6 rounded-2xl border border-border bg-card p-4 md:p-5">
      <h2 id="private-records" className="text-base font-semibold">Private records</h2>
      <p className="mt-0.5 text-[12.5px] text-muted-foreground">Kept securely and never shown back as files. Not counted in emissions.</p>
      <ul className="mt-3 divide-y divide-border">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5 text-[13.5px]">
            <span className="min-w-0">
              <span className="font-medium">{KIND_LABEL[r.kind] ?? "Record"}</span>
              <span className="text-muted-foreground">
                {r.financial_year ? ` · FY ${r.financial_year}` : r.period_from && r.period_to ? ` · ${month(r.period_from)} to ${month(r.period_to)}` : ""}
                {` · uploaded ${when(r.created_at)}`}
              </span>
            </span>
            <span className={`rounded-full border px-2 py-0.5 text-[11.5px] ${r.read ? "border-border text-foreground" : "border-dashed border-border text-muted-foreground"}`}>
              {r.read ? "Totals read" : "Could not be read"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
