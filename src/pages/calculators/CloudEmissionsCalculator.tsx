import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Calculator as CalcIcon, Server } from "lucide-react";
import { CalculatorShell } from "@/components/calculators/CalculatorShell";
import { SaveRunButton } from "@/components/calculators/SaveRunButton";
import { MethodologyPanel } from "@/components/calculators/MethodologyPanel";
import { useCalculatorAutosave } from "@/hooks/useCalculatorAutosave";
import { useCalculatorRerun } from "@/hooks/useCalculatorRerun";
import { getCountryList } from "@/lib/countryConfig";
import {
  PROVIDERS, calculateCloudEmissions, hasUsage,
  type CloudWorkload, type CloudEmissionsResult, type CloudProvider, type StorageType,
} from "@/lib/calculators/cloudEmissionsEngine";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { analyticsEvents } from "@/lib/analytics";

const uid = () => Math.random().toString(36).slice(2, 9);
const newWorkload = (): CloudWorkload => ({
  id: uid(),
  provider: 'aws',
  regionCountry: 'IN',
  vcpuHours: 0,
  memoryGbHours: 0,
  storageTb: 0,
  storageType: 'ssd',
  storageHours: 730,
  networkGb: 0,
});

const countries = getCountryList();

const CloudEmissionsCalculator = () => {
  const [workloads, setWorkloads] = useState<CloudWorkload[]>([newWorkload()]);
  const [result, setResult] = useState<CloudEmissionsResult | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);

  const update = (id: string, patch: Partial<CloudWorkload>) =>
    setWorkloads(ws => ws.map(w => (w.id === id ? { ...w, ...patch } : w)));

  const usable = workloads.filter(hasUsage);

  const calculate = () => {
    analyticsEvents.calculatorRunStart("cloud-data-centre-emissions");
    if (usable.length === 0) {
      setResult(null);
      setBlocked("Each workload needs at least one usage quantity — vCPU-hours, memory GB-hours, storage, or network transfer. Without a measured quantity there is no energy to convert, and no emissions figure can be produced.");
      return;
    }
    setBlocked(null);
    setResult(calculateCloudEmissions(usable));
  };

  const num = (v: string) => parseFloat(v) || 0;
  const chartData = result ? Object.entries(result.byRegion).map(([name, value]) => ({ name, value })) : [];

  useCalculatorAutosave({
    calculatorSlug: "cloud-data-centre-emissions",
    inputs: { workloads },
    results: result,
    factorSources: result?.factorSources,
  });

  useCalculatorRerun("cloud-data-centre-emissions", (i) => {
    if (Array.isArray(i.workloads)) setWorkloads(i.workloads as CloudWorkload[]);
  });

  return (
    <CalculatorShell
      slug="cloud-data-centre-emissions"
      title="Cloud & Data Centre Emissions Calculator | GHG Protocol Scope 2"
      description="Calculate server, cloud and data-centre emissions by region. Location-based and market-based figures using published PUE and grid factors."
      keywords="cloud emissions calculator, data centre carbon, server emissions, scope 2 cloud, PUE, AWS Azure GCP carbon footprint"
      h1="Cloud & Data Centre Emissions Calculator"
      intro="Convert real cloud and server usage into energy and emissions, region by region. Location-based and market-based results are reported separately, as GHG Protocol Scope 2 requires."
      howToSteps={[
        'Add one line per workload, account or data centre.',
        'Pick the provider (or on-premise / colocation) and the country the region physically sits in.',
        'Enter usage from your billing or monitoring export: vCPU-hours, memory GB-hours, storage TB and hours, network GB.',
        'Set average CPU utilisation if you know it — otherwise 50% is assumed and stated.',
        'Enter a contractual renewable share only if it is backed by RECs or a PPA; that produces the market-based figure.',
        'Calculate to see kWh, location-based and market-based kgCO₂e, and the split by region and provider.',
      ]}
      faqs={[
        { q: 'Which scope do cloud emissions belong to?', a: 'Owned or colocated servers you pay the power for are Scope 2. Public cloud purchased as a service is Scope 3 Category 1 for your organisation, though the same energy calculation underlies both. This calculator reports the energy and the emissions; the scope placement depends on your operational boundary.' },
        { q: 'Why are location-based and market-based different?', a: 'Location-based uses the physical grid factor of the hosting region. Market-based reflects contractual instruments you hold (RECs, PPAs). GHG Protocol requires both to be disclosed where market instruments are claimed.' },
        { q: 'Why does the calculator not apply my provider\'s 100% renewable claim?', a: 'A provider\'s corporate renewable claim is not a contractual instrument held by your organisation. It is shown as reference information only and never applied to your figures automatically.' },
        { q: 'Are hardware manufacturing emissions included?', a: 'No. Embodied emissions of servers and storage are out of scope for this calculation and are stated as an exclusion in the results.' },
        { q: 'Where do the energy coefficients come from?', a: 'Cloud Carbon Footprint published coefficients for vCPU, memory, storage and network, multiplied by operator-published PUE and the IEA 2023 grid factor of the hosting country.' },
      ]}
      factorSources={['Cloud Carbon Footprint coefficients', 'Operator-published PUE (2023)', 'IEA 2023 grid factors', 'GHG Protocol Scope 2 Guidance']}
      related={[
        { href: '/calculators/energy-transition-savings', label: 'Energy Transition Savings →' },
        { href: '/calculators/product-carbon-footprint', label: 'Product Carbon Footprint →' },
      ]}
    >
      <Card className="mb-6">
        <CardContent className="pt-6 space-y-3">
          {workloads.map(w => (
            <div key={w.id} className="border border-border rounded-lg p-3 grid grid-cols-12 gap-2 items-end">
              <div className="col-span-12 sm:col-span-3">
                <label className="text-xs text-muted-foreground">Label</label>
                <Input placeholder="e.g. Production API — Mumbai" value={w.label || ''} onChange={e => update(w.id, { label: e.target.value })} />
              </div>
              <div className="col-span-6 sm:col-span-3">
                <label className="text-xs text-muted-foreground">Provider</label>
                <Select value={w.provider} onValueChange={v => update(w.id, { provider: v as CloudProvider })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-6 sm:col-span-3">
                <label className="text-xs text-muted-foreground">Region country</label>
                <Select value={w.regionCountry} onValueChange={v => update(w.id, { regionCountry: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {countries.map(c => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-6 sm:col-span-3">
                <label className="text-xs text-muted-foreground">CPU utilisation (%)</label>
                <Input type="number" min="0" max="100" placeholder="50 assumed"
                  value={w.utilisation === undefined ? '' : Math.round(w.utilisation * 100)}
                  onChange={e => update(w.id, { utilisation: e.target.value === '' ? undefined : num(e.target.value) / 100 })} />
              </div>

              <div className="col-span-6 sm:col-span-2">
                <label className="text-xs text-muted-foreground">vCPU-hours</label>
                <Input type="number" value={w.vcpuHours || ''} onChange={e => update(w.id, { vcpuHours: num(e.target.value) })} />
              </div>
              <div className="col-span-6 sm:col-span-2">
                <label className="text-xs text-muted-foreground">Memory GB-hours</label>
                <Input type="number" value={w.memoryGbHours || ''} onChange={e => update(w.id, { memoryGbHours: num(e.target.value) })} />
              </div>
              <div className="col-span-4 sm:col-span-2">
                <label className="text-xs text-muted-foreground">Storage (TB)</label>
                <Input type="number" step="0.1" value={w.storageTb || ''} onChange={e => update(w.id, { storageTb: num(e.target.value) })} />
              </div>
              <div className="col-span-4 sm:col-span-2">
                <label className="text-xs text-muted-foreground">Storage type</label>
                <Select value={w.storageType} onValueChange={v => update(w.id, { storageType: v as StorageType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ssd">SSD</SelectItem>
                    <SelectItem value="hdd">HDD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-4 sm:col-span-2">
                <label className="text-xs text-muted-foreground">Storage hours</label>
                <Input type="number" value={w.storageHours || ''} onChange={e => update(w.id, { storageHours: num(e.target.value) })} />
              </div>
              <div className="col-span-6 sm:col-span-2">
                <label className="text-xs text-muted-foreground">Network (GB)</label>
                <Input type="number" value={w.networkGb || ''} onChange={e => update(w.id, { networkGb: num(e.target.value) })} />
              </div>
              <div className="col-span-6 sm:col-span-2">
                <label className="text-xs text-muted-foreground">Renewable share (%)</label>
                <Input type="number" min="0" max="100" placeholder="contractual only"
                  value={w.renewableShare === undefined ? '' : Math.round(w.renewableShare * 100)}
                  onChange={e => update(w.id, { renewableShare: e.target.value === '' ? undefined : num(e.target.value) / 100 })} />
              </div>
              <div className="col-span-12 sm:col-span-2 flex justify-end">
                {workloads.length > 1 && (
                  <Button variant="ghost" size="icon" onClick={() => setWorkloads(ws => ws.filter(x => x.id !== w.id))}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}

          <div className="flex flex-wrap gap-2 pt-2">
            <Button variant="outline" onClick={() => setWorkloads(ws => [...ws, newWorkload()])}>
              <Plus className="w-4 h-4 mr-1" /> Add workload
            </Button>
            <Button onClick={calculate}>
              <CalcIcon className="w-4 h-4 mr-1" /> Calculate
            </Button>
          </div>
        </CardContent>
      </Card>

      {blocked && (
        <Card className="mb-6 border-amber-500/40">
          <CardContent className="pt-6 text-sm text-muted-foreground">{blocked}</CardContent>
        </Card>
      )}

      {result && (
        <>
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div>
                  <p className="text-xs text-muted-foreground">Energy</p>
                  <p className="text-2xl font-semibold">{result.totalKwh.toLocaleString()} kWh</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Location-based</p>
                  <p className="text-2xl font-semibold">{(result.locationBasedKgCO2e / 1000).toFixed(3)} tCO₂e</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Market-based</p>
                  <p className="text-2xl font-semibold">
                    {result.marketBasedKgCO2e === null
                      ? <span className="text-base text-muted-foreground">Not reported — no contractual instruments entered</span>
                      : `${(result.marketBasedKgCO2e / 1000).toFixed(3)} tCO₂e`}
                  </p>
                </div>
              </div>

              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="name" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip formatter={(v: number) => `${v.toLocaleString()} kgCO₂e`} />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground border-b border-border">
                      <th className="py-2 pr-4">Workload</th>
                      <th className="py-2 pr-4">Region</th>
                      <th className="py-2 pr-4">PUE</th>
                      <th className="py-2 pr-4">Grid factor</th>
                      <th className="py-2 pr-4">kWh</th>
                      <th className="py-2 pr-4">Location kgCO₂e</th>
                      <th className="py-2">Market kgCO₂e</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.workloads.map(w => (
                      <tr key={w.id} className="border-b border-border/50">
                        <td className="py-2 pr-4">
                          <span className="flex items-center gap-1.5"><Server className="w-3.5 h-3.5 text-muted-foreground" />{w.label}</span>
                        </td>
                        <td className="py-2 pr-4">{w.regionName}</td>
                        <td className="py-2 pr-4">{w.pue}</td>
                        <td className="py-2 pr-4">{w.gridFactor} kg/kWh</td>
                        <td className="py-2 pr-4">{w.kwh.toLocaleString()}</td>
                        <td className="py-2 pr-4">{w.locationBasedKgCO2e.toLocaleString()}</td>
                        <td className="py-2">{w.marketBasedKgCO2e === null ? '—' : w.marketBasedKgCO2e.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6">
                <p className="text-xs font-medium mb-1">Assumptions and exclusions</p>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                  {result.assumptions.map(a => <li key={a}>{a}</li>)}
                </ul>
              </div>

              <div className="mt-4">
                <SaveRunButton
                  calculatorSlug="cloud-data-centre-emissions"
                  inputs={{ workloads }}
                  results={result as unknown as Record<string, unknown>}
                  factorSources={result.factorSources}
                />
              </div>
            </CardContent>
          </Card>

          <MethodologyPanel
            methodologyVersion={result.methodologyVersion}
            factorSources={result.factorSources}
            issues={result.assumptions}
          />
        </>
      )}
    </CalculatorShell>
  );
};

export default CloudEmissionsCalculator;
