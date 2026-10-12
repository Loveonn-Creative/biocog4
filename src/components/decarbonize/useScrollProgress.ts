import { useEffect, useRef, useState } from "react";

/**
 * How far the visitor has scrolled through an element, 0 at its top reaching
 * the viewport top, 1 when its bottom reaches the viewport bottom. The ref is
 * updated every frame for canvas work; `step` re-renders only when the value
 * crosses one of `steps` evenly spaced points, so text can react cheaply.
 */
export function useScrollProgress<T extends HTMLElement>(steps = 20) {
  const ref = useRef<T>(null);
  const progress = useRef(0);
  const [step, setStep] = useState(0);
  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const span = r.height - window.innerHeight;
      const p = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : r.top < 0 ? 1 : 0;
      progress.current = p;
      const s = Math.round(p * steps);
      setStep(prev => (prev === s ? prev : s));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(measure); };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); cancelAnimationFrame(raf); };
  }, [steps]);
  return { ref, progress, step, value: step / steps };
}

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
