import { useMemo, useState } from "react";
import { useT } from "@/lib/i18n/useT";
import { FRAMEWORKS, assessFramework, EMPTY_AVAILABILITY } from "@/lib/reportFrameworks";

const REGIONS = {
  global: ["GHG_PROTOCOL", "ISO_14064", "ISSB_S2", "GRI_305", "CDP", "SBTI"],
  eu: ["CSRD_ESRS", "CBAM"],
  india: ["INDIA_BRSR", "INDIA_BRSR_CORE"],
} as const;
type Region = keyof typeof REGIONS | "all";
const LABEL: Record<string, [string, string?]> = {
  GHG_PROTOCOL: ["GHG", "Protocol"], ISO_14064: ["ISO", "14064-1"], ISSB_S2: ["ISSB", "S2"], GRI_305: ["GRI", "305"], CDP: ["CDP"],
  SBTI: ["SBTi"], CSRD_ESRS: ["CSRD", "ESRS"], CBAM: ["CBAM"], INDIA_BRSR: ["BRSR"], INDIA_BRSR_CORE: ["BRSR", "Core"],
};
const ALL = [...REGIONS.global, ...REGIONS.eu, ...REGIONS.india];

// What the platform can evidence once an enterprise's data is complete:
// every scope, energy, a recorded target and product-level (HSN/CN) records.
// No intensity denominator is captured today; governance and risk narratives
// are always the entity's own.
const COMPLETE = { ...EMPTY_AVAILABILITY, scope1: true, scope2: true, scope3: true, energy: true, targets: true, productLevel: true };

/**
 * One verified record at the centre, every framework around it. Pick one and
 * the beam shows exactly which of its disclosures the record fills, which
 * need more data and which only you can write. Mappings come from the same
 * engine that builds the reports.
 */
export const StandardsPrism = () => {
  const t = useT();
  const [region, setRegion] = useState<Region>("all");
  const [active, setActive] = useState<string>("GHG_PROTOCOL");
  const ids = region === "all" ? ALL : REGIONS[region];
  const a = useMemo(() => assessFramework(FRAMEWORKS[active], COMPLETE), [active]);

  const pick = (r: Region) => {
    setRegion(r);
    const list = r === "all" ? ALL : REGIONS[r];
    if (!list.includes(active as never)) setActive(list[0]);
  };

  const R = 128, C = 180;
  const pos = (i: number, n: number) => {
    const ang = -Math.PI / 2 + (i / n) * Math.PI * 2;
    return { x: C + Math.cos(ang) * R, y: C + Math.sin(ang) * R };
  };
  const activeIndex = ids.indexOf(active as never);
  const target = activeIndex >= 0 ? pos(activeIndex, ids.length) : null;

  const regionLabel: Record<Region, string> = {
    all: t("ent.std.all", "All"), global: t("ent.std.global", "Global"), eu: t("ent.std.eu", "European Union"), india: t("ent.std.india", "India"),
  };

  return (
    <div>
      <div role="radiogroup" aria-label={t("ent.std.region", "Region")} className="flex flex-wrap gap-2 mb-6">
        {(["all", "global", "eu", "india"] as Region[]).map(r => (
          <button key={r} role="radio" aria-checked={r === region} onClick={() => pick(r)}
            className={`rounded-full px-4 py-1.5 text-sm ${r === region ? "bg-foreground text-background" : "border border-border hover:bg-secondary"}`}>{regionLabel[r]}</button>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-center">
        <svg viewBox="0 0 360 360" className="w-full max-w-[420px] mx-auto h-auto" role="group" aria-label={t("ent.std.aria", "Frameworks around one verified record")}>
          <circle cx={C} cy={C} r={R} fill="none" stroke="hsl(var(--border))" strokeDasharray="2 5" />
          {target && (
            <line key={active} x1={C} y1={C} x2={target.x} y2={target.y} stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round"
              pathLength={1} strokeDasharray="1" strokeDashoffset="1" className="animate-[ent-draw_0.45s_ease-out_forwards]" />
          )}
          <g>
            <circle cx={C} cy={C} r="34" fill="hsl(var(--foreground))" />
            <text x={C} y={C - 3} textAnchor="middle" fontSize="10" fill="hsl(var(--background))">{t("ent.std.record", "Verified")}</text>
            <text x={C} y={C + 10} textAnchor="middle" fontSize="10" fill="hsl(var(--background))">{t("ent.std.record2", "record")}</text>
          </g>
          {ids.map((id, i) => {
            const p = pos(i, ids.length);
            const on = id === active;
            return (
              <g key={id} role="button" tabIndex={0} aria-pressed={on} aria-label={FRAMEWORKS[id].name}
                onClick={() => setActive(id)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActive(id); } }}
                className="cursor-pointer outline-none [&:focus-visible>circle]:stroke-[3]">
                <circle cx={p.x} cy={p.y} r={on ? 27 : 23} fill={on ? "hsl(var(--primary))" : "hsl(var(--background))"} stroke="hsl(var(--primary))" strokeWidth="1.5" className="transition-all" />
                <text x={p.x} y={LABEL[id][1] ? p.y - 1 : p.y + 3.5} textAnchor="middle" fontSize="9" fontWeight="600" fill={on ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))"}>
                  {LABEL[id][0]}
                  {LABEL[id][1] && <tspan x={p.x} dy="10" fontSize="8" fontWeight="400">{LABEL[id][1]}</tspan>}
                </text>
              </g>
            );
          })}
        </svg>

        <div key={active} className="animate-[ent-fade-up_0.3s_ease-out_both]" aria-live="polite">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{a.framework.shortName}</p>
          <h3 className="mt-1 text-lg sm:text-xl font-semibold leading-snug">{a.framework.name}</h3>
          <ul className="mt-5 space-y-2">
            {a.satisfied.map(ref => (
              <li key={ref} className="flex items-start gap-3 text-sm"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden="true" /><span><span className="font-mono text-xs text-muted-foreground mr-2">{ref}</span>{t("ent.std.fills", "Filled from your verified records")}</span></li>
            ))}
            {a.dataGaps.map(g => (
              <li key={g.reference} className="flex items-start gap-3 text-sm"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-warning" aria-hidden="true" /><span><span className="font-mono text-xs text-muted-foreground mr-2">{g.reference}</span>{g.reason}</span></li>
            ))}
            {a.notApplicable.map(g => (
              <li key={g.reference} className="flex items-start gap-3 text-sm"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full border border-foreground/50" aria-hidden="true" /><span><span className="font-mono text-xs text-muted-foreground mr-2">{g.reference}</span>{t("ent.std.author", "Written by you; Senseible supplies the evidence")}</span></li>
            ))}
          </ul>
          {a.framework.note && <p className="mt-4 text-xs text-muted-foreground">{a.framework.note}</p>}
          <p className="mt-4 text-xs text-muted-foreground">{t("ent.std.basis", "Shown for a complete dataset. Reports are labelled self-reported; filing and assurance stay with you.")}</p>
        </div>
      </div>
    </div>
  );
};
