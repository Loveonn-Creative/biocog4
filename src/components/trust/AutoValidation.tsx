import { AlertCircle, CheckCircle, Shield } from "lucide-react";

interface AutoValidationProps {
  extractedData: {
    vendor?: string;
    buyerGstin?: string;
    date?: string;
    amount?: number;
    emissionCategory?: string;
    classificationMethod?: string;
  };
}

interface ValidationCheck {
  label: string;
  pass: boolean;
  suggestion?: string;
}

export const AutoValidation = ({ extractedData }: AutoValidationProps) => {
  const checks: ValidationCheck[] = [];

  // Check GSTIN
  if (!extractedData.buyerGstin) {
    checks.push({
      label: 'Missing supplier GSTIN',
      pass: false,
      suggestion: 'Weaker Scope 3 evidence without GSTIN'
    });
  } else {
    checks.push({ label: 'Supplier GSTIN present', pass: true });
  }

  // Check date freshness
  if (extractedData.date) {
    const invoiceDate = new Date(extractedData.date);
    const monthsAgo = (Date.now() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
    if (monthsAgo > 1) {
      checks.push({
        label: 'Invoice older than 12 months',
        pass: false,
        suggestion: 'Older invoices may not reflect current emission intensity'
      });
    } else {
      checks.push({ label: 'Invoice date within valid range', pass: true });
    }
  }

  // Classification method
  const method = (extractedData.classificationMethod || '').toUpperCase();
  if (method === 'HSN') {
    checks.push({ label: 'HSN-based classification', pass: true });
  } else if (method === 'KEYWORD') {
    checks.push({
      label: 'Keyword-only classification',
      pass: false,
      suggestion: 'Upload invoices with HSN codes for stronger verification'
    });
  }

  // Vendor name
  if (!extractedData.vendor) {
    checks.push({
      label: 'Vendor name missing',
      pass: false,
      suggestion: 'Named vendors strengthen audit trail'
    });
  }

  const failCount = checks.filter(c => !c.pass).length;
  if (checks.length === 0 || (failCount === 0 && checks.length < 2)) return null;

  return (
    <div className="w-full p-3 rounded-lg bg-secondary/50 border border-border/50 space-y-2">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Shield className="w-3.5 h-3.5" />
        <span>Pre-submission checks</span>
        <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded ${
          failCount === 0 ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
        }`}>
          {checks.length - failCount}/{checks.length} passed
        </span>
      </div>
      <div className="space-y-1.5">
        {checks.map((check, i) => (
          <div key={i} className="flex items-start gap-2 text-xs">
            {check.pass 
              ? <CheckCircle className="w-3.5 h-3.5 text-success mt-0.5 shrink-0" />
              : <AlertCircle className="w-3.5 h-3.5 text-warning mt-0.5 shrink-0" />
            }
            <div>
              <span className={check.pass ? 'text-muted-foreground' : 'text-foreground'}>
                {check.label}
              </span>
              {check.suggestion && (
                <p className="text-muted-foreground/70 text-[10px] mt-0.5">{check.suggestion}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
