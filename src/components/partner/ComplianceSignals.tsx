import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Clock, AlertTriangle, Shield, FileCheck, Leaf } from 'lucide-react';

interface ComplianceSignalsProps {
  cbamStatus: 'compliant' | 'pending' | 'non-compliant';
  euTaxonomyStatus: 'eligible' | 'pending' | 'not-eligible';
  pcafStatus: 'aligned' | 'pending' | 'not-aligned';
  cctsStatus: 'eligible' | 'pending' | 'not-eligible';
  lastVerified?: string;
  auditHash?: string;
}

const statusConfig = {
  compliant: { icon: CheckCircle, color: 'text-success', bg: 'bg-success/10', label: 'Compliant' },
  eligible: { icon: CheckCircle, color: 'text-success', bg: 'bg-success/10', label: 'Eligible' },
  aligned: { icon: CheckCircle, color: 'text-success', bg: 'bg-success/10', label: 'Aligned' },
  pending: { icon: Clock, color: 'text-warning', bg: 'bg-warning/10', label: 'Pending' },
  'non-compliant': { icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10', label: 'Non-Compliant' },
  'not-eligible': { icon: AlertTriangle, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Not Eligible' },
  'not-aligned': { icon: AlertTriangle, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Not Aligned' },
};

export const ComplianceSignals = ({
  cbamStatus,
  euTaxonomyStatus,
  pcafStatus,
  cctsStatus,
  lastVerified,
  auditHash,
}: ComplianceSignalsProps) => {
  const signals = [
    { key: 'cbam', label: 'EU CBAM', status: cbamStatus, icon: Shield },
    { key: 'taxonomy', label: 'EU Taxonomy', status: euTaxonomyStatus, icon: Leaf },
    { key: 'pcaf', label: 'PCAF', status: pcafStatus, icon: FileCheck },
    { key: 'ccts', label: 'India CCTS', status: cctsStatus, icon: Shield },
  ];

  return (
    <Card className="border-primary/20">
      <CardContent className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {signals.map((signal) => {
            const config = statusConfig[signal.status];
            const StatusIcon = config.icon;
            
            return (
              <div
                key={signal.key}
                className={`p-3 rounded-lg ${config.bg} flex flex-col items-center justify-center text-center`}
              >
                <signal.icon className={`h-4 w-4 ${config.color} mb-1`} />
                <span className="text-xs font-medium text-muted-foreground">{signal.label}</span>
                <div className="flex items-center gap-1 mt-1">
                  <StatusIcon className={`h-3 w-3 ${config.color}`} />
                  <span className={`text-xs font-semibold ${config.color}`}>{config.label}</span>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="flex items-center justify-between pt-3 border-t border-border/50 text-xs text-muted-foreground">
          <span>
            Last Verified: {lastVerified ? new Date(lastVerified).toLocaleDateString('en-IN', { 
              day: 'numeric', 
              month: 'short', 
              year: 'numeric' 
            }) : 'N/A'}
          </span>
          {auditHash && (
            <span className="font-mono truncate max-w-[120px]" title={auditHash}>
              Audit: {auditHash.substring(0, 12)}...
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
