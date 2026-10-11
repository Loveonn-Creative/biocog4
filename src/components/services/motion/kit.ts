import { useEffect, useRef, useState, type RefObject } from "react";

/** Shared motion helpers for service-page visuals. No dependencies. */

export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/** True while the element is on screen, the tab is visible and motion is allowed. */
export function useMotionGate<T extends Element>(ref: RefObject<T>, threshold = 0.15): boolean {
  const [onScreen, setOnScreen] = useState(false);
  const [visible, setVisible] = useState(true);
  const reduced = useRef(prefersReducedMotion());
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { threshold });
    io.observe(el);
    const onVis = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => { io.disconnect(); document.removeEventListener("visibilitychange", onVis); };
  }, [ref, threshold]);
  return onScreen && visible && !reduced.current;
}

export type DrawFn = (ctx: CanvasRenderingContext2D, frame: { t: number; dt: number; w: number; h: number }) => void;

/**
 * Runs a canvas draw loop at device pixel ratio (capped at 2), only while
 * `active`. Always draws one frame so reduced-motion visitors see the state.
 */
export function useCanvasLoop(canvasRef: RefObject<HTMLCanvasElement>, draw: DrawFn, active: boolean) {
  const drawRef = useRef(draw);
  drawRef.current = draw;
  const size = useRef({ w: 0, h: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const fit = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      size.current = { w: r.width, h: r.height };
    };
    fit();
    const ro = new ResizeObserver(() => { fit(); if (!active) drawRef.current(ctx, { t: 0, dt: 0, ...size.current }); });
    ro.observe(canvas);

    let raf = 0;
    let last = performance.now();
    const start = last;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      drawRef.current(ctx, { t: (now - start) / 1000, dt, ...size.current });
      raf = requestAnimationFrame(tick);
    };
    if (active) raf = requestAnimationFrame(tick);
    else drawRef.current(ctx, { t: 0, dt: 0, ...size.current });
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [canvasRef, active]);
}

/**
 * Critically damped spring towards `target` (Hooke's law with drag), for
 * numbers that should glide to a new value instead of jumping.
 */
export function useSpring(target: number, stiffness = 120, damping = 2 * Math.sqrt(120)): number {
  const [value, setValue] = useState(target);
  const state = useRef({ x: target, v: 0 });
  useEffect(() => {
    if (prefersReducedMotion()) { state.current = { x: target, v: 0 }; setValue(target); return; }
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = state.current;
      const a = -stiffness * (s.x - target) - damping * s.v;
      s.v += a * dt;
      s.x += s.v * dt;
      if (Math.abs(s.x - target) < 1e-3 * Math.max(1, Math.abs(target)) && Math.abs(s.v) < 1e-3) {
        s.x = target; s.v = 0; setValue(target); return;
      }
      setValue(s.x);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, stiffness, damping]);
  return value;
}

/** Reads a CSS colour token (e.g. "--primary") as an hsl() string for canvas. */
export function token(name: string, alpha = 1): string {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    if (v) return `hsl(${v} / ${alpha})`;
  } catch { /* SSR or no DOM */ }
  return `rgba(30, 90, 60, ${alpha})`;
}
