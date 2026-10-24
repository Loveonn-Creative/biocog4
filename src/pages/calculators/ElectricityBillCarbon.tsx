import { useMemo, useState } from "react";
import { ToolFaqs, ToolFrame, ToolNextStep, type ToolFaq } from "@/components/tools/ToolFrame";
import { GRID_FACTOR, electricityKg, inKg, inT } from "@/lib/calculators/quickCarbon";
import { FUEL_FACTORS } from "../../../supabase/functions/_shared/emissionFactors";

const PATH = "/calculators/electricity-bill-carbon";
const MONTHS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
const factorText = GRID_FACTOR.toLocaleString("en-IN", { minimumFractionDigits: 2 });

const FAQS: ToolFaq[] = [
  { q: "Which number on the bill do I type?", a: "Units consumed in kWh for the billing period, usually printed as present reading minus previous reading. If the bill shows both kWh and kVAh, use kWh: kVAh includes reactive power and is always the larger number." },
  { q: `Why ${factorText} kg CO2 per kWh?`, a: `It is the CEA grid factor Senseible uses in every calculation, so this tool gives the same answer as an uploaded bill. CEA publishes a new edition of its CO2 Baseline Database every year.` },
  { q: "Is this Scope 2?", a: "Yes. Grid electricity you buy is Scope 2, and this is the location-based figure: units times the grid average. Rooftop solar you generate yourself is not in these units, so it is not counted." },
  { q: "Can I use this figure in BRSR or for a buyer?", a: "As an estimate, yes. For a figure a buyer or auditor can check, it needs the bill behind it: the period, the meter and the units. Upload the bill and Senseible keeps that trail." },
];

/** One rolling digit: a strip of 0 to 9 that slides to the value. */
function Digit({ d }: { d: number }) {
  return (
    <span className="relative inline-block h-[1.15em] w-[0.68em] overflow-hidden rounded-[3px] bg-foreground/90 text-center text-background">
      <span className="absolute inset-x-0 top-0 flex flex-col transition-transform duration-500 ease-out motion-reduce:transition-none" style={{ transform: `translateY(-${d * 10}%)` }}>
        {Array.from({ length: 10 }, (_, i) => <span key={i} className="h-[1.15em] leading-[1.15em]">{i}</span>)}
      </span>
    </span>
  );
}

function Odometer({ value }: { value: number }) {
  const s = String(Math.min(9_999_999, Math.round(value))).padStart(6, "0");
  return <span className="inline-flex gap-[3px] font-mono text-4xl font-bold tabular-nums sm:text-5xl" aria-hidden="true">{s.split("").map((c, i) => <Digit key={i} d={Number(c)} />)}</span>;
}

/** CO2 as stacked blocks; the block size steps up so the stack stays readable. */
function CarbonStack({ kg }: { kg: number }) {
  const step = kg <= 2_000 ? 50 : kg <= 20_000 ? 500 : kg <= 200_000 ? 5_000 : 50_000;
  const blocks = Math.min(40, Math.ceil(kg / step));
  const label = step >= 1000 ? `${step / 1000} t` : `${step} kg`;
  return (
    <div className="flex items-end gap-3" aria-hidden="true">
      <div className="grid w-28 grid-cols-4 content-end gap-[3px]" style={{ minHeight: "10.5rem" }}>
        {Array.from({ length: blocks }, (_, i) => (
          <span key={`${step}-${i}`} className="eb-block h-[0.85rem] rounded-[2px] bg-foreground/80" style={{ animationDelay: `${Math.min(i, 30) * 18}ms` }} />
        ))}
      </div>
      <p className="pb-1 text-xs leading-tight text-muted-foreground">each block<br /><b className="text-foreground">{label}</b> CO2</p>
    </div>
  );
}

