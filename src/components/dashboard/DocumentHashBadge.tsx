import { Badge } from "@/components/ui/badge";
import { CheckCircle, ShieldCheck, Clock } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DocumentHashBadgeProps {
  documentHash: string | null;
  confidence: number | null;
  cachedResult?: boolean;
  className?: string;
}

export function DocumentHashBadge({ 
  documentHash, 
  confidence, 
  cachedResult,
  className = "" 
}: DocumentHashBadgeProps) {
  if (!documentHash) return null;

  const shortHash = documentHash.substring(0, 8);
  const isHighConfidence = (confidence ?? 0) >= 80;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-1.5 ${className}`}>
            {cachedResult ? (
              <Badge variant="outline" className="text-xs bg-primary/5 border-primary/20 text-primary">
                <ShieldCheck className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            ) : isHighConfidence ? (
              <Badge variant="outline" className="text-xs bg-emerald-500/10 border-emerald-500/20 text-emerald-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                Processed
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs bg-amber-500/10 border-amber-500/20 text-amber-600">
                <Clock className="h-3 w-3 mr-1" />
                Review
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="text-xs space-y-1">
            <p className="font-medium">
              {cachedResult ? "Verified & Cached Result" : "Document Fingerprint"}
            </p>
            <p className="font-mono text-muted-foreground">
              SHA256: {shortHash}...
            </p>
            {cachedResult && (
              <p className="text-muted-foreground">
                This invoice was previously processed. Results are deterministic and reused for accuracy.
              </p>
            )}
            {!cachedResult && isHighConfidence && (
              <p className="text-muted-foreground">
                High confidence extraction ({confidence}%). Ready for verification.
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}