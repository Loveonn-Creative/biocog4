import { useEffect, useMemo, useRef, useState } from "react";

const reduced = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** How far the reader is through `ref` (0 at its top, 1 at its end), updated per frame, re-rendered in steps. */
function useReadProgress<T extends HTMLElement>(steps = 40) {
  const ref = useRef<T>(null);
  const [p, setP] = useState(reduced() ? 1 : 0);
  useEffect(() => {
    if (reduced()) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const span = r.height - window.innerHeight * 0.5;
      const v = span > 0 ? Math.min(1, Math.max(0, (window.innerHeight * 0.5 - r.top) / span)) : 1;
      const s = Math.round(v * steps) / steps;
      setP(prev => (prev === s ? prev : s));
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(measure); };
    measure();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => { window.removeEventListener("scroll", on); window.removeEventListener("resize", on); cancelAnimationFrame(raf); };
  }, [steps]);
  return { ref, p };
}

// Deterministic pseudo-random so the field is the same on every visit.
function rand(seed: number) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

interface Dot { x: number; y: number; r: number; big: boolean; t: number }

function makeField(count: number, w: number, h: number, seed: number): Dot[] {
  const rnd = rand(seed);
  const dots: Dot[] = [];
  const cols = Math.round(Math.sqrt((count * w) / h));
  const rows = Math.ceil(count / cols);
  for (let i = 0; i < count; i++) {
    const c = i % cols, r = Math.floor(i / cols);
    const big = i % 37 === 5;
    dots.push({
      x: ((c + 0.5 + (rnd() - 0.5) * 0.6) / cols) * w,
      y: ((r + 0.5 + (rnd() - 0.5) * 0.6) / rows) * h,
      r: big ? 4.2 : 1.6 + rnd() * 0.9,
      big,
      // Large firms are lit from the start; small ones light as infrastructure reaches them.
      t: big ? 0 : 0.18 + rnd() * 0.8,
    });
  }
  return dots;
}

/**
 * Small businesses, mostly dark to climate finance. A few large firms are lit
 * from the start; as you read, the rest light up. Desktop: a panel that stays
 * beside the text. Phones: a slim strip along the bottom. Illustrative, not a count.
 */
export const MissionField = ({ children }: { children: React.ReactNode }) => {
  const { ref, p } = useReadProgress<HTMLDivElement>();
  const panel = useMemo(() => makeField(210, 280, 520, 7), []);
  const strip = useMemo(() => makeField(64, 360, 28, 11), []);
  const litCount = panel.filter(d => p >= d.t).length;
  // The phone strip shows only while the article is on screen, so it never covers the footer.
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: "0px 0px -120px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);

  const dot = (d: Dot, i: number) => {
    const lit = p >= d.t;
    return (
      <circle key={i} cx={d.x} cy={d.y} r={d.r} className="transition-[fill,opacity] duration-500"
        fill={lit ? (d.big ? "hsl(var(--foreground))" : "hsl(var(--primary))") : "hsl(var(--muted-foreground))"}
        opacity={lit ? 1 : 0.18} />
    );
  };

  return (
    <div ref={ref} className="relative grid gap-12 md:grid-cols-[1fr_17rem] lg:grid-cols-[1fr_19rem]">
      <div className="min-w-0">{children}</div>
      <aside className="hidden md:block" aria-hidden="true">
        <div className="sticky top-24 rounded-3xl border border-border bg-secondary/20 p-4">
          <svg viewBox="0 0 280 520" className="w-full h-auto">{panel.map(dot)}</svg>
          <p className="mt-3 text-[11px] text-muted-foreground leading-snug">
            {p < 0.18 ? "Large firms are measured. Most small businesses are not." : p < 0.95 ? "Each document measured brings one more business into view." : "Every business, visible."}
          </p>
          <p className="mt-1 font-mono text-[10px] text-muted-foreground">{litCount} of {panel.length} lit · illustration</p>
        </div>
      </aside>
      <div className={`md:hidden fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/90 backdrop-blur px-4 py-2 transition-transform duration-300 ${inView ? "translate-y-0" : "translate-y-full"}`} aria-hidden="true">
        <svg viewBox="0 0 360 28" className="w-full h-7">{strip.map(dot)}</svg>
      </div>
    </div>
  );
};

/** A hand-drawn underline that draws itself under a phrase once it is read. */
export const DrawnUnderline = ({ children }: { children: React.ReactNode }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [seen, setSeen] = useState(reduced());
  useEffect(() => {
    const el = ref.current;
    if (!el || seen || typeof IntersectionObserver === "undefined") { setSeen(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 1, rootMargin: "0px 0px -20% 0px" });
    io.observe(el);
    return () => io.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- once
  }, []);
  return (
    <span ref={ref} className="relative inline-block text-primary font-semibold">
      {children}
      <svg viewBox="0 0 100 8" preserveAspectRatio="none" className="absolute left-0 -bottom-1.5 w-full h-2" aria-hidden="true">
        <path d="M2 5 C 20 1, 40 7, 60 3 S 90 5, 98 3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          pathLength={1} strokeDasharray="1" strokeDashoffset={seen ? 0 : 1} style={{ transition: "stroke-dashoffset .9s ease-out .15s" }} />
      </svg>
    </span>
  );
};

/** Stat that rises into place when it reaches the viewport. */
export const RiseIn = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(reduced());
  useEffect(() => {
    const el = ref.current;
    if (!el || seen || typeof IntersectionObserver === "undefined") { setSeen(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- once
  }, []);
  return (
    <div ref={ref} className="transition-[opacity,transform] duration-700 ease-out" style={{ opacity: seen ? 1 : 0, transform: seen ? "none" : "translateY(14px)", transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
};
