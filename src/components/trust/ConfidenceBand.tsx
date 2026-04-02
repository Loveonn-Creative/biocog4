import { Info } from "lucide-react";

interface ConfidenceBandProps {
  confidence: number;
  classificationMethod?: string;
}

export const ConfidenceBand = ({ confidence, classificationMethod }: ConfidenceBandProps) => {
  const method = (classificationMethod || '').toUpperCase();
  
  // Deterministic uncertainty band based on classification method
  const methodVariance = method === 'HSN' ? 2 : method === 'KEYWORD' ? 8 : 15;
  const ocrVariance = confidence >= 90 ? 2 : confidence >= 70 ? 4 : 7;
  const totalVariance = Math.min(20, methodVariance + ocrVariance);
  
  const low = Math.max(0, Math.round(confidence - totalVariance));
  const high = Math.min(100, Math.round(confidence + totalVariance));

  const getColor = () => {
    if (confidence >= 80) return 'text-success';
    if (confidence >= 50) return 'text-warning';
    return 'text-destructive';
  };

  return (
    <div className="w-full p-3 rounded-lg bg-secondary/50 border border-border/50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Info className="w-3 h-3" />
          Confidence Band
        </span>
        <span className={`text-sm font-mono font-bold ${getColor()}`}>
          {Math.round(confidence)}% <span className="text-xs font-normal text-muted-foreground">± {totalVariance}%</span>
        </span>
      </div>
      
      {/* Visual band */}
      <div className="relative w-full h-3 rounded-full bg-secondary overflow-hidden">
        {/* Uncertainty range */}
        <div 
          className="absolute h-full bg-primary/15 rounded-full"
          style={{ left: `${low}%`, width: `${high - low}%` }}
        />
        {/* Point estimate */}
        <div 
          className={`absolute h-full w-1 rounded-full ${
            confidence >= 80 ? 'bg-success' : confidence >= 50 ? 'bg-warning' : 'bg-destructive'
          }`}
          style={{ left: `${Math.round(confidence)}%` }}
        />
      </div>
      
      <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
        <span>±{ocrVariance}% OCR</span>
        <span>±{methodVariance}% {method === 'HSN' ? 'HSN match' : method === 'KEYWORD' ? 'keyword' : 'generic'}</span>
      </div>
    </div>
  );
};
