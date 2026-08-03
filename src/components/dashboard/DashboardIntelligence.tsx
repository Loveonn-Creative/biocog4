import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingDown, TrendingUp, Minus, ShieldCheck, AlertTriangle } from 'lucide-react';
import {
  type PeriodDelta,
  type CategoryRow,
  type EvidenceCompleteness,
  type ScopeTotals,
  TIME_RANGE_LABELS,
  type TimeRange,
} from '@/lib/dashboardAnalytics';

interface Props {
  range: TimeRange;
  totals: ScopeTotals;
  delta: PeriodDelta;
  categories: CategoryRow[];
  completeness: EvidenceCompleteness;
}

const kg = (v: number) => `${Math.round(v).toLocaleString()} kg`;
const pct = (v: number) => `${v.toFixed(1)}%`;

export const DashboardIntelligence = ({ range, totals, delta, categories, completeness }: Props) => {
  const rising = delta.changePct !== null && delta.changePct > 0;
  const flat = delta.changePct !== null && Math.abs(delta.changePct) < 0.5;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Period-over-period movement */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Movement vs previous period
          </CardTitle>
        </CardHeader>
        <CardContent>
          {delta.comparable && delta.changePct !== null ? (
            <>
              <div className="flex items-baseline gap-2">
                {flat ? (
                  <Minus className="h-5 w-5 text-muted-foreground" />
                ) : rising ? (
                  <TrendingUp className="h-5 w-5 text-warning" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-success" />
                )}
                <span className="text-2xl font-semibold">
                  {delta.changePct > 0 ? '+' : ''}
                  {delta.changePct.toFixed(1)}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {kg(delta.currentKg)} in {TIME_RANGE_LABELS[range].toLowerCase()}, against{' '}
                {kg(delta.priorKg)} in the equivalent period before it.
              </p>
            </>
          ) : (
            <>
              <div className="text-2xl font-semibold text-muted-foreground">Not comparable</div>
              <p className="text-xs text-muted-foreground mt-2">
                No records exist in the equivalent prior period, so a change cannot be stated.
                {' '}Current period: {kg(delta.currentKg)}.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Scope mix */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Scope mix in view</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {totals.total > 0 ? (
            ([
              ['Scope 1', totals.scope1],
              ['Scope 2', totals.scope2],
              ['Scope 3', totals.scope3],
            ] as const).map(([label, value]) => (
              <div key={label}>
                <div className="flex justify-between text-xs mb-1">
                  <span>{label}</span>
                  <span className="text-muted-foreground">
                    {kg(value)} · {pct((value / totals.total) * 100)}
                  </span>
                </div>
                <Progress value={(value / totals.total) * 100} className="h-1.5" />
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">No records match the current filters.</p>
          )}
        </CardContent>
      </Card>

      {/* Evidence completeness */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Evidence completeness</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-success" />
            <span className="text-2xl font-semibold">{pct(completeness.verifiedPct)}</span>
            <span className="text-xs text-muted-foreground">verified</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {completeness.verifiedRecords} of {completeness.totalRecords} records in view carry a
            completed verification.
          </p>
          {(completeness.withoutActivityData > 0 || completeness.withoutFactor > 0) && (
            <div className="flex items-start gap-2 text-xs text-warning pt-1">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>
                {completeness.withoutActivityData > 0 &&
                  `${completeness.withoutActivityData} without an activity quantity. `}
                {completeness.withoutFactor > 0 && `${completeness.withoutFactor} without a recorded factor.`}
              </span>
            </div>
          )}
          <div className="flex gap-1 pt-1">
            {[1, 2, 3].map((s) => (
              <Badge
                key={s}
                variant={completeness.scopesPresent.includes(s) ? 'secondary' : 'outline'}
                className="text-[10px] font-normal"
              >
                Scope {s} {completeness.scopesPresent.includes(s) ? 'present' : 'absent'}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Concentration */}
      <Card className="md:col-span-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Where the emissions sit
          </CardTitle>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No categories to rank under the current filters.
            </p>
          ) : (
            <div className="space-y-3">
              {categories.map((c) => (
                <div key={c.category}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="truncate pr-2">{c.category}</span>
                    <span className="text-muted-foreground shrink-0">
                      {kg(c.co2Kg)} · {pct(c.sharePct)} · {c.recordCount} record
                      {c.recordCount === 1 ? '' : 's'}
                    </span>
                  </div>
                  <Progress value={c.sharePct} className="h-1.5" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
