import { useState } from "react";
import { Plus, X } from "lucide-react";
import { ToolFaqs, ToolFrame, ToolNextStep, type ToolFaq } from "@/components/tools/ToolFrame";
import { FUELS, fuelLine, inKg, inT, type FuelLine, type QuickFuel } from "@/lib/calculators/quickCarbon";

const PATH = "/calculators/fuel-carbon";

const FAQS: ToolFaq[] = [
  { q: "Where do these factors come from?", a: "They are the factors Senseible uses for every fuel invoice it reads, mostly IPCC 2006 defaults for India's fuels. Per-litre factors include a standard density. If your supplier gives the calorific value or density, a figure built on that is more exact." },
  { q: "Does this include methane and nitrous oxide?", a: "No, CO2 only. At IPCC defaults for burning fuel in boilers, furnaces and generators, methane and nitrous oxide add well under one percent." },
  { q: "Is fuel Scope 1 or Scope 3?", a: "Fuel you burn in your own generators, boilers, furnaces or vehicles is Scope 1. Fuel burnt by a transporter you hire sits in your Scope 3." },
  { q: "Why is there no figure for biomass?", a: "CO2 from burning biomass is biogenic and reported separately, not added to fossil emissions. Senseible records biomass as zero and never counts it as a reduction." },
];

const fmtFactor = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2 });

/** The fuel as a tank on the left, its CO2 as a cloud on the right: the cloud's area tracks the kg. */
function TankToCloud({ fill, kg, max }: { fill: number; kg: number; max: number }) {
  const r = 18 + 52 * Math.sqrt(Math.min(1, kg / Math.max(1, max)));
  return (
    <svg viewBox="0 0 320 150" className="h-auto w-full" aria-hidden="true">
      <rect x="18" y="22" width="70" height="110" rx="12" className="fill-none stroke-current text-background/40" strokeWidth="3" />
      <rect x="21" y={25 + 104 * (1 - fill)} width="64" height={104 * fill} rx="9" className="fc-anim fill-current text-[hsl(var(--warning))]" />
      <rect x="38" y="10" width="36" height="14" rx="4" className="fill-current text-background/40" />
      <path d="M100 77 H170" className="fc-flow stroke-current text-background/60" strokeWidth="3" strokeDasharray="6 8" />
      <path d="M164 70 l10 7 -10 7" className="fill-none stroke-current text-background/60" strokeWidth="3" />
      <g className="fc-anim" style={{ transformOrigin: "245px 77px", transform: `scale(${r / 70})` }}>
        <circle cx="225" cy="85" r="34" className="fill-current text-background" />
        <circle cx="262" cy="80" r="30" className="fill-current text-background" />
        <circle cx="244" cy="58" r="30" className="fill-current text-background" />
        <text x="245" y="86" textAnchor="middle" className="fill-current font-mono text-[18px] font-bold text-foreground">CO2</text>
      </g>
    </svg>
  );
}

