import { Coins, TrendingUp } from "lucide-react";

interface MonetizationPreviewProps {
  co2Kg: number;
}

const CARBON_CREDIT_RATE = 750; // INR per tCO₂e
const GREEN_LOAN_SAVINGS_RATE = 0.005; // 0.5% interest reduction
const AVERAGE_LOAN = 500000; // ₹5L average MSME loan

export const MonetizationPreview = ({ co2Kg }: MonetizationPreviewProps) => {
  const tCO2 = co2Kg / 1000;
  const lowEstimate = Math.round(tCO2 * 0.8 * CARBON_CREDIT_RATE);
  const highEstimate = Math.round(tCO2 * 1.0 * CARBON_CREDIT_RATE);
  const loanSavings = Math.round(AVERAGE_LOAN * GREEN_LOAN_SAVINGS_RATE);
  
  if (highEstimate < 1 && loanSavings < 1) return null;

  const formatINR = (n: number) => new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0
  }).format(n);

  return (
    <div className="w-full p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
      <div className="flex items-center gap-2 text-xs font-medium text-primary">
        <TrendingUp className="w-3.5 h-3.5" />
        <span>If verified, potential value</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {highEstimate >= 1 && (
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-warning shrink-0" />
            <div>
              <p className="text-sm font-mono font-bold text-foreground">
                {formatINR(lowEstimate)}–{formatINR(highEstimate)}
              </p>
              <p className="text-[10px] text-muted-foreground">Carbon credits</p>
            </div>
          </div>
        )}
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-success shrink-0" />
          <div>
            <p className="text-sm font-mono font-bold text-foreground">
              {formatINR(loanSavings)}
            </p>
            <p className="text-[10px] text-muted-foreground">Green loan savings</p>
          </div>
        </div>
      </div>
    </div>
  );
};
