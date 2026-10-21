import { useEffect, useRef, useState } from 'react';

// Counts a figure up from zero once, when it first appears. With reduced
// motion the final figure shows straight away.
const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function CountUp({ to, decimals = 0, ms = 700 }: { to: number; decimals?: number; ms?: number }) {
  const [v, setV] = useState(() => (reduced() ? to : 0));
  const played = useRef(false);
  useEffect(() => {
    if (played.current || reduced() || !Number.isFinite(to)) { setV(to); return; }
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
  }, [to, ms]);
  return <>{v.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</>;
}
