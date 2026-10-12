import { Coins, Info } from "lucide-react";
import { CREDIT_VALUE_WITHHELD, kgToTonnes } from "@/lib/carbonValue";

interface MonetizationPreviewProps {
  /** Verified kgCO2e. Shown as a quantity. */
  verifiedKg: number;
  /** Extracted kgCO2e still awaiting verification. Shown as a quantity. */
  pendingKg?: number;
}

/**
 * What a document's data can lead to. Quantities only: emissions are not
 * credits, so no rupee value, range, multiplier or loan saving is shown
 * (see carbonValue.ts).
 */
export const MonetizationPreview = ({ verifiedKg, pendingKg = 0 }: MonetizationPreviewProps) => {
  const verifiedT = kgToTonnes(verifiedKg);
  const pendingT = kgToTonnes(pendingKg);
  if (verifiedT <= 0 && pendingT <= 0) return null;

  return (
    <div className="w-full p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
      <div className="flex items-center gap-2 text-xs font-medium text-primary">
        <Coins className="w-3.5 h-3.5" />
        <span>Verified data</span>
      </div>
      {verifiedT > 0 ? (
        <div>
          <p className="text-sm font-mono font-bold text-foreground">{verifiedT.toFixed(3)} tCO₂e verified</p>
          <p className="text-xs text-muted-foreground mt-1">{CREDIT_VALUE_WITHHELD}</p>
        </div>
      ) : (
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            {pendingT.toFixed(3)} tCO₂e is awaiting verification.
          </p>
        </div>
      )}
    </div>
  );
};
