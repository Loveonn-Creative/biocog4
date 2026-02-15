import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Building2, Shield, FileBarChart, Sparkles } from 'lucide-react';
import { useEnterpriseMode } from '@/hooks/useEnterpriseMode';

export function EnterpriseModeCard() {
  const { isEnterprise, toggleEnterprise, isLoading } = useEnterpriseMode();

  return (
    <Card className={`transition-all duration-300 ${isEnterprise ? 'border-primary/40 bg-primary/5' : ''}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Enterprise Mode
          {isEnterprise && (
            <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
              Active
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Activate audit-grade verification, compliance labeling, and finance-ready exports
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
          <div className="space-y-1">
            <Label htmlFor="enterprise_mode" className="font-medium">
              Enable Enterprise Features
            </Label>
            <p className="text-xs text-muted-foreground">
              Layers additional audit controls on top of your existing workflow
            </p>
          </div>
          <Switch
            id="enterprise_mode"
            checked={isEnterprise}
            onCheckedChange={toggleEnterprise}
            disabled={isLoading}
          />
        </div>

        {isEnterprise && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 text-sm">
              <Shield className="w-4 h-4 text-primary shrink-0" />
              <span className="text-muted-foreground">Audit-grade ledger</span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 text-sm">
              <FileBarChart className="w-4 h-4 text-primary shrink-0" />
              <span className="text-muted-foreground">Finance-ready exports</span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 text-sm">
              <Sparkles className="w-4 h-4 text-primary shrink-0" />
              <span className="text-muted-foreground">Compliance labels</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
