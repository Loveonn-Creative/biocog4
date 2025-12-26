import { Card, CardContent } from '@/components/ui/card';
import type { EmissionsSummary as SummaryType } from '@/hooks/useEmissions';
import { Flame, Zap, Truck } from 'lucide-react';

interface EmissionsSummaryProps {
  summary: SummaryType;
}

export function EmissionsSummary({ summary }: EmissionsSummaryProps) {
  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(2)}t`;
    }
    return `${num.toFixed(1)}kg`;
  };

  const scopes = [
    {
      label: 'Scope 1',
      description: 'Direct emissions',
      value: summary.scope1,
      icon: Flame,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10'
    },
    {
      label: 'Scope 2',
      description: 'Indirect (energy)',
      value: summary.scope2,
      icon: Zap,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10'
    },
    {
      label: 'Scope 3',
      description: 'Value chain',
      value: summary.scope3,
      icon: Truck,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    }
  ];

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Emissions Overview</h2>
            <p className="text-sm text-muted-foreground">Total carbon footprint</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-foreground">{formatNumber(summary.total)}</div>
            <div className="text-sm text-muted-foreground">CO₂ equivalent</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {scopes.map(scope => (
            <div 
              key={scope.label}
              className={`rounded-lg p-4 ${scope.bgColor} transition-all hover:scale-[1.02]`}
            >
              <div className="flex items-center gap-2 mb-2">
                <scope.icon className={`h-4 w-4 ${scope.color}`} />
                <span className="text-sm font-medium text-foreground">{scope.label}</span>
              </div>
              <div className="text-xl font-bold text-foreground mb-1">
                {formatNumber(scope.value)}
              </div>
              <div className="text-xs text-muted-foreground">{scope.description}</div>
            </div>
          ))}
        </div>

        {/* Category breakdown */}
        {Object.keys(summary.byCategory).length > 0 && (
          <div className="mt-6 pt-6 border-t border-border/50">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">By Category</h3>
            <div className="space-y-2">
              {Object.entries(summary.byCategory)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([category, value]) => (
                  <div key={category} className="flex items-center justify-between">
                    <span className="text-sm text-foreground capitalize">{category}</span>
                    <span className="text-sm font-medium text-muted-foreground">{formatNumber(value)}</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
