import { Check, ArrowRight, Leaf, AlertTriangle, TreePine, Building2, Shield, TrendingUp, Coins, Info } from "lucide-react";
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
  confidence: number;
  validationFlags?: string[];
  classificationMethod?: string;
}

interface ResultStateProps {
  type: "revenue" | "compliance";
  amount?: number;
  extractedData?: ExtractedData;
  onConfirm: () => void;
  onReset: () => void;
}

export const ResultState = ({ type, amount, extractedData, onConfirm, onReset }: ResultStateProps) => {
  const { isEnabled } = useTrustLayerSettings();
  const hasWarnings = extractedData?.validationFlags && extractedData.validationFlags.length > 0;
  const co2Value = extractedData?.totalCO2Kg ?? extractedData?.estimatedCO2Kg ?? 0;
  const isGreenBenefit = co2Value < 0;
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
            <p className="text-sm text-muted-foreground mb-2">Verified Green Benefit</p>
            <div className="flex items-center justify-center gap-2">
              <TreePine className="w-6 h-6 text-success" />
              <p className="text-3xl sm:text-4xl font-semibold text-success tracking-tight">
                {Math.abs(co2Value).toFixed(2)} kg
              </p>
            </div>
            <p className="text-sm text-success/80 mt-1">CO₂ avoided / reduced</p>
          </>
        ) : type === "revenue" ? (
          <>
            <p className="text-sm text-muted-foreground mb-2">Potential carbon credit value</p>
            <p className="text-4xl sm:text-5xl font-semibold text-foreground tracking-tight">
              {amount ? formatCurrency(amount) : "₹0"}
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-2">Submission ready</p>
            <p className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
              Compliance verified
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
      {co2Value !== 0 && !isGreenBenefit && isEnabled('monetization_preview') && (
        <MonetizationPreview co2Kg={co2Value} />
      )}

      {/* Validation Warnings */}
      {hasWarnings && (
        <div className="w-full p-3 rounded-lg bg-warning/10 border border-warning/30 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-warning">
            <AlertTriangle className="w-4 h-4" />
            <span>Data Extraction Warnings</span>
          </div>
          <ul className="text-xs text-muted-foreground space-y-1 pl-6">
            {extractedData?.validationFlags?.map((flag, i) => (
              <li key={i} className="list-disc">{flag}</li>
            ))}
          </ul>
        </div>
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
            {co2Value !== 0 && (
              <div>
                <p className="text-muted-foreground text-xs">{isGreenBenefit ? 'CO₂ Avoided' : 'CO₂ Emissions'}</p>
                <p className={`font-medium ${isGreenBenefit ? 'text-success' : 'text-destructive'}`}>
                  {isGreenBenefit ? '-' : ''}{Math.abs(co2Value).toFixed(2)} kg
                </p>
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

      {/* Action buttons */}
      <div className="flex flex-col gap-3 w-full">
        <button
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
        </button>
        
        <button
          onClick={onReset}
          className="
            text-sm text-muted-foreground
            transition-colors duration-300
            hover:text-foreground
          "
        >
          Process another
        </button>
      </div>
    </div>
  );
};
