import { useState } from "react";
import { ShieldAlert, ChevronDown, ChevronUp, AlertTriangle, CheckCircle } from "lucide-react";

interface GreenwashingExplainerProps {
  risk: 'low' | 'medium' | 'high';
  factors?: string[];
}

export const GreenwashingExplainer = ({ risk, factors = [] }: GreenwashingExplainerProps) => {
  const [expanded, setExpanded] = useState(false);

  const getRiskColor = () => {
    switch (risk) {
      case 'low': return 'bg-success/10 text-success border-success/30';
      case 'medium': return 'bg-warning/10 text-warning border-warning/30';
      case 'high': return 'bg-destructive/10 text-destructive border-destructive/30';
    }
  };

  if (factors.length === 0) return null;

  return (
    <div className={`rounded-lg border ${getRiskColor()} overflow-hidden`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 text-sm"
      >
        <div className="flex items-center gap-2 font-medium">
          <ShieldAlert className="h-4 w-4" />
          {risk.toUpperCase()} Greenwashing Risk — {factors.length} factor{factors.length !== 1 ? 's' : ''}
        </div>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-1.5 animate-fade-in border-t border-current/10 pt-2">
          <p className="text-xs text-muted-foreground mb-2">What triggered this assessment:</p>
          {factors.map((f, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
              <span>{f}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
