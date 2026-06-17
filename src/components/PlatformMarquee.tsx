import { useTranslation } from "@/lib/i18n/useTranslation";

const pairs = [
  { left: "MRV workflows", right: "standardised", lk: "marquee.mrv.left", rk: "marquee.mrv.right" },
  { left: "Decarbonisation roadmaps", right: "actionable", lk: "marquee.roadmaps.left", rk: "marquee.roadmaps.right" },
  { left: "Climate finance flows", right: "transparent", lk: "marquee.finance.left", rk: "marquee.finance.right" },
  { left: "Emerging markets", right: "included", lk: "marquee.em.left", rk: "marquee.em.right" },
  { left: "Scope 1 · 2 · 3", right: "verified", lk: "marquee.scope.left", rk: "marquee.scope.right" },
  { left: "Carbon credits", right: "traceable", lk: "marquee.credits.left", rk: "marquee.credits.right" },
];

export const PlatformMarquee = () => {
  const { t } = useTranslation();
  // Render the list twice for a seamless loop.
  const items = [...pairs, ...pairs];
  return (
    <div className="bg-foreground text-background border-y border-foreground/20 overflow-hidden">
      <div className="relative">
        <div className="flex gap-12 whitespace-nowrap py-4 animate-marquee motion-reduce:animate-none font-mono text-xs sm:text-sm tracking-tight">
          {items.map((p, i) => (
            <div key={i} className="flex items-center gap-2 shrink-0">
              <span className="text-background/60">{t(`platform.${p.lk}`, p.left)}</span>
              <span className="text-background/40">→</span>
              <span className="text-primary font-medium">{t(`platform.${p.rk}`, p.right)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlatformMarquee;
