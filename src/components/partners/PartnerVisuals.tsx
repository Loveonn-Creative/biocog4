import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import { useMotionGate } from "@/components/services/motion/kit";

export interface PartnerType {
  id: string;
  title: string;
  description: string;
  benefits: string[];
  cta: string;
  href: string;
  /** What travels along the lane, and which way. */
  flow: { label: string; back?: string };
}

/**
 * One lane per kind of partner: MSME → Senseible → partner, with what
 * actually flows between them moving along the lane. Pick a lane to open
 * its details. Particles run only while on screen and never for reduced motion.
 */
export const FlowLanes = ({ types }: { types: PartnerType[] }) => {
  const [active, setActive] = useState(types[0].id);
  const box = useRef<HTMLDivElement>(null);
  const moving = useMotionGate(box);
  const t = types.find(x => x.id === active)!;
  const panel = useRef<HTMLDivElement>(null);
  // On phones the details sit below the lanes: bring them into view after a tap.
  const pick = (id: string) => {
    setActive(id);
    if (window.innerWidth < 1024) {
      const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      requestAnimationFrame(() => panel.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" }));
    }
  };

  return (
    <div ref={box} className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
      <div role="tablist" aria-label="Partnership types" className="grid gap-2">
        {types.map(x => {
          const on = x.id === active;
          return (
            <button key={x.id} role="tab" aria-selected={on} aria-controls="pt-panel" onClick={() => pick(x.id)}
              className={`group rounded-2xl border px-4 py-3 text-left transition-colors ${on ? "border-foreground bg-secondary/60" : "border-border hover:bg-secondary/40"}`}>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm sm:text-base font-medium">{x.title}</span>
                <span className="text-[11px] text-muted-foreground">{x.flow.label}</span>
              </div>
              <svg viewBox="0 0 300 16" className="mt-2 w-full h-auto" aria-hidden="true">
                <line x1="10" y1="8" x2="290" y2="8" stroke="hsl(var(--border))" strokeWidth="1.5" />
                {[10, 150, 290].map((cx, i) => (
                  <circle key={cx} cx={cx} cy="8" r={i === 1 ? 4.5 : 3.8} fill={i === 1 ? "hsl(var(--foreground))" : "hsl(var(--background))"} stroke="hsl(var(--foreground))" strokeWidth="1.5" />
                ))}
                {/* Still: packets rest along the lane. Moving: they travel MSME → partner. */}
                {(on || !moving) && [0, 1, 2].map(k => (
                  <rect key={`f${k}`} x={moving ? 5 : 70 + k * 80} y="5.5" width="8" height="5" rx="1.5" fill="hsl(var(--primary))"
                    className={moving ? "pt-run" : ""} style={{ animationDelay: `${k * 0.6}s` }} />
                ))}
                {x.flow.back && (on || !moving) && (
                  <rect x={moving ? 285 : 220} y="5.5" width="8" height="5" rx="1.5" fill="hsl(var(--warning))" className={moving ? "pt-run-back" : ""} />
                )}
              </svg>
              <div className="mt-1 flex justify-between text-[10px] text-muted-foreground"><span>MSME</span><span>Senseible</span><span>Partner</span></div>
            </button>
          );
        })}
      </div>

      <div ref={panel} id="pt-panel" role="tabpanel" key={t.id} className="rounded-3xl border border-border p-5 sm:p-7 animate-[pt-in_.35s_ease-out_both] lg:sticky lg:top-24">
        <h3 className="text-xl sm:text-2xl font-semibold tracking-tight">{t.title}</h3>
        <p className="mt-2 text-muted-foreground">{t.description}</p>
        <p className="mt-4 text-xs text-muted-foreground">
          <span className="inline-block h-2 w-2 rounded-full bg-primary mr-1.5 align-middle" />{t.flow.label}
          {t.flow.back && <><span className="inline-block h-2 w-2 rounded-full bg-warning ml-4 mr-1.5 align-middle" />{t.flow.back}</>}
        </p>
        <ul className="mt-5 space-y-2.5">
          {t.benefits.map(b => (
            <li key={b} className="flex items-start gap-2.5 text-sm"><Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />{b}</li>
          ))}
        </ul>
        <Link to={t.href} className="mt-6 inline-flex items-center gap-2 rounded-full bg-foreground text-background px-5 py-2.5 text-sm font-medium">
          {t.cta} <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};

export interface Reason { title: string; body: string; mark: string }

/** Cards that turn over to show how each claim works. Keyboard and screen readers get both sides. */
export const FlipReasons = ({ reasons }: { reasons: Reason[] }) => {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {reasons.map((r, i) => {
        const flipped = open === i;
        return (
          <button key={r.title} onClick={() => setOpen(flipped ? null : i)} aria-expanded={flipped}
            className="group relative h-52 text-left [perspective:900px]">
            <span className={`absolute inset-0 rounded-3xl border border-border bg-background p-6 flex flex-col justify-between transition-transform duration-500 [backface-visibility:hidden] ${flipped ? "[transform:rotateY(180deg)]" : ""}`}>
              <svg viewBox="0 0 40 40" className="w-10 h-10 text-primary" aria-hidden="true">
                <path d={r.mark} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>
                <span className="block text-lg font-semibold">{r.title}</span>
                <span className="mt-1 block text-xs text-muted-foreground">Tap to see how</span>
              </span>
            </span>
            <span className={`absolute inset-0 rounded-3xl bg-foreground text-background p-6 flex items-center transition-transform duration-500 [backface-visibility:hidden] ${flipped ? "" : "[transform:rotateY(-180deg)]"}`}>
              <span className="text-sm leading-relaxed">{r.body}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
};
