import { Badge } from '@/components/ui/badge';
import { Shield } from 'lucide-react';

export function EnterpriseVerificationBadge() {
  return (
    <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20 mb-4">
      <Shield className="h-4 w-4 text-primary" />
      <span className="text-sm font-medium">Enhanced Verification Depth</span>
      <Badge variant="outline" className="text-xs ml-auto border-primary/30 text-primary">Enterprise</Badge>
    </div>
  );
}
