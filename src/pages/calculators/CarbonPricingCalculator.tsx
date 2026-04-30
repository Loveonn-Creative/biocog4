import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calculator as CalcIcon } from "lucide-react";
import { CalculatorShell } from "@/components/calculators/CalculatorShell";
import { SaveRunButton } from "@/components/calculators/SaveRunButton";
import {
  SECTOR_BENCHMARKS, calculateCarbonPricing, formatCurrencyEur, formatLocal,
  type CarbonPricingInput, type CarbonPricingResult, type PriceScenario,
} from "@/lib/calculators/carbonPricingEngine";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from "recharts";

const CarbonPricingCalculator = () => {
  const [scope1, setScope1] = useState('100000');
  const [scope2, setScope2] = useState('500000');
  const [scope3, setScope3] = useState('200000');
  const [production, setProduction] = useState('1000');
  const [sectorId, setSectorId] = useState('steel');
  const [exportsToEU, setExportsToEU] = useState(true);
  const [reduction, setReduction] = useState('5');
  const [scenario, setScenario] = useState<PriceScenario>('base');
  const [startYear, setStartYear] = useState('2026');
  const [endYear, setEndYear] = useState('2034');
  const [domesticPrice, setDomesticPrice] = useState('0');
  const [currency, setCurrency] = useState('EUR');
  const [result, setResult] = useState<CarbonPricingResult | null>(null);

  const calculate = () => {
    const input: CarbonPricingInput = {
      scope1KgCO2e: parseFloat(scope1) || 0,
      scope2KgCO2e: parseFloat(scope2) || 0,
      scope3KgCO2e: parseFloat(scope3) || 0,
      productionTonnes: parseFloat(production) || 0,
      sectorId, exportsToEU,
      reductionPctByYear: (parseFloat(reduction) || 0) / 100,
      scenario, startYear: parseInt(startYear) || 2026, endYear: parseInt(endYear) || 2034,
      countryCarbonPrice: parseFloat(domesticPrice) || 0,
      reportingCurrency: currency,
    };
    setResult(calculateCarbonPricing(input));
  };

  return (
    <CalculatorShell
      slug="carbon-pricing-impact"
      title="Carbon Pricing Impact Calculator | EU ETS + CBAM Cost"
      description="Estimate carbon cost exposure 2026–2034 using EU ETS forward curves, CBAM phase-in and free allowances. Scenario sensitivity included."
      keywords="carbon price calculator, EU ETS calculator, CBAM cost calculator, carbon tax exposure, carbon liability, scope 1 2 3 cost"
      h1="Carbon Pricing Impact Calculator"
      intro="Estimate carbon cost exposure year by year. Models EU ETS forward curves, CBAM phase-in, and sector free allowances with best / base / worst sensitivity."
      howToSteps={[
        'Enter your annual Scope 1, 2 and 3 emissions in kgCO₂e.',
        'Enter production volume in tonnes (used for free allowance calculation).',
        'Select your sector — sets the EU benchmark and CBAM coverage flag.',
        'Tick "Exports to EU" if any output is sold to the EU (activates CBAM phase-in).',
        'Set a yearly reduction % to model your decarbonisation plan.',
        'Choose price scenario (best / base / worst) and click Calculate.',
        'Review yearly liability, regulated vs non-regulated split, and sensitivity range.',
      ]}
      faqs={[
        { q: 'What carbon prices does this calculator assume?', a: 'EU ETS forward curve from €80/tCO₂ in 2026 rising to €135 by 2034 (base scenario). Best case applies −20%, worst case +30%.' },
        { q: 'How does CBAM phase-in work?', a: 'CBAM certificates phase in from 2.5% in 2026 to 100% by 2034, while free allowances decline from 97.5% to 0% over the same period — both schedules are from EU Regulation 2023/956.' },
        { q: 'What if my sector is not CBAM-covered?', a: 'Non-CBAM sectors get no free allowance and no phase-in — they pay the full ETS-equivalent price on liable emissions if a domestic carbon market applies.' },
        { q: 'How is the regulated vs non-regulated split calculated?', a: 'For CBAM-covered sectors, Scope 1 + Scope 2 are treated as regulated; Scope 3 is non-regulated unless your downstream falls under separate regulation.' },
      ]}
      factorSources={['EU Regulation 2023/956 (CBAM)', 'EU ETS forward curve assumption', 'EU sector benchmarks']}
      related={[
        { href: '/cbam-calculator', label: 'CBAM Cost Estimator →' },
        { href: '/calculators/energy-transition-savings', label: 'Energy Transition ROI →' },
      ]}
    >
      <Card className="mb-6">
        <CardContent className="pt-6 space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <div><label className="text-sm font-medium">Scope 1 (kgCO₂e/yr)</label><Input type="number" value={scope1} onChange={e => setScope1(e.target.value)} /></div>
            <div><label className="text-sm font-medium">Scope 2 (kgCO₂e/yr)</label><Input type="number" value={scope2} onChange={e => setScope2(e.target.value)} /></div>
            <div><label className="text-sm font-medium">Scope 3 (kgCO₂e/yr)</label><Input type="number" value={scope3} onChange={e => setScope3(e.target.value)} /></div>
            <div><label className="text-sm font-medium">Production (tonnes/yr)</label><Input type="number" value={production} onChange={e => setProduction(e.target.value)} /></div>
            <div>
              <label className="text-sm font-medium">Sector</label>
              <Select value={sectorId} onValueChange={setSectorId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SECTOR_BENCHMARKS).map(([id, info]) => <SelectItem key={id} value={id}>{info.name}{info.cbamCovered ? ' (CBAM)' : ''}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Scenario</label>
              <Select value={scenario} onValueChange={(v: PriceScenario) => setScenario(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="best">Best (−20%)</SelectItem>
                  <SelectItem value="base">Base</SelectItem>
                  <SelectItem value="worst">Worst (+30%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><label className="text-sm font-medium">Reduction %/yr</label><Input type="number" value={reduction} onChange={e => setReduction(e.target.value)} /></div>
            <div><label className="text-sm font-medium">Start year</label><Input type="number" value={startYear} onChange={e => setStartYear(e.target.value)} /></div>
            <div><label className="text-sm font-medium">End year</label><Input type="number" value={endYear} onChange={e => setEndYear(e.target.value)} /></div>
            <div><label className="text-sm font-medium">Domestic carbon price (€/tCO₂)</label><Input type="number" value={domesticPrice} onChange={e => setDomesticPrice(e.target.value)} /></div>
            <div>
              <label className="text-sm font-medium">Reporting currency</label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['EUR','USD','GBP','INR','CNY','JPY','IDR','VND','BDT','PHP','THB'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm pt-6">
              <Checkbox checked={exportsToEU} onCheckedChange={v => setExportsToEU(!!v)} /> Exports to EU (activate CBAM phase-in)
            </label>
          </div>
          <Button size="lg" onClick={calculate}><CalcIcon className="w-4 h-4 mr-2" /> Calculate exposure</Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid sm:grid-cols-4 gap-4">
              <div><p className="text-xs text-muted-foreground">Total liability ({startYear}–{endYear})</p><p className="text-xl font-bold">{formatCurrencyEur(result.totalLiabilityEur)}</p><p className="text-xs text-muted-foreground">{formatLocal(result.totalLiabilityLocal, currency)}</p></div>
              <div><p className="text-xs text-muted-foreground">Sector</p><p className="text-xl font-bold">{result.sectorName}</p><p className="text-xs text-muted-foreground">{result.isCbamCovered ? 'CBAM-covered' : 'Non-CBAM'}</p></div>
              <div><p className="text-xs text-muted-foreground">Regulated share</p><p className="text-xl font-bold">{formatCurrencyEur(result.regulatedShareEur)}</p></div>
              <div><p className="text-xs text-muted-foreground">Non-regulated share</p><p className="text-xl font-bold">{formatCurrencyEur(result.nonRegulatedShareEur)}</p></div>
            </div>

            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={result.yearly}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="year" />
                <YAxis tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrencyEur(v)} />
                <Legend />
                <Line type="monotone" dataKey="netLiabilityEur" stroke="hsl(var(--primary))" name="Net liability (€)" strokeWidth={2} />
                <Line type="monotone" dataKey="grossEur" stroke="hsl(var(--accent))" name="Gross (€)" strokeDasharray="3 3" />
              </LineChart>
            </ResponsiveContainer>

            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={[
                { name: 'Best (−20%)', value: result.sensitivity.best },
                { name: 'Base', value: result.sensitivity.base },
                { name: 'Worst (+30%)', value: result.sensitivity.worst },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrencyEur(v)} />
                <Bar dataKey="value" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>

            <SaveRunButton
              calculatorSlug="carbon-pricing-impact"
              inputs={{ scope1, scope2, scope3, production, sectorId, exportsToEU, reduction, scenario, startYear, endYear, domesticPrice, currency }}
              results={result as never}
              factorSources={result.factorSources}
            />
          </CardContent>
        </Card>
      )}
    </CalculatorShell>
  );
};

export default CarbonPricingCalculator;
