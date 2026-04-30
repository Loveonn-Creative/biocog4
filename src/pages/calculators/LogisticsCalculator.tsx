import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Calculator as CalcIcon } from "lucide-react";
import { CalculatorShell } from "@/components/calculators/CalculatorShell";
import { SaveRunButton } from "@/components/calculators/SaveRunButton";
import {
  TRANSPORT_MODES, calculateLogistics,
  type FreightLeg, type LogisticsResult, type TransportMode,
} from "@/lib/calculators/logisticsEngine";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const uid = () => Math.random().toString(36).slice(2, 9);
const newLeg = (): FreightLeg => ({ id: uid(), mode: 'road-articulated', weightTonnes: 0, distanceKm: 0, emptyReturnFactor: 0 });

const LogisticsCalculator = () => {
  const [legs, setLegs] = useState<FreightLeg[]>([newLeg()]);
  const [result, setResult] = useState<LogisticsResult | null>(null);

  const update = (id: string, patch: Partial<FreightLeg>) => setLegs(legs.map(l => l.id === id ? { ...l, ...patch } : l));
  const calculate = () => setResult(calculateLogistics(legs));

  const chartData = result ? Object.entries(result.byMode).map(([name, value]) => ({ name, value })) : [];

  return (
    <CalculatorShell
      slug="logistics-emissions"
      title="Freight & Logistics Emissions Calculator | GLEC v3.0 ISO 14083"
      description="Calculate transport emissions across road, rail, sea and air. GLEC v3.0 / ISO 14083 aligned with load factor and empty-return adjustments."
      keywords="logistics emissions calculator, freight carbon calculator, GLEC framework, ISO 14083, transport scope 3, multimodal shipping emissions"
      h1="Logistics & Transportation Emissions Calculator"
      intro="Calculate freight emissions across road, rail, sea and air. Aligned with GLEC Framework v3.0 and ISO 14083."
      howToSteps={[
        'Add each transport leg of your shipment.',
        'Pick the transport mode — articulated truck, container ship, rail, air, etc.',
        'Enter weight in tonnes and distance in kilometres.',
        'Optionally adjust load factor (default per mode is set) and empty-return factor.',
        'Click Calculate to see total kgCO₂e, emissions per mode, and average intensity (kgCO₂e per tonne-km).',
        'Chain multiple legs for multimodal shipments (e.g. truck → ship → truck).',
      ]}
      faqs={[
        { q: 'What is a tonne-kilometre (t-km)?', a: 'The standard unit for freight emissions: 1 tonne moved over 1 kilometre. Total emissions = mode EF × tonnes × km.' },
        { q: 'Should I include the empty return trip?', a: 'Yes for owned fleet or dedicated trucks. Set empty-return factor to 1.0 for full empty return, 0.5 for half-loaded return. Default is 0 (none added).' },
        { q: 'Why are my truck emissions higher than the GLEC default?', a: 'Lower load factor increases per-tonne intensity. If you ship at 30% load, the calculator scales the EF up vs the default 70% load factor.' },
        { q: 'Where do the emission factors come from?', a: 'GLEC Framework v3.0 published well-to-wheel intensities, validated against ISO 14083:2023.' },
      ]}
      factorSources={['GLEC Framework v3.0', 'ISO 14083:2023']}
      related={[
        { href: '/calculators/product-carbon-footprint', label: 'Product Carbon Footprint →' },
        { href: '/calculators/supplier-emissions-risk', label: 'Supplier Risk →' },
      ]}
    >
      <Card className="mb-6">
        <CardContent className="pt-6 space-y-3">
          {legs.map(l => (
            <div key={l.id} className="border border-border rounded-lg p-3 grid grid-cols-12 gap-2 items-end">
              <div className="col-span-12 sm:col-span-2">
                <label className="text-xs text-muted-foreground">Label</label>
                <Input placeholder="e.g. Mumbai → Hamburg" value={l.label || ''} onChange={e => update(l.id, { label: e.target.value })} />
              </div>
              <div className="col-span-12 sm:col-span-3">
                <label className="text-xs text-muted-foreground">Mode</label>
                <Select value={l.mode} onValueChange={v => update(l.id, { mode: v as TransportMode })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TRANSPORT_MODES.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-4 sm:col-span-2">
                <label className="text-xs text-muted-foreground">Weight (tonnes)</label>
                <Input type="number" step="0.1" value={l.weightTonnes || ''} onChange={e => update(l.id, { weightTonnes: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="col-span-4 sm:col-span-2">
                <label className="text-xs text-muted-foreground">Distance (km)</label>
                <Input type="number" value={l.distanceKm || ''} onChange={e => update(l.id, { distanceKm: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="col-span-4 sm:col-span-2">
                <label className="text-xs text-muted-foreground">Empty return (0–1)</label>
                <Input type="number" step="0.1" value={l.emptyReturnFactor ?? 0} onChange={e => update(l.id, { emptyReturnFactor: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="col-span-12 sm:col-span-1 flex justify-end">
                <Button size="icon" variant="ghost" onClick={() => setLegs(legs.filter(x => x.id !== l.id))} disabled={legs.length === 1}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
          ))}
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setLegs([...legs, newLeg()])}><Plus className="w-3 h-3 mr-1" /> Add leg</Button>
            <Button onClick={calculate}><CalcIcon className="w-4 h-4 mr-2" /> Calculate</Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid sm:grid-cols-3 gap-4">
              <div><p className="text-xs text-muted-foreground">Total emissions</p><p className="text-2xl font-bold">{(result.totalKgCO2e / 1000).toFixed(2)} tCO₂e</p></div>
              <div><p className="text-xs text-muted-foreground">Total tonne-km</p><p className="text-2xl font-bold">{result.totalTonneKm.toLocaleString()}</p></div>
              <div><p className="text-xs text-muted-foreground">Avg intensity</p><p className="text-2xl font-bold">{result.averageIntensity} kg/tkm</p></div>
            </div>

            {chartData.length > 0 && (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={v => `${(v / 1000).toFixed(1)}t`} />
                  <Tooltip formatter={(v: number) => `${(v / 1000).toFixed(2)} tCO₂e`} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            )}

            <SaveRunButton
              calculatorSlug="logistics-emissions"
              inputs={{ legs }}
              results={result as never}
              factorSources={result.factorSources}
            />
          </CardContent>
        </Card>
      )}
    </CalculatorShell>
  );
};

export default LogisticsCalculator;
