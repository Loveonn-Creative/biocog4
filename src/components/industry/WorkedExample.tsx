import { useMemo, useState } from "react";
import type { IndustryData } from "@/data/industriesData";
import { computeExample } from "@/lib/industryExample";

const fmt = (n: number, d = 0) => n.toLocaleString("en-IN", { maximumFractionDigits: d });

/**
 * A worked example, not a case study: illustrative monthly quantities for a
 * typical unit, multiplied by the same factors the product uses. Drag a slider
 * to see your own scale; the note says what the example leaves out.
 */
export function WorkedExample({ ind }: { ind: IndustryData }) {
  const [qtys, setQtys] = useState(() => ind.example.map(e => e.qty));
  const r = useMemo(() => computeExample(ind.example, qtys), [ind.example, qtys]);
  const s2Pct = r.annualTonnes > 0 ? Math.round((100 * r.scope2Tonnes) / r.annualTonnes) : 0;

  return (
    <div className="grid gap-8 rounded-3xl border border-border bg-card p-5 md:grid-cols-[1.2fr_1fr] md:p-8">
      <div className="space-y-6">
        {r.lines.map((l, i) => (
          <div key={l.label}>
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor={`ex-${i}`} className="text-sm font-medium">{l.label}</label>
              <span className="font-mono text-sm tabular-nums">{fmt(l.qty)} {l.unit}/month</span>
            </div>
            <input id={`ex-${i}`} type="range" min={0} max={ind.example[i].max} step={ind.example[i].max / 200} value={qtys[i]}
              onChange={e => setQtys(q => q.map((v, j) => (j === i ? Number(e.target.value) : v)))}
              className="mt-2 w-full accent-[hsl(var(--primary))]" />
            <div className="mt-1 text-xs text-muted-foreground">× {l.factor < 1 ? l.factor.toFixed(3) : l.factor} kg CO₂ per {l.unit} = {fmt(l.annualKg / 1000, 1)} t a year</div>
          </div>
        ))}
      </div>
      <div className="flex flex-col justify-center rounded-2xl bg-secondary/60 p-6" aria-live="polite">
        <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Worked example</div>
        <div className="mt-2 text-4xl font-semibold tabular-nums">{fmt(r.annualTonnes, 1)} <span className="text-lg font-normal text-muted-foreground">t CO₂ a year</span></div>
        <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-background" aria-hidden="true">
          <div className="bg-destructive/70 transition-[width] duration-500" style={{ width: `${100 - s2Pct}%` }} />
          <div className="bg-primary transition-[width] duration-500" style={{ width: `${s2Pct}%` }} />
        </div>
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>Scope 1: {fmt(r.scope1Tonnes, 1)} t</span><span>Scope 2: {fmt(r.scope2Tonnes, 1)} t</span>
        </div>
        <p className="mt-5 text-xs leading-relaxed text-muted-foreground">Illustrative quantities, not a customer’s data. {ind.exampleNote}</p>
      </div>
    </div>
  );
}

export default WorkedExample;
