import { useSpring } from "@/components/services/motion/kit";
import { SBTI_MIN_ANNUAL_PCT, formatCo2, type BadgeKey } from "@/lib/netZeroEngine";

/* ------------------------------ Summit trail ------------------------------ */

export interface TrailStep { id: string; label: string }

// Five levels climbing to the summit; positions in a 360 x 130 drawing.
const NODES = [
  { x: 30, y: 108 }, { x: 102, y: 92 }, { x: 174, y: 70 }, { x: 246, y: 50 }, { x: 318, y: 26 },
];
const PATH = "M30 108 C 60 104, 76 96, 102 92 S 150 76, 174 70 S 222 54, 246 50 S 296 32, 318 26";

/**
 * The five steps as a climb. Done levels are filled, the current one carries
 * the climber, and every level is a button. The flag is net zero.
 */
export const SummitTrail = ({ steps, active, done, onPick }: { steps: TrailStep[]; active: string; done: Set<string>; onPick: (id: string) => void }) => {
  const ai = Math.max(0, steps.findIndex(s => s.id === active));
  const doneUpTo = steps.reduce((n, s, i) => (done.has(s.id) ? i + 1 : n), 0);
  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <svg viewBox="0 0 360 130" className="w-full h-auto" aria-hidden="true">
        <path d="M0 130 L58 74 L94 100 L168 34 L210 66 L262 16 L338 98 L360 130 Z" fill="hsl(var(--primary))" opacity="0.06" />
        <path d={PATH} fill="none" stroke="hsl(var(--border))" strokeWidth="3" strokeLinecap="round" strokeDasharray="1 6" />
        <path d={PATH} fill="none" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" pathLength={1}
          strokeDasharray="1" strokeDashoffset={1 - doneUpTo / steps.length} style={{ transition: "stroke-dashoffset .6s ease-out" }} />
        <g transform="translate(330 4)">
          <line x1="0" y1="0" x2="0" y2="22" stroke="hsl(var(--foreground))" strokeWidth="1.5" />
          <path d="M0 1 L16 6 L0 11 Z" fill={doneUpTo >= steps.length ? "hsl(var(--success))" : "hsl(var(--muted-foreground))"} className="origin-left" />
        </g>
        {/* "You are here": a small marker that walks to the current level. */}
        <g style={{ transform: `translate(${NODES[ai].x}px, ${NODES[ai].y - 21}px)`, transition: "transform .5s cubic-bezier(.2,.8,.2,1)" }}>
          <path d="M0 4 L-4 -3 L4 -3 Z" fill="hsl(var(--foreground))" />
        </g>
      </svg>
      {steps.map((s, i) => {
        const isDone = done.has(s.id);
        const isActive = s.id === active;
        return (
          <button key={s.id} onClick={() => onPick(s.id)} aria-current={isActive ? "step" : undefined}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 group"
            style={{ left: `${(NODES[i].x / 360) * 100}%`, top: `${(NODES[i].y / 130) * 100}%` }}>
            <span className={`grid place-items-center h-7 w-7 sm:h-8 sm:w-8 rounded-full border-2 text-[11px] font-semibold transition-colors ${
              isDone ? "bg-primary border-primary text-primary-foreground" : isActive ? "bg-background border-foreground" : "bg-background border-border text-muted-foreground group-hover:border-foreground/50"}`}>
              {isDone ? "✓" : i + 1}
            </span>
            <span className={`text-[10px] sm:text-xs whitespace-nowrap ${isActive ? "font-semibold" : "text-muted-foreground"}`}>{s.label}</span>
          </button>
        );
      })}
    </div>
  );
};

/* ----------------------------- Carbon budget ------------------------------ */

