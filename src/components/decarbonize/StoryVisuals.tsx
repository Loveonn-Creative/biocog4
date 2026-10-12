import { useRef, useState, type ReactNode } from "react";
import { useInView } from "@/components/platform/Reveal";
import { filter, quote, rewards } from "@/data/decarbonizeIndia";
import { CountUp } from "./SprintVisuals";
import { CoinSapling, PlaneGlobe, Seal, WorkStack } from "./DiDoodles";
import { useScrollProgress } from "./useScrollProgress";

/** Frosted panel that tilts toward the pointer, so it feels like a physical object. */
function GlassTilt({ children, className = "" }: { children: ReactNode; className?: string }) {
  const el = useRef<HTMLDivElement>(null);
  const [t, setT] = useState({ x: 0, y: 0 });
  return (
    <div ref={el} className={`[perspective:900px] ${className}`}
      onPointerMove={e => {
        if (e.pointerType !== "mouse") return;
        const r = el.current!.getBoundingClientRect();
        setT({ x: ((e.clientY - r.top) / r.height - 0.5) * -8, y: ((e.clientX - r.left) / r.width - 0.5) * 10 });
      }}
      onPointerLeave={() => setT({ x: 0, y: 0 })}>
      <div className="h-full rounded-[1.75rem] border border-white/50 bg-white/30 p-6 shadow-[0_30px_60px_-35px_rgba(0,0,0,.55)] backdrop-blur-xl transition-transform duration-200 ease-out dark:border-white/15 dark:bg-white/10"
        style={{ transform: `rotateX(${t.x}deg) rotateY(${t.y}deg)` }}>
        {children}
      </div>
    </div>
  );
}

const ART = { certificate: Seal, global: PlaneGlobe, portfolio: WorkStack } as const;

