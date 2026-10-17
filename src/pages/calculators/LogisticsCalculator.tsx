import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Calculator as CalcIcon } from "lucide-react";
import { CalculatorShell } from "@/components/calculators/CalculatorShell";
import { SaveRunButton } from "@/components/calculators/SaveRunButton";
import { MethodologyPanel } from "@/components/calculators/MethodologyPanel";

import { useCalculatorAutosave } from "@/hooks/useCalculatorAutosave";
import { useCalculatorRerun } from "@/hooks/useCalculatorRerun";
import {
  TRANSPORT_MODES, calculateLogistics,
  type FreightLeg, type LogisticsResult, type TransportMode,
} from "@/lib/calculators/logisticsEngine";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { analyticsEvents } from "@/lib/analytics";

const uid = () => Math.random().toString(36).slice(2, 9);
const newLeg = (): FreightLeg => ({ id: uid(), mode: 'road-hcv20-diesel', weightTonnes: 0, distanceKm: 0 });

const LogisticsCalculator = () => {
  const [legs, setLegs] = useState<FreightLeg[]>([newLeg()]);
  const [result, setResult] = useState<LogisticsResult | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);

  const update = (id: string, patch: Partial<FreightLeg>) => setLegs(legs.map(l => l.id === id ? { ...l, ...patch } : l));

  const usableLegs = legs.filter(l => l.weightTonnes > 0 && l.distanceKm > 0);

  const calculate = () => {
    analyticsEvents.calculatorRunStart("logistics-emissions");
    if (usableLegs.length === 0) {
      setResult(null);
      setBlocked("Each leg needs a weight above 0 tonnes and a distance above 0 km. Without both, tonne-kilometres cannot be computed and no emissions figure can be produced.");
      return;
    }
    setBlocked(null);
    setResult(calculateLogistics(usableLegs));
  };

  // Data-quality caveats, derived from what the user actually supplied.
  const issues: string[] = [];
  if (result) {
    const skipped = legs.length - usableLegs.length;
    if (skipped > 0) issues.push(`${skipped} leg${skipped > 1 ? "s" : ""} excluded for missing weight or distance.`);
    issues.push(...result.notes);
    if (usableLegs.some(l => l.customEf === undefined)) issues.push("Default intensities used where no carrier factor was entered; they already include average load and empty running.");
  }

  const chartData = result ? Object.entries(result.byMode).map(([name, value]) => ({ name, value })) : [];


  useCalculatorAutosave({
    calculatorSlug: "logistics-emissions",
    inputs: { legs },
    results: result,
    factorSources: result?.factorSources,
  });

  useCalculatorRerun("logistics-emissions", (i) => {
    if (Array.isArray(i.legs)) setLegs(i.legs as FreightLeg[]);
  });

  return (
    <CalculatorShell
      slug="logistics-emissions"
      title="Freight & Logistics Emissions Calculator | ISO 14083"
      description="Calculate transport emissions across road, rail, sea and air, with Indian truck classes and rail. ISO 14083 method, per tonne-kilometre."
      keywords="logistics emissions calculator, freight carbon calculator, GLEC framework, ISO 14083, transport scope 3, multimodal shipping emissions"
      h1="Logistics & Transportation Emissions Calculator"
      intro="Calculate freight emissions across road, rail, sea and air, per tonne-kilometre, following ISO 14083."
      howToSteps={[
        'Add each transport leg of your shipment.',
        'Pick the transport mode or truck class (by gross vehicle weight), rail, sea or air.',
        'Enter weight in tonnes and distance in kilometres.',
        'If your carrier gives its own intensity in kg CO₂e per tonne-km, enter it; it is used as given.',
        'Click Calculate to see total kgCO₂e, emissions per mode, and average intensity (kgCO₂e per tonne-km).',
        'Chain multiple legs for multimodal shipments (e.g. truck → ship → truck).',
      ]}
      faqs={[
        { q: 'What is a tonne-kilometre (t-km)?', a: 'The standard unit for freight emissions: 1 tonne moved over 1 kilometre. Total emissions = mode EF × tonnes × km.' },
        { q: 'Should I add the empty return trip?', a: 'Not on top of the defaults. Default intensities already include average load and typical empty running, so adding an empty-return uplift would count it twice. If your carrier gives a factor based on its own loading and empty trips, enter that instead.' },
        { q: 'What if I do not know the truck size?', a: 'Pick the closest class by gross vehicle weight. Larger trucks carry more per trip, so their emissions per tonne-km are lower.' },
        { q: 'Can I use a factor quoted per ton-mile or per vehicle-mile?', a: 'Convert it first. A factor per short ton-mile divided by 1.46 gives kg per tonne-km. A factor per vehicle-mile or vehicle-km has no load in it, so it must be divided by the average tonnes carried before it can be used here.' },
      ]}
      factorSources={['ISO 14083:2023']}
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
                <label className="text-xs text-muted-foreground">Carrier factor (optional)</label>
                <Input type="number" step="0.001" placeholder="kg CO₂e/tkm" value={l.customEf ?? ''} onChange={e => { const v = parseFloat(e.target.value); update(l.id, { customEf: Number.isFinite(v) && v > 0 ? v : undefined }); }} />
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

      {blocked && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{blocked}</p>
          </CardContent>
        </Card>
      )}

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

            <MethodologyPanel
              methodologyVersion={result.methodologyVersion}
              factorSources={result.factorSources}
              issues={issues}
            />

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