/** Baseline on the left, target marked, the estimated position gliding as actions are done. */
export const CarbonBudget = ({ baselineKg, targetKg, cutKg }: { baselineKg: number; targetKg: number; cutKg: number }) => {
  const shownCut = useSpring(cutKg, 90);
  const now = Math.max(0, baselineKg - shownCut);
  const pct = (v: number) => (baselineKg > 0 ? (v / baselineKg) * 100 : 0);
  const toGo = Math.max(0, baselineKg - cutKg - targetKg);
  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Estimated cut</p>
          <p className="text-3xl sm:text-4xl font-semibold tabular-nums">{formatCo2(shownCut)}</p>
        </div>
        <p className="text-right text-sm text-muted-foreground">{toGo > 0 ? `${formatCo2(toGo)} to the target` : "Target reached (est.)"}</p>
      </div>
      <div className="relative mt-4 h-4 rounded-full bg-secondary overflow-hidden">
        <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-warning to-primary" style={{ width: `${pct(now)}%` }} />
      </div>
      <div className="relative h-5 mt-1 text-[10px] text-muted-foreground">
        <span className="absolute left-0">0</span>
        <span className="absolute -translate-x-1/2 flex flex-col items-center" style={{ left: `${pct(targetKg)}%` }}>
          <span className="h-2 w-px bg-foreground -mt-6 mb-3" />Target
        </span>
        <span className="absolute right-0">Baseline</span>
      </div>
    </div>
  );
};

/* -------------------------------- Badges --------------------------------- */

export const BADGES: { key: BadgeKey; name: string; how: string; glyph: string }[] = [
  { key: "baseline", name: "Grounded", how: "Your baseline comes from your own records", glyph: "M6 15 L10 9 L13 12 L18 6" },
  { key: "locked", name: "Committed", how: "Goal saved to your account", glyph: "M8 11 V8 a4 4 0 0 1 8 0 V11 M7 11 h10 v7 h-10 Z" },
  { key: "pace", name: "1.5°C pace", how: `Target at least ${SBTI_MIN_ANNUAL_PCT}% a year`, glyph: "M5 17 L19 7 M14 7 h5 v5" },
  { key: "first", name: "First step", how: "First action marked done", glyph: "M7 12 l3 3 l7 -7" },
  { key: "halfway", name: "Halfway", how: "Half the target cut (est.)", glyph: "M12 5 a7 7 0 1 0 0.01 0 M12 5 v14" },
  { key: "target", name: "Summit", how: "Target cut reached (est.)", glyph: "M5 18 L10 9 L13 13 L15 10 L19 18 Z" },
  { key: "report", name: "On the record", how: "Progress report exported", glyph: "M8 5 h6 l4 4 v10 h-10 Z M14 5 v4 h4" },
];

