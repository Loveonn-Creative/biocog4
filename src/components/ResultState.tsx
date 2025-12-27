import { Check, ArrowRight, Leaf } from "lucide-react";

interface ExtractedData {
  documentType: string;
  vendor?: string;
  date?: string;
  invoiceNumber?: string;
  amount?: number;
  currency?: string;
  emissionCategory?: string;
  estimatedCO2Kg?: number;
  confidence: number;
}

interface ResultStateProps {
  type: "revenue" | "compliance";
  amount?: number;
  extractedData?: ExtractedData;
  onConfirm: () => void;
  onReset: () => void;
}

export const ResultState = ({ type, amount, extractedData, onConfirm, onReset }: ResultStateProps) => {
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
        
        {/* Celebration particles */}
        <div className="absolute -top-2 -right-2 w-3 h-3 rounded-full bg-success/30 animate-float" />
        <div className="absolute -bottom-1 -left-3 w-2 h-2 rounded-full bg-primary/30 animate-float delay-200" />
      </div>
      
      {/* Result message */}
      <div className="text-center">
        {type === "revenue" ? (
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

      {/* Extracted data summary */}
      {extractedData && (
        <div className="w-full p-4 rounded-xl bg-secondary/50 border border-border/50 space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Leaf className="w-4 h-4 text-success" />
            <span>Emissions Data Extracted</span>
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
            {extractedData.estimatedCO2Kg !== undefined && extractedData.estimatedCO2Kg > 0 && (
              <div>
                <p className="text-muted-foreground text-xs">CO₂ Emissions</p>
                <p className="font-medium text-success">{extractedData.estimatedCO2Kg.toFixed(2)} kg</p>
              </div>
            )}
            {extractedData.amount && (
              <div>
                <p className="text-muted-foreground text-xs">Amount</p>
                <p className="font-medium text-foreground">{formatCurrency(extractedData.amount)}</p>
              </div>
            )}
          </div>
          
          {extractedData.confidence && (
            <div className="pt-2 border-t border-border/50">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Confidence</span>
                <span className={`font-medium ${
                  extractedData.confidence >= 0.8 ? 'text-success' : 
                  extractedData.confidence >= 0.5 ? 'text-yellow-600' : 'text-destructive'
                }`}>
                  {Math.round(extractedData.confidence * 100)}%
                </span>
              </div>
            </div>
          )}
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