const ElectricityBillCarbon = () => {
  const [mode, setMode] = useState<"month" | "year">("month");
  const [kwh, setKwh] = useState(2500);
  const [months, setMonths] = useState<number[]>(() => Array(12).fill(2500));

  const units = mode === "month" ? kwh : months.reduce((a, b) => a + (b > 0 ? b : 0), 0);
  const kg = useMemo(() => electricityKg(mode === "month" ? kwh : months), [mode, kwh, months]);
  const dieselLitres = kg / FUEL_FACTORS.DIESEL.value;
  const peak = Math.max(1, ...months);

  const toYear = () => { setMonths(Array(12).fill(kwh)); setMode("year"); };
  const slider = Math.round(Math.log10(Math.max(10, kwh)) * 100);

  return (
    <ToolFrame path={PATH} name="Electricity bill to CO2 calculator" faqs={FAQS}>
      <style>{`.eb-block{animation:eb-in .35s ease-out both}@keyframes eb-in{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}@media (prefers-reduced-motion: reduce){.eb-block{animation:none}}`}</style>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div>
          <h1 className="font-display text-3xl font-bold leading-tight text-foreground sm:text-5xl">Your electricity bill, in kilograms of CO2.</h1>
          <p className="mt-3 max-w-xl text-base text-muted-foreground">Type the units on the bill. You get the same figure Senseible would record from it, at {factorText} kg CO2 for every kWh drawn from India's grid.</p>
        </div>

        <div className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex rounded-full bg-muted p-1 text-sm font-semibold" role="tablist" aria-label="Period">
            <button type="button" role="tab" aria-selected={mode === "month"} onClick={() => setMode("month")} className={`flex-1 rounded-full py-2 ${mode === "month" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>One bill</button>
            <button type="button" role="tab" aria-selected={mode === "year"} onClick={toYear} className={`flex-1 rounded-full py-2 ${mode === "year" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>A year of bills</button>
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <Odometer value={units} />
            <span className="text-sm font-semibold text-muted-foreground">kWh</span>
          </div>

          {mode === "month" ? (
            <div className="mt-4 space-y-3">
              <label className="block text-sm font-medium text-foreground" htmlFor="eb-kwh">Units consumed this bill</label>
              <input id="eb-kwh" type="number" inputMode="numeric" min={0} value={Number.isFinite(kwh) ? kwh : ""} onChange={(e) => setKwh(Math.max(0, Number(e.target.value) || 0))} className="h-12 w-full rounded-xl border border-input bg-card px-4 font-mono text-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
              <input type="range" min={100} max={600} value={slider} onChange={(e) => setKwh(Math.round(10 ** (Number(e.target.value) / 100)))} className="w-full accent-[hsl(var(--primary))]" aria-label="Units, from 100 to 10 lakh kWh" />
              <div className="flex justify-between text-[11px] text-muted-foreground"><span>100</span><span>10,000</span><span>10 lakh</span></div>
            </div>
          ) : (
            <div className="mt-4">
              <p className="text-sm font-medium text-foreground">Units each month, April to March</p>
              <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-4 xl:grid-cols-6">
                {months.map((m, i) => (
                  <label key={MONTHS[i]} className="flex flex-col items-center gap-1">
                    <span className="flex h-10 w-full items-end overflow-hidden rounded-md bg-muted"><i className="block w-full rounded-md bg-primary/70 transition-[height] duration-300 motion-reduce:transition-none" style={{ height: `${Math.max(4, (Math.max(0, m) / peak) * 100)}%` }} /></span>
                    <input type="number" inputMode="numeric" min={0} value={m} aria-label={`${MONTHS[i]} kWh`} onChange={(e) => setMonths((p) => p.map((v, j) => (j === i ? Math.max(0, Number(e.target.value) || 0) : v)))} className="h-9 w-full min-w-0 rounded-md border border-input bg-card px-1 text-center font-mono text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                    <span className="text-[10px] text-muted-foreground">{MONTHS[i]}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t border-border pt-5">
            <div aria-live="polite">
              <p className="text-sm text-muted-foreground">{mode === "month" ? "This bill" : "This year"}</p>
              <p className="whitespace-nowrap font-display text-4xl font-bold text-foreground sm:text-5xl">{inKg(kg)}<span className="ml-1 text-lg font-semibold text-muted-foreground">kg CO2</span></p>
              <p className="mt-1 text-sm text-muted-foreground">{inT(kg)} tonnes. Burning about {inKg(dieselLitres)} litres of diesel releases the same.</p>
            </div>
            <CarbonStack kg={kg} />
          </div>
        </div>
      </section>

      <section className="mt-14 grid gap-8 md:grid-cols-2 md:items-center">
        <div aria-hidden="true" className="relative mx-auto w-full max-w-sm rotate-[-1.5deg] rounded-xl border border-border bg-card p-5 font-mono text-xs text-muted-foreground shadow-sm">
          <p className="text-[11px] uppercase tracking-wider">Electricity bill</p>
          <div className="mt-3 space-y-1.5">
            <p className="flex justify-between"><span>Billing period</span><span>01 Sep to 30 Sep</span></p>
            <p className="flex justify-between"><span>Tariff category</span><span>LT industrial</span></p>
            <p className="flex justify-between"><span>Present reading</span><span>48,920</span></p>
            <p className="flex justify-between"><span>Previous reading</span><span>46,420</span></p>
            <p className="-mx-2 flex justify-between rounded-md bg-primary/10 px-2 py-1 font-bold text-foreground ring-2 ring-primary"><span>Units consumed (kWh)</span><span>2,500</span></p>
            <p className="flex justify-between opacity-70"><span>Units (kVAh)</span><span>2,690</span></p>
          </div>
        </div>
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Type the kWh line. Not kVAh, not rupees.</h2>
          <p className="mt-3 text-muted-foreground">Units consumed is present reading minus previous reading. Many industrial bills also print kVAh, which counts reactive power too and is always higher. Using it overstates your carbon.</p>
          <p className="mt-3 text-muted-foreground">Own rooftop solar? Those units never pass through the meter as grid power, so they are already left out.</p>
        </div>
      </section>

      <ToolNextStep line="This is one number, typed. Upload the bill itself and Senseible reads the period, tariff and units, and keeps it as a record your buyer or lender can check." cta="Upload my bill" />
      <ToolFaqs faqs={FAQS} />
    </ToolFrame>
  );
};

export default ElectricityBillCarbon;
