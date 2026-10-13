import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useT } from "@/lib/i18n/useT";
import { StatusBadge } from "../StatusBadge";
import { suiteModules, type SuiteModule } from "@/data/enterpriseCapabilities";
import { FRAMEWORKS, assessFramework, EMPTY_AVAILABILITY } from "@/lib/reportFrameworks";

/* Each module gets the picture its users actually read. Values are illustrative. */

const Scope3Strip = () => {
  // GHG Protocol Scope 3 categories 1 to 15; shading shows data tier per category (illustrative).
  const tiers = ["p", "d", "d", "d", "e", "d", "e", "e", "d", "e", "e", "e", "e", "e", "e"];
  const fill = { p: "hsl(var(--primary))", d: "hsl(var(--success))", e: "hsl(var(--warning))" } as const;
  return (
    <svg viewBox="0 0 300 92" className="w-full h-auto" role="img" aria-label="Scope 3 categories 1 to 15 shaded by data tier">
      {tiers.map((tier, i) => (
        <g key={i}>
          <rect x={4 + i * 19.5} y={14} width={16} height={52} rx={4} fill={fill[tier as keyof typeof fill]} opacity={tier === "e" ? 0.45 : 0.9}
            className="ent-bar-y" style={{ animationDelay: `${i * 30}ms` }} />
          <text x={12 + i * 19.5} y={82} textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))">{i + 1}</text>
        </g>
      ))}
    </svg>
  );
};

const PcfStack = () => {
  const stages = [
    { k: "Materials", v: 46, c: "hsl(var(--warning))" },
    { k: "Energy in production", v: 31, c: "hsl(var(--primary))" },
    { k: "Packaging", v: 9, c: "hsl(var(--accent))" },
    { k: "Transport to gate", v: 14, c: "hsl(var(--success))" },
  ];
  return (
    <div>
      <div className="flex h-9 w-full overflow-hidden rounded-lg" role="img" aria-label="Cradle-to-gate footprint split by stage">
        {stages.map(s => <div key={s.k} className="h-full origin-left animate-[ent-grow-x_0.6s_ease-out_both]" style={{ width: `${s.v}%`, background: s.c }} />)}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        {stages.map(s => <li key={s.k} className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: s.c }} />{s.k}<span className="ml-auto font-mono text-muted-foreground">{s.v}%</span></li>)}
      </ul>
    </div>
  );
};

const LcaLoop = () => {
  // The four ISO 14040/14044 phases, with interpretation feeding back to each.
  const phases = ["Goal and scope", "Inventory", "Impact assessment", "Interpretation"];
  return (
    <svg viewBox="0 0 300 120" className="w-full h-auto" role="img" aria-label="The four phases of a life cycle assessment">
      <path d="M40 60 C 80 10, 220 10, 260 60 C 220 110, 80 110, 40 60" fill="none" stroke="hsl(var(--border))" strokeWidth="1.5" strokeDasharray="4 5" />
      {phases.map((p, i) => {
        const pos = [[40, 60], [150, 22], [260, 60], [150, 98]][i];
        return (
          <g key={p}>
            <circle cx={pos[0]} cy={pos[1]} r="7" fill="hsl(var(--background))" stroke="hsl(var(--primary))" strokeWidth="2" />
            <text x={pos[0]} y={i === 1 ? pos[1] - 12 : i === 3 ? pos[1] + 20 : pos[1] + 22} textAnchor="middle" fontSize="9" fill="hsl(var(--foreground))">{p}</text>
          </g>
        );
      })}
      <circle r="3.5" fill="hsl(var(--primary))" className="ent-orbit-dot" />
    </svg>
  );
};

