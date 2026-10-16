import { useState } from "react";
import { createPortal } from "react-dom";
import { Share2, Check, ArrowRight, Info, Zap, Fuel, FileText, Building2 } from "lucide-react";
import { GreenCategoryBadge, getGreenCategoryFromEmissionCategory } from "./GreenCategoryBadge";
import { TrustScoreGauge } from "./trust/TrustScoreGauge";
import { ConfidenceBand } from "./trust/ConfidenceBand";
import { AutoValidation } from "./trust/AutoValidation";
import { MonetizationPreview } from "./trust/MonetizationPreview";
import { useTrustLayerSettings } from "@/hooks/useTrustLayerSettings";

interface ExtractedData {
  documentType: string;
  vendor?: string;
  date?: string;
  invoiceNumber?: string;
  buyerGstin?: string;
  amount?: number;
  currency?: string;
  emissionCategory?: string;
  estimatedCO2Kg?: number;
  totalCO2Kg?: number;
  avoidedCO2Kg?: number;
  confidence: number;
  validationFlags?: string[];
  classificationMethod?: string;
  lineItems?: Array<{
    description?: string;
    quantity?: number;
    unit?: string;
    scope?: number;
    co2Kg?: number;
    emissionFactor?: number;
    factorSource?: string;
    productCategory?: string;
    avoidedCo2Kg?: number;
    guidance?: LineGuidance;
    /** How the quantity was obtained (read from the bill, estimated, handwritten, meter readings, entered by you) and its plain label. */
    basis?: string;
    basisLabel?: string;
  }>;
  /** Billing details printed on an electricity bill (no personal data). */
  electricityBill?: { billingPeriodStart: string | null; billingPeriodEnd: string | null; tariffCategory: string | null; sanctionedLoadKw: number | null };
  documentCapture?: 'printed' | 'handwritten' | 'meter_photo';
  /** Server summary: lines counted, lines needing a document, and the one next step. */
  guidance?: {
    counted: number; needsData: number; notCovered: number; unclassified: number; nextStep: string | null;
    /** Electricity bill charge lines (money, not energy). */
    billCharges?: number;
    /** Nothing counted and the blocker is printed on the document: reading it again gives the same result. */
    deterministicBlocker?: boolean;
    /** Which electricity blocker applies (kvah_needs_kwh asks the owner for the kWh). */
    blocker?: string | null;
  };
}

interface LineGuidance { status: 'counted' | 'avoided' | 'needs_data' | 'not_covered' | 'unclassified' | 'bill_charge' | 'reference'; need: string | null; nextStep: string | null }

const fmt = (n: number, dp = 2) => n.toLocaleString("en-IN", { maximumFractionDigits: dp });
const kgOrT = (kg: number) => (kg >= 1000 ? { v: fmt(kg / 1000, 2), u: "t CO₂e" } : { v: fmt(kg, kg < 10 ? 2 : 0), u: "kg CO₂e" });
const fmtDate = (d: string | null | undefined) => {
  if (!d) return null;
  const t = Date.parse(`${d}T00:00:00Z`);
  return Number.isFinite(t) ? new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : null;
};

interface ResultStateProps {
  type: "revenue" | "compliance";
  /** Not used for a rupee value: emissions are not credits (see carbonValue.ts). */
  amount?: number;
  extractedData?: ExtractedData;
  onConfirm: () => void;
  onReset: () => void;
  /** False when no line item had a printed quantity and unit, so nothing was saved to verify. */
  hasRecords?: boolean;
  /** Read the same file again (signed in, only while nothing from it is counted). */
  onReread?: () => void;
  /** A kVAh bill that prints neither kWh nor a power factor: count it with the kWh the owner types (labelled "Entered by you"). */
  onEnterKwh?: (kwh: number) => void;
}

