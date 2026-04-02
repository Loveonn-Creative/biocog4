import { FileText, ArrowRight, BarChart3, Target, Leaf, Coins } from "lucide-react";

interface ProofGraphProps {
  totalCO2Kg: number;
  scopeBreakdown: { scope1: number; scope2: number; scope3: number };
  eligibleCredits: number;
  verificationScore: number;
  qualityGrade: string;
}

const steps = [
  { icon: FileText, label: 'Invoice', key: 'invoice' },
  { icon: BarChart3, label: 'Activity Data', key: 'activity' },
  { icon: Target, label: 'Emission Factor', key: 'factor' },
  { icon: Leaf, label: 'CO₂ Calculated', key: 'co2' },
  { icon: Coins, label: 'Credit Value', key: 'credit' },
];

export const ProofGraph = ({ totalCO2Kg, scopeBreakdown, eligibleCredits, verificationScore, qualityGrade }: ProofGraphProps) => {
  const getStepValue = (key: string) => {
    switch (key) {
      case 'invoice': return 'OCR extracted';
      case 'activity': return `${totalCO2Kg > 0 ? 'Detected' : 'None'}`;
      case 'factor': return 'BIOCOG v1.0';
      case 'co2': return `${totalCO2Kg.toFixed(1)} kg`;
      case 'credit': return eligibleCredits > 0 ? `${eligibleCredits} tCO₂e` : 'Pending';
      default: return '';
    }
  };

  return (
    <div className="w-full p-4 rounded-xl bg-secondary/30 border border-border/50">
      <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-primary" />
        Proof Chain — How your carbon value is derived
      </h4>
      
      <div className="flex items-center justify-between overflow-x-auto pb-2">
        {steps.map((step, i) => (
          <div key={step.key} className="flex items-center">
            <div className="flex flex-col items-center min-w-[60px]">
              <div className="p-2 rounded-lg bg-primary/10 mb-1">
                <step.icon className="h-4 w-4 text-primary" />
              </div>
              <span className="text-[10px] font-medium text-foreground">{step.label}</span>
              <span className="text-[9px] text-muted-foreground mt-0.5">{getStepValue(step.key)}</span>
            </div>
            {i < steps.length - 1 && (
              <ArrowRight className="h-3 w-3 text-muted-foreground mx-1 shrink-0" />
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
        <span>Methodology: BIOCOG_MVR_INDIA v1.0</span>
        <span>Score: {(verificationScore * 100).toFixed(0)}% • Grade {qualityGrade}</span>
      </div>
    </div>
  );
};
