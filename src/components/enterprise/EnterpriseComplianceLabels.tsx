import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award } from 'lucide-react';
import { getScopeComplianceLabels } from '@/lib/complianceLabels';

interface Props {
  scope1: number;
  scope2: number;
  scope3: number;
}

export function EnterpriseComplianceLabels({ scope1, scope2, scope3 }: Props) {
  const scopes = [
    { scope: 1, value: scope1 },
    { scope: 2, value: scope2 },
    { scope: 3, value: scope3 },
  ].filter(s => s.value > 0);

  if (scopes.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Award className="h-4 w-4 text-primary" />
          Compliance Labels
          <Badge variant="outline" className="text-xs ml-auto">Enterprise</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {scopes.map(({ scope, value }) => {
            const labels = getScopeComplianceLabels(scope);
            return (
              <div key={scope} className="p-3 rounded-lg bg-secondary/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Scope {scope}</span>
                  <span className="text-xs font-mono text-muted-foreground">{value.toFixed(1)} kg</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {labels.map((l, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className={`text-xs ${l.region === 'india' ? 'border-amber-500/30 text-amber-600 bg-amber-500/5' : 'border-blue-500/30 text-blue-600 bg-blue-500/5'}`}
                    >
                      {l.framework}: {l.label}
                    </Badge>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
