import { Check, ArrowRight } from "lucide-react";

interface ResultStateProps {
  type: "revenue" | "compliance";
  amount?: number;
  onConfirm: () => void;
  onReset: () => void;
}

export const ResultState = ({ type, amount, onConfirm, onReset }: ResultStateProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="flex flex-col items-center gap-8 animate-reveal">
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
            <p className="text-sm text-muted-foreground mb-2">Revenue ready</p>
            <p className="text-4xl sm:text-5xl font-semibold text-foreground tracking-tight">
              {amount ? formatCurrency(amount) : "₹12,450"}
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
      
      {/* Action buttons */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
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
          <span>Confirm</span>
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
