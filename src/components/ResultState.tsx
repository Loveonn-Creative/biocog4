import { Share2, Check, ArrowRight, Leaf, AlertTriangle, TreePine, Building2, Shield, TrendingUp, Coins, Info } from "lucide-react";
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
  }>;
  /** Server summary: lines counted, lines needing a document, and the one next step. */
  guidance?: { counted: number; needsData: number; notCovered: number; unclassified: number; nextStep: string | null };
}

interface LineGuidance { status: 'counted' | 'avoided' | 'needs_data' | 'not_covered' | 'unclassified'; need: string | null; nextStep: string | null }

const fmt = (n: number, dp = 2) => n.toLocaleString("en-IN", { maximumFractionDigits: dp });

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
}

export const ResultState = ({ type, amount, extractedData, onConfirm, onReset, hasRecords = true, onReread }: ResultStateProps) => {
  const { isEnabled } = useTrustLayerSettings();
  const hasWarnings = extractedData?.validationFlags && extractedData.validationFlags.length > 0;
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
  const lineCount = extractedData?.lineItems?.length ?? 0;
  const greenCategory = extractedData?.emissionCategory ? getGreenCategoryFromEmissionCategory(extractedData.emissionCategory) : null;
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="flex flex-col items-center gap-6 animate-reveal max-w-sm w-full">
      {/* Success indicator */}
      <div className="relative">
        <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-success/20 flex items-center justify-center">
            <Check className="w-7 h-7 text-success" strokeWidth={2.5} />
          </div>
        </div>
        <div className="absolute -top-2 -right-2 w-3 h-3 rounded-full bg-success/30 animate-float" />
        <div className="absolute -bottom-1 -left-3 w-2 h-2 rounded-full bg-primary/30 animate-float delay-200" />
      </div>
      
      {/* Green Category Badge */}
      {greenCategory && (
        <GreenCategoryBadge category={greenCategory} size="md" />
      )}

      {/* Innovation 1: Trust Score Gauge */}
      {extractedData && (
        <TrustScoreGauge extractedData={extractedData} />
      )}

      {/* Result message */}
      <div className="text-center">
        {isGreenBenefit ? (
          <>
            <p className="text-sm text-muted-foreground mb-2">Avoided emissions (not yet verified)</p>
            <div className="flex items-center justify-center gap-2">
              <TreePine className="w-6 h-6 text-success" />
              <p className="text-3xl sm:text-4xl font-semibold text-success tracking-tight">
                {avoidedKg.toFixed(2)} kg
              </p>
            </div>
            <p className="text-sm text-success/80 mt-1">CO₂e avoided, reported separately from emissions</p>
          </>
        ) : type === "revenue" && co2Value === 0 ? (
          <>
            <p className="text-sm text-muted-foreground mb-2">Document read</p>
            <p className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">No emissions counted yet</p>
          </>
        ) : type === "revenue" ? (
          <>
            <p className="text-sm text-muted-foreground mb-2">Emissions recorded</p>
            <p className="text-3xl sm:text-4xl font-semibold text-foreground tracking-tight">
              {co2Value.toFixed(2)} kg CO₂e
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Not yet verified.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-2">Document recorded</p>
            <p className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
              Ready for verification
            </p>
          </>
        )}
      </div>

      {/* Innovation 5: Confidence Band */}
      {extractedData && extractedData.confidence !== undefined && (
        <ConfidenceBand 
          confidence={extractedData.confidence} 
          classificationMethod={extractedData.classificationMethod}
        />
      )}

      {/* Innovation 6: Real-time Monetization Preview (opt-in) */}
      {co2Value > 0 && isEnabled('monetization_preview') && (
        <MonetizationPreview pendingKg={co2Value} verifiedKg={0} />
      )}

      {/* What this document still needs: counts and one next step. The
          checks behind it stay available for an auditor, folded away. */}
      {(guide || hasWarnings) && (
        <div className="w-full rounded-lg border border-warning/30 bg-warning/10 p-3 text-left">
          {guide && (guide.needsData > 0 || guide.unclassified > 0 || guide.notCovered > 0) && (
            <>
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <AlertTriangle className="h-4 w-4 text-warning" aria-hidden="true" />
                <span>{guide.counted} of {lineCount} {lineCount === 1 ? 'line' : 'lines'} counted</span>
              </div>
              <ul className="mt-1.5 space-y-0.5 pl-6 text-xs text-muted-foreground">
                {guide.needsData > 0 && <li className="list-disc">{guide.needsData} need a document that prints the quantity or unit</li>}
                {guide.notCovered > 0 && <li className="list-disc">{guide.notCovered} kept as evidence (purchased goods are not converted to emissions yet)</li>}
                {guide.unclassified > 0 && <li className="list-disc">{guide.unclassified} not recognised as fuel or electricity</li>}
              </ul>
              {guide.nextStep && <p className="mt-2 text-sm text-foreground"><span className="font-medium">Next step:</span> {guide.nextStep}</p>}
            </>
          )}
          {hasWarnings && (
            <details className={guide ? 'mt-2' : ''}>
              <summary className="cursor-pointer text-xs font-medium text-muted-foreground">Checks on this document ({extractedData!.validationFlags!.length})</summary>
              <ul className="mt-1.5 space-y-1 pl-6 text-xs text-muted-foreground">
                {extractedData?.validationFlags?.map((flag, i) => (
                  <li key={i} className="list-disc">{flag}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {/* How the figure was calculated: every line, its quantity, factor and source. Collapsed. */}
      {!!extractedData?.lineItems?.length && (
        <details className="w-full rounded-lg border border-border p-3 text-left">
          <summary className="cursor-pointer text-sm font-medium">How this was calculated</summary>
          <ul className="mt-3 space-y-2.5 text-xs">
            {extractedData.lineItems.map((li, i) => {
              const counted = typeof li.co2Kg === "number" && typeof li.quantity === "number" && typeof li.emissionFactor === "number";
              return (
                <li key={i} className="border-b border-border/60 pb-2 last:border-0">
                  <p className="font-medium text-foreground break-words">{li.description || "Line " + (i + 1)}</p>
                  {counted ? (
                    <p className="mt-0.5 text-muted-foreground">
                      {fmt(li.quantity!)} {li.unit} × {fmt(li.emissionFactor!, 4)} kg CO2e per {li.unit} = <span className="font-medium text-foreground">{fmt(li.co2Kg!)} kg CO2e</span>
                      {li.scope ? ` · Scope ${li.scope}` : ""}
                      {li.factorSource ? <span className="block">Factor source: {li.factorSource}</span> : null}
                    </p>
                  ) : (
                    <p className="mt-0.5 text-muted-foreground">
                      Not counted: {li.guidance?.need ? `${li.guidance.need} not printed` : typeof li.quantity !== "number" || !li.unit ? "no quantity with a unit on this line" : "no documented emission factor for this item yet"}.
                      {li.guidance?.nextStep && <span className="block">{li.guidance.nextStep}</span>}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Total = sum of counted lines = {fmt(co2Value)} kg CO2e. Calculated from the bill, not yet verified.
          </p>
        </details>
      )}

      {/* Innovation 3: Auto-Validation Before Submission (opt-in) */}
      {extractedData && isEnabled('auto_validation') && (
        <AutoValidation extractedData={extractedData} />
      )}

      {/* Extracted data summary */}
      {extractedData && (
        <div className="w-full p-4 rounded-xl bg-secondary/50 border border-border/50 space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Leaf className="w-4 h-4 text-success" />
            <span>{isGreenBenefit ? 'Green Benefit Data' : 'Emissions Data Extracted'}</span>
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            {extractedData.vendor && (
              <div>
                <p className="text-muted-foreground text-xs">Vendor</p>
                <p className="font-medium text-foreground truncate">{extractedData.vendor}</p>
              </div>
            )}
            {extractedData.emissionCategory && (
              <div>
                <p className="text-muted-foreground text-xs">Category</p>
                <p className="font-medium text-foreground capitalize">{extractedData.emissionCategory}</p>
              </div>
            )}
            {co2Value > 0 && (
              <div>
                <p className="text-muted-foreground text-xs">CO₂ Emissions</p>
                <p className="font-medium text-destructive">{co2Value.toFixed(2)} kg</p>
              </div>
            )}
            {avoidedKg > 0 && (
              <div>
                <p className="text-muted-foreground text-xs">CO₂ Avoided (separate)</p>
                <p className="font-medium text-success">{avoidedKg.toFixed(2)} kg</p>
              </div>
            )}
            {extractedData.amount && (
              <div>
                <p className="text-muted-foreground text-xs">Amount</p>
                <p className="font-medium text-foreground">{formatCurrency(extractedData.amount)}</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Scope 3 Supply Chain Signal */}
      {extractedData?.buyerGstin && (
        <div className="w-full p-3 rounded-lg bg-accent/10 border border-accent/30 space-y-1">
          <div className="flex items-center gap-2 text-sm font-medium text-accent">
            <Building2 className="w-4 h-4" />
            <span>Supply Chain Scope 3 Evidence</span>
          </div>
          <p className="text-xs text-muted-foreground">
            This data can serve as Scope 3 evidence for buyer (GSTIN: {extractedData.buyerGstin.substring(0, 4)}****). 
            Share verified data to gain <span className="font-semibold text-foreground">Preferred Supplier</span> status.
          </p>
        </div>
      )}

      {/* Nothing to verify: say why, plainly, before any button */}
      {!hasRecords && (
        <p className="w-full rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-foreground">
          Nothing from this document can be counted yet, so there is nothing to verify.{' '}
          {guide?.nextStep ?? 'Emissions need a quantity with a unit (kWh, litres, kg) printed on the document.'}
        </p>
      )}

      {/* Action buttons */}
      <div className="flex flex-col gap-3 w-full">
        {!hasRecords && onReread && (
          <button
            onClick={onReread}
            className="flex items-center justify-center gap-2 w-full py-4 px-6 bg-carbon text-carbon-foreground rounded-full font-medium transition-colors hover:bg-carbon/90"
          >
            Read this file again
          </button>
        )}
        {hasRecords && <button
          onClick={onConfirm}
          className="
            flex items-center justify-center gap-2
            w-full py-4 px-6
            bg-carbon text-carbon-foreground
            rounded-full font-medium
            transition-all duration-300
            hover:bg-carbon/90 hover:scale-[1.02]
            active:scale-[0.98]
          "
        >
          <span>Continue to Verify</span>
          <ArrowRight className="w-4 h-4" />
        </button>}
        
        {co2Value > 0 && (
          <a
            href={`https://wa.me/?text=${encodeURIComponent(
              `My ${extractedData?.documentType ?? 'document'} came to ${co2Value.toFixed(1)} kg CO2e on Senseible, with the emission factor and source for every line. Try it: https://senseible.earth/`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 px-6 rounded-full border border-border text-sm font-medium hover:bg-secondary transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span>Share on WhatsApp</span>
          </a>
        )}

        <button
          onClick={onReset}
          className="
            text-sm text-muted-foreground
            transition-colors duration-300
            hover:text-foreground
          "
        >
          {hasRecords ? 'Process another' : 'Upload a different document'}
        </button>
      </div>
    </div>
  );
};