/**
 * The screen right after a document is read (owner-approved layout, October
 * 2026): which document it is, one result, one button. On phones the button
 * sits in a bar fixed to the bottom of the screen, so it is always on the
 * first screen. A question appears only when the document cannot be counted
 * without it (a kVAh bill with no printed kWh or power factor). Every figure,
 * factor, check and score is still here, folded under the result.
 */
export const ResultState = ({ type: _type, amount: _amount, extractedData, onConfirm, onReset, hasRecords = true, onReread, onEnterKwh }: ResultStateProps) => {
  const { isEnabled } = useTrustLayerSettings();
  const [kwhInput, setKwhInput] = useState("");

  // Gross emissions and avoided emissions are separate and both >= 0. Older
  // cached results may still carry a netted negative total; read that as
  // avoided emissions, never as negative emissions.
  const rawTotal = extractedData?.totalCO2Kg ?? extractedData?.estimatedCO2Kg ?? 0;
  const co2Value = rawTotal > 0 ? rawTotal : 0;
  const avoidedKg = extractedData?.avoidedCO2Kg && extractedData.avoidedCO2Kg > 0
    ? extractedData.avoidedCO2Kg
    : rawTotal < 0 ? -rawTotal : 0;
  const isGreenBenefit = co2Value === 0 && avoidedKg > 0;
  const guide = extractedData?.guidance;
  const lines = extractedData?.lineItems ?? [];
  const counted = lines.filter((li) => typeof li.co2Kg === "number" && typeof li.quantity === "number" && typeof li.emissionFactor === "number");
  const charges = lines.filter((li) => li.guidance?.status === "bill_charge");
  const others = lines.filter((li) => !counted.includes(li) && !charges.includes(li));
  const flags = extractedData?.validationFlags ?? [];
  const bill = extractedData?.electricityBill;
  const isElectricity = !!bill || extractedData?.emissionCategory === "electricity" || counted.some((l) => /kwh/i.test(l.unit ?? ""));
  const needsKwh = !hasRecords && guide?.blocker === "kvah_needs_kwh";
  const greenCategory = extractedData?.emissionCategory ? getGreenCategoryFromEmissionCategory(extractedData.emissionCategory) : null;

  const docTitle = (() => {
    if (extractedData?.documentCapture === "meter_photo") return "Meter photo";
    if (isElectricity) return "Electricity bill";
    if (/fuel|diesel|petrol|lpg|cng/i.test(extractedData?.emissionCategory ?? "")) return "Fuel bill";
    const t = (extractedData?.documentType ?? "").trim();
    return !t || t === "unknown" ? "Document" : t.charAt(0).toUpperCase() + t.slice(1);
  })();
  const DocIcon = isElectricity ? Zap : /fuel/i.test(docTitle) ? Fuel : FileText;
  const period = bill?.billingPeriodStart && bill.billingPeriodEnd ? `${fmtDate(bill.billingPeriodStart)} to ${fmtDate(bill.billingPeriodEnd)}` : extractedData?.date ?? null;
  const amountText = typeof extractedData?.amount === "number"
    ? new Intl.NumberFormat("en-IN", { style: "currency", currency: extractedData.currency || "INR", maximumFractionDigits: 0 }).format(extractedData.amount)
    : null;
  const docSub = [bill?.tariffCategory, period, amountText].filter(Boolean).join(" · ");

  // One plain sentence on what was and was not counted.
  const noteParts: string[] = [];
  if (charges.length) noteParts.push(`${charges.length} bill charge${charges.length === 1 ? "" : "s"} (fixed charges, duty, FAC, rebates) ${charges.length === 1 ? "is" : "are"} money, not energy, so ${charges.length === 1 ? "it doesn't" : "they don't"} change emissions.`);
  if (guide?.notCovered) noteParts.push(`${guide.notCovered} item${guide.notCovered === 1 ? " is" : "s are"} kept as evidence; purchased goods are not converted to emissions yet.`);
  if (hasRecords && guide && (guide.needsData > 0 || guide.unclassified > 0)) {
    noteParts.push(`${guide.needsData + guide.unclassified} line${guide.needsData + guide.unclassified === 1 ? "" : "s"} could not be counted; see "How we calculated it".`);
  }

  const singleLine = counted.length === 1 ? counted[0] : null;
  const shownBasis = counted.find((l) => l.basis && l.basis !== "read_from_bill")?.basisLabel ?? null;
  const total = kgOrT(co2Value);
  const enteredKwh = Number(kwhInput.replace(/[,\s]/g, ""));
  const kwhValid = Number.isFinite(enteredKwh) && enteredKwh > 0;

  const primary = hasRecords
    ? { label: "Verify this bill", onClick: onConfirm, disabled: false }
    : needsKwh && onEnterKwh
      ? { label: "Count and verify", onClick: () => kwhValid && onEnterKwh(enteredKwh), disabled: !kwhValid }
      : { label: "Upload another document", onClick: onReset, disabled: false };
  const secondary = hasRecords || (needsKwh && onEnterKwh)
    ? { label: hasRecords ? "Upload next bill" : "Upload a different document", onClick: onReset }
    : onReread && !guide?.deterministicBlocker
      ? { label: "Read this file again", onClick: onReread }
      : null;

  const actions = (
    <>
      <button
        type="button"
        onClick={primary.onClick}
        disabled={primary.disabled}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-carbon px-6 py-4 font-medium text-carbon-foreground transition-colors hover:bg-carbon/90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span>{primary.label}</span>
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>
      {secondary && (
        <button type="button" onClick={secondary.onClick} className="py-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
          {secondary.label}
        </button>
      )}
    </>
  );
  // Rendered into <body> so no animated (transformed) parent can unpin it.
  const phoneBar = typeof document !== "undefined" ? createPortal(
    <div data-result-bar className="fixed inset-x-0 bottom-0 z-40 flex flex-col gap-2 border-t border-border bg-background/95 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:hidden">
      {actions}
    </div>,
    document.body,
  ) : null;

  const details: Array<{ title: string; summary: string; body: JSX.Element }> = [];
  details.push({
    title: "Bill details",
    summary: [extractedData?.vendor, period].filter(Boolean).join(" · ") || "From the document",
    body: (
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
        {extractedData?.vendor && <><dt className="text-muted-foreground">Supplier</dt><dd className="text-right text-foreground break-words">{extractedData.vendor}</dd></>}
        {period && <><dt className="text-muted-foreground">Period</dt><dd className="text-right text-foreground">{period}</dd></>}
        {bill?.tariffCategory && <><dt className="text-muted-foreground">Tariff</dt><dd className="text-right text-foreground">{bill.tariffCategory}</dd></>}
        {typeof bill?.sanctionedLoadKw === "number" && <><dt className="text-muted-foreground">Sanctioned load</dt><dd className="text-right text-foreground">{fmt(bill.sanctionedLoadKw)} kW</dd></>}
        {extractedData?.emissionCategory && <><dt className="text-muted-foreground">Category</dt><dd className="text-right text-foreground capitalize">{extractedData.emissionCategory}</dd></>}
        {amountText && <><dt className="text-muted-foreground">Amount</dt><dd className="text-right text-foreground">{amountText}</dd></>}
        {extractedData?.buyerGstin && (
          <><dt className="text-muted-foreground">Buyer</dt><dd className="text-right text-foreground">GSTIN {extractedData.buyerGstin.substring(0, 4)}****: usable as their Scope 3 evidence once verified</dd></>
        )}
      </dl>
    ),
  });
  if (lines.length) {
    details.push({
      title: "How we calculated it",
      summary: hasRecords ? `${counted.length} line${counted.length === 1 ? "" : "s"} counted` : needsKwh ? "waiting for kWh" : "nothing counted yet",
      body: (
        <div className="space-y-2.5">
          {counted.map((li, i) => (
            <div key={`c${i}`} className="border-b border-border/60 pb-2 last:border-0">
              <p className="font-medium text-foreground break-words">{li.description || `Line ${i + 1}`}</p>
              <p className="mt-0.5 text-muted-foreground">
                {fmt(li.quantity!)} {li.unit} × {fmt(li.emissionFactor!, 4)} kg CO₂e per {li.unit} = <span className="font-medium text-foreground">{fmt(li.co2Kg!)} kg CO₂e</span>
                {li.scope ? ` · Scope ${li.scope}` : ""}
                {li.basisLabel && <span className="block">{li.basisLabel}</span>}
                {li.factorSource && <span className="block">Factor source: {li.factorSource}</span>}
              </p>
            </div>
          ))}
          {charges.length > 0 && (
            <p className="text-muted-foreground">{charges.length} bill charge{charges.length === 1 ? "" : "s"} (money, not energy): {charges.map((c) => c.description).filter(Boolean).join(", ")}.</p>
          )}
          {others.map((li, i) => (
            <div key={`o${i}`} className="border-b border-border/60 pb-2 last:border-0">
              <p className="font-medium text-foreground break-words">{li.description || `Line ${i + 1}`}</p>
              <p className="mt-0.5 text-muted-foreground">
                Not counted: {li.guidance?.need ? `${li.guidance.need} not printed` : typeof li.quantity !== "number" || !li.unit ? "no quantity with a unit on this line" : "no documented emission factor for this item yet"}.
                {li.guidance?.nextStep && <span className="block">{li.guidance.nextStep}</span>}
              </p>
            </div>
          ))}
          <p className="text-muted-foreground">Total = sum of counted lines = {fmt(co2Value)} kg CO₂e. Calculated from the document; verification is a separate check.</p>
        </div>
      ),
    });
  }
  if (flags.length) {
    details.push({
      title: "Checks",
      summary: `${flags.length} on this document`,
      body: <ul className="list-disc space-y-1 pl-5 text-muted-foreground">{flags.map((f, i) => <li key={i}>{f}</li>)}</ul>,
    });
  }
  if (extractedData) {
    const q = extractedData.confidence;
    details.push({
      title: "Read quality",
      summary: q >= 0.85 ? "Good" : q >= 0.6 ? "Fair" : "Check",
      body: (
        <div className="space-y-4">
          <TrustScoreGauge extractedData={extractedData} />
          {extractedData.confidence !== undefined && hasRecords && (
            <ConfidenceBand confidence={extractedData.confidence} classificationMethod={extractedData.classificationMethod} />
          )}
          {isEnabled("auto_validation") && <AutoValidation extractedData={extractedData} />}
        </div>
      ),
    });
  }

  return (
    <div className="w-full max-w-sm sm:max-w-xl lg:max-w-4xl animate-reveal pb-36 sm:pb-0">
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10">
        <div className="flex flex-col gap-4 text-left">
          {/* Which document this is */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <DocIcon className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-foreground">{docTitle}{extractedData?.vendor ? ` · ${extractedData.vendor}` : ""}</p>
              {docSub && <p className="truncate text-xs text-muted-foreground">{docSub}</p>}
            </div>
            <span className="ml-auto flex shrink-0 items-center gap-1 text-xs font-medium text-success"><Check className="h-3.5 w-3.5" aria-hidden="true" />Read</span>
          </div>

          {/* The result */}
          {hasRecords && !isGreenBenefit ? (
            <div className="flex flex-col gap-1.5">
              <p className="text-sm text-muted-foreground">Emissions from this {isElectricity ? "bill" : "document"}</p>
              <p className="text-4xl font-semibold tracking-tight text-foreground">{total.v} <span className="text-lg font-medium text-muted-foreground">{total.u}</span></p>
              <span className="inline-flex w-max items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-hidden="true" />Verification pending
              </span>
              {singleLine && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-mono text-[13px]">{fmt(singleLine.quantity!)} {singleLine.unit} × {fmt(singleLine.emissionFactor!, 3)}</span>
                  {singleLine.scope ? ` · Scope ${singleLine.scope}` : ""}
                </p>
              )}
              {shownBasis && <p className="text-sm text-muted-foreground">{shownBasis}</p>}
            </div>
          ) : isGreenBenefit ? (
            <div className="flex flex-col gap-1.5">
              <p className="text-sm text-muted-foreground">Avoided emissions, reported separately</p>
              <p className="text-4xl font-semibold tracking-tight text-success">{fmt(avoidedKg)} <span className="text-lg font-medium">kg CO₂e</span></p>
              {greenCategory && <GreenCategoryBadge category={greenCategory} size="md" />}
            </div>
          ) : needsKwh && onEnterKwh ? (
            <div className="flex flex-col gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4">
              <p className="text-lg font-semibold tracking-tight text-foreground">One number needed: kWh</p>
              <p className="text-sm text-foreground/80">Your bill charges in kVAh, which is normal for many HT and MSEDCL bills. Emissions are counted in kWh.</p>
              <label htmlFor="result-kwh" className="text-sm font-medium text-foreground">Type the kWh units from your bill</label>
              <input
                id="result-kwh"
                inputMode="numeric"
                autoComplete="off"
                value={kwhInput}
                onChange={(e) => setKwhInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && kwhValid) onEnterKwh(enteredKwh); }}
                placeholder="e.g. 22,435"
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-base text-foreground"
              />
              <p className="text-xs text-muted-foreground">Look for "kWh" or "Units consumed", usually near the meter readings. It is saved as "Entered by you".</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-warning/40 bg-warning/10 p-4">
              <p className="font-semibold text-foreground">Nothing to count from this document yet</p>
              <p className="mt-1 text-sm text-foreground/80">{guide?.nextStep ?? "Emissions need a quantity with a unit (kWh, litres, kg) printed on the document."}</p>
            </div>
          )}

          {noteParts.length > 0 && (
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{noteParts.join(" ")}</span>
            </p>
          )}

          {co2Value > 0 && isEnabled("monetization_preview") && <MonetizationPreview pendingKg={co2Value} verifiedKg={0} />}

          {/* Actions inline from tablet up; on phones the same actions sit in a
              bar fixed to the bottom of the screen (rendered below). */}
          <div className="hidden sm:flex sm:max-w-sm sm:flex-col sm:gap-2">{actions}</div>
        </div>

        {/* Details, folded. Open on desktop, where there is room. */}
        <div className="mt-6 lg:mt-0 lg:border-l lg:border-border lg:pl-8">
          <div className="divide-y divide-border border-y border-border text-left lg:border-t-0">
            {details.map((d, i) => (
              <details key={d.title} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-3.5 text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
                  <span className="shrink-0 whitespace-nowrap">{d.title}</span>
                  <span className="ml-auto truncate text-xs font-normal text-muted-foreground">{d.summary}</span>
                  <span className="h-2 w-2 shrink-0 rotate-45 border-b-[1.5px] border-r-[1.5px] border-muted-foreground transition-transform group-open:-rotate-[135deg]" aria-hidden="true" />
                </summary>
                <div className="pb-4 text-xs">{d.body}</div>
              </details>
            ))}
          </div>
          {co2Value > 0 && (
            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                `My ${extractedData?.documentType ?? 'document'} came to ${co2Value.toFixed(1)} kg CO2e on Senseible, with the emission factor and source for every line. Try it: https://senseible.earth/`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <Share2 className="h-4 w-4" aria-hidden="true" />Share on WhatsApp
            </a>
          )}
          {extractedData?.buyerGstin && (
            <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground"><Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />Your buyer can use this as Scope 3 evidence once it is verified.</p>
          )}
        </div>
      </div>
      {phoneBar}
    </div>
  );
};

export default ResultState;
