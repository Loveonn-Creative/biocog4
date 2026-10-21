import { Link } from "react-router-dom";
import { Check, Lock } from "lucide-react";
import { readiness, type InsightRecord, type MonthRow, type Plan, type RecordKind } from "../../../supabase/functions/_shared/financeInsights";

// The path to a lender-ready file, and six months of money in and out drawn as
// paired columns. Steps light up only from the user's own uploads; heights are
// to scale (parallel projection, no perspective) and the exact figures sit one
// tap away in Cash flow.

export interface UploadedRecord { kind: RecordKind; read: boolean }

const inr = (n: number) => {
  const a = Math.abs(n), sign = n < 0 ? "−" : "+";
  if (a >= 1e7) return `${sign}₹${(a / 1e7).toLocaleString("en-IN", { maximumFractionDigits: 2 })} Cr`;
  if (a >= 1e5) return `${sign}₹${(a / 1e5).toLocaleString("en-IN", { maximumFractionDigits: 2 })} L`;
  return `${sign}₹${a.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
};
const shortMonth = (m: string) => new Date(`${m}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" });

export function pathState(plan: Plan, uploads: UploadedRecord[], records: InsightRecord[]) {
  const statements = uploads.some((u) => u.kind === "bank_statement");
  const read = plan !== "snapshot" && uploads.some((u) => u.kind === "bank_statement" && u.read);
  const gaps = plan === "snapshot"
    ? [
        ...(uploads.some((u) => u.kind === "itr") ? [] : ["No tax return on record."]),
        ...(uploads.some((u) => u.kind === "financial_statement") ? [] : ["No annual accounts (balance sheet and profit and loss) on record."]),
      ]
    : readiness(records).gaps;
  const steps = [statements, read, statements && read && gaps.length === 0];
  const done = steps.filter(Boolean).length + (steps.every(Boolean) ? 1 : 0);
  const next = !statements ? "Upload a bank statement to see your money in and out."
    : plan === "snapshot" ? "See your monthly cash flow from the statement you uploaded."
    : !read ? "The statement could not be read. A clearer copy helps."
    : gaps.length ? gaps[0]
    : "Nothing obvious is missing.";
  return { statements, read, gaps, done, next };
}

function Isometric({ months }: { months: MonthRow[] }) {
  const c = Math.cos(Math.PI / 6), s = 0.5, W = 20, D = 20, H = 150;
  const step = W * 2 + 38, ox = 60, oy = 215;
  const max = Math.max(1, ...months.flatMap((m) => [m.inflow ?? 0, m.outflow ?? 0]));
  const P = (x: number, y: number, z: number) => [ox + (x - y) * c, oy + (x + y) * s - z] as const;
  const pts = (a: ReadonlyArray<readonly [number, number]>) => a.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const prism = (x: number, h: number, cols: [string, string, string], key: string) => {
    const t = [P(x, 0, h), P(x + W, 0, h), P(x + W, D, h), P(x, D, h)];
    const b = [P(x, 0, 0), P(x + W, 0, 0), P(x + W, D, 0), P(x, D, 0)];
    return (
      <g key={key}>
        <polygon points={pts([t[3], t[2], b[2], b[3]])} fill={cols[1]} />
        <polygon points={pts([t[1], t[2], b[2], b[1]])} fill={cols[2]} />
        <polygon points={pts(t)} fill={cols[0]} />
      </g>
    );
  };
  const floor = [P(-10, -10, 0), P(months.length * step, -10, 0), P(months.length * step, D + 16, 0), P(-10, D + 16, 0)];
  return (
    <svg viewBox="0 50 480 440" className="mx-auto h-auto w-full max-w-[520px]" role="img"
      aria-label={months.map((m) => `${shortMonth(m.month)}: in ${m.inflow ?? "not printed"}, out ${m.outflow ?? "not printed"}`).join("; ")}>
      <polygon points={pts(floor)} fill="hsl(var(--muted))" />
      {months.map((m, i) => {
        const x = i * step;
        const lp = P(x + W, D + 30, 0);
        return (
          <g key={m.month}>
            {m.inflow !== null && prism(x, (m.inflow / max) * H, ["#5cb88f", "#1a7f55", "#136243"], "in")}
            {m.outflow !== null && prism(x + W + 6, (m.outflow / max) * H, ["#d4d4d4", "#a3a3a3", "#858585"], "out")}
            <text x={lp[0]} y={lp[1]} fontSize="14" fill="hsl(var(--muted-foreground))" textAnchor="middle">{shortMonth(m.month)}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function FinancePath({ plan, uploads, records, months }: { plan: Plan; uploads: UploadedRecord[]; records: InsightRecord[]; months: MonthRow[] }) {
  const p = pathState(plan, uploads, records);
  const shown = months.slice(-6);
  const net = shown.reduce((t, m) => (m.inflow !== null && m.outflow !== null ? t + m.inflow - m.outflow : t), 0);
  const short = shown.filter((m) => m.inflow !== null && m.outflow !== null && m.outflow > m.inflow);
  const labels = ["Statements", "Totals read", "Gaps closed", "Lender-ready"];
  const state = [p.statements, p.read, p.statements && p.read && p.gaps.length === 0, p.done === 4];
  const current = state.findIndex((x) => !x);

  return (
    <div className="grid gap-6 rounded-2xl border border-border bg-card p-5 md:p-6 lg:grid-cols-2 lg:items-center">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-[15px] font-semibold">Path to a lender-ready file</h3>
          <span className="text-[13px] text-muted-foreground">{p.done} of 4</span>
        </div>
        <ol className="grid grid-cols-4">
          {labels.map((l, i) => (
            <li key={l} className="flex min-w-0 flex-col gap-2">
              <span className="flex items-center">
                {state[i]
                  ? <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-success text-success-foreground"><Check className="h-3.5 w-3.5" aria-hidden="true" /></span>
                  : i === 1 && plan === "snapshot"
                    ? <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-border text-muted-foreground"><Lock className="h-3 w-3" aria-hidden="true" /></span>
                    : <span className={`h-6 w-6 shrink-0 rounded-full border-2 ${i === current ? "border-warning bg-warning/10" : "border-border"}`} />}
                {i < 3 && <span className={`h-0.5 flex-1 ${state[i] ? "bg-success" : "bg-border"}`} />}
              </span>
              <span className={`text-[12.5px] font-medium ${state[i] || i === current ? "" : "text-muted-foreground"}`}>
                {l}{i === 2 && p.statements && p.read && p.gaps.length > 0 ? ` · ${p.gaps.length} left` : ""}
              </span>
              <span className="sr-only">{state[i] ? "done" : "not done"}</span>
            </li>
          ))}
        </ol>
        <div className="flex flex-col gap-3 rounded-xl bg-secondary/60 p-3.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13.5px]"><span className="font-semibold">{p.done === 4 ? "Ready." : "Next:"}</span> {p.next}</p>
          {p.done < 4 && (plan === "snapshot" && p.statements
            ? <Link to="/pricing" className="shrink-0 rounded-lg bg-primary px-3.5 py-2 text-center text-[13px] font-medium text-primary-foreground hover:bg-primary/90">See plans</Link>
            : <Link to="/" className="shrink-0 rounded-lg bg-primary px-3.5 py-2 text-center text-[13px] font-medium text-primary-foreground hover:bg-primary/90">Upload</Link>)}
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-[15px] font-semibold">Six months of cash</h3>
          {shown.length > 0 && <span className="text-[13px] text-muted-foreground tabular-nums">Net {inr(net)}{short.length ? ` · ${short.length} ${short.length === 1 ? "month" : "months"} short` : ""}</span>}
        </div>
        {plan === "snapshot" ? (
          <p className="flex items-center gap-2 rounded-xl border border-dashed border-border px-4 py-10 text-[13px] text-muted-foreground"><Lock className="h-3.5 w-3.5" aria-hidden="true" />Opens on Essential</p>
        ) : shown.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-[13px] text-muted-foreground">Shown once a bank statement is read.</p>
        ) : (
          <>
            <Isometric months={shown} />
            <p className="flex flex-wrap gap-x-4 text-[12.5px] text-muted-foreground">
              <span><span className="mr-1.5 inline-block h-2 w-2 rounded-sm bg-[#1a7f55] align-middle" />Money in</span>
              <span><span className="mr-1.5 inline-block h-2 w-2 rounded-sm bg-[#a3a3a3] align-middle" />Money out</span>
              <a href="#fin-cashflow" className="ml-auto font-medium text-primary hover:underline">Exact figures by month</a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