const Macc = () => {
  // Marginal abatement cost curve: width = tonnes cut, height = cost per tonne (below the line saves money).
  const bars = [
    { w: 34, h: -26, k: "LED and power factor" }, { w: 42, h: -14, k: "Green tariff" }, { w: 58, h: 8, k: "Rooftop solar" },
    { w: 48, h: 22, k: "Boiler efficiency" }, { w: 70, h: 44, k: "Fleet to EV/CNG" },
  ];
  let x = 10;
  return (
    <svg viewBox="0 0 300 130" className="w-full h-auto" role="img" aria-label="Abatement options ranked by cost per tonne">
      <line x1="6" y1="70" x2="294" y2="70" stroke="hsl(var(--foreground))" strokeOpacity="0.4" />
      {bars.map(b => {
        const el = (
          <g key={b.k}>
            <rect x={x} y={b.h < 0 ? 70 : 70 - b.h} width={b.w - 3} height={Math.abs(b.h)} rx="2" fill={b.h < 0 ? "hsl(var(--success))" : "hsl(var(--primary))"} opacity="0.85" />
            <title>{b.k}</title>
          </g>
        );
        x += b.w;
        return el;
      })}
      <text x="8" y="122" fontSize="9" fill="hsl(var(--muted-foreground))">Saves money</text>
      <text x="292" y="16" fontSize="9" textAnchor="end" fill="hsl(var(--muted-foreground))">Costs per tonne</text>
    </svg>
  );
};

