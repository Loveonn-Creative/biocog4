import { Shield, Check, AlertTriangle, X } from "lucide-react";

interface TrustScoreGaugeProps {
  extractedData: {
    confidence: number;
    vendor?: string;
    invoiceNumber?: string;
    emissionCategory?: string;
    amount?: number;
    validationFlags?: string[];
    classificationMethod?: string;
    date?: string;
    buyerGstin?: string;
  };
}

interface ReasonCode {
  label: string;
  status: 'pass' | 'warn' | 'fail';
  weight: number;
}

function computeTrustScore(data: TrustScoreGaugeProps['extractedData']): { score: number; reasons: ReasonCode[] } {
  const reasons: ReasonCode[] = [];
  
  // Data completeness (30%)
  let completeness = 0;
  if (data.vendor) completeness += 25;
  if (data.invoiceNumber) completeness += 25;
  if (data.amount && data.amount > 0) completeness += 25;
  if (data.date) completeness += 25;
  
  reasons.push({
    label: completeness >= 75 ? 'Document fields complete' : completeness >= 50 ? 'Partial data extracted' : 'Missing critical fields',
    status: completeness >= 75 ? 'pass' : completeness >= 50 ? 'warn' : 'fail',
    weight: 30,
  });

  // Emission factor match quality (25%)
  const method = data.classificationMethod?.toUpperCase() || '';
  const factorScore = method === 'HSN' ? 100 : method === 'KEYWORD' ? 65 : 30;
  reasons.push({
    label: method === 'HSN' ? 'HSN code matched' : method === 'KEYWORD' ? 'Keyword classification' : 'Generic factor applied',
    status: factorScore >= 80 ? 'pass' : factorScore >= 50 ? 'warn' : 'fail',
    weight: 25,
  });

  // Document integrity (25%)
  const hasHash = !!data.invoiceNumber;
  const noFlags = !data.validationFlags || data.validationFlags.length === 0;
  const integrityScore = (hasHash ? 50 : 0) + (noFlags ? 50 : 20);
  reasons.push({
    label: integrityScore >= 80 ? 'Document integrity verified' : integrityScore >= 50 ? 'Minor integrity gaps' : 'Integrity review needed',
    status: integrityScore >= 80 ? 'pass' : integrityScore >= 50 ? 'warn' : 'fail',
    weight: 25,
  });

  // Classification confidence (20%)
  const confScore = Math.min(100, data.confidence || 0);
  reasons.push({
    label: confScore >= 80 ? 'High OCR confidence' : confScore >= 50 ? 'Moderate extraction quality' : 'Low extraction confidence',
    status: confScore >= 80 ? 'pass' : confScore >= 50 ? 'warn' : 'fail',
    weight: 20,
  });

  const score = Math.round(
    (completeness / 100 * 30) +
    (factorScore / 100 * 25) +
    (integrityScore / 100 * 25) +
    (confScore / 100 * 20)
  );

  return { score: Math.max(0, Math.min(100, score)), reasons };
}

export const TrustScoreGauge = ({ extractedData }: TrustScoreGaugeProps) => {
  const { score, reasons } = computeTrustScore(extractedData);
  
  const getScoreColor = () => {
    if (score >= 75) return 'text-success';
    if (score >= 50) return 'text-warning';
    return 'text-destructive';
  };

  const getScoreBg = () => {
    if (score >= 75) return 'bg-success/10 border-success/30';
    if (score >= 50) return 'bg-warning/10 border-warning/30';
    return 'bg-destructive/10 border-destructive/30';
  };

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'pass') return <Check className="w-3 h-3 text-success" />;
    if (status === 'warn') return <AlertTriangle className="w-3 h-3 text-warning" />;
    return <X className="w-3 h-3 text-destructive" />;
  };

  return (
    <div className={`w-full p-4 rounded-xl border ${getScoreBg()} space-y-3`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Trust Index</span>
        </div>
        <div className={`text-2xl font-mono font-bold ${getScoreColor()}`}>
          {score}<span className="text-sm text-muted-foreground">/100</span>
        </div>
      </div>
      
      {/* Score bar */}
      <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-700 ${
            score >= 75 ? 'bg-success' : score >= 50 ? 'bg-warning' : 'bg-destructive'
          }`}
          style={{ width: `${score}%` }}
        />
      </div>

      {/* Reason codes */}
      <div className="space-y-1.5">
        {reasons.map((r, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <StatusIcon status={r.status} />
            <span className="text-muted-foreground flex-1">{r.label}</span>
            <span className="text-muted-foreground/60">{r.weight}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};
