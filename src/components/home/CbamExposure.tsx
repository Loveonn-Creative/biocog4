import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useT } from "@/lib/i18n/useT";
import { calculateCBAM, CBAM_SECTORS, DEFAULT_EU_ETS_PRICE } from "@/lib/cbamEngine";

// First annual CBAM declaration (covering 2026 imports), Regulation (EU) 2025/2083.
const FIRST_DECLARATION = new Date("2027-09-30T23:59:59Z");

const OPTIONS = [
  { sectorId: "steel", routeId: "bf-bof" },
  { sectorId: "aluminium", routeId: "primary-mixed" },
  { sectorId: "cement", routeId: "grey-clinker" },
  { sectorId: "fertilizers", routeId: "haber-bosch-gas" },
];

const eur = (n: number) => `€${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

/**
 * "What will your EU buyer pay per tonne?" Loss framing with real numbers from
 * the CBAM engine, and the method one tap away. No invented urgency: the only
 * deadline shown is the legal one.
 */
export const CbamExposure = () => {
  const t = useT();
  const [sectorId, setSectorId] = useState("steel");
  const [verified, setVerified] = useState(false);
  const option = OPTIONS.find(o => o.sectorId === sectorId)!;
  const sector = CBAM_SECTORS.find(s => s.id === sectorId)!;

  const perTonne = useMemo(() => {
    const base = { sectorId, productionRouteId: option.routeId, countryCode: "IN", supplierName: "x", tonnage: 1000, carbonPricePaid: null, euEtsPrice: DEFAULT_EU_ETS_PRICE };
    const fallback = calculateCBAM({ ...base, actualEmissionsIntensity: null });
    const r = verified ? calculateCBAM({ ...base, actualEmissionsIntensity: fallback.emissionsIntensityUsed }) : fallback;
    const at = (y: number) => r.yearlyResults.find(x => x.year === y)!.costPerTonne;
    return { y2026: at(2026), y2027: at(2027), y2030: at(2030), intensity: r.emissionsIntensityUsed, route: r.routeName };
  }, [sectorId, option.routeId, verified]);

  const daysLeft = Math.max(0, Math.ceil((FIRST_DECLARATION.getTime() - Date.now()) / 86_400_000));

  return (
    <div className="rounded-3xl border border-border p-5 sm:p-8 bg-background">
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("home.cbam.sector_label", "Product")}>
        {OPTIONS.map(o => {
          const s = CBAM_SECTORS.find(x => x.id === o.sectorId)!;
          const active = o.sectorId === sectorId;
          return (
            <button
              key={o.sectorId}
              role="radio"
              aria-checked={active}
              onClick={() => setSectorId(o.sectorId)}
              className={`rounded-full px-3.5 py-1.5 text-sm border transition-colors ${active ? "bg-foreground text-background border-foreground" : "border-border hover:bg-secondary"}`}
            >
              {s.name}
            </button>
          );
        })}
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        {t("home.cbam.lead", "Estimated CBAM cost your EU buyer pays per tonne of {sector} from India")
          .replace("{sector}", sector.name.toLowerCase())}
      </p>
      <div className="mt-2 grid grid-cols-3 gap-3">
        {[
          { label: "2026", value: perTonne.y2026 },
          { label: "2027", value: perTonne.y2027 },
          { label: "2030", value: perTonne.y2030 },
        ].map(c => (
          <div key={c.label} className="rounded-2xl bg-secondary/50 p-3 sm:p-4">
            <p className="font-mono text-xl sm:text-3xl font-semibold tracking-tight">{eur(c.value)}</p>
            <p className="text-xs text-muted-foreground mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      <label className="mt-4 flex items-center gap-3 text-sm cursor-pointer select-none">
        <input type="checkbox" checked={verified} onChange={e => setVerified(e.target.checked)} className="h-4 w-4 accent-[hsl(var(--primary))]" />
        {t("home.cbam.toggle", "My buyer has my verified emissions data")}
      </label>
      <p className="mt-2 text-xs text-muted-foreground">
        {(verified
          ? t("home.cbam.note_verified", "Using {intensity} tCO2 per tonne ({route}) with no mark-up.")
          : t("home.cbam.note_default", "Without your data the buyer uses a default value of {intensity} tCO2 per tonne plus a mark-up (10% in 2026, 20% in 2027, 30% from 2028)."))
          .replace("{intensity}", String(perTonne.intensity))
          .replace("{route}", perTonne.route)}{" "}
        {t("home.cbam.price", "Certificate price €{price} (Q3 2026). Benchmarks indicative.").replace("{price}", String(DEFAULT_EU_ETS_PRICE))}
      </p>

      <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between border-t border-border pt-5">
        <p className="text-sm">
          <span className="font-mono text-2xl font-semibold">{daysLeft}</span>{" "}
          <span className="text-muted-foreground">{t("home.cbam.countdown", "days until the first CBAM declaration is due (30 September 2027)")}</span>
        </p>
        <Link to="/cbam-calculator" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline underline-offset-4">
          {t("home.cbam.cta", "Run it with your tonnage")} <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};
