import { useEffect, useMemo, useRef, useState } from "react";
import { calculateCBAM, DEFAULT_EU_ETS_PRICE } from "@/lib/cbamEngine";

const reduced = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/* ------------------------------ Lender's lens ----------------------------- */

export interface Property { key: string; title: string; body: string }

/**
 * A sample verified record, seen through a lender's eyes. Choosing a property
 * brings the part of the record that proves it into focus; the rest dims.
 * Values are illustrative.
 */
export const LenderLens = ({ properties }: { properties: Property[] }) => {
  const [active, setActive] = useState(properties[0].key);
  const p = properties.find(x => x.key === active)!;
  const on = (k: string) => (active === k ? "ring-2 ring-primary ring-offset-2 ring-offset-background opacity-100" : "opacity-35");

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
      <div>
        <div role="tablist" aria-label="Properties" className="grid gap-1.5">
          {properties.map((x, i) => (
            <button key={x.key} role="tab" aria-selected={x.key === active} aria-controls="cf-lens" onClick={() => setActive(x.key)}
              className={`flex items-baseline gap-3 text-left rounded-xl px-3 py-2.5 transition-colors ${x.key === active ? "bg-foreground text-background" : "hover:bg-secondary"}`}>
              <span className={`font-mono text-[11px] ${x.key === active ? "text-background/60" : "text-muted-foreground"}`}>0{i + 1}</span>
              <span className="text-sm font-medium">{x.title}</span>
            </button>
          ))}
        </div>
        <p key={p.key} className="mt-4 text-sm text-muted-foreground leading-relaxed animate-[cf-in_.3s_ease-out_both]" aria-live="polite">{p.body}</p>
      </div>

      <div id="cf-lens" role="tabpanel" className="rounded-3xl border border-border bg-secondary/30 p-4 sm:p-6">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Verified record · Scope 2</span>
          <span>Illustration</span>
        </div>
        <p className="mt-2 text-3xl font-semibold tabular-nums">2,982 <span className="text-base font-normal text-muted-foreground">kgCO2e</span></p>

        <div className="mt-5 grid gap-3">
          <div className={`rounded-xl bg-background px-3 py-2.5 transition-all duration-300 ${on("hash")}`}>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Source document</p>
            <p className="font-mono text-xs mt-0.5">sha256 9f2c…a71e · electricity bill, Sep 2026</p>
          </div>

          <div className={`rounded-xl bg-background px-3 py-2.5 transition-all duration-300 ${on("band")}`}>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Confidence band</p>
            <svg viewBox="0 0 200 22" className="mt-1 w-full h-5" aria-hidden="true">
              <line x1="4" y1="11" x2="196" y2="11" stroke="hsl(var(--border))" />
              <rect x="78" y="5" width="56" height="12" rx="6" fill="hsl(var(--primary))" opacity="0.2" />
              <line x1="106" y1="3" x2="106" y2="19" stroke="hsl(var(--primary))" strokeWidth="2" />
            </svg>
            <p className="font-mono text-[11px] text-muted-foreground">2,833 to 3,131 kg · confidence 0.95</p>
          </div>

          <div className={`rounded-xl bg-background px-3 py-2.5 transition-all duration-300 ${on("lock")}`}>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Method, frozen with the figure</p>
            <p className="font-mono text-xs mt-0.5">BIOCOG_MVR_INDIA v1.1 · CEA v21.0 grid factor 0.710</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className={`rounded-xl bg-background px-3 py-2.5 transition-all duration-300 ${on("score")}`}>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Credibility</p>
              <div className="mt-1 flex items-center gap-2">
                <svg viewBox="0 0 36 20" className="w-10 h-6" aria-hidden="true">
                  <path d="M3 18 A15 15 0 0 1 33 18" fill="none" stroke="hsl(var(--border))" strokeWidth="4" strokeLinecap="round" />
                  <path d="M3 18 A15 15 0 0 1 30 10" fill="none" stroke="hsl(var(--primary))" strokeWidth="4" strokeLinecap="round" />
                </svg>
                <span className="text-sm font-semibold">B · 72</span>
              </div>
            </div>
            <div className={`rounded-xl bg-background px-3 py-2.5 transition-all duration-300 ${on("peers")}`}>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Sector peers</p>
              <svg viewBox="0 0 100 22" className="mt-1 w-full h-5" aria-hidden="true">
                {[8, 14, 20, 15, 10, 6, 4].map((h, i) => <rect key={i} x={4 + i * 13} y={20 - h} width="10" height={h} rx="1.5" fill="hsl(var(--muted-foreground))" opacity="0.35" />)}
                <rect x="30" y="0" width="2.5" height="22" fill="hsl(var(--primary))" />
              </svg>
            </div>
          </div>

          <div className={`rounded-xl bg-foreground text-background px-3 py-2.5 transition-all duration-300 ${on("decision")}`}>
            <p className="text-[10px] uppercase tracking-wider text-background/60">What the borrower can share</p>
            <p className="text-sm mt-0.5">Instrument fit: green working-capital loan · Evidence depth: 12 documents · Invoices stay with the borrower</p>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ---------------------------- Route the record ---------------------------- */

export interface Pipeline { title: string; sub: string; body: string; to: string }

/** Pick a pipeline and the verified record travels from the MSME, through verification, to that desk. */
export const RouteRecord = ({ pipelines }: { pipelines: Pipeline[] }) => {
  const [i, setI] = useState(0);
  const p = pipelines[i];
  return (
    <div className="rounded-3xl border border-border p-4 sm:p-6">
      <div role="tablist" aria-label="Pipelines" className="flex flex-wrap gap-2">
        {pipelines.map((x, k) => (
          <button key={x.title} role="tab" aria-selected={k === i} onClick={() => setI(k)}
            className={`rounded-full px-4 py-2 text-sm transition-colors ${k === i ? "bg-foreground text-background" : "border border-border hover:bg-secondary"}`}>{x.title}</button>
        ))}
      </div>

      <svg viewBox="0 0 320 96" className="mt-6 w-full max-w-xl mx-auto h-auto" role="img" aria-label={`From the MSME through verification to ${p.to}`}>
        <path d="M40 60 C 100 60, 110 30, 160 30 S 230 60, 280 60" fill="none" stroke="hsl(var(--border))" strokeWidth="2" strokeDasharray="4 5" />
        {[{ x: 40, y: 60, l: "MSME" }, { x: 160, y: 30, l: "Verified" }, { x: 280, y: 60, l: p.to }].map(n => (
          <g key={n.l}>
            <circle cx={n.x} cy={n.y} r="11" fill="hsl(var(--background))" stroke="hsl(var(--foreground))" strokeWidth="1.5" />
            <text x={n.x} y={n.y + 26} textAnchor="middle" fontSize="9" fill="hsl(var(--foreground))">{n.l}</text>
          </g>
        ))}
        <rect key={i} width="16" height="11" rx="2" x="-8" y="-5.5" fill="hsl(var(--primary))" className="cf-packet" />
      </svg>

      <div key={p.title} className="mt-2 animate-[cf-in_.35s_ease-out_both]">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{p.sub}</p>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl">{p.body}</p>
      </div>
    </div>
  );
};

/* -------------------------------- Doodles -------------------------------- */

const DOODLES: Record<string, string> = {
  loan: "M10 34 h28 M14 34 V22 M34 34 V22 M24 12 L8 20 h32 Z M24 6 c4 4 4 8 0 10 c-4 -2 -4 -6 0 -10",
  incentive: "M8 40 h32 M10 40 V20 M18 40 V20 M30 40 V20 M38 40 V20 M6 20 h36 L24 8 Z",
  export: "M6 30 h36 l-4 8 h-28 Z M12 30 V18 h10 v12 M24 30 V14 h12 v16 M28 8 l4 -2 l4 2",
  linked: "M18 26 a7 7 0 0 1 0 -10 l4 -4 a7 7 0 0 1 10 10 l-2 2 M30 22 a7 7 0 0 1 0 10 l-4 4 a7 7 0 0 1 -10 -10 l2 -2",
};

/** A small hand-drawn mark that draws itself when it comes into view. */
export const Doodle = ({ kind }: { kind: keyof typeof DOODLES }) => {
  const ref = useRef<SVGSVGElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced() || typeof IntersectionObserver === "undefined") { setSeen(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <svg ref={ref} viewBox="0 0 48 48" className="w-10 h-10 text-primary" aria-hidden="true">
      <path d={DOODLES[kind]} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        pathLength={1} strokeDasharray="1" strokeDashoffset={seen ? 0 : 1} style={{ transition: "stroke-dashoffset 1.1s ease-out" }} />
    </svg>
  );
};

/* ------------------------------ CBAM scrubber ----------------------------- */

// Regulation (EU) 2023/956 as amended by 2025/2083; default values and
// mark-ups per Implementing Regulation (EU) 2025/2621; EU ETS price
// DEFAULT_EU_ETS_PRICE. Indian blast-furnace steel (BF-BOF) at EU defaults.
export function steelCbamPerTonne() {
  const r = calculateCBAM({ sectorId: "steel", productionRouteId: "bf-bof", countryCode: "IN", supplierName: "", tonnage: 1000, actualEmissionsIntensity: null, carbonPricePaid: null, euEtsPrice: DEFAULT_EU_ETS_PRICE });
  return r.yearlyResults.map(y => ({ year: y.year, perTonne: y.costPerTonne }));
}

/** Drag through 2026 to 2034 and watch the default-value cost per tonne climb as free allocation ends. */
export const CbamScrubber = () => {
  const series = useMemo(steelCbamPerTonne, []);
  const [year, setYear] = useState(2026);
  const cur = series.find(s => s.year === year)!;
  const max = Math.max(...series.map(s => s.perTonne));
  return (
    <div className="mt-3 rounded-2xl border border-border bg-background p-4">
      <div className="flex items-end gap-1.5 h-20" aria-hidden="true">
        {series.map(s => (
          <button key={s.year} tabIndex={-1} onClick={() => setYear(s.year)} className="flex-1 h-full flex items-end">
            <span className={`block w-full rounded-t transition-colors ${s.year === year ? "bg-primary" : s.year < year ? "bg-primary/40" : "bg-border"}`} style={{ height: `${(s.perTonne / max) * 100}%` }} />
          </button>
        ))}
      </div>
      <input type="range" min={2026} max={2034} step={1} value={year} onChange={e => setYear(Number(e.target.value))}
        aria-label="Year" className="mt-2 w-full accent-[hsl(var(--primary))]" />
      <p className="text-sm" aria-live="polite">
        <span className="font-mono">{year}</span>: about <span className="font-semibold tabular-nums">€{Math.round(cur.perTonne).toLocaleString("en-US")}</span> per tonne of blast-furnace steel from India at EU default values.
      </p>
    </div>
  );
};
