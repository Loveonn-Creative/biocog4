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
 * What the platform changes, as before → after pairs on one moving line.
 * Pauses while hovered or focused so a pair can be read; the copy used for the
 * seamless loop is hidden from screen readers; with reduced motion the line
 * stays still and scrolls by hand.
 */
export const PlatformMarquee = () => {
  const { t } = useTranslation();
  const row = (copy: boolean) => (
    <ul aria-hidden={copy || undefined} className="flex shrink-0 items-center gap-12 pr-12">
      {pairs.map((p) => (
        <li key={p.lk} className="flex items-center gap-2">
          <span className="text-background/70">{t(`platform.${p.lk}`, p.left)}</span>
          <span aria-hidden="true" className="text-background/40">→</span>
          <span className="font-medium text-[hsl(var(--strip-accent))]">{t(`platform.${p.rk}`, p.right)}</span>
        </li>
      ))}
    </ul>
  );
  return (
    <div
      className="group bg-foreground text-background border-y border-foreground/20 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[hsl(var(--strip-accent))]"
      tabIndex={0}
      aria-label={t("platform.marquee.label", "What the platform changes")}
    >
      <div className="overflow-hidden motion-reduce:overflow-x-auto [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]">
      <div className="flex w-max whitespace-nowrap py-4 font-mono text-xs sm:text-sm tracking-tight animate-marquee group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused] motion-reduce:animate-none">
        {row(false)}
        <span className="contents motion-reduce:hidden">{row(true)}</span>
      </div>
      </div>
    </div>
  );
};

export default PlatformMarquee;
