import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Share2, X } from "lucide-react";
import { useT } from "@/lib/i18n/useT";
import { computeSampleResult } from "@/lib/sampleInvoice";

const kg = (n: number) => `${n.toLocaleString("en-IN", { maximumFractionDigits: 1 })} kg`;
const eur = (n: number) => `€${Math.round(n).toLocaleString("en-US")}`;

/**
 * Result for the built-in sample bill. Computed locally in the same render,
 * so it appears instantly; nothing is uploaded or saved.
 */
export const SampleResult = ({ onClose, onTryOwn }: { onClose: () => void; onTryOwn: () => void }) => {
  const t = useT();
  const r = useMemo(() => computeSampleResult(), []);
  const max = Math.max(r.scope1Kg, r.scope2Kg, r.scope3Kg, 1);

  const shareText = t(
    "home.sample.share_text",
    "A sample energy bill on Senseible: {total} CO2e, with the emission factor and source shown for every line. Try it with your own bill:"
  ).replace("{total}", kg(r.totalKg));
  const shareUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText} https://senseible.earth/`)}`;

  return (
    <section
      aria-labelledby="sample-result-title"
      className="w-full max-w-md rounded-2xl border border-border bg-background/95 backdrop-blur p-5 sm:p-6 shadow-lg animate-fade-in text-left"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-widest text-warning">{t("home.sample.badge", "Sample data, not saved")}</p>
          <h2 id="sample-result-title" className="text-lg font-semibold mt-1">{t("home.sample.title", "Sample electricity and fuel bill")}</h2>
        </div>
        <button onClick={onClose} aria-label={t("home.sample.close", "Close sample")} className="p-2 -m-2 rounded-full hover:bg-secondary">
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="font-mono text-3xl font-semibold tracking-tight">
        {kg(r.totalKg)} <span className="text-base text-muted-foreground">CO2e</span>
      </p>

      <dl className="mt-4 space-y-2">
        {[
          { key: "1", label: t("home.sample.scope1", "Scope 1 · fuel you burn"), value: r.scope1Kg },
          { key: "2", label: t("home.sample.scope2", "Scope 2 · electricity you buy"), value: r.scope2Kg },
          { key: "3", label: t("home.sample.scope3", "Scope 3 · purchases (none on this bill)"), value: r.scope3Kg },
        ].map(row => (
          <div key={row.key}>
            <div className="flex justify-between text-sm">
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className="font-mono">{kg(row.value)}</dd>
            </div>
            <div className="h-1.5 rounded-full bg-secondary mt-1 overflow-hidden" aria-hidden="true">
              <div className="h-full rounded-full bg-primary" style={{ width: `${(row.value / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </dl>

      <details className="mt-4 text-xs text-muted-foreground">
        <summary className="cursor-pointer text-foreground">{t("home.sample.method", "How each line was calculated")}</summary>
        <ul className="mt-2 space-y-1.5">
          {r.lines.map(l => (
            <li key={l.description}>
              <span className="font-mono">{l.quantity.toLocaleString("en-IN")} {l.unit} × {l.factor} = {kg(l.co2Kg)}</span>
              <br />
              {l.description}. {l.factorSource}.
            </li>
          ))}
        </ul>
      </details>

      <div className="mt-4 rounded-xl bg-secondary/60 p-3 text-sm">
        <p className="font-medium">{t("home.sample.cbam_title", "If this unit shipped 100 t of steel to the EU in 2026")}</p>
        <p className="text-muted-foreground mt-1">
          {t("home.sample.cbam_body", "Estimated CBAM cost for the EU buyer: {verified} with verified data, {fallback} on default values.")
            .replace("{verified}", eur(r.cbam.costVerified2026))
            .replace("{fallback}", eur(r.cbam.costDefault2026))}{" "}
          <Link to="/cbam-calculator" className="text-primary underline underline-offset-2">{t("home.sample.cbam_method", "Method")}</Link>
        </p>
      </div>

      <div className="mt-5 flex flex-col sm:flex-row gap-2">
        <button
          onClick={onTryOwn}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium hover:bg-primary/90"
        >
          {t("home.sample.try_own", "Now try your own bill")} <ArrowRight className="w-4 h-4" />
        </button>
        <a
          href={shareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-medium hover:bg-secondary"
        >
          <Share2 className="w-4 h-4" /> {t("home.sample.share", "Share on WhatsApp")}
        </a>
      </div>
    </section>
  );
};
