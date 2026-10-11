import { Coins, Info } from "lucide-react";
import { indicativeValueFromKg, INDICATIVE_RATE_INR_PER_T, INDICATIVE_VALUE_LABEL } from "@/lib/carbonValue";

interface MonetizationPreviewProps {
  /** Verified kgCO2e. Only this feeds the indicative value. */
  verifiedKg: number;
  /** Extracted kgCO2e still awaiting verification. Shown as a quantity, never priced. */
  pendingKg?: number;
}

/**
 * Indicative value preview: verified tCO2e x the single reference rate.
 * Unverified emissions are listed but never turned into money, and no range,
 * multiplier or loan saving is shown.
 */
export const MonetizationPreview = ({ verifiedKg, pendingKg = 0 }: MonetizationPreviewProps) => {
  const value = indicativeValueFromKg(verifiedKg);
  if (value < 1 && pendingKg <= 0) return null;

  const formatINR = (n: number) => new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0
  }).format(n);

  return (
    <div className="w-full p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
      <div className="flex items-center gap-2 text-xs font-medium text-primary">
        <Coins className="w-3.5 h-3.5" />
        <span>Indicative value</span>
      </div>
      {value >= 1 ? (
        <div>
          <p className="text-sm font-mono font-bold text-foreground">{formatINR(value)}</p>
          <p className="text-[10px] text-muted-foreground">{INDICATIVE_VALUE_LABEL}</p>
        </div>
      ) : (
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            {(pendingKg / 1000).toFixed(3)} tCO₂e is awaiting verification. Once verified, the indicative value is
            verified tCO₂e × ₹{INDICATIVE_RATE_INR_PER_T}. It is not an issued credit.
          </p>
        </div>
      )}
    </div>
  );
};
