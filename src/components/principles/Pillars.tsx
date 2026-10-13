import { useEffect, useRef, useState } from "react";

const reduced = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const PILLARS = [
  { label: "AI", tone: "hsl(var(--primary))" },
  { label: "Climate", tone: "hsl(var(--success))" },
  { label: "Business", tone: "hsl(var(--accent))" },
];

/**
 * Three columns under one lintel. `raised` columns stand; the lintel sets
 * once all three are up. `highlight` marks the pillar being read.
 */
export const PillarsVisual = ({ raised, highlight, compact = false }: { raised: number; highlight?: number; compact?: boolean }) => (
  <svg viewBox="0 0 240 212" className={compact ? "w-40 h-auto" : "w-full h-auto"} role="img"
    aria-label={`${raised} of 3 pillars standing${raised === 3 ? ", lintel set" : ""}`}>
    <rect x="14" y="184" width="212" height="8" rx="2" fill="hsl(var(--foreground))" opacity="0.85" />
    {PILLARS.map((p, i) => {
      const x = 34 + i * 70;
      const up = i < raised;
      const hl = highlight === i;
      return (
        <g key={p.label}>
          <g className="pl-rise" style={{ transform: up ? "scaleY(1)" : "scaleY(0.08)", opacity: up ? 1 : 0.35 }}>
            <rect x={x - 4} y="56" width="40" height="7" rx="1.5" fill={p.tone} />
            <rect x={x} y="63" width="32" height="114" fill={p.tone} opacity={hl ? 1 : 0.8} />
            {[8, 16, 24].map(dx => <line key={dx} x1={x + dx} y1="66" x2={x + dx} y2="174" stroke="hsl(var(--background))" strokeOpacity="0.35" />)}
            <rect x={x - 4} y="177" width="40" height="7" rx="1.5" fill={p.tone} />
          </g>
          <text x={x + 16} y={207} textAnchor="middle" fontSize="9" fill={hl ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))"} fontWeight={hl ? 600 : 400}>{p.label}</text>
          {hl && <circle cx={x + 16} cy={44} r="3" fill={p.tone} />}
        </g>
      );
    })}
    <g className="pl-lintel" style={{ transform: raised === 3 ? "translateY(0)" : "translateY(-26px)", opacity: raised === 3 ? 1 : 0 }}>
      <rect x="14" y="40" width="212" height="16" rx="3" fill="hsl(var(--foreground))" />
      <text x="120" y="51.5" textAnchor="middle" fontSize="8.5" fontWeight="600" letterSpacing="2" fill="hsl(var(--background))">SENSEIBLE</text>
    </g>
  </svg>
);

/** Reports which section is being read (index), and how many have been reached. */
export function useSectionsReached(count: number) {
  const refs = useRef<(HTMLElement | null)[]>([]);
  const [reached, setReached] = useState(reduced() ? count : 0);
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    if (reduced() || typeof IntersectionObserver === "undefined") { setReached(count); return; }
    // A section counts once its top is in the upper 70% of the screen, so the
    // last, short section still counts at the bottom of the page.
    const io = new IntersectionObserver(() => {
      const line = window.innerHeight * 0.7;
      let last = -1;
      refs.current.forEach((el, i) => { if (el && el.getBoundingClientRect().top < line) last = i; });
      if (last < 0) return;
      setCurrent(last);
      setReached(r => Math.max(r, last + 1));
    }, { rootMargin: "0px 0px -30% 0px", threshold: [0, 0.25, 0.5, 1] });
    refs.current.forEach(el => el && io.observe(el));
    return () => io.disconnect();
  }, [count]);
  return { refs, reached, current };
}
