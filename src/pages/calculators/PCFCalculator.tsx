import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Calculator as CalcIcon } from "lucide-react";
import { CalculatorShell } from "@/components/calculators/CalculatorShell";
import { SaveRunButton } from "@/components/calculators/SaveRunButton";
import {
  PCF_MATERIALS, PCF_ENERGY, PCF_TRANSPORT,
  calculatePCF, type PCFInput, type PCFResult, type MaterialLine, type EnergyLine, type TransportLine, type ProcessingLine, type AllocationMethod, type SystemBoundary,
} from "@/lib/calculators/pcfEngine";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const uid = () => Math.random().toString(36).slice(2, 9);

const PCFCalculatorPage = () => {
  const [productName, setProductName] = useState('');
  const [functionalUnit, setFunctionalUnit] = useState('1 kg');
  const [unitsPerBatch, setUnitsPerBatch] = useState('1000');
  const [systemBoundary, setSystemBoundary] = useState<SystemBoundary>('cradle-to-gate');
  const [allocationMethod, setAllocationMethod] = useState<AllocationMethod>('mass');
  const [coProductShare, setCoProductShare] = useState('1');

  const [materials, setMaterials] = useState<MaterialLine[]>([{ id: uid(), factorId: 'steel-virgin', massKg: 0 }]);
  const [energy, setEnergy] = useState<EnergyLine[]>([{ id: uid(), factorId: 'grid-in', kwh: 0 }]);
  const [transport, setTransport] = useState<TransportLine[]>([]);
  const [processing, setProcessing] = useState<ProcessingLine[]>([]);
  const [result, setResult] = useState<PCFResult | null>(null);

  const calculate = () => {
    const input: PCFInput = {
      productName: productName || 'Unnamed product',
      functionalUnit,
      unitsPerBatch: Math.max(1, parseFloat(unitsPerBatch) || 1),
      systemBoundary,
      allocationMethod,
      coProductShare: parseFloat(coProductShare) || 1,
      materials,
      energy,
      transport,
      processing,
    };
    setResult(calculatePCF(input));
  };

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--warning))', 'hsl(var(--muted-foreground))'];

  const pieData = useMemo(() => {
    if (!result) return [];
    return [
      { name: 'Materials', value: result.byCategory.material },
      { name: 'Energy', value: result.byCategory.energy },
      { name: 'Transport', value: result.byCategory.transport },
      { name: 'Processing', value: result.byCategory.processing },
    ].filter(d => d.value > 0);
  }, [result]);

  return (
    <CalculatorShell
      slug="product-carbon-footprint"
      title="Product Carbon Footprint Calculator | ISO 14067 | Senseible"
      description="Free PCF calculator following ISO 14067 and GHG Protocol Product Standard. Cradle-to-gate emissions per product unit with audit-ready breakdown."
      keywords="PCF calculator, product carbon footprint, ISO 14067, cradle to gate, EU CBAM PCF, GHG Protocol product"
      h1="Product Carbon Footprint (PCF) Calculator"
      intro="Calculate cradle-to-gate emissions per product unit. Aligned with ISO 14067 and the GHG Protocol Product Standard."
      howToSteps={[
        'Name your product and define the functional unit (e.g. 1 kg, 1 unit).',
        'Choose system boundary: cradle-to-gate (raw material to factory exit) or gate-to-gate (your facility only).',
        'Add each raw material with its mass in kilograms — the calculator picks DEFRA / Ecoinvent factors automatically.',
        'Enter electricity, fuel, and transport inputs used in production.',
        'Choose allocation method (mass / energy / economic) if your process produces co-products.',
        'Click Calculate to see emissions per functional unit and a full breakdown.',
        'Sign in to save the result and download as CSV for buyer disclosures.',
      ]}
      faqs={[
        { q: 'Which standards does this PCF calculator follow?', a: 'ISO 14067 and the GHG Protocol Product Standard. Emission factors are sourced from DEFRA 2024, Ecoinvent v3.10, World Steel Association, IAI, GCCA and IPCC AR6 where primary data is unavailable.' },
        { q: 'What is a functional unit?', a: 'A functional unit is the reference quantity for which emissions are reported — for example "1 kg of finished steel" or "1 pair of shoes". It lets buyers compare products fairly.' },
        { q: 'When should I use mass vs economic allocation?', a: 'Use mass allocation when co-products have similar value per kg. Use economic allocation when the main product has much higher market value than by-products.' },
        { q: 'Can I use my own emission factors?', a: 'Yes. Each material line accepts a custom kgCO₂e/kg value and source label, which is preserved in the audit trail.' },
      ]}
      factorSources={['ISO 14067', 'GHG Protocol Product Standard', 'DEFRA 2024', 'Ecoinvent v3.10', 'IPCC AR6']}
      related={[
        { href: '/calculators/supplier-emissions-risk', label: 'Supplier Emissions & Risk →' },
        { href: '/calculators/logistics-emissions', label: 'Logistics & Freight Emissions →' },
      ]}
    >
      {/* Inputs */}
      <Card className="mb-6">
        <CardContent className="pt-6 space-y-6">
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Product name</label>
              <Input value={productName} onChange={e => setProductName(e.target.value)} placeholder="e.g. Stainless steel rod" />
            </div>
            <div>
              <label className="text-sm font-medium">Functional unit</label>
              <Input value={functionalUnit} onChange={e => setFunctionalUnit(e.target.value)} placeholder="1 kg" />
            </div>
            <div>
              <label className="text-sm font-medium">Units produced per batch</label>
              <Input type="number" value={unitsPerBatch} onChange={e => setUnitsPerBatch(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">System boundary</label>
              <Select value={systemBoundary} onValueChange={(v: SystemBoundary) => setSystemBoundary(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cradle-to-gate">Cradle-to-gate</SelectItem>
                  <SelectItem value="gate-to-gate">Gate-to-gate</SelectItem>
                  <SelectItem value="cradle-to-grave">Cradle-to-grave</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Allocation method</label>
              <Select value={allocationMethod} onValueChange={(v: AllocationMethod) => setAllocationMethod(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mass">Mass</SelectItem>
                  <SelectItem value="energy">Energy</SelectItem>
                  <SelectItem value="economic">Economic</SelectItem>
                  <SelectItem value="none">None (single product)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Allocation share (0–1)</label>
              <Input type="number" step="0.01" value={coProductShare} onChange={e => setCoProductShare(e.target.value)} disabled={allocationMethod === 'none'} />
            </div>
          </div>

          {/* Materials */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm">Materials</h3>
              <Button size="sm" variant="ghost" onClick={() => setMaterials([...materials, { id: uid(), factorId: 'steel-virgin', massKg: 0 }])}><Plus className="w-3 h-3 mr-1" /> Add</Button>
            </div>
            <div className="space-y-2">
              {materials.map((m, i) => (
                <div key={m.id} className="grid grid-cols-12 gap-2 items-center">
                  <Select value={m.factorId} onValueChange={v => setMaterials(materials.map(x => x.id === m.id ? { ...x, factorId: v } : x))}>
                    <SelectTrigger className="col-span-7"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PCF_MATERIALS.map(f => <SelectItem key={f.id} value={f.id}>{f.name} ({f.kgCO2ePerKg} kg/kg)</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input type="number" placeholder="Mass (kg)" className="col-span-4" value={m.massKg || ''} onChange={e => setMaterials(materials.map(x => x.id === m.id ? { ...x, massKg: parseFloat(e.target.value) || 0 } : x))} />
                  <Button size="icon" variant="ghost" onClick={() => setMaterials(materials.filter(x => x.id !== m.id))} disabled={materials.length === 1}><Trash2 className="w-3 h-3" /></Button>
                </div>
              ))}
            </div>
          </div>

          {/* Energy */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm">Energy</h3>
              <Button size="sm" variant="ghost" onClick={() => setEnergy([...energy, { id: uid(), factorId: 'grid-in', kwh: 0 }])}><Plus className="w-3 h-3 mr-1" /> Add</Button>
            </div>
            <div className="space-y-2">
              {energy.map(e => (
                <div key={e.id} className="grid grid-cols-12 gap-2 items-center">
                  <Select value={e.factorId} onValueChange={v => setEnergy(energy.map(x => x.id === e.id ? { ...x, factorId: v } : x))}>
                    <SelectTrigger className="col-span-7"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PCF_ENERGY.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input type="number" placeholder="kWh" className="col-span-4" value={e.kwh || ''} onChange={ev => setEnergy(energy.map(x => x.id === e.id ? { ...x, kwh: parseFloat(ev.target.value) || 0 } : x))} />
                  <Button size="icon" variant="ghost" onClick={() => setEnergy(energy.filter(x => x.id !== e.id))}><Trash2 className="w-3 h-3" /></Button>
                </div>
              ))}
            </div>
          </div>

          {/* Transport */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm">Inbound transport</h3>
              <Button size="sm" variant="ghost" onClick={() => setTransport([...transport, { id: uid(), factorId: 'truck-articulated', weightTonnes: 0, distanceKm: 0 }])}><Plus className="w-3 h-3 mr-1" /> Add</Button>
            </div>
            <div className="space-y-2">
              {transport.map(t => (
                <div key={t.id} className="grid grid-cols-12 gap-2 items-center">
                  <Select value={t.factorId} onValueChange={v => setTransport(transport.map(x => x.id === t.id ? { ...x, factorId: v } : x))}>
                    <SelectTrigger className="col-span-5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PCF_TRANSPORT.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input type="number" placeholder="Tonnes" className="col-span-3" value={t.weightTonnes || ''} onChange={e => setTransport(transport.map(x => x.id === t.id ? { ...x, weightTonnes: parseFloat(e.target.value) || 0 } : x))} />
                  <Input type="number" placeholder="km" className="col-span-3" value={t.distanceKm || ''} onChange={e => setTransport(transport.map(x => x.id === t.id ? { ...x, distanceKm: parseFloat(e.target.value) || 0 } : x))} />
                  <Button size="icon" variant="ghost" onClick={() => setTransport(transport.filter(x => x.id !== t.id))}><Trash2 className="w-3 h-3" /></Button>
                </div>
              ))}
            </div>
          </div>

          {/* Processing */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm">Direct process emissions (optional)</h3>
              <Button size="sm" variant="ghost" onClick={() => setProcessing([...processing, { id: uid(), label: '', kgCO2e: 0 }])}><Plus className="w-3 h-3 mr-1" /> Add</Button>
            </div>
            <div className="space-y-2">
              {processing.map(p => (
                <div key={p.id} className="grid grid-cols-12 gap-2 items-center">
                  <Input placeholder="Label" className="col-span-7" value={p.label} onChange={e => setProcessing(processing.map(x => x.id === p.id ? { ...x, label: e.target.value } : x))} />
                  <Input type="number" placeholder="kgCO₂e" className="col-span-4" value={p.kgCO2e || ''} onChange={e => setProcessing(processing.map(x => x.id === p.id ? { ...x, kgCO2e: parseFloat(e.target.value) || 0 } : x))} />
                  <Button size="icon" variant="ghost" onClick={() => setProcessing(processing.filter(x => x.id !== p.id))}><Trash2 className="w-3 h-3" /></Button>
                </div>
              ))}
            </div>
          </div>

          <Button size="lg" onClick={calculate}><CalcIcon className="w-4 h-4 mr-2" /> Calculate footprint</Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid sm:grid-cols-3 gap-4 mb-6">
              <div>
                <p className="text-xs text-muted-foreground">Per functional unit</p>
                <p className="text-2xl font-bold text-foreground">{result.perFunctionalUnit} kgCO₂e</p>
                <p className="text-xs text-muted-foreground">({result.functionalUnit})</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total batch</p>
                <p className="text-2xl font-bold text-foreground">{result.totalKgCO2eBatch.toLocaleString()} kg</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">After allocation</p>
                <p className="text-2xl font-bold text-foreground">{result.allocatedPerUnit} kgCO₂e</p>
              </div>
            </div>

            {pieData.length > 0 && (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v} kgCO₂e`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <SaveRunButton
                calculatorSlug="product-carbon-footprint"
                label={result.productName}
                inputs={{ productName, functionalUnit, unitsPerBatch, systemBoundary, allocationMethod, coProductShare, materials, energy, transport, processing }}
                results={result as never}
                factorSources={result.factorSources}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </CalculatorShell>
  );
};

export default PCFCalculatorPage;
