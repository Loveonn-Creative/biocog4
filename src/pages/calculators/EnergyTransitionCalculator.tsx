import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator as CalcIcon, TrendingUp, Leaf, Wallet } from "lucide-react";
import { CalculatorShell } from "@/components/calculators/CalculatorShell";
import { SaveRunButton } from "@/components/calculators/SaveRunButton";
import {
  calculateEnergyTransition, formatLocalCurrency, ENERGY_COUNTRIES,
  type EnergyInput, type EnergyResult, type EnergyScenario,
} from "@/lib/calculators/energyTransitionEngine";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const EnergyTransitionCalculator = () => {
  const [country, setCountry] = useState('IN');
  const [scenario, setScenario] = useState<EnergyScenario>('on-grid-solar');
  const [monthlyKwh, setMonthlyKwh] = useState('5000');
  const [tariff, setTariff] = useState('9');
  const [systemKwp, setSystemKwp] = useState('30');
  const [capex, setCapex] = useState('50000');
  const [opex, setOpex] = useState('10000');
  const [ppaTariff, setPpaTariff] = useState('5.5');
  const [selfCons, setSelfCons] = useState('0.85');
  const [exportTariff, setExportTariff] = useState('3');
  const [discount, setDiscount] = useState('10');
  const [degradation, setDegradation] = useState('0.5');
  const [life, setLife] = useState('25');
  const [cuf, setCuf] = useState('0.18');
  const [subsidy, setSubsidy] = useState('20');
  const [result, setResult] = useState<EnergyResult | null>(null);

  const calculate = () => {
    const input: EnergyInput = {
      countryCode: country, monthlyKwh: parseFloat(monthlyKwh) || 0,
      currentTariff: parseFloat(tariff) || 0, systemKwp: parseFloat(systemKwp) || 0,
      capexPerKwp: parseFloat(capex) || 0, opexPerYear: parseFloat(opex) || 0,
      ppaTariff: parseFloat(ppaTariff) || 0, scenario,
      selfConsumptionPct: parseFloat(selfCons) || 0,
      exportTariff: parseFloat(exportTariff) || 0,
      discountRate: (parseFloat(discount) || 0) / 100,
      degradationPctPerYear: (parseFloat(degradation) || 0) / 100,
      systemLifeYears: parseInt(life) || 25,
      capacityUtilization: parseFloat(cuf) || 0.18,
      subsidyPct: (parseFloat(subsidy) || 0) / 100,
    };
    setResult(calculateEnergyTransition(input));
  };

  return (
    <CalculatorShell
      slug="energy-transition-savings"
      title="Solar ROI & Energy Transition Calculator | IRR NPV Payback"
      description="Calculate solar / PPA / hybrid savings, payback, IRR, NPV and CO₂ avoided over 25 years. Region-specific grid factors and tariffs."
      keywords="solar roi calculator, solar payback calculator, renewable energy savings, PPA calculator, MNRE solar calculator, IRR NPV solar"
      h1="Energy Transition Savings Calculator"
      intro="Compare grid vs solar / PPA / hybrid. See payback period, IRR, NPV and lifetime CO₂ avoided using region-specific grid factors."
      howToSteps={[
        'Choose your country — grid emission factor and currency are set automatically.',
        'Enter monthly electricity consumption and your current tariff (per kWh).',
        'Pick a scenario: on-grid solar, off-grid solar, hybrid, or PPA (no upfront capex).',
        'Enter proposed system size in kWp and capex per kWp.',
        'Adjust optional fields: self-consumption %, export tariff, subsidy, degradation, discount rate.',
        'Click Calculate to see payback years, 25-year cashflow, IRR, NPV and lifetime CO₂ avoided.',
      ]}
      faqs={[
        { q: 'What payback period should I aim for?', a: 'For commercial solar in India, 4–6 years is typical with current MNRE benchmarks. PPA models have zero payback because there is no upfront capex.' },
        { q: 'What is capacity utilization factor (CUF)?', a: 'The fraction of theoretical maximum output a solar system actually delivers. India averages 0.17–0.20. Higher CUF means more annual generation.' },
        { q: 'How is CO₂ avoided calculated?', a: 'Annual generation (kWh) × country grid factor (kgCO₂e/kWh from IEA 2023). For India this is 0.708 kgCO₂e per kWh of grid electricity displaced.' },
        { q: 'Is the IRR pre-tax or post-tax?', a: 'Pre-tax. Apply your effective tax rate separately or consult your CA for accelerated depreciation benefits.' },
      ]}
      factorSources={['IEA 2023', 'MNRE benchmarks', 'Standard IRR/NPV math']}
      related={[
        { href: '/calculators/carbon-pricing-impact', label: 'Carbon Pricing Impact →' },
        { href: '/calculators/product-carbon-footprint', label: 'Product Carbon Footprint →' },
      ]}
    >
      <Card className="mb-6">
        <CardContent className="pt-6 space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Country</label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ENERGY_COUNTRIES.map(c => <SelectItem key={c.code} value={c.code}>{c.name} ({c.gridFactor} kgCO₂/kWh)</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Scenario</label>
              <Select value={scenario} onValueChange={(v: EnergyScenario) => setScenario(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="on-grid-solar">On-grid solar</SelectItem>
                  <SelectItem value="off-grid-solar">Off-grid solar</SelectItem>
                  <SelectItem value="hybrid">Hybrid (solar + grid)</SelectItem>
                  <SelectItem value="ppa">PPA (no capex)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Monthly consumption (kWh)</label>
              <Input type="number" value={monthlyKwh} onChange={e => setMonthlyKwh(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Current tariff (per kWh)</label>
              <Input type="number" step="0.1" value={tariff} onChange={e => setTariff(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Proposed system size (kWp)</label>
              <Input type="number" value={systemKwp} onChange={e => setSystemKwp(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Capex per kWp</label>
              <Input type="number" value={capex} onChange={e => setCapex(e.target.value)} disabled={scenario === 'ppa'} />
            </div>
            <div>
              <label className="text-sm font-medium">Annual O&amp;M</label>
              <Input type="number" value={opex} onChange={e => setOpex(e.target.value)} disabled={scenario === 'ppa'} />
            </div>
            {scenario === 'ppa' && (
              <div>
                <label className="text-sm font-medium">PPA tariff (per kWh)</label>
                <Input type="number" step="0.1" value={ppaTariff} onChange={e => setPpaTariff(e.target.value)} />
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Self-consumption % (0–1)</label>
              <Input type="number" step="0.05" value={selfCons} onChange={e => setSelfCons(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Export tariff (per kWh)</label>
              <Input type="number" step="0.1" value={exportTariff} onChange={e => setExportTariff(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Discount rate (%)</label>
              <Input type="number" value={discount} onChange={e => setDiscount(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Degradation %/yr</label>
              <Input type="number" step="0.1" value={degradation} onChange={e => setDegradation(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">System life (yrs)</label>
              <Input type="number" value={life} onChange={e => setLife(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Capacity utilization (CUF)</label>
              <Input type="number" step="0.01" value={cuf} onChange={e => setCuf(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Subsidy (%)</label>
              <Input type="number" value={subsidy} onChange={e => setSubsidy(e.target.value)} disabled={scenario === 'ppa'} />
            </div>
          </div>
          <Button size="lg" onClick={calculate}><CalcIcon className="w-4 h-4 mr-2" /> Calculate savings</Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground"><Wallet className="w-3 h-3 inline mr-1" /> Net capex</p>
                <p className="text-xl font-bold">{formatLocalCurrency(result.netCapex, country)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground"><TrendingUp className="w-3 h-3 inline mr-1" /> Payback</p>
                <p className="text-xl font-bold">{result.paybackYears !== null ? `${result.paybackYears} yrs` : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">IRR / NPV</p>
                <p className="text-xl font-bold">{result.irrPct !== null ? `${result.irrPct}%` : '—'}</p>
                <p className="text-xs text-muted-foreground">{formatLocalCurrency(result.npv, country)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground"><Leaf className="w-3 h-3 inline mr-1" /> CO₂ avoided (lifetime)</p>
                <p className="text-xl font-bold">{(result.lifetimeCo2AvoidedKg / 1000).toFixed(0)} tCO₂</p>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={result.cashflows}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="year" />
                <YAxis tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatLocalCurrency(v, country)} />
                <Legend />
                <Line type="monotone" dataKey="cumulative" stroke="hsl(var(--primary))" name="Cumulative cashflow" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="netCashflow" stroke="hsl(var(--accent))" name="Yearly net" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>

            <SaveRunButton
              calculatorSlug="energy-transition-savings"
              label={`${scenario} ${systemKwp}kWp ${country}`}
              inputs={{ country, scenario, monthlyKwh, tariff, systemKwp, capex, opex, ppaTariff, selfCons, exportTariff, discount, degradation, life, cuf, subsidy }}
              results={result as never}
              factorSources={result.factorSources}
            />
          </CardContent>
        </Card>
      )}
    </CalculatorShell>
  );
};

export default EnergyTransitionCalculator;