/** Seals that light up when their condition is met; never awarded for anything not done. */
export const BadgeShelf = ({ earned, fresh }: { earned: BadgeKey[]; fresh: BadgeKey | null }) => (
  <ul className="grid grid-cols-4 sm:grid-cols-7 gap-3">
    {BADGES.map(b => {
      const on = earned.includes(b.key);
      return (
        <li key={b.key} className="flex flex-col items-center text-center gap-1.5" title={b.how}>
          <span className={`relative grid place-items-center h-12 w-12 ${b.key === fresh ? "animate-[nz-pop_.6s_ease-out_both]" : ""}`}>
            <svg viewBox="0 0 48 48" className="absolute inset-0" aria-hidden="true">
              <path d="M24 3 L42 13 V35 L24 45 L6 35 V13 Z" fill={on ? "hsl(var(--primary))" : "hsl(var(--secondary))"} stroke={on ? "hsl(var(--primary))" : "hsl(var(--border))"} strokeWidth="1.5" />
            </svg>
            <svg viewBox="0 0 24 24" className="relative h-5 w-5" aria-hidden="true">
              <path d={b.glyph} fill="none" stroke={on ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className={`text-[11px] leading-tight ${on ? "font-medium" : "text-muted-foreground"}`}>{b.name}</span>
          <span className="sr-only">{on ? "Earned" : "Not yet"}: {b.how}</span>
        </li>
      );
    })}
  </ul>
);

/* ------------------------------ Pathway chart ----------------------------- */

/** Your target line against the SBTi 1.5°C minimum pace, from today to the target date. */
export const PathwayChart = ({ targetPct, months }: { targetPct: number; months: number }) => {
  const years = months / 12;
  const W = 320, H = 150, x0 = 34, x1 = 306, y0 = 20, y1 = 120;
  const yFor = (pctLeft: number) => y0 + (1 - pctLeft / 100) * (y1 + 12 - y0);
  const userEnd = 100 - targetPct;
  const sbtiEnd = Math.max(0, 100 - SBTI_MIN_ANNUAL_PCT * years);
  const meets = targetPct / years >= SBTI_MIN_ANNUAL_PCT;
  const clampY = (v: number) => Math.min(y1 + 12, v);
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`Your target, ${targetPct}% over ${years} years, against the SBTi minimum of ${SBTI_MIN_ANNUAL_PCT}% a year`}>
        <line x1={x0} y1={y0} x2={x0} y2={y1 + 12} stroke="hsl(var(--border))" />
        <line x1={x0} y1={y1 + 12} x2={x1} y2={y1 + 12} stroke="hsl(var(--border))" />
        <text x={x0 - 4} y={y0 + 4} textAnchor="end" fontSize="8" fill="hsl(var(--muted-foreground))">100%</text>
        <text x={x0} y={H - 4} fontSize="8" fill="hsl(var(--muted-foreground))">Today</text>
        <text x={x1} y={H - 4} textAnchor="end" fontSize="8" fill="hsl(var(--muted-foreground))">{months >= 60 ? "2030" : `${years} yr`}</text>
        <line x1={x0} y1={y0} x2={x1} y2={clampY(yFor(sbtiEnd))} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
        <text x={x1 - 2} y={clampY(yFor(sbtiEnd)) - 5} textAnchor="end" fontSize="8" fill="hsl(var(--muted-foreground))">SBTi 1.5°C minimum</text>
        <line x1={x0} y1={y0} x2={x1} y2={clampY(yFor(userEnd))} stroke={meets ? "hsl(var(--primary))" : "hsl(var(--warning))"} strokeWidth="3" strokeLinecap="round"
          pathLength={1} strokeDasharray="1" strokeDashoffset="1" key={`${targetPct}-${months}`} className="animate-[nz-draw_.6s_ease-out_forwards]" />
        <circle cx={x1} cy={clampY(yFor(userEnd))} r="4" fill={meets ? "hsl(var(--primary))" : "hsl(var(--warning))"} />
      </svg>
    </figure>
  );
};

/* ------------------------------- Scope donut ------------------------------ */

export const ScopeDonut = ({ parts }: { parts: { label: string; value: number; color: string }[] }) => {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  const r = 15.9155; // circumference 100
  let offset = 25;
  return (
    <svg viewBox="0 0 42 42" className="w-40 h-40" role="img" aria-label={parts.map(p => `${p.label} ${Math.round((p.value / total) * 100)}%`).join(", ")}>
      <circle cx="21" cy="21" r={r} fill="none" stroke="hsl(var(--secondary))" strokeWidth="6" />
      {parts.map(p => {
        const len = (p.value / total) * 100;
        const el = <circle key={p.label} cx="21" cy="21" r={r} fill="none" stroke={p.color} strokeWidth="6" strokeDasharray={`${len} ${100 - len}`} strokeDashoffset={offset} />;
        offset -= len;
        return el;
      })}
    </svg>
  );
};

/* ------------------------------ Celebration ------------------------------- */

/** A small burst and a floating "+x t" when an action is completed. Hidden for reduced motion. */
export const Burst = ({ label }: { label: string }) => (
  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" aria-hidden="true">
    <span className="absolute right-0 -top-2 text-xs font-semibold text-primary whitespace-nowrap animate-[nz-float_1.1s_ease-out_forwards]">{label}</span>
    {Array.from({ length: 8 }, (_, i) => (
      <span key={i} className="absolute h-1.5 w-1.5 rounded-full bg-primary animate-[nz-burst_.7s_ease-out_forwards]"
        style={{ ["--a" as string]: `${i * 45}deg` } as React.CSSProperties} />
    ))}
  </span>
);
