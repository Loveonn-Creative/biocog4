import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useT } from "@/lib/i18n/useT";
import { calculateCBAM, DEFAULT_EU_ETS_PRICE } from "@/lib/cbamEngine";
import { useSpring } from "@/components/services/motion/kit";

// CBAM cost from the same engine as /cbam-calculator: Regulation (EU)
// 2023/956 as amended by 2025/2083, default values and mark-ups per
// Implementing Regulation (EU) 2025/2621, EU ETS price DEFAULT_EU_ETS_PRICE.
// Example: Indian blast-furnace steel (BF-BOF) sold into the EU.
const YEARS = [2026, 2030, 2034] as const;
const eur = (n: number) => `€${Math.round(n).toLocaleString("en-US")}`;

/**
 * The same tonnes, priced twice: at EU default values (the liability) and at
 * the intensity your verified data shows (the decision). Sliders change both.
 */
export const LiabilityToProfit = () => {
  const t = useT();
  const [tonnes, setTonnes] = useState(5000);
  const [intensity, setIntensity] = useState(1.9);
  const [year, setYear] = useState<(typeof YEARS)[number]>(2030);

  const r = useMemo(() => {
    const base = { sectorId: "steel", productionRouteId: "bf-bof", countryCode: "IN", supplierName: "", tonnage: tonnes, carbonPricePaid: null, euEtsPrice: DEFAULT_EU_ETS_PRICE };
    const at = (res: ReturnType<typeof calculateCBAM>) => res.yearlyResults.find(y => y.year === year)!;
    const def = at(calculateCBAM({ ...base, actualEmissionsIntensity: null }));
    const act = at(calculateCBAM({ ...base, actualEmissionsIntensity: intensity }));
    return { def: def.netCbamCost, act: act.netCbamCost, defIntensity: def.totalEmissions / tonnes };
  }, [tonnes, intensity, year]);

  const defShown = useSpring(r.def);
  const actShown = useSpring(r.act);
  const diff = r.def - r.act;
  const max = Math.max(r.def, r.act, 1);

  return (
    <div className="rounded-3xl border border-border overflow-hidden">
      <div className="grid lg:grid-cols-[1fr_1.15fr]">
        <div className="p-5 sm:p-7 space-y-6 border-b lg:border-b-0 lg:border-r border-border">
          <label className="block">
            <span className="flex justify-between text-sm"><span>{t("ent.liab.tonnes", "Steel sold into the EU each year")}</span><span className="font-mono tabular-nums">{tonnes.toLocaleString("en-US")} t</span></span>
            <input type="range" min={500} max={20000} step={500} value={tonnes} onChange={e => setTonnes(Number(e.target.value))} className="mt-3 w-full accent-[hsl(var(--primary))]" />
          </label>
          <label className="block">
            <span className="flex justify-between text-sm"><span>{t("ent.liab.intensity", "What your verified data shows")}</span><span className="font-mono tabular-nums">{intensity.toFixed(2)} tCO2/t</span></span>
            <input type="range" min={1.4} max={2.6} step={0.05} value={intensity} onChange={e => setIntensity(Number(e.target.value))} className="mt-3 w-full accent-[hsl(var(--primary))]" />
            <span className="mt-1 block text-xs text-muted-foreground">{t("ent.liab.default", "EU default for this route in {year}, with mark-up:").replace("{year}", String(year))} {r.defIntensity.toFixed(2)} tCO2/t</span>
          </label>
          <div role="radiogroup" aria-label={t("ent.liab.year", "Year")} className="flex gap-2">
            {YEARS.map(y => (
              <button key={y} role="radio" aria-checked={y === year} onClick={() => setYear(y)}
                className={`rounded-full px-4 py-1.5 text-sm font-mono ${y === year ? "bg-foreground text-background" : "border border-border hover:bg-secondary"}`}>{y}</button>
            ))}
          </div>
        </div>

        <div className="p-5 sm:p-7">
          <div className="space-y-5">
            <div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t("ent.liab.liability", "Liability at EU default values")}</span><span className="font-mono tabular-nums">{eur(defShown)}</span></div>
              <div className="mt-2 h-3 rounded-full bg-border overflow-hidden"><div className="h-full rounded-full bg-warning transition-[width] duration-500" style={{ width: `${(r.def / max) * 100}%` }} /></div>
            </div>
            <div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t("ent.liab.actual", "With your verified data")}</span><span className="font-mono tabular-nums">{eur(actShown)}</span></div>
              <div className="mt-2 h-3 rounded-full bg-border overflow-hidden"><div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${(r.act / max) * 100}%` }} /></div>
            </div>
          </div>

          <div className={`mt-7 rounded-2xl p-4 sm:p-5 ${diff >= 0 ? "bg-primary/10" : "bg-warning/10"}`} aria-live="polite">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{t("ent.liab.decision", "The decision in {year}").replace("{year}", String(year))}</p>
            <p className="mt-1 text-2xl sm:text-3xl font-semibold tabular-nums">{diff >= 0 ? eur(diff) : eur(-diff)}</p>
            <p className="mt-1 text-sm">
              {diff >= 0
                ? t("ent.liab.saves", "less CBAM cost on these tonnes when your buyer declares your verified data instead of defaults.")
                : t("ent.liab.more", "more than the default on these tonnes. Verified data shows where to cut first.")}
            </p>
          </div>

          <ul className="mt-6 grid gap-2 text-sm">
            <li className="flex gap-2"><span aria-hidden="true">→</span>{t("ent.liab.d1", "Price EU contracts on actual intensity, not defaults")}</li>
            <li className="flex gap-2"><span aria-hidden="true">→</span>{t("ent.liab.d2", "Work first with suppliers above the EU benchmark")}</li>
            <li className="flex gap-2"><span aria-hidden="true">→</span><Link to="/green-finance" className="underline underline-offset-4">{t("ent.liab.d3", "Use the same verified record for green finance")}</Link></li>
          </ul>
          <Link to="/cbam-calculator" className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium underline underline-offset-4">{t("ent.liab.calc", "Run your own sector in the CBAM calculator")} <ArrowRight className="w-3.5 h-3.5" /></Link>
        </div>
      </div>
    </div>
  );
};
