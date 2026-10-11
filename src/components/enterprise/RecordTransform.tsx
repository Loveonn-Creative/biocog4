import { useT } from "@/lib/i18n/useT";
import { StatusBadge } from "./StatusBadge";
import type { CapabilityStatus } from "@/data/enterpriseCapabilities";

interface Example {
  key: string;
  channelLabel: string;
  channelStatus: CapabilityStatus;
  raw: string[];
  record: { scope: string; activity: string; factor: string; result: string; confidence: string; source: string };
}

// Illustrative supplier inputs and the record each becomes. Factors are the
// same published values the product uses; hashes are shortened examples.
export const EXAMPLES: Example[] = [
  {
    key: "invoice",
    channelLabel: "PDF electricity invoice",
    channelStatus: "live",
    raw: ["STATE DISCOM  Bill No 44817-B", "Units consumed  4,200", "Period 01/09 to 30/09", "Amount due  Rs 38,640"],
    record: { scope: "Scope 2", activity: "4,200 kWh grid electricity", factor: "0.710 kgCO2/kWh, CEA v21.0", result: "2,982 kgCO2e", confidence: "0.95", source: "sha256 9f2c…a71e" },
  },
  {
    key: "slip",
    channelLabel: "Photo of a fuel slip",
    channelStatus: "live",
    raw: ["HSD  120.00 L", "Rate 90.10", "Veh  TN-38-BX-2231", "14-09-26  10:42"],
    record: { scope: "Scope 1", activity: "120 L diesel", factor: "2.68 kgCO2/L (IPCC basis)", result: "321.6 kgCO2e", confidence: "0.81", source: "sha256 41d0…c3b8" },
  },
  {
    key: "meter",
    channelLabel: "Meter readings (CSV)",
    channelStatus: "roadmap",
    raw: ["ts,kwh", "2026-09-01T00:00,0.84", "2026-09-01T00:15,0.79", "… 2,880 rows"],
    record: { scope: "Scope 2", activity: "1,312 kWh metered", factor: "0.710 kgCO2/kWh, CEA v21.0", result: "931.5 kgCO2e", confidence: "0.98", source: "sha256 7a55…19fe" },
  },
  {
    key: "spend",
    channelLabel: "Long-tail supplier, spend only",
    channelStatus: "live",
    raw: ["Vendor  Shree Packaging", "PO 7781  Corrugated boxes", "Spend  Rs 4,20,000", "No activity data"],
    record: { scope: "Scope 3, Cat 1", activity: "Spend-based estimate", factor: "Sector spend factor", result: "Estimate, flagged", confidence: "0.40", source: "Request primary data" },
  },
];

/** Hand-drawn arrow: the one doodle on the page, marking messy input becoming a record. */
const DoodleArrow = () => (
  <svg viewBox="0 0 120 40" className="w-20 sm:w-28 h-auto text-foreground/70 rotate-90 sm:rotate-0" aria-hidden="true">
    <path d="M4 24 C 22 10, 40 34, 60 20 S 92 10, 108 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M100 12 L 110 20 L 99 27" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const RecordTransform = ({ index, onChange }: { index: number; onChange: (i: number) => void }) => {
  const t = useT();
  const ex = EXAMPLES[index % EXAMPLES.length];

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label={t("ent.transform.tabs", "Example supplier inputs")}>
        {EXAMPLES.map((e, i) => (
          <button
            key={e.key}
            role="tab"
            aria-selected={i === index % EXAMPLES.length}
            onClick={() => onChange(i)}
            className={`rounded-full border px-3 py-1.5 text-xs sm:text-sm transition-colors ${i === index % EXAMPLES.length ? "bg-foreground text-background border-foreground" : "border-border hover:bg-secondary"}`}
          >
            {t(`ent.example.${e.key}`, e.channelLabel)}
          </button>
        ))}
      </div>

      <div className="mt-5 grid items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
        {/* Messy input */}
        <div className="relative rounded-2xl border border-dashed border-foreground/30 bg-background p-4 -rotate-1">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">{t("ent.transform.input", "What the supplier has")}</span>
            <StatusBadge status={ex.channelStatus} />
          </div>
          <pre className="font-mono text-[11px] sm:text-xs leading-relaxed text-foreground/80 whitespace-pre-wrap">{ex.raw.join("\n")}</pre>
        </div>

        <div className="flex justify-center"><DoodleArrow /></div>

        {/* Structured record */}
        <div className="rounded-2xl border border-border bg-secondary/40 p-4">
          <p className="text-xs text-muted-foreground mb-2">{t("ent.transform.output", "What you receive")}</p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs sm:text-sm">
            <dt className="text-muted-foreground">{t("ent.rec.scope", "Scope")}</dt><dd>{ex.record.scope}</dd>
            <dt className="text-muted-foreground">{t("ent.rec.activity", "Activity")}</dt><dd>{ex.record.activity}</dd>
            <dt className="text-muted-foreground">{t("ent.rec.factor", "Factor")}</dt><dd>{ex.record.factor}</dd>
            <dt className="text-muted-foreground">{t("ent.rec.result", "Emissions")}</dt><dd className="font-mono font-semibold">{ex.record.result}</dd>
            <dt className="text-muted-foreground">{t("ent.rec.confidence", "Confidence")}</dt><dd className="font-mono">{ex.record.confidence}</dd>
            <dt className="text-muted-foreground">{t("ent.rec.source", "Source")}</dt><dd className="font-mono text-[11px] sm:text-xs">{ex.record.source}</dd>
          </dl>
        </div>
      </div>
    </div>
  );
};
