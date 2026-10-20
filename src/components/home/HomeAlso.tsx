import { useState } from "react";
import { Link } from "react-router-dom";
import { useT } from "@/lib/i18n/useT";

// Kill switch for the homepage additions: the guest "Also:" line, the guest
// footer delivery motion and the signed-in Help Center link. Set the Vercel
// env var VITE_HOME_ALSO=off and redeploy to hide all three at once.
export const HOME_ALSO_ON = import.meta.env.VITE_HOME_ALSO !== "off";

// Two lines of five on desktop: start and fund, then measure and report.
const ROWS: { key: string; label: string; to: string }[][] = [
  [
    { key: "first", label: "First Report Free", to: "/msme-carbon-number" },
    { key: "finance", label: "Climate Finance", to: "/climate-finance" },
    { key: "credits", label: "Carbon Credits", to: "/carbon-credits" },
    { key: "cbam", label: "CBAM Calculator", to: "/cbam-calculator" },
    { key: "netzero", label: "Net Zero", to: "/net-zero" },
  ],
  [
    { key: "accounting", label: "Carbon Accounting", to: "/carbon-accounting" },
    { key: "brsr", label: "BRSR Reporting", to: "/esg-reporting" },
    { key: "ratings", label: "EcoVadis & CDP", to: "/esg-ratings" },
    { key: "supplier", label: "Supplier Emissions", to: "/scope-3-supplier-evidence" },
    { key: "sample", label: "Sample Report", to: "/esg-report-sample" },
  ],
];

// Hover colours cycle through the platform palette: India saffron, India green, ink.
const HOVER = ["hover:text-[#FF9933] focus-visible:text-[#FF9933]", "hover:text-[#138808] focus-visible:text-[#138808]", "hover:text-foreground focus-visible:text-foreground"];

const Sep = () => <span aria-hidden="true" className="ml-1.5 sm:ml-4">·</span>;

/**
 * Desktop shows both lines. Phones show the first line (two short lines of
 * text) and a "More" toggle that opens the second, so the block never runs
 * past four lines.
 */
export const HomeAlso = () => {
  const t = useT();
  const [open, setOpen] = useState(false);
  const toggle = (label: string) => (
    <button
      type="button"
      onClick={() => setOpen((o) => !o)}
      aria-expanded={open}
      aria-controls="home-also-more"
      className="sm:hidden font-medium text-foreground underline underline-offset-4"
    >
      {label}
    </button>
  );
  return (
    <nav aria-label={t("home.also.label", "Also")} className="mt-16 sm:mt-20 w-full max-w-6xl px-0 sm:px-6 text-center text-[13px] sm:text-[15px] leading-8 sm:leading-9 text-muted-foreground">
      {ROWS.map((row, r) => (
        <p key={r} id={r === 1 ? "home-also-more" : undefined} className={`[text-wrap:balance] ${r === 1 && !open ? "hidden sm:block" : ""}`}>
          {r === 0 && <><span className="font-semibold text-foreground">{t("home.also.label", "Also")}:</span>{" "}</>}
          {row.map((l, i) => {
            const last = i === row.length - 1;
            // Phones get a separator before the toggle that ends each line.
            const sepAfter = !last ? <Sep /> : <span className="sm:hidden"><Sep /></span>;
            return (
              <span key={l.key}>
                {/* The dot stays with the link before it, so a line never starts with one. */}
                <span className="whitespace-nowrap">
                  <Link
                    to={l.to}
                    className={`text-primary underline-offset-4 transition-colors hover:underline focus-visible:underline ${HOVER[(r + i) % HOVER.length]}`}
                  >
                    {t(`home.also.${l.key}`, l.label)}
                  </Link>
                  {sepAfter}
                </span>
                <span className={last ? "sm:hidden mr-0.5" : "mr-0.5 sm:mr-3"}> </span>
              </span>
            );
          })}
          {r === 0 && !open && toggle(t("home.also.more", "More"))}
          {r === 1 && open && toggle(t("home.also.less", "Less"))}
        </p>
      ))}
    </nav>
  );
};
