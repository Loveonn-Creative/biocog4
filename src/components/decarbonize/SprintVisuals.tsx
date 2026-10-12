import { useEffect, useState } from "react";
import { useInView } from "@/components/platform/Reveal";
import { counters, sprint } from "@/data/decarbonizeIndia";
import { prefersReducedMotion, useScrollProgress } from "./useScrollProgress";

/** Counts up once when it scrolls into view. */
function CountUp({ to, duration = 1200 }: { to: number; duration?: number }) {
  const { ref, inView } = useInView<HTMLSpanElement>(0.6);
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    if (prefersReducedMotion()) { setN(to); return; }
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / duration);
      setN(Math.round(to * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, duration]);
  return <span ref={ref} className="tabular-nums">{n.toLocaleString("en-IN")}</span>;
}
export { CountUp };

/**
 * Hand-drawn doodle beside each number. It draws itself in when the strip
 * scrolls into view, then keeps a small loop (sun crossing the sky, globe
 * turning, heart beating). Reduced motion: drawn, still.
 */
function CounterDoodle({ kind, on }: { kind: "sun" | "globe" | "heart"; on: boolean }) {
  const stroke = { fill: "none", stroke: "#f4c45a", strokeWidth: 3, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, pathLength: 1 };
  const draw = `di-draw${on ? " di-draw-on" : ""}`;
  return (
    <svg viewBox="0 0 80 56" className="mx-auto mb-2 h-12 w-[4.5rem] sm:h-14 sm:w-20 md:h-16 md:w-24" aria-hidden="true">
      {kind === "sun" && (
        <g>
          {/* the day's arc and the horizon, then a sun that travels along it */}
          <path d="M8 46 Q40 2 72 46" fill="none" stroke="#f4c45a80" strokeWidth={2} strokeLinecap="round" strokeDasharray="2 5" className={`di-fade${on ? " di-fade-on" : ""}`} />
          <path d="M4 48 H76" {...stroke} className={draw} />
          <g className={on ? "di-sun-travel di-fade di-fade-on" : "di-fade"} style={{ offsetPath: "path('M8 46 Q40 2 72 46')" } as Record<string, string>}>
            <circle r="6" fill="#f4c45a" />
            {[0, 60, 120, 180, 240, 300].map(a => <path key={a} d="M0 -9 V-12" stroke="#f4c45a" strokeWidth="2" strokeLinecap="round" transform={`rotate(${a})`} />)}
          </g>
        </g>
      )}
      {kind === "globe" && (
        <g>
          <circle cx="40" cy="28" r="22" {...stroke} className={draw} />
          <path d="M18 28 H62 M22 17 H58 M22 39 H58" {...stroke} strokeWidth={2} className={draw} />
          <g className={on ? "di-globe-turn" : ""}>
            <ellipse cx="40" cy="28" rx="9" ry="22" {...stroke} strokeWidth={2} className={draw} />
          </g>
          <circle cx="62" cy="10" r="2.5" fill="#7fdca4" className={on ? "di-twinkle" : ""} />
        </g>
      )}
      {kind === "heart" && (
        <g className={on ? "di-heart-beat" : ""}>
          <path d="M40 48 C18 34 12 22 20 14 C27 8 36 11 40 19 C44 11 53 8 60 14 C68 22 62 34 40 48 Z" {...stroke} className={draw} />
          <path d="M26 26 h6 l3 -6 l4 12 l3 -6 h12" {...stroke} strokeWidth={2} style={{ stroke: "#7fdca4" }} className={draw} />
        </g>
      )}
    </svg>
  );
}

/** Oversized numbers with one-word labels and a doodle each: a pause between heavier sections. */
export function CounterStrip() {
  const { ref, inView } = useInView<HTMLElement>(0.35);
  return (
    <section ref={ref} className="bg-[#12321f] px-4 py-14 text-[#f7f3e8] sm:px-6 md:py-20" aria-label="The program in numbers">
      <dl className="mx-auto grid max-w-5xl grid-cols-3 gap-x-2">
        {counters.map(c => (
          <div key={c.label} className="flex flex-col-reverse items-center text-center">
            <dt className="mt-3 text-[11px] uppercase tracking-[0.22em] text-amber-300 sm:text-xs">{c.label}</dt>
            <dd className="text-5xl font-semibold leading-none tracking-tight sm:text-7xl md:text-8xl">
              {c.prefix}<CountUp to={c.value} />{c.suffix}
            </dd>
            <CounterDoodle kind={c.doodle} on={inView} />
          </div>
        ))}
      </dl>
    </section>
  );
}

/**
 * The 90 days as a ring that fills while the visitor scrolls past it. Daily
 * motion ticks around the edge; the three big wins land at day 90.
 */
export function SprintRing() {
  const { ref, value } = useScrollProgress<HTMLDivElement>(90);
  const day = Math.round(value * 90);
  const R = 120, C = 2 * Math.PI * R;
  const ticks = Array.from({ length: 45 }, (_, i) => i * 8);

  return (
    <div ref={ref} className="relative h-[180svh]">
      <div className="sticky top-0 flex h-[100svh] items-center">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 sm:px-6 md:grid-cols-2">
          <div className="relative mx-auto w-full max-w-[340px]">
            <svg viewBox="0 0 300 300" className="w-full -rotate-90" aria-hidden="true">
              <circle cx="150" cy="150" r={R} fill="none" stroke="hsl(var(--secondary))" strokeWidth="14" />
              <circle cx="150" cy="150" r={R} fill="none" stroke="url(#di-ring)" strokeWidth="14" strokeLinecap="round"
                strokeDasharray={C} strokeDashoffset={C * (1 - value)} />
              {ticks.map(a => (
                <line key={a} x1="150" y1={150 - R - 16} x2="150" y2={150 - R - 22} stroke="currentColor" strokeWidth="2"
                  transform={`rotate(${a} 150 150)`} className={a / 360 <= value ? "text-[#3fae6b]" : "text-border"} />
              ))}
              <defs><linearGradient id="di-ring" x1="0" x2="1"><stop offset="0" stopColor="#3fae6b" /><stop offset="1" stopColor="#f4a21a" /></linearGradient></defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Day</span>
              <span className="text-7xl font-semibold tabular-nums tracking-tight">{day}</span>
              <span className="text-xs text-muted-foreground">of 90</span>
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">{sprint.title}</h2>
            <div className={`mt-6 transition-opacity duration-500 ${value < 0.75 ? "opacity-100" : "opacity-40"}`}>
              <p className="text-sm text-muted-foreground">Every day</p>
              <p className="mt-1 text-xl">{sprint.daily.join(" · ")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{sprint.dailyNote}</p>
            </div>
            <ol className="mt-6 space-y-2">
              {sprint.wins.map((w, i) => {
                const landed = value >= 0.78 + i * 0.07;
                return (
                  <li key={w} className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-lg transition-all duration-500 ${landed ? "translate-x-0 bg-[#184d37] text-[#f7f3e8] opacity-100" : "translate-x-4 opacity-0"}`}>
                    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-amber-300" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M5 21V4 M5 4h11l-2 4 2 4H5" /></svg>
                    {w}
                  </li>
                );
              })}
            </ol>
            <p className={`mt-4 text-sm font-medium transition-opacity duration-500 ${value >= 0.95 ? "opacity-100" : "opacity-0"}`}>{sprint.winsNote}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
