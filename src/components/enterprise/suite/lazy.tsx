import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from "react";

// Below-the-fold sections load as the visitor approaches them, so the hero
// paints with only the code it needs. Jump links preload everything first,
// so the page does not move under a smooth scroll.
const loaders = {
  suite: () => import("./SuiteDashboard"),
  wave: () => import("./OneClickCollect"),
  feed: () => import("./SignalFeed"),
  profit: () => import("./LiabilityToProfit"),
  mind: () => import("./BiocogMind"),
  standards: () => import("./StandardsPrism"),
  proof: () => import("./BenchmarkProof"),
};

export const LazySuiteDashboard = lazy(() => loaders.suite().then(m => ({ default: m.SuiteDashboard })));
export const LazyOneClickCollect = lazy(() => loaders.wave().then(m => ({ default: m.OneClickCollect })));
export const LazySignalFeed = lazy(() => loaders.feed().then(m => ({ default: m.SignalFeed })));
export const LazyLiabilityToProfit = lazy(() => loaders.profit().then(m => ({ default: m.LiabilityToProfit })));
export const LazyBiocogMind = lazy(() => loaders.mind().then(m => ({ default: m.BiocogMind })));
export const LazyStandardsPrism = lazy(() => loaders.standards().then(m => ({ default: m.StandardsPrism })));
export const LazyBenchmarkProof = lazy(() => loaders.proof().then(m => ({ default: m.BenchmarkProof })));

const REVEAL = "ent:reveal-all";

/** Load every section, then smooth-scroll to `id` once the layout is final. */
export async function scrollToSection(id: string) {
  window.dispatchEvent(new Event(REVEAL));
  try { await Promise.all(Object.values(loaders).map(l => l())); } catch { /* scroll anyway */ }
  // Two frames: one for React to render the loaded sections, one for layout.
  requestAnimationFrame(() => requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })));
}

/** Mounts its children when within ~a screen of the viewport; reserves height until then. */
export const WhenNear = ({ minH, children }: { minH: number; children: ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reveal = () => setNear(true);
    window.addEventListener(REVEAL, reveal);
    if (typeof IntersectionObserver === "undefined") { setNear(true); return () => window.removeEventListener(REVEAL, reveal); }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setNear(true); io.disconnect(); } }, { rootMargin: "900px 0px" });
    io.observe(el);
    return () => { io.disconnect(); window.removeEventListener(REVEAL, reveal); };
  }, []);
  const placeholder = <div style={{ minHeight: minH }} aria-hidden="true" />;
  return <div ref={ref}>{near ? <Suspense fallback={placeholder}>{children}</Suspense> : placeholder}</div>;
};