const Materiality = () => {
  // ESRS topical standards placed on impact (y) and financial (x) materiality; positions illustrative.
  const topics = [
    { k: "E1 Climate", x: 82, y: 86 }, { k: "E2 Pollution", x: 48, y: 62 }, { k: "E3 Water", x: 40, y: 70 },
    { k: "E4 Biodiversity", x: 22, y: 38 }, { k: "E5 Resources", x: 66, y: 58 }, { k: "S1 Own workforce", x: 58, y: 74 },
    { k: "S2 Value-chain workers", x: 36, y: 64 }, { k: "G1 Conduct", x: 70, y: 40 },
  ];
  const [hover, setHover] = useState<string | null>("E1 Climate");
  return (
    <div>
      <svg viewBox="0 0 300 170" className="w-full h-auto" role="img" aria-label="Double materiality matrix of ESRS topics">
        <rect x="150" y="10" width="140" height="70" fill="hsl(var(--primary))" opacity="0.07" />
        <line x1="150" y1="10" x2="150" y2="150" stroke="hsl(var(--border))" strokeDasharray="3 3" />
        <line x1="10" y1="80" x2="290" y2="80" stroke="hsl(var(--border))" strokeDasharray="3 3" />
        <text x="290" y="164" fontSize="8" textAnchor="end" fill="hsl(var(--muted-foreground))">Financial materiality →</text>
        <text x="12" y="20" fontSize="8" fill="hsl(var(--muted-foreground))">↑ Impact materiality</text>
        {topics.map(tp => {
          const cx = 10 + tp.x * 2.8, cy = 150 - tp.y * 1.4;
          const material = tp.x >= 50 || tp.y >= 50;
          return (
            <circle key={tp.k} cx={cx} cy={cy} r={hover === tp.k ? 7 : 5} tabIndex={0}
              fill={material ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"} opacity={material ? 0.9 : 0.5}
              onMouseEnter={() => setHover(tp.k)} onFocus={() => setHover(tp.k)} className="cursor-pointer transition-all outline-none">
              <title>{tp.k}</title>
            </circle>
          );
        })}
      </svg>
      <p className="text-xs text-muted-foreground" aria-live="polite">{hover}</p>
    </div>
  );
};

const FrameworkRings = () => {
  // Computed by the report engine for a sample dataset with Scope 1, Scope 2 and energy records.
  const sample = { ...EMPTY_AVAILABILITY, scope1: true, scope2: true, energy: true };
  const ids = ["GHG_PROTOCOL", "ISO_14064", "INDIA_BRSR_CORE", "CDP", "CSRD_ESRS"];
  return (
    <div className="grid grid-cols-5 gap-2">
      {ids.map(id => {
        const a = assessFramework(FRAMEWORKS[id], sample);
        const c = 2 * Math.PI * 15;
        return (
          <figure key={id} className="flex flex-col items-center gap-1">
            <svg viewBox="0 0 40 40" className="w-12 h-12 -rotate-90" aria-hidden="true">
              <circle cx="20" cy="20" r="15" fill="none" stroke="hsl(var(--border))" strokeWidth="4" />
              <circle cx="20" cy="20" r="15" fill="none" stroke="hsl(var(--primary))" strokeWidth="4" strokeLinecap="round"
                strokeDasharray={`${(a.completeness / 100) * c} ${c}`} className="transition-[stroke-dasharray] duration-700" />
            </svg>
            <figcaption className="text-[10px] text-center leading-tight">{a.framework.shortName}<br /><span className="font-mono text-muted-foreground">{a.completeness}%</span></figcaption>
          </figure>
        );
      })}
    </div>
  );
};

const VISUAL: Record<string, () => JSX.Element> = {
  scope3: Scope3Strip, pcf: PcfStack, lca: LcaLoop, decarb: Macc, dma: Materiality, reporting: FrameworkRings,
};

/**
 * The whole suite as one working dashboard: pick a module on the rail and its
 * panel shows what goes in, what comes out, its status and where to go next.
 */
export const SuiteDashboard = ({ onAsk }: { onAsk: (interest: string) => void }) => {
  const t = useT();
  const [active, setActive] = useState<SuiteModule["key"]>("scope3");
  const m = suiteModules.find(x => x.key === active)!;
  const Visual = VISUAL[m.key];
  const label = (x: SuiteModule) => t(`ent.suite.${x.key}`, x.label);

  return (
    <div className="rounded-3xl border border-border bg-secondary/30 overflow-hidden">
      <div className="grid md:grid-cols-[15rem_1fr]">
        <div role="tablist" aria-label={t("ent.suite.aria", "Suite modules")} className="flex md:flex-col gap-1 overflow-x-auto p-2 md:p-3 border-b md:border-b-0 md:border-r border-border bg-background/60 [scrollbar-width:none]">
          {suiteModules.map(x => (
            <button key={x.key} role="tab" id={`suite-tab-${x.key}`} aria-selected={x.key === active} aria-controls="suite-panel"
              onClick={() => setActive(x.key)}
              className={`shrink-0 text-left rounded-xl px-3 py-2.5 text-sm transition-colors ${x.key === active ? "bg-foreground text-background" : "hover:bg-secondary"}`}>
              <span className="block font-medium whitespace-nowrap md:whitespace-normal">{label(x)}</span>
            </button>
          ))}
        </div>

        <div id="suite-panel" role="tabpanel" aria-labelledby={`suite-tab-${m.key}`} key={m.key} className="p-5 sm:p-7 animate-[ent-fade-up_0.35s_ease-out_both]">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-xl sm:text-2xl font-semibold tracking-tight">{label(m)}</h3>
            <StatusBadge status={m.status} />
          </div>
          {m.note && <p className="mt-1 text-sm text-muted-foreground">{t(`ent.suite.${m.key}.note`, m.note)}</p>}

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div className="rounded-2xl bg-background border border-border p-4">
              <Visual />
              <p className="mt-2 text-[10px] text-muted-foreground">{t("ent.suite.illus", "Illustration, not customer data.")}</p>
            </div>
            <dl className="grid gap-4 text-sm">
              <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">{t("ent.suite.in", "Goes in")}</dt><dd className="mt-1">{t(`ent.suite.${m.key}.in`, m.input)}</dd></div>
              <div><dt className="text-xs uppercase tracking-wider text-muted-foreground">{t("ent.suite.out", "Comes out")}</dt><dd className="mt-1 font-medium">{t(`ent.suite.${m.key}.out`, m.output)}</dd></div>
              <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1">
                <Link to={m.to} className="inline-flex items-center gap-1.5 font-medium underline underline-offset-4">{t("ent.suite.open", "See how it works")} <ArrowRight className="w-3.5 h-3.5" /></Link>
                <button onClick={() => onAsk(m.label)} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground underline underline-offset-4">{t("ent.suite.ask", "Plan this with us")}</button>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
};
