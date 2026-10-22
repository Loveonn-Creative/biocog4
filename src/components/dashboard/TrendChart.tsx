import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// Emissions by month, stacked by scope, over the records the filters select.
// When the filters match nothing it says so rather than showing other data.

interface TrendChartProps {
  data: Array<{ month: string; scope1: number; scope2: number; scope3: number }>;
  rangeLabel: string;
}

const COLORS = { scope1: 'var(--scope-1, #1a7f55)', scope2: 'var(--scope-2, #2a78d6)', scope3: 'var(--scope-3, #c97a00)' };
const NAMES: Record<string, string> = { scope1: 'Scope 1', scope2: 'Scope 2', scope3: 'Scope 3' };
const tick = (v: number) => (v >= 1000 ? `${(v / 1000).toLocaleString('en-IN', { maximumFractionDigits: v < 10000 ? 1 : 0 })} t` : `${Math.round(v)} kg`);

export function TrendChart({ data, rangeLabel }: TrendChartProps) {
  const hasData = data.some((d) => d.scope1 > 0 || d.scope2 > 0 || d.scope3 > 0);
  return (
    <section aria-labelledby="trend-title" className="min-w-0 rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="trend-title" className="text-[15px] font-semibold">Emissions trend by scope</h3>
        <span className="text-[13px] text-muted-foreground">{rangeLabel}</span>
      </div>
      {hasData ? (
        <div className="mt-3 h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} barCategoryGap="28%">
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={{ stroke: 'hsl(var(--border))' }} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={tick} width={56} />
              <Tooltip
                cursor={{ fill: 'hsl(var(--secondary))' }}
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                formatter={(value: number, name: string) => [`${value.toLocaleString('en-IN', { maximumFractionDigits: 1 })} kg CO₂e`, NAMES[name] ?? name]}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} formatter={(v) => <span style={{ color: 'hsl(var(--foreground))' }}>{NAMES[v as string] ?? v}</span>} />
              <Bar dataKey="scope1" stackId="s" fill={COLORS.scope1} />
              <Bar dataKey="scope2" stackId="s" fill={COLORS.scope2} />
              <Bar dataKey="scope3" stackId="s" fill={COLORS.scope3} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="mt-3 rounded-xl border border-dashed border-border px-4 py-10 text-center text-[13px] text-muted-foreground">No emissions match the current filters.</p>
      )}
    </section>
  );
}
