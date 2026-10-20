import { useEffect, useRef, useState, type ReactNode } from "react";
import { useInView } from "@/components/platform/Reveal";

// Motion for the lead pages. Each piece plays once when it scrolls into view
// and lands on its final state; with reduced motion the final state shows at
// once. No icons: checks, stamps and fingerprints are drawn.

const reduced = () => {
  try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return true; }
};

/** Types `text` out once after `start`; later changes show at once, so live numbers never lag. */
export function useTypewriter(text: string, start: boolean, msPerChar = 14) {
  const [shown, setShown] = useState(text);
  const played = useRef(false);
  useEffect(() => {
    if (played.current || !start || !text || reduced()) { setShown(text); return; }
    played.current = true;
    let i = 0;
    setShown("");
    const id = window.setInterval(() => {
      i = Math.min(text.length, i + 3);
      setShown(text.slice(0, i));
      if (i >= text.length) window.clearInterval(id);
    }, msPerChar * 3);
    return () => { window.clearInterval(id); setShown(text); };
  }, [text, start, msPerChar]);
  return shown;
}

/** A list whose hand-drawn checks are drawn one after another as it arrives. */
export const TickList = ({ items, className = "" }: { items: string[]; className?: string }) => {
  const { ref, inView } = useInView<HTMLUListElement>(0.3);
  return (
    <ul ref={ref} className={`space-y-4 ${className}`}>
      {items.map((n, i) => (
        <li key={n} className="flex gap-3 text-[16px] leading-snug">
          <svg viewBox="0 0 20 20" className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true">
            <path d="M3 11 L8 15 L17 4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" pathLength={1}
              className="motion-reduce:!transition-none"
              style={{ strokeDasharray: 1, strokeDashoffset: inView ? 0 : 1, transition: `stroke-dashoffset 420ms cubic-bezier(.2,.8,.2,1) ${180 + i * 220}ms` }} />
          </svg>
          <span className={`transition-opacity duration-500 motion-reduce:transition-none ${inView ? "opacity-100" : "opacity-40"}`} style={{ transitionDelay: `${180 + i * 220}ms` }}>{n}</span>
        </li>
      ))}
    </ul>
  );
};

const HEX = "0123456789abcdef";

/** Random characters that settle, left to right, into `target`: a file being fingerprinted. */
export const HashScramble = ({ target, start, className = "" }: { target: string; start: boolean; className?: string }) => {
  const [out, setOut] = useState(target);
  const played = useRef(false);
  useEffect(() => {
    if (!start || played.current || reduced()) { if (!played.current) setOut(target); return; }
    played.current = true;
    let frame = 0;
    const total = 28;
    const id = window.setInterval(() => {
      frame++;
      const settled = Math.floor((frame / total) * target.length);
      setOut(target.split("").map((c, i) => (i < settled ? c : HEX[Math.floor(Math.random() * 16)])).join(""));
      if (frame >= total) { window.clearInterval(id); setOut(target); }
    }, 45);
    return () => window.clearInterval(id);
  }, [start, target]);
  return <span className={`font-mono tabular-nums ${className}`}>{out}</span>;
};

/** Counts from 0 to `to` once when `start` turns true. */
export const CountUp = ({ to, start, decimals = 0, ms = 1100 }: { to: number; start: boolean; decimals?: number; ms?: number }) => {
  const [v, setV] = useState(to);
  const played = useRef(false);
  useEffect(() => {
    if (!start || played.current || reduced()) { if (!played.current) setV(to); return; }
    played.current = true;
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      setV(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [start, to, ms]);
  return <>{v.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</>;
};

/** A rubber stamp that lands once, slightly crooked, when `start` turns true. */
export const Stamp = ({ children, start, className = "" }: { children: ReactNode; start: boolean; className?: string }) => (
  <span
    className={`inline-block rotate-[-6deg] rounded-md border-2 border-primary px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-primary transition-[opacity,transform] duration-300 ease-[cubic-bezier(.3,1.6,.5,1)] motion-reduce:transition-none ${start ? "scale-100 opacity-100" : "scale-[1.8] opacity-0"} ${className}`}
    aria-hidden="true"
  >
    {children}
  </span>
);
