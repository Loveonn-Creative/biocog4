import { Link } from "react-router-dom";
import { useT } from "@/lib/i18n/useT";

// Kill switch for the homepage additions: the guest "Also:" line, the guest
// footer delivery motion and the signed-in Help Center link. Set the Vercel
// env var VITE_HOME_ALSO=off and redeploy to hide all three at once.
export const HOME_ALSO_ON = import.meta.env.VITE_HOME_ALSO !== "off";

const LINKS: { key: string; label: string; to: string }[] = [
  { key: "first", label: "First Report Free", to: "/msme-carbon-number" },
  { key: "loan", label: "Green Loan", to: "/green-loan-check" },
  { key: "finance", label: "Climate Finance", to: "/climate-finance" },
  { key: "cbam", label: "CBAM Calculator", to: "/cbam-calculator" },
  { key: "supplier", label: "Supplier Emissions", to: "/scope-3-supplier-evidence" },
  { key: "credits", label: "Carbon Credits", to: "/carbon-credits" },
  { key: "netzero", label: "Net Zero", to: "/net-zero" },
  { key: "decarbonize", label: "Decarbonize", to: "/decarbonize-india" },
  { key: "sample", label: "Sample Report", to: "/esg-report-sample" },
  { key: "careers", label: "Careers", to: "/careers" },
];

// Hover colours cycle through the platform palette: brand green, India saffron, deep green.
const HOVER = ["hover:text-[#FF9933] focus-visible:text-[#FF9933]", "hover:text-[#138808] focus-visible:text-[#138808]", "hover:text-foreground focus-visible:text-foreground"];

export const HomeAlso = () => {
  const t = useT();
  return (
    <p className="mt-10 sm:mt-12 w-full max-w-4xl px-1 text-center text-[13px] sm:text-[15px] leading-7 sm:leading-8 text-muted-foreground">
      {t("home.also.label", "Also:")}{" "}
      {LINKS.map((l, i) => (
        <span key={l.key}>
          <Link
            to={l.to}
            className={`whitespace-nowrap text-primary underline-offset-4 transition-colors hover:underline focus-visible:underline ${HOVER[i % HOVER.length]}`}
          >
            {t(`home.also.${l.key}`, l.label)}
          </Link>
          {i < LINKS.length - 1 && <>{" "}<span aria-hidden="true">·</span>{" "}</>}
        </span>
      ))}
    </p>
  );
};
