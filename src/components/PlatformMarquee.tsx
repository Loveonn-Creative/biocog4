import { useEffect, useRef, useState } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";

const pairs = [
  { left: "MRV workflows", right: "standardised", lk: "marquee.mrv.left", rk: "marquee.mrv.right" },
  { left: "Decarbonisation roadmaps", right: "actionable", lk: "marquee.roadmaps.left", rk: "marquee.roadmaps.right" },
  { left: "Climate finance flows", right: "transparent", lk: "marquee.finance.left", rk: "marquee.finance.right" },
  { left: "Emerging markets", right: "included", lk: "marquee.em.left", rk: "marquee.em.right" },
  { left: "Scope 1 · 2 · 3", right: "verified", lk: "marquee.scope.left", rk: "marquee.scope.right" },
  { left: "Carbon credits", right: "traceable", lk: "marquee.credits.left", rk: "marquee.credits.right" },
];

/**
 * What the platform changes, as before → after pairs. Each pair resolves once
 * as it scrolls into view (the "before" state turns into the "after" state),
 * instead of looping forever.
 */
export const PlatformMarquee = () => {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") { setShown(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="bg-foreground text-background border-y border-foreground/20">
      <ul className="container max-w-6xl mx-auto px-6 py-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-3 font-mono text-xs sm:text-sm tracking-tight">
        {pairs.map((p, i) => (
          <li key={p.lk} className="flex items-center gap-2 min-w-0">
            <span className="text-background/60 truncate">{t(`platform.${p.lk}`, p.left)}</span>
            <span
              aria-hidden="true"
              className="text-background/40 transition-transform duration-500 motion-reduce:transition-none"
              style={{ transform: shown ? "translateX(0)" : "translateX(-6px)", transitionDelay: `${i * 90}ms` }}
            >
              →
            </span>
            <span
              className="text-primary font-medium transition-all duration-500 motion-reduce:transition-none"
              style={{ opacity: shown ? 1 : 0.15, filter: shown ? "none" : "blur(2px)", transitionDelay: `${150 + i * 90}ms` }}
            >
              {t(`platform.${p.rk}`, p.right)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PlatformMarquee;
