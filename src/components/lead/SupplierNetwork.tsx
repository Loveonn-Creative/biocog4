import { useMemo } from "react";

/**
 * The enterprise tool's answer drawn as the supplier base around the buyer:
 * solid dots have evidence (a bill behind the number), dashed dots are spend
 * estimates. The plane is tilted in 3D so it reads as a map, not a chart.
 */
export function SupplierNetwork({ evidence, estimate, perDot }: { evidence: number; estimate: number; perDot: number }) {
  const total = evidence + estimate;
  const dots = useMemo(() => {
    const out: { x: number; y: number }[] = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < total; i++) {
      const r = 46 + 120 * Math.sqrt((i + 0.5) / Math.max(total, 1));
      const a = i * golden;
      out.push({ x: 180 + r * Math.cos(a), y: 180 + r * Math.sin(a) });
    }
    return out;
  }, [total]);

  return (
    <figure className="relative mx-auto aspect-square w-full max-w-[420px] [perspective:1000px]" aria-label={`${evidence} dots with evidence, ${estimate} estimated; each dot is ${perDot} supplier${perDot > 1 ? "s" : ""}`}>
      <div className="absolute inset-0 [transform:rotateX(55deg)_rotateZ(-18deg)] [transform-style:preserve-3d] motion-safe:animate-[lm-float_9s_ease-in-out_infinite]">
        <svg viewBox="0 0 360 360" className="h-full w-full overflow-visible">
          <circle cx="180" cy="180" r="172" fill="none" stroke="hsl(var(--border))" strokeDasharray="2 6" />
          {dots.map((d, i) => {
            const ev = i < evidence;
            return (
              <g key={i}>
                <line x1="180" y1="180" x2={d.x} y2={d.y} stroke={ev ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
                  strokeOpacity={ev ? 0.55 : 0.18} strokeWidth={ev ? 1.2 : 0.8} strokeDasharray={ev ? undefined : "2 4"}
                  className="transition-[stroke,stroke-opacity] duration-500" />
                <circle cx={d.x} cy={d.y} r={ev ? 6 : 5}
                  fill={ev ? "hsl(var(--primary))" : "hsl(var(--background))"}
                  stroke={ev ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
                  strokeWidth={1.4} strokeDasharray={ev ? undefined : "2.5 2"}
                  className="transition-[fill,stroke] duration-500" style={{ transitionDelay: `${(i % 12) * 25}ms` }} />
              </g>
            );
          })}
          {/* the buyer */}
          <path d="M150 166 q30 -9 60 0 q8 14 0 28 q-30 9 -60 0 q-8 -14 0 -28z" fill="hsl(var(--foreground))" />
          <text x="180" y="185" textAnchor="middle" fontSize="13" fontWeight="600" fill="hsl(var(--background))">You</text>
        </svg>
      </div>
      {/* hand-drawn annotations stay upright, outside the tilted plane */}
      <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between px-1 text-[12px] leading-tight text-muted-foreground">
        <span className="flex items-center gap-1.5"><svg width="14" height="14" aria-hidden="true"><circle cx="7" cy="7" r="5" fill="hsl(var(--primary))" /></svg>bill behind it</span>
        <span className="flex items-center gap-1.5"><svg width="14" height="14" aria-hidden="true"><circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeDasharray="2.5 2" /></svg>spend estimate</span>
        <span>1 dot = {perDot} supplier{perDot > 1 ? "s" : ""}</span>
      </figcaption>
    </figure>
  );
}
