import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { LockedBody } from "@/components/dashboard/Locked";
import {
  CATEGORIES, CATEGORY_LABEL, ENERGY_CATEGORIES, KIND_LABEL, UNLOCKS_ON,
  energyCosts, moduleAccess, monthsCsv, monthsFrom, readiness,
  type Access, type InsightRecord, type ModuleId, type MonthRow, type Plan,
} from "../../../supabase/functions/_shared/financeInsights";

// The three finance modules on the Dashboard (pure view: data comes in as
// props, so the page and its tests render it the same way). Every figure says
// where it comes from and over which period; nothing is estimated or filled
// in. Locked modules show their shape and the plan they open on, never data.

const PLAN_NAME: Record<Plan, string> = { snapshot: "Snapshot", essential: "Essential", pro: "Pro", scale: "Scale" };

function inr(n: number): string {
  const a = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  if (a >= 1e7) return `${sign}₹${(a / 1e7).toLocaleString("en-IN", { maximumFractionDigits: 2 })} Cr`;
  if (a >= 1e5) return `${sign}₹${(a / 1e5).toLocaleString("en-IN", { maximumFractionDigits: 2 })} L`;
  return `${sign}₹${a.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}
const monthLabel = (m: string) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "short", year: "numeric", timeZone: "UTC" });

const Source = ({ children }: { children: React.ReactNode }) => (
  <p className="mt-1 text-[12.5px] text-muted-foreground">{children}</p>
);

const Shell = ({ id, title, line, access, children, actions }: { id: ModuleId; title: string; line: string; access: Access; plan: Plan; children?: React.ReactNode; actions?: React.ReactNode }) => (
  <section aria-labelledby={`fin-${id}`} className="min-w-0 rounded-xl border border-border bg-card p-4 md:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 id={`fin-${id}`} className="text-[15px] font-semibold">{title}</h3>
        <p className="mt-0.5 text-[13px] text-muted-foreground">{line}</p>
      </div>
      {access !== "locked" && actions}
    </div>
    {access === "locked" ? <LockedBody plan={PLAN_NAME[UNLOCKS_ON[id]]} /> : children}
  </section>
);

const Empty = ({ children }: { children: React.ReactNode }) => (
  <p className="mt-4 rounded-lg border border-dashed border-border px-4 py-5 text-center text-[13.5px] text-muted-foreground">{children}</p>
);

type Range = 3 | 6 | 12 | 0;
const RangePicker = ({ value, onChange }: { value: Range; onChange: (r: Range) => void }) => (
  <label className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
    <span className="sr-only">Months shown</span>
    <select value={value} onChange={(e) => onChange(Number(e.target.value) as Range)} className="rounded-lg border border-input bg-background px-2 py-1 text-[12.5px] text-foreground">
      <option value={3}>Last 3 months</option><option value={6}>Last 6 months</option><option value={12}>Last 12 months</option><option value={0}>All months</option>
    </select>
  </label>
);

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const DownloadButton = ({ onClick }: { onClick: () => void }) => (
  <button type="button" onClick={onClick} className="rounded-full border border-border px-3 py-1 text-[12.5px] font-medium hover:bg-secondary">Download CSV</button>
);

function CashFlow({ months, access, plan }: { months: (MonthRow & { source: string })[]; access: Access; plan: Plan }) {
  const [range, setRange] = useState<Range>(6);
  const shown = access === "full" && range === 0 ? months : months.slice(-(access === "full" ? range : 6));
  const max = Math.max(1, ...shown.flatMap((m) => [m.inflow ?? 0, m.outflow ?? 0]));
  const period = shown.length ? `${monthLabel(shown[0].month)} to ${monthLabel(shown[shown.length - 1].month)}` : null;
  const totals = useMemo(() => {
    const t: Partial<Record<(typeof CATEGORIES)[number], number>> = {};
    let out = 0;
    for (const m of shown) if (m.categories) { for (const c of CATEGORIES) { const v = m.categories[c]; if (v) { t[c] = (t[c] ?? 0) + v; out += v; } } }
    return { t, out, months: shown.filter((m) => m.categories).length };
  }, [shown]);
  return (
    <Shell id="cashflow" title="Cash flow" line="Money in and out each month, read from your bank statements." access={access} plan={plan}
      actions={access === "full" && months.length ? <div className="flex items-center gap-2"><RangePicker value={range} onChange={setRange} /><DownloadButton onClick={() => download("cash-flow.csv", monthsCsv(shown))} /></div> : undefined}>
      {!shown.length ? <Empty>Upload a bank statement to see money in and out by month.</Empty> : (
        <>
          <Source>Bank statements · {period}</Source>
          <ul className="mt-4 space-y-3">
            {shown.map((m) => {
              const net = m.inflow !== null && m.outflow !== null ? m.inflow - m.outflow : null;
              return (
                <li key={m.month} className="grid grid-cols-[4.5rem_minmax(0,1fr)_5.5rem] items-center gap-3 text-[13px]">
                  <span className="text-muted-foreground">{monthLabel(m.month)}</span>
                  <span className="space-y-1">
                    {m.inflow !== null ? <span className="block h-2 rounded-full bg-primary/80" style={{ width: `${(m.inflow / max) * 100}%` }} title={`In ${inr(m.inflow)}`} /> : <span className="block h-2 w-full rounded-full border border-dashed border-border" title="Money in not printed" />}
                    {m.outflow !== null ? <span className="block h-2 rounded-full bg-foreground/25" style={{ width: `${(m.outflow / max) * 100}%` }} title={`Out ${inr(m.outflow)}`} /> : <span className="block h-2 w-full rounded-full border border-dashed border-border" title="Money out not printed" />}
                  </span>
                  <span className={`text-right tabular-nums ${net !== null && net < 0 ? "text-destructive" : ""}`}>{net === null ? "–" : `${net >= 0 ? "+" : ""}${inr(net)}`}</span>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 flex flex-wrap gap-x-4 text-[12px] text-muted-foreground">
            <span><span className="mr-1 inline-block h-2 w-3 rounded-full bg-primary/80 align-middle" />Money in</span>
            <span><span className="mr-1 inline-block h-2 w-3 rounded-full bg-foreground/25 align-middle" />Money out</span>
            <span><span className="mr-1 inline-block h-2 w-3 rounded-full border border-dashed border-border align-middle" />Not printed</span>
            <span>Right: in minus out</span>
          </p>
          {shown.some((m) => m.balanced === false) && (
            <p className="mt-2 text-[12.5px] text-muted-foreground">On {shown.filter((m) => m.balanced === false).map((m) => monthLabel(m.month)).join(", ")} the printed balances do not add up to money in and out. Shown as printed.</p>
          )}
          {access !== "basic" && (
            totals.out > 0 ? (
              <div className="mt-5 border-t border-border pt-4">
                <p className="text-[13.5px] font-medium">Where money went</p>
                <p className="text-[12px] text-muted-foreground">{totals.months} {totals.months === 1 ? "month" : "months"} where every payment could be sorted. Payments with no clear purpose are under Other payments.</p>
                <ul className="mt-3 space-y-2">
                  {CATEGORIES.filter((c) => totals.t[c]).sort((a, b) => (totals.t[b] ?? 0) - (totals.t[a] ?? 0)).map((c) => (
                    <li key={c} className="flex items-baseline justify-between gap-3 text-[13.5px]">
                      <span>{CATEGORY_LABEL[c]}</span>
                      <span className="tabular-nums">{inr(totals.t[c]!)} <span className="text-muted-foreground">· {Math.round(((totals.t[c] ?? 0) / totals.out) * 100)}%</span></span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : <p className="mt-4 text-[12.5px] text-muted-foreground">No month on record could be split by purpose, so the breakdown is not shown.</p>
          )}
        </>
      )}
    </Shell>
  );
}

function Readiness({ records, access, plan }: { records: InsightRecord[]; access: Access; plan: Plan }) {
  const r = useMemo(() => readiness(records), [records]);
  const csv = () => ["figure,value_inr,from,period", ...r.figures.map((f) => [f.label, f.value, KIND_LABEL[f.kind], f.period ?? ""].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
  return (
    <Shell id="readiness" title="Financial readiness" line="The figures a lender asks for, from your documents, and what is still missing." access={access} plan={plan}
      actions={access === "full" && r.figures.length ? <DownloadButton onClick={() => download("financial-readiness.csv", csv())} /> : undefined}>
      {!records.length ? <Empty>Upload a tax return, annual accounts or a bank statement to see this.</Empty> : (
        <>
          {r.figures.length > 0 && (
            <dl className="mt-4 divide-y divide-border rounded-xl border border-border">
              {r.figures.map((f) => (
                <div key={f.key} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-0.5 px-4 py-3">
                  <dt className="text-[13.5px]">{f.label}</dt>
                  <dd className="text-right text-[14px] font-medium tabular-nums">{f.key === "cheque_returns_count" ? f.value : inr(f.value)}</dd>
                  <dd className="col-span-2 text-[12px] text-muted-foreground">From your {KIND_LABEL[f.kind].toLowerCase()}{f.period ? ` · ${f.period}` : ""}</dd>
                </div>
              ))}
            </dl>
          )}
          <div className="mt-4">
            <p className="text-[13.5px] font-medium">{r.gaps.length ? "Still missing" : "Nothing obvious is missing"}</p>
            {r.gaps.length > 0 && (
              <ul className="mt-2 space-y-1.5">
                {r.gaps.map((g) => <li key={g} className="flex gap-2 text-[13.5px] text-foreground/85"><span aria-hidden="true" className="text-muted-foreground">○</span>{g}</li>)}
              </ul>
            )}
            <p className="mt-3 text-[12px] text-muted-foreground">Figures are shown as printed in your documents. They are not checked by Senseible and are not a credit decision.</p>
          </div>
        </>
      )}
    </Shell>
  );
}

function EnergyCosts({ months, access, plan }: { months: MonthRow[]; access: Access; plan: Plan }) {
  const [range, setRange] = useState<Range>(6);
  const rows = useMemo(() => energyCosts(months), [months]);
  const shown = access === "full" && range === 0 ? rows : rows.slice(-(access === "full" ? range : 6));
  const last = shown[shown.length - 1];
  const prev = shown[shown.length - 2];
  const change = last && prev && prev.total > 0 ? Math.round(((last.total - prev.total) / prev.total) * 100) : null;
  const csv = () => ["month," + ENERGY_CATEGORIES.map((c) => `${c}_inr`).join(",") + ",total_inr", ...shown.map((r) => [r.month, ...ENERGY_CATEGORIES.map((c) => r.values[c] ?? ""), r.total].join(","))].join("\n");
  return (
    <Shell id="energy" title="Energy and operating costs" line="What you paid for electricity, fuel, freight and raw materials each month." access={access} plan={plan}
      actions={access === "full" && rows.length ? <div className="flex items-center gap-2"><RangePicker value={range} onChange={setRange} /><DownloadButton onClick={() => download("energy-costs.csv", csv())} /></div> : undefined}>
      {!shown.length ? <Empty>Shown once a bank statement has payments that clearly name an electricity board, a fuel company, a transporter or a materials supplier.</Empty> : (
        <>
          <Source>Bank statements · {monthLabel(shown[0].month)} to {monthLabel(shown[shown.length - 1].month)}</Source>
          {change !== null && (
            <p className="mt-3 text-[14px]"><span className="font-semibold tabular-nums">{change > 0 ? "+" : ""}{change}%</span> <span className="text-muted-foreground">in {monthLabel(last!.month)} against {monthLabel(prev!.month)}</span></p>
          )}
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[28rem] text-[13px]">
              <thead><tr className="text-left text-[12px] text-muted-foreground"><th className="py-1.5 font-medium">Month</th>{ENERGY_CATEGORIES.map((c) => <th key={c} className="py-1.5 text-right font-medium">{CATEGORY_LABEL[c]}</th>)}</tr></thead>
              <tbody className="divide-y divide-border">
                {shown.map((r) => (
                  <tr key={r.month}><td className="py-2 text-muted-foreground">{monthLabel(r.month)}</td>{ENERGY_CATEGORIES.map((c) => <td key={c} className="py-2 text-right tabular-nums">{r.values[c] ? inr(r.values[c]!) : "–"}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[12px] text-muted-foreground">Payments only. Emissions are counted from bills that print quantities (kWh, litres, kg), never from amounts paid.</p>
        </>
      )}
    </Shell>
  );
}

export function FinanceInsightsView({ plan, records }: { plan: Plan; records: InsightRecord[] }) {
  const access = moduleAccess(plan);
  const months = useMemo(() => monthsFrom(records), [records]);
  return (
    <section aria-labelledby="finance-title" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2 pt-2">
        <h2 id="finance-title" className="text-[17px] font-semibold tracking-tight">Finance insights</h2>
        <p className="text-[12.5px] text-muted-foreground">Private to your account · <Link to="/settings" className="underline underline-offset-4">Settings</Link></p>
      </div>
      <div className="grid items-start gap-3 lg:grid-cols-2 lg:gap-4">
        <CashFlow months={months} access={access.cashflow} plan={plan} />
        <Readiness records={records} access={access.readiness} plan={plan} />
      </div>
      <EnergyCosts months={months} access={access.energy} plan={plan} />
    </section>
  );
}
