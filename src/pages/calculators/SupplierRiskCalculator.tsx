import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Calculator as CalcIcon, AlertTriangle } from "lucide-react";
import { CalculatorShell } from "@/components/calculators/CalculatorShell";
import { SaveRunButton } from "@/components/calculators/SaveRunButton";
import {
  SPEND_EF_BY_SECTOR, COUNTRY_RISK,
  calculateSupplierPortfolio, type SupplierInput, type SupplierPortfolioResult, type SupplierTier,
} from "@/lib/calculators/supplierRiskEngine";

const uid = () => Math.random().toString(36).slice(2, 9);

const newSupplier = (): SupplierInput => ({
  id: uid(), name: '', tier: 1, countryCode: 'IN', sectorId: 'steel',
  annualSpendUSD: undefined, activityKgCO2e: undefined,
  hasDisclosure: false, hasIso14064: false,
});

const SupplierRiskCalculator = () => {
  const [suppliers, setSuppliers] = useState<SupplierInput[]>([newSupplier()]);
  const [result, setResult] = useState<SupplierPortfolioResult | null>(null);

  const update = (id: string, patch: Partial<SupplierInput>) => {
    setSuppliers(suppliers.map(s => s.id === id ? { ...s, ...patch } : s));
  };

  const calculate = () => setResult(calculateSupplierPortfolio(suppliers.filter(s => s.name.trim())));

  const riskBadge = (score: number) =>
    score >= 70 ? <Badge variant="destructive">High</Badge>
      : score >= 40 ? <Badge variant="secondary">Medium</Badge>
        : <Badge>Low</Badge>;

  return (
    <CalculatorShell
      slug="supplier-emissions-risk"
      title="Supplier Emissions & Risk Calculator | GHG Scope 3 Cat 1"
      description="Score supplier carbon emissions and risk using GHG Protocol Scope 3 Cat 1. Hybrid spend + activity method with confidence ratings."
      keywords="supplier emissions calculator, scope 3 supplier, supply chain carbon, EEIO calculator, supplier risk score, vendor carbon"
      h1="Supplier Emissions & Risk Score Calculator"
      intro="Score every vendor's carbon emissions and supply-chain risk. Hybrid spend-based + activity-based method aligned with GHG Protocol Scope 3 Category 1."
      howToSteps={[
        'Add each supplier with its country, sector, and tier (1 = direct, 2 = sub-supplier, 3 = upstream).',
        'Enter annual spend in USD if you do not have primary activity data.',
        'If the supplier shared its own emissions in tonnes CO₂e, enter that — it overrides the spend estimate.',
        'Mark whether the supplier discloses emissions or has ISO 14064 verification.',
        'Click Calculate to see emissions, risk score 0–100, and confidence band per supplier.',
        'Use the top contributors list to focus engagement on the highest-impact 5 suppliers.',
      ]}
      faqs={[
        { q: 'What is the difference between spend-based and activity-based?', a: 'Spend-based multiplies USD spent by an EEIO factor (kgCO₂e per USD). Activity-based uses primary data such as kWh, kg of material, or tonne-km. Activity is more accurate; spend is faster when data is missing.' },
        { q: 'How is the risk score calculated?', a: 'Weighted: 30% geography (grid intensity + disclosure maturity of country), 35% sector emissions intensity, 35% disclosure gap (whether the supplier reports and is verified).' },
        { q: 'Why does my supplier have a Low confidence rating?', a: 'Low confidence means no spend or activity data was provided and a sector average was used as a proxy. Add spend (USD) or primary emissions data to upgrade to Medium or High.' },
        { q: 'Where do EEIO factors come from?', a: 'World Bank EORA Multi-Region Input-Output 2023 sector medians. Country grid intensities use IEA 2023 data.' },
      ]}
      factorSources={['GHG Protocol Scope 3 Cat 1', 'EORA 2023 EEIO', 'IEA 2023', 'ISO 14064']}
      related={[
        { href: '/calculators/product-carbon-footprint', label: 'Product Carbon Footprint →' },
        { href: '/calculators/logistics-emissions', label: 'Logistics Emissions →' },
      ]}
    >
      <Card className="mb-6">
        <CardContent className="pt-6 space-y-4">
          {suppliers.map((s) => (
            <div key={s.id} className="border border-border rounded-lg p-4 space-y-3">
              <div className="grid sm:grid-cols-4 gap-3">
                <Input placeholder="Supplier name" value={s.name} onChange={e => update(s.id, { name: e.target.value })} />
                <Select value={String(s.tier)} onValueChange={v => update(s.id, { tier: Number(v) as SupplierTier })}>
                  <SelectTrigger><SelectValue placeholder="Tier" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Tier 1 (direct)</SelectItem>
                    <SelectItem value="2">Tier 2</SelectItem>
                    <SelectItem value="3">Tier 3</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={s.countryCode} onValueChange={v => update(s.id, { countryCode: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(COUNTRY_RISK).map(([code, info]) => <SelectItem key={code} value={code}>{info.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={s.sectorId} onValueChange={v => update(s.id, { sectorId: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(SPEND_EF_BY_SECTOR).map(([id, info]) => <SelectItem key={id} value={id}>{info.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <Input type="number" placeholder="Annual spend (USD)" value={s.annualSpendUSD ?? ''} onChange={e => update(s.id, { annualSpendUSD: e.target.value ? Number(e.target.value) : undefined })} />
                <Input type="number" placeholder="Primary emissions (kgCO₂e/yr) — optional" value={s.activityKgCO2e ?? ''} onChange={e => update(s.id, { activityKgCO2e: e.target.value ? Number(e.target.value) : undefined })} />
              </div>
              <div className="flex flex-wrap gap-4 items-center">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={s.hasDisclosure} onCheckedChange={v => update(s.id, { hasDisclosure: !!v })} /> Has carbon disclosure
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={s.hasIso14064} onCheckedChange={v => update(s.id, { hasIso14064: !!v, hasDisclosure: !!v || s.hasDisclosure })} /> ISO 14064 verified
                </label>
                <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSuppliers(suppliers.filter(x => x.id !== s.id))} disabled={suppliers.length === 1}>
                  <Trash2 className="w-3 h-3 mr-1" /> Remove
                </Button>
              </div>
            </div>
          ))}
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setSuppliers([...suppliers, newSupplier()])}><Plus className="w-3 h-3 mr-1" /> Add supplier</Button>
            <Button onClick={calculate}><CalcIcon className="w-4 h-4 mr-2" /> Calculate</Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid sm:grid-cols-3 gap-4">
              <div><p className="text-xs text-muted-foreground">Total emissions</p><p className="text-2xl font-bold">{(result.totalKgCO2e / 1000).toFixed(1)} tCO₂e</p></div>
              <div><p className="text-xs text-muted-foreground">Average risk score</p><p className="text-2xl font-bold">{result.averageRisk}/100</p></div>
              <div><p className="text-xs text-muted-foreground">High-risk suppliers</p><p className="text-2xl font-bold flex items-center gap-2">{result.highRiskCount} {result.highRiskCount > 0 && <AlertTriangle className="w-5 h-5 text-warning" />}</p></div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b">
                  <tr><th className="text-left py-2">Supplier</th><th>Tier</th><th>Country</th><th className="text-right">tCO₂e/yr</th><th className="text-right">Risk</th><th>Confidence</th></tr>
                </thead>
                <tbody>
                  {result.suppliers.map(s => (
                    <tr key={s.id} className="border-b">
                      <td className="py-2 font-medium">{s.name}</td>
                      <td className="text-center">{s.tier}</td>
                      <td>{s.countryName}</td>
                      <td className="text-right">{(s.estimatedKgCO2e / 1000).toFixed(2)}</td>
                      <td className="text-right">{riskBadge(s.riskScore)} <span className="ml-1 text-xs text-muted-foreground">{s.riskScore}</span></td>
                      <td><Badge variant="outline">{s.confidence}</Badge> <span className="text-xs text-muted-foreground">±{s.uncertaintyPct}%</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <SaveRunButton
              calculatorSlug="supplier-emissions-risk"
              inputs={{ suppliers }}
              results={result as never}
              factorSources={result.factorSources}
            />
          </CardContent>
        </Card>
      )}
    </CalculatorShell>
  );
};

export default SupplierRiskCalculator;