const FuelCarbon = () => {
  const [lines, setLines] = useState<FuelLine[]>([{ fuel: "DIESEL", unit: "litre", qty: 500 }]);
  const [active, setActive] = useState(0);
  const results = lines.map(fuelLine);
  const total = results.reduce((s, r) => s + r.kg, 0);
  const cur = results[active] ?? results[0];
  const curLine = lines[active] ?? lines[0];

  const patch = (i: number, p: Partial<FuelLine>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...p } : l)));
  const pickFuel = (id: QuickFuel) => patch(active, { fuel: id, unit: FUELS.find((f) => f.id === id)!.units[0].id });
  const add = () => { setLines((ls) => [...ls, { fuel: "LPG", unit: "kg", qty: 100 }]); setActive(lines.length); };
  const remove = (i: number) => { setLines((ls) => ls.filter((_, j) => j !== i)); setActive(0); };

  return (
    <ToolFrame path={PATH} name="Fuel to CO2 calculator" faqs={FAQS}>
      <style>{`.fc-anim{transition:transform .5s ease-out, y .5s ease-out, height .5s ease-out}.fc-flow{animation:fc-flow 1.2s linear infinite}@keyframes fc-flow{to{stroke-dashoffset:-28}}@media (prefers-reduced-motion: reduce){.fc-anim{transition:none}.fc-flow{animation:none}}`}</style>

      <h1 className="max-w-3xl font-display text-3xl font-bold leading-tight text-foreground sm:text-5xl">Litres of diesel in. Kilograms of CO2 out.</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">Pick the fuel, type what you bought, and watch the arithmetic. These are the same factors Senseible applies to every fuel invoice it reads.</p>

      <section className="mt-6 overflow-hidden rounded-3xl bg-foreground text-background">
        <div className="flex gap-2 overflow-x-auto px-4 pt-4 sm:px-6" role="radiogroup" aria-label="Fuel">
          {FUELS.map((f) => (
            <button key={f.id} type="button" role="radio" aria-checked={curLine.fuel === f.id} onClick={() => pickFuel(f.id)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-semibold ${curLine.fuel === f.id ? "border-background bg-background text-foreground" : "border-background/30 text-background/80 hover:border-background/60"}`}>
              {f.name}
            </button>
          ))}
        </div>

        <div className="grid gap-4 p-4 sm:p-6 md:grid-cols-[1fr_1.1fr] md:items-center">
          <TankToCloud fill={Math.min(1, Math.max(0.04, Math.log10(1 + cur.base) / 5))} kg={cur.kg} max={Math.max(...results.map((r) => r.kg), 1)} />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <input type="number" inputMode="decimal" min={0} value={curLine.qty} aria-label="Quantity" onChange={(e) => patch(active, { qty: Math.max(0, Number(e.target.value) || 0) })}
                className="h-12 w-36 rounded-xl border border-background/30 bg-background px-3 font-mono text-lg text-foreground focus:outline-none focus:ring-2 focus:ring-[hsl(var(--warning))]" />
              <select value={curLine.unit} aria-label="Unit" onChange={(e) => patch(active, { unit: e.target.value })}
                className="h-12 rounded-xl border border-background/30 bg-background px-3 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-[hsl(var(--warning))]">
                {cur.fuel.units.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
              </select>
            </div>
            <p className="mt-4 font-mono text-sm leading-relaxed text-background/80" aria-live="polite">
              {inKg(cur.base)} {cur.fuel.unit}{cur.base === 1 ? "" : "s"} <span className="text-background/50">x</span> {fmtFactor(cur.fuel.factor)} kg CO2 per {cur.fuel.unit}
            </p>
            <p className="font-display text-4xl font-bold sm:text-5xl">= {inKg(cur.kg)}<span className="ml-1 text-lg font-semibold text-background/70">kg CO2</span></p>
            <p className="mt-1 text-sm text-background/70">{inT(cur.kg)} tonnes from this {cur.fuel.name.toLowerCase()}.</p>
          </div>
        </div>

        <div className="border-t border-background/15 px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            {results.map((r, i) => (
              <span key={i} className={`inline-flex items-center gap-1 rounded-full border text-sm ${i === active ? "border-background bg-background/10" : "border-background/25"}`}>
                <button type="button" onClick={() => setActive(i)} className="py-1.5 pl-3 pr-1 font-semibold">{r.fuel.name}: {inKg(r.kg)} kg</button>
                {lines.length > 1 && <button type="button" onClick={() => remove(i)} aria-label={`Remove ${r.fuel.name}`} className="rounded-full p-1.5 text-background/60 hover:text-background"><X className="h-3.5 w-3.5" /></button>}
              </span>
            ))}
            {lines.length < 6 && <button type="button" onClick={add} className="inline-flex items-center gap-1 rounded-full border border-dashed border-background/40 px-3 py-1.5 text-sm text-background/80 hover:border-background"><Plus className="h-3.5 w-3.5" /> Add a fuel</button>}
          </div>
          {lines.length > 1 && <p className="mt-3 text-sm text-background/80">All fuels: <b className="font-display text-xl text-background">{inKg(total)} kg</b> ({inT(total)} t) CO2</p>}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="font-display text-2xl font-bold text-foreground">Every factor, side by side</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">Each factor is per unit the fuel is usually sold in, so read litre against litre and kilogram against kilogram. Tap a fuel to load it above.</p>
        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {FUELS.map((f) => (
            <button key={f.id} type="button" onClick={() => pickFuel(f.id)} className="flex items-baseline justify-between rounded-xl border border-border bg-card px-4 py-3 text-left hover:border-primary/50">
              <span className="font-semibold text-foreground">{f.name}</span>
              <span className="font-mono text-sm text-muted-foreground">{fmtFactor(f.factor)} kg / {f.unit}</span>
            </button>
          ))}
        </div>
      </section>

      <ToolNextStep line="Got the fuel invoice? Upload it and Senseible reads the fuel, quantity and date line by line, applies these factors, and keeps the record with its source." cta="Upload a fuel invoice" />
      <ToolFaqs faqs={FAQS} />
    </ToolFrame>
  );
};

export default FuelCarbon;
