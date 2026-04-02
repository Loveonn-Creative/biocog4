import { useState } from "react";
import { ShieldAlert, ShieldCheck, ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface DisputeSimulationProps {
  flags: string[];
  greenwashingRisk: string;
  greenwashingFactors?: string[];
  score: number;
  scopeBreakdown: { scope1: number; scope2: number; scope3: number };
  qualityGrade: string;
  cctsEligible: boolean;
  cbamCompliant: boolean;
}

interface DisputePoint {
  label: string;
  type: 'defensible' | 'vulnerable';
  detail: string;
}

export const DisputeSimulation = ({
  flags, greenwashingRisk, greenwashingFactors, score, scopeBreakdown, qualityGrade, cctsEligible, cbamCompliant
}: DisputeSimulationProps) => {
  const [open, setOpen] = useState(false);

  const points: DisputePoint[] = [];

  // Defensible points
  if (score >= 0.8) {
    points.push({ label: 'Verification score above 80%', type: 'defensible', detail: `Score ${(score * 100).toFixed(0)}% exceeds audit threshold` });
  }
  if (qualityGrade === 'A' || qualityGrade === 'B') {
    points.push({ label: `Quality Grade ${qualityGrade}`, type: 'defensible', detail: 'Meets carbon credit issuance standard' });
  }
  if (cctsEligible) {
    points.push({ label: 'CCTS eligibility confirmed', type: 'defensible', detail: 'Passes Indian carbon trading system criteria' });
  }
  if (cbamCompliant) {
    points.push({ label: 'CBAM compliant', type: 'defensible', detail: 'Meets EU carbon border requirements' });
  }
  if (greenwashingRisk === 'low') {
    points.push({ label: 'Low greenwashing risk', type: 'defensible', detail: 'Data patterns consistent with genuine reporting' });
  }

  // Vulnerable points from flags
  flags.forEach(flag => {
    points.push({ label: flag, type: 'vulnerable', detail: 'May be challenged during third-party audit' });
  });

  if (greenwashingRisk !== 'low') {
    points.push({ label: `${greenwashingRisk.toUpperCase()} greenwashing risk`, type: 'vulnerable', detail: 'Auditor likely to request additional documentation' });
  }
  if (score < 0.8) {
    points.push({ label: 'Verification score below 80%', type: 'vulnerable', detail: 'Strengthening data quality would improve defensibility' });
  }

  const defensible = points.filter(p => p.type === 'defensible');
  const vulnerable = points.filter(p => p.type === 'vulnerable');

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50 hover:bg-secondary/50 transition-colors text-sm">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-accent" />
          <span className="font-medium">Dispute Simulation</span>
          <span className="text-xs text-muted-foreground">— What if an auditor challenges this?</span>
        </div>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-3 animate-fade-in">
        {defensible.length > 0 && (
          <div className="p-3 rounded-lg bg-success/5 border border-success/20 space-y-2">
            <p className="text-xs font-medium text-success flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" /> What holds ({defensible.length})
            </p>
            {defensible.map((p, i) => (
              <div key={i} className="text-xs pl-5">
                <p className="font-medium text-foreground">{p.label}</p>
                <p className="text-muted-foreground">{p.detail}</p>
              </div>
            ))}
          </div>
        )}
        {vulnerable.length > 0 && (
          <div className="p-3 rounded-lg bg-warning/5 border border-warning/20 space-y-2">
            <p className="text-xs font-medium text-warning flex items-center gap-1">
              <ShieldAlert className="h-3.5 w-3.5" /> What breaks ({vulnerable.length})
            </p>
            {vulnerable.map((p, i) => (
              <div key={i} className="text-xs pl-5">
                <p className="font-medium text-foreground">{p.label}</p>
                <p className="text-muted-foreground">{p.detail}</p>
              </div>
            ))}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};
