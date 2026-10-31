import { useEffect, useRef, useState } from "react";

/*
 * Shared pieces for the "Privacy by design" moments on /platform, /enterprise
 * and /trust. Each page tells the same promise with a different motion.
 *
 * Every claim these pieces illustrate is true in code:
 * - bills and documents stay in the owner's account (private Storage buckets,
 *   account-scoped RLS; no public URLs are issued for uploaded files)
 * - a supplier shares only computed totals with an enterprise, after pressing
 *   Share, and can stop sharing at any time (supplier_shares)
 * - guest uploads are not stored on the server; results stay in the browser
 *   for 24 hours (src/lib/guestResults.ts, supabase/functions/_shared/guestScan.ts)
 * - request links are stored only as hashes; every bill gets a SHA-256
 *   fingerprint; logs do not record document contents
 * - encrypted in transit and at rest (Privacy Policy)
 */

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Once-only flag that turns true when the element first comes into view. */
export function useSeen<T extends Element>(threshold = 0.35) {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") { setSeen(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return { ref, seen };
}

/**
 * Scroll progress from 0 to 1 as the element rises through the viewport:
 * 0 when its top reaches 90% of the screen height, 1 at 30%. Listens only
 * while the element is near the screen. Reduced motion gets 1 at once.
 */
export function useScrollProgress<T extends Element>() {
  const ref = useRef<T>(null);
  const [p, setP] = useState(() => (prefersReducedMotion() ? 1 : 0));
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") { setP(1); return; }
    let raf = 0;
    const read = () => {
      raf = 0;
      const vh = window.innerHeight || 1;
      const top = el.getBoundingClientRect().top;
      setP(Math.min(1, Math.max(0, (vh * 0.9 - top) / (vh * 0.6))));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(read); };
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        read();
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onScroll);
      } else {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
        read();
      }
    }, { rootMargin: "20% 0px 20% 0px" });
    io.observe(el);
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return { ref, p };
}

/** Maps overall progress p onto a sub-range [a, b], eased out. */
export const span = (p: number, a: number, b: number) => {
  const x = Math.min(1, Math.max(0, (p - a) / (b - a)));
  return 1 - Math.pow(1 - x, 3);
};

type ArtProps = { x?: number; y?: number; width?: number; height?: number; className?: string };

/** A utility bill: header, a few lines, the units row. Usable in HTML or inside another SVG. */
export const BillArt = ({ className, ...pos }: ArtProps) => (
  <svg viewBox="0 0 60 78" className={className} {...pos} aria-hidden="true">
    <path d="M4 2 H44 L58 16 V74 a2 2 0 0 1 -2 2 H4 a2 2 0 0 1 -2 -2 V4 a2 2 0 0 1 2 -2 Z" className="fill-card stroke-foreground/40" strokeWidth="1.5" />
    <path d="M44 2 V16 H58" fill="none" className="stroke-foreground/40" strokeWidth="1.5" />
    <rect x="9" y="10" width="22" height="5" rx="1.5" className="fill-foreground/70" />
    <rect x="9" y="24" width="40" height="2.5" rx="1" className="fill-foreground/20" />
    <rect x="9" y="31" width="34" height="2.5" rx="1" className="fill-foreground/20" />
    <rect x="9" y="38" width="38" height="2.5" rx="1" className="fill-foreground/20" />
    <rect x="9" y="52" width="16" height="3" rx="1" className="fill-foreground/40" />
    <rect x="33" y="50" width="18" height="7" rx="1.5" className="fill-primary/25" />
    <rect x="9" y="64" width="42" height="2.5" rx="1" className="fill-foreground/20" />
  </svg>
);

/** The one thing that may leave: a computed total, never the bill behind it. */
export const TOTAL_LABEL = "4.2 tCO2e";

export const TotalArt = ({ className, ...pos }: ArtProps) => (
  <svg viewBox="0 0 96 32" className={className} {...pos} aria-hidden="true">
    <rect x="1" y="1" width="94" height="30" rx="15" className="fill-primary" />
    <text x="48" y="20.5" textAnchor="middle" className="fill-primary-foreground" style={{ font: "600 12px ui-monospace, SFMono-Regular, Menlo, monospace" }}>{TOTAL_LABEL}</text>
  </svg>
);
