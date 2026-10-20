import { Link } from "react-router-dom";
import { useT } from "@/lib/i18n/useT";

// Kill switch for the homepage additions: the guest "Also:" line, the guest
// footer delivery motion and the signed-in Help Center link. Set the Vercel
// env var VITE_HOME_ALSO=off and redeploy to hide all three at once.
export const HOME_ALSO_ON = import.meta.env.VITE_HOME_ALSO !== "off";

// Three rows of six, each one job: start and fund, measure and report, trade and comply.
const ROWS: { key: string; label: string; to: string }[][] = [
  [
    { key: "first", label: "First Report Free", to: "/msme-carbon-number" },
    { key: "finance", label: "Climate Finance", to: "/climate-finance" },
    { key: "credits", label: "Carbon Credits", to: "/carbon-credits" },
    { key: "grants", label: "Grants", to: "/grants" },
    { key: "netzero", label: "Net Zero", to: "/net-zero" },
    { key: "sample", label: "Sample Report", to: "/esg-report-sample" },
  ],
  [
    { key: "accounting", label: "Carbon Accounting", to: "/carbon-accounting" },
    { key: "brsr", label: "BRSR Reporting", to: "/esg-reporting" },
    { key: "ratings", label: "EcoVadis & CDP", to: "/esg-ratings" },
    { key: "assurance", label: "ESG Assurance", to: "/esg-data-management" },
    { key: "factors", label: "Emission Factors", to: "/emission-factors" },
    { key: "risk", label: "Climate Risk", to: "/climate-risk" },
  ],
  [
    { key: "cbam", label: "CBAM Calculator", to: "/cbam-calculator" },
    { key: "supplier", label: "Supplier Emissions", to: "/scope-3-supplier-evidence" },
    { key: "diligence", label: "Supplier Due Diligence", to: "/supplier-due-diligence" },
    { key: "epr", label: "EPR Compliance", to: "/circular-economy" },
    { key: "decarbonisation", label: "Decarbonisation", to: "/decarbonization" },
    { key: "ehs", label: "EHS & Safety", to: "/ehs-social" },
  ],
];

// Hover colours cycle through the platform palette: India saffron, India green, ink.
const HOVER = ["hover:text-[#FF9933] focus-visible:text-[#FF9933]", "hover:text-[#138808] focus-visible:text-[#138808]", "hover:text-foreground focus-visible:text-foreground"];

export const HomeAlso = () => {
  const t = useT();
  return (
    <nav aria-label={t("home.also.label", "Also")} className="mt-16 sm:mt-20 w-full max-w-6xl px-0 sm:px-6 text-center text-[13px] sm:text-[14px] leading-7 sm:leading-8 text-muted-foreground">
      <p className="font-semibold text-foreground">{t("home.also.label", "Also")}</p>
      {ROWS.map((row, r) => (
        <p key={r} className="[text-wrap:balance]">
          {row.map((l, i) => (
            <span key={l.key}>
              <Link
                to={l.to}
                className={`whitespace-nowrap text-primary underline-offset-4 transition-colors hover:underline focus-visible:underline ${HOVER[(r + i) % HOVER.length]}`}
              >
                {t(`home.also.${l.key}`, l.label)}
              </Link>
              {i < row.length - 1 && <><span aria-hidden="true">{"\u00a0·"}</span>{" "}</>}
            </span>
          ))}
        </p>
      ))}
    </nav>
  );
};