/** The fund as one live number with a ring that fills; the rest as glass over a dawn planet. */
export function RewardsField() {
  const { ref, inView } = useInView<HTMLDivElement>(0.4);
  const fund = rewards.items.find(r => r.key === "fund")!;
  const rest = rewards.items.filter(r => r.key !== "fund");
  return (
    <div ref={ref} className="relative overflow-hidden rounded-[2.25rem] px-4 py-10 sm:px-8 sm:py-14"
      style={{ background: "radial-gradient(120% 90% at 50% 120%, #f4c45a 0%, #e9a35a 22%, #2f7a55 48%, #12321f 78%)" }}>
      {/* the planet rising behind the glass */}
      <div aria-hidden="true" className="absolute -bottom-[55%] left-1/2 h-[90%] w-[140%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(circle_at_50%_20%,#3fae6b_0%,#184d37_55%,#0d2b1c_100%)] shadow-[0_-30px_80px_10px_rgba(244,196,90,.45)]" />

      <div className="relative grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div className="flex flex-col justify-between rounded-[1.75rem] bg-[#0d2b1c]/80 p-7 text-[#f7f3e8] backdrop-blur">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-amber-300">Grand Impact Fund</p>
              <p className="mt-3 text-5xl font-semibold tracking-tight sm:text-6xl">₹<CountUp to={150000} duration={1600} /></p>
            </div>
            <svg viewBox="0 0 44 44" className="h-16 w-16 shrink-0 -rotate-90" aria-hidden="true">
              <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="4" />
              <circle cx="22" cy="22" r="18" fill="none" stroke="#f4c45a" strokeWidth="4" strokeLinecap="round" strokeDasharray={113}
                strokeDashoffset={inView ? 0 : 113} style={{ transition: "stroke-dashoffset 1.6s cubic-bezier(.2,.8,.2,1)" }} />
            </svg>
          </div>
          {/* money that turns into a project where the ambassador lives */}
          <div className="my-6 flex items-center gap-4 text-[#f7f3e8]" aria-hidden="true">
            <span className="text-3xl font-semibold text-amber-300">₹</span>
            <span className="h-[2px] flex-1 bg-[linear-gradient(90deg,#f4c45a,#3fae6b)]" />
            <span className="[&_svg]:h-20 [&_svg]:w-28"><CoinSapling /></span>
            <span className="text-sm leading-tight text-[#f7f3e8]/80">a climate project<br />in your community</span>
          </div>
          <p className="text-lg leading-relaxed text-[#f7f3e8]/85">{fund.line}</p>
        </div>
        <div className="grid gap-4">
          {rest.map(r => {
            const Art = ART[r.key as keyof typeof ART];
            return (
              <GlassTilt key={r.key}>
                <div className="flex items-center gap-5 text-[#f7f3e8]">
                  <div className="shrink-0"><Art /></div>
                  <div>
                    <h3 className="text-xl font-semibold">{r.name}</h3>
                    <p className="mt-1 text-[15px] leading-relaxed text-[#f7f3e8]/85">{r.line}</p>
                  </div>
                </div>
              </GlassTilt>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** The quote arrives with the sunrise: a planet's edge rises while the words settle in, one half at a time. */
export function SunriseQuote() {
  const { ref, value } = useScrollProgress<HTMLElement>(30);
  const [first, second] = quote.split(";").map(s => s.trim());
  const rise = Math.min(1, value * 1.6);
  return (
    <section ref={ref} className="relative h-[150svh]">
      <div className="sticky top-0 flex h-[100svh] items-center justify-center overflow-hidden"
        style={{ background: `linear-gradient(180deg, #0d1b14 0%, rgb(${Math.round(20 + 200 * rise)},${Math.round(40 + 120 * rise)},${Math.round(40 + 40 * rise)}) 100%)` }}>
        <div aria-hidden="true" className="absolute left-1/2 h-[120vw] w-[120vw] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_50%_8%,#3fae6b_0%,#184d37_30%,#0d2b1c_60%)] shadow-[0_-40px_120px_20px_rgba(244,196,90,.55)]"
          style={{ top: `${100 - rise * 28}%` }} />
        <blockquote className="relative z-10 mx-auto max-w-4xl px-6 text-center font-serif text-3xl italic leading-snug text-[#f7f3e8] sm:text-5xl [text-wrap:balance]">
          <span className={`block transition-all duration-700 ${value > 0.15 ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>{first};</span>
          <span className={`block transition-all duration-700 ${value > 0.4 ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>{second}</span>
        </blockquote>
      </div>
    </section>
  );
}

/**
 * The honest filter. Smog sits over the section; each line the visitor reads
 * clears a little more of it.
 */
export function HardTruth() {
  const { ref, value } = useScrollProgress<HTMLElement>(40);
  const shown = Math.min(filter.points.length, Math.floor(value * (filter.points.length + 1.5)));
  const smog = 1 - shown / filter.points.length;
  return (
    <section ref={ref} className="relative h-[200svh] text-[#f7f3e8]">
      <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden bg-[#12321f]">
        <div aria-hidden="true" className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: smog * 0.9, background: "radial-gradient(60% 50% at 20% 30%, #6b6e72 0%, transparent 70%), radial-gradient(50% 60% at 80% 70%, #55585d 0%, transparent 70%), linear-gradient(180deg, #3a3d42, #2b2d31)" }} />
        <div className="relative mx-auto w-full max-w-4xl px-4 sm:px-6">
          <p className="mb-3 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.16em] text-amber-300"><span aria-hidden="true" className="h-[3px] w-6 rounded-full bg-amber-500" />Read this before you apply</p>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">{filter.title}</h2>
          <ul className="mt-8 space-y-4">
            {filter.points.map((p, i) => (
              <li key={p} className={`flex gap-4 border-b border-white/10 pb-4 text-lg leading-relaxed transition-all duration-700 sm:text-xl ${i < shown ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"}`}>
                <span className="w-6 shrink-0 font-mono text-sm text-amber-300">0{i + 1}</span><span>{p}</span>
              </li>
            ))}
          </ul>
          <p className={`mt-8 text-2xl font-semibold text-amber-300 transition-opacity duration-700 ${shown >= filter.points.length ? "opacity-100" : "opacity-0"}`}>{filter.close}</p>
        </div>
      </div>
    </section>
  );
}
