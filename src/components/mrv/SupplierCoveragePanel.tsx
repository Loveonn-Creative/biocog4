import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Network, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';
import { useSupplierCoverage } from '@/hooks/useSupplierCoverage';
import { TIER_LABEL, type SupplierRecord } from '@/lib/supplierLedger';

const fmt = (n: number, currency: string) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);

const tierVariant = (t: SupplierRecord['tier']) =>
  t === 'primary' ? 'default' : t === 'factor_derived' ? 'secondary' : 'outline';

export const SupplierCoveragePanel = () => {
  const { coverage, isLoading } = useSupplierCoverage();

  if (isLoading) return null;

  if (coverage.supplierCount === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Network className="h-4 w-4 text-muted-foreground" /> Scope 3 supplier visibility
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No supplier is visible yet. Suppliers appear here as soon as invoices carrying a vendor
          name are captured — nothing is assumed on your behalf.
        </CardContent>
      </Card>
    );
  }

  const top = coverage.suppliers.slice(0, 8);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Network className="h-4 w-4 text-muted-foreground" /> Scope 3 supplier visibility
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Suppliers seen</div>
            <div className="text-2xl font-semibold">{coverage.supplierCount}</div>
            <div className="text-xs text-muted-foreground">{coverage.evidencedCount} with usable evidence</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Spend covered</div>
            <div className="text-2xl font-semibold">{coverage.spendCoveragePct.toFixed(0)}%</div>
            <Progress value={coverage.spendCoveragePct} className="h-1.5 mt-2" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Verified emissions</div>
            <div className="text-2xl font-semibold">{coverage.emissionsCoveragePct.toFixed(0)}%</div>
            <div className="text-xs text-muted-foreground">
              {(coverage.verifiedCo2Kg / 1000).toFixed(2)} of {(coverage.totalCo2Kg / 1000).toFixed(2)} tCO₂e
            </div>
          </div>
        </div>

        <div className="border rounded-lg divide-y">
          {top.map((s) => (
            <div key={s.key} className="p-3 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="font-medium truncate">{s.name}</div>
                <div className="text-xs text-muted-foreground">
                  {s.documentCount} document{s.documentCount === 1 ? '' : 's'} ·{' '}
                  {fmt(s.spend, s.currency)} · {(s.co2Kg / 1000).toFixed(3)} tCO₂e
                  {s.categories.length > 0 && ` · ${s.categories.slice(0, 2).join(', ')}`}
                </div>
                {s.gaps.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {s.gaps.map((g) => (
                      <li key={g} className="text-xs text-muted-foreground flex items-start gap-1.5">
                        <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0 text-amber-500" />
                        {g}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <Badge variant={tierVariant(s.tier)} className="shrink-0 text-[11px]">
                {TIER_LABEL[s.tier]}
              </Badge>
            </div>
          ))}
        </div>

        {coverage.suppliers.length > top.length && (
          <p className="text-xs text-muted-foreground">
            Showing the {top.length} suppliers with the highest attributed emissions of{' '}
            {coverage.suppliers.length}.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button asChild size="sm" variant="outline">
            <Link to="/reports">
              <ShieldCheck className="h-4 w-4 mr-2" /> Export supplier annex with reports
            </Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link to="/calculators/supplier-emissions-risk">
              Model a supplier gap <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          Coverage is computed only from your own captured documents. A supplier with no verified
          document is shown as a gap rather than estimated, so the annex you hand to a buyer or
          auditor states exactly what is evidenced and what is not.
        </p>
      </CardContent>
    </Card>
  );
};
