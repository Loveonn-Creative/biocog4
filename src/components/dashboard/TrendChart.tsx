import { Card, CardContent } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface TrendChartProps {
  data: Array<{ month: string; scope1: number; scope2: number; scope3: number }>;
}

export function TrendChart({ data }: TrendChartProps) {
  const hasData = data.some(d => d.scope1 > 0 || d.scope2 > 0 || d.scope3 > 0);

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Emissions Trend</h2>
            <p className="text-sm text-muted-foreground">Last 6 months by scope</p>
          </div>
        </div>

        {hasData ? (
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorScope1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorScope2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#eab308" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorScope3" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}t` : `${v}kg`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value: number) => [`${value.toFixed(1)} kg CO₂`, '']}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '12px' }}
                  formatter={(value) => value.replace('scope', 'Scope ')}
                />
                <Area 
                  type="monotone" 
                  dataKey="scope1" 
                  stroke="#f97316" 
                  fillOpacity={1} 
                  fill="url(#colorScope1)" 
                  strokeWidth={2}
                />
                <Area 
                  type="monotone" 
                  dataKey="scope2" 
                  stroke="#eab308" 
                  fillOpacity={1} 
                  fill="url(#colorScope2)" 
                  strokeWidth={2}
                />
                <Area 
                  type="monotone" 
                  dataKey="scope3" 
                  stroke="#3b82f6" 
                  fillOpacity={1} 
                  fill="url(#colorScope3)" 
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[250px] flex items-center justify-center">
            <div className="text-center">
              <p className="text-muted-foreground mb-2">No emissions data yet</p>
              <p className="text-sm text-muted-foreground/70">Upload invoices to start tracking</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
