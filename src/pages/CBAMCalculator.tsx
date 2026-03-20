import { useState, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { MinimalNav } from "@/components/MinimalNav";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calculator, TrendingUp, Plus, X, Download, AlertTriangle, Info, BarChart3 } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useSession } from "@/hooks/useSession";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import {
  CBAM_SECTORS,
  CARBON_PRICES,
  DEFAULT_EU_ETS_PRICE,
  calculateCBAM,
  formatEuro,
  type CBAMInput,
  type CBAMResult,
} from "@/lib/cbamEngine";

interface ScenarioState {
  id: string;
  label: string;
  sectorId: string;
  productionRouteId: string;
  countryCode: string;
  supplierName: string;
  tonnage: string;
  actualIntensity: string;
  carbonPrice: string;
  euEtsPrice: string;
  result: CBAMResult | null;
}

const defaultScenario = (id: string, label: string): ScenarioState => ({
  id,
  label,
  sectorId: 'steel',
  productionRouteId: 'bf-bof',
  countryCode: 'IN',
  supplierName: '',
  tonnage: '1000',
  actualIntensity: '',
  carbonPrice: '',
  euEtsPrice: String(DEFAULT_EU_ETS_PRICE),
  result: null,
});

const CBAMCalculator = () => {
  const { isAuthenticated } = useSession();
  const navigate = useNavigate();
  const [scenarios, setScenarios] = useState<ScenarioState[]>([defaultScenario('s1', 'Scenario A')]);
  const [activeScenario, setActiveScenario] = useState('s1');

  const currentScenario = scenarios.find(s => s.id === activeScenario) || scenarios[0];
  const selectedSector = CBAM_SECTORS.find(s => s.id === currentScenario.sectorId);

  const updateScenario = (id: string, updates: Partial<ScenarioState>) => {
    setScenarios(prev => prev.map(s => s.id === id ? { ...s, ...updates, result: null } : s));
  };

  const addScenario = () => {
    if (scenarios.length >= 3) return;
    const labels = ['Scenario A', 'Scenario B', 'Scenario C'];
    const newId = `s${Date.now()}`;
    setScenarios(prev => [...prev, defaultScenario(newId, labels[prev.length])]);
    setActiveScenario(newId);
  };

  const removeScenario = (id: string) => {
    if (scenarios.length <= 1) return;
    setScenarios(prev => prev.filter(s => s.id !== id));
    if (activeScenario === id) setActiveScenario(scenarios[0].id);
  };

  const calculate = () => {
    const updated = scenarios.map(s => {
      const tonnage = parseFloat(s.tonnage);
      if (!tonnage || tonnage <= 0) return s;

      const input: CBAMInput = {
        sectorId: s.sectorId,
        productionRouteId: s.productionRouteId,
        countryCode: s.countryCode,
        supplierName: s.supplierName,
        tonnage,
        actualEmissionsIntensity: s.actualIntensity ? parseFloat(s.actualIntensity) : null,
        carbonPricePaid: s.carbonPrice ? parseFloat(s.carbonPrice) : null,
        euEtsPrice: parseFloat(s.euEtsPrice) || DEFAULT_EU_ETS_PRICE,
      };

      try {
        return { ...s, result: calculateCBAM(input) };
      } catch {
        return s;
      }
    });
    setScenarios(updated);
  };

  const hasResults = scenarios.some(s => s.result);

  // Chart data for comparison
  const comparisonChartData = useMemo(() => {
    if (!hasResults) return [];
    const years = [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034];
    return years.map(year => {
      const point: Record<string, number | string> = { year: String(year) };
      scenarios.forEach(s => {
        if (s.result) {
          const yr = s.result.yearlyResults.find(y => y.year === year);
          point[s.label] = yr?.netCbamCost ?? 0;
        }
      });
      return point;
    });
  }, [scenarios, hasResults]);

  const handleExport = () => {
    if (!isAuthenticated) {
      toast({ title: "Sign in to export", description: "Create an account to save and export CBAM estimates.", variant: "destructive" });
      navigate('/auth');
      return;
    }
    // CSV export
    const rows = [['Year', 'Phase-in %', 'Total Emissions (tCO2)', 'Free Allowances', 'Net Liable', 'Gross Cost (€)', 'Credit (€)', 'Net CBAM Cost (€)', 'Cost/Tonne (€)']];
    scenarios.forEach(s => {
      if (!s.result) return;
      rows.push([`--- ${s.label}: ${s.result.sectorName} (${s.result.routeName}) ---`]);
      s.result.yearlyResults.forEach(yr => {
        rows.push([String(yr.year), `${(yr.phaseInPct * 100).toFixed(1)}%`, String(yr.totalEmissions), String(yr.freeAllowances), String(yr.netLiableEmissions), String(yr.grossCbamCost), String(yr.carbonPriceCredit), String(yr.netCbamCost), String(yr.costPerTonne)]);
      });
    });
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cbam-estimate.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const colors = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--warning))'];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "CBAM Cost Estimator",
    "description": "Calculate EU Carbon Border Adjustment Mechanism costs for imports from India. Free CBAM calculator for steel, aluminium, cement, fertilizers.",
    "url": "https://senseible.earth/cbam-calculator",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "offers": { "@type": "Offer", "price": "0", "priceCurrency": "EUR" },
    "provider": { "@type": "Organization", "name": "Senseible", "url": "https://senseible.earth" },
  };

  return (
    <>
      <Helmet>
        <title>CBAM Calculator — EU Carbon Border Tax Cost Estimator | Senseible</title>
        <meta name="description" content="Free CBAM cost estimator for EU importers. Calculate carbon border tax exposure for steel, aluminium, cement, fertilizers from India. 2026-2034 projections with scenario modeling." />
        <meta name="keywords" content="CBAM calculator, CBAM cost estimator, EU carbon border tax, CBAM India, carbon border adjustment mechanism calculator" />
        <link rel="canonical" href="https://senseible.earth/cbam-calculator" />
        <meta property="og:title" content="CBAM Calculator — EU Carbon Border Tax Cost Estimator" />
        <meta property="og:description" content="Calculate your CBAM cost exposure from 2026-2034. Free tool for EU importers and Indian producers." />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>
      <MinimalNav />
      <main className="min-h-screen bg-background pt-20 pb-16">
        <div className="container max-w-6xl mx-auto px-4 sm:px-6">
          {/* Hero */}
          <div className="text-center mb-10">
            <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
              <Calculator className="w-3 h-3 mr-1" /> Free Tool
            </Badge>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3 font-display">
              CBAM Cost Estimator
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Calculate your EU Carbon Border Adjustment Mechanism exposure from 2026–2034.
              Deterministic calculations based on EU Regulation 2023/956.
            </p>
          </div>

          {/* Scenario Tabs */}
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            {scenarios.map((s, i) => (
              <Button
                key={s.id}
                variant={activeScenario === s.id ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveScenario(s.id)}
                className="relative"
              >
                {s.label}
                {scenarios.length > 1 && (
                  <X className="w-3 h-3 ml-1 opacity-60 hover:opacity-100" onClick={(e) => { e.stopPropagation(); removeScenario(s.id); }} />
                )}
              </Button>
            ))}
            {scenarios.length < 3 && (
              <Button variant="ghost" size="sm" onClick={addScenario}>
                <Plus className="w-3 h-3 mr-1" /> Add Scenario
              </Button>
            )}
          </div>

          {/* Input Form */}
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Sector */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">CBAM Sector</label>
                  <Select value={currentScenario.sectorId} onValueChange={(v) => {
                    const sector = CBAM_SECTORS.find(s => s.id === v);
                    updateScenario(currentScenario.id, { sectorId: v, productionRouteId: sector?.productionRoutes[0]?.id || '' });
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CBAM_SECTORS.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Production Route */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Production Route</label>
                  <Select value={currentScenario.productionRouteId} onValueChange={(v) => updateScenario(currentScenario.id, { productionRouteId: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {selectedSector?.productionRoutes.map(r => <SelectItem key={r.id} value={r.id}>{r.name} ({r.defaultIntensity} tCO₂/t)</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Country */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Country of Origin</label>
                  <Select value={currentScenario.countryCode} onValueChange={(v) => updateScenario(currentScenario.id, { countryCode: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(CARBON_PRICES).map(([code, info]) => (
                        <SelectItem key={code} value={code}>{info.name} {info.price > 0 ? `(€${info.price}/tCO₂)` : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Supplier */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Supplier Name <span className="text-muted-foreground text-xs">(optional)</span></label>
                  <Input placeholder="e.g. JSW Steel" value={currentScenario.supplierName} onChange={(e) => updateScenario(currentScenario.id, { supplierName: e.target.value })} />
                </div>

                {/* Tonnage */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Annual Import Tonnage</label>
                  <Input type="number" placeholder="1000" value={currentScenario.tonnage} onChange={(e) => updateScenario(currentScenario.id, { tonnage: e.target.value })} />
                </div>

                {/* Actual Intensity */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Actual Emissions Intensity <span className="text-muted-foreground text-xs">(tCO₂/t, optional)</span></label>
                  <Input type="number" step="0.01" placeholder={`Default: ${selectedSector?.productionRoutes.find(r => r.id === currentScenario.productionRouteId)?.defaultIntensity}`} value={currentScenario.actualIntensity} onChange={(e) => updateScenario(currentScenario.id, { actualIntensity: e.target.value })} />
                </div>

                {/* Carbon Price */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Carbon Price Paid <span className="text-muted-foreground text-xs">(€/tCO₂, optional)</span></label>
                  <Input type="number" step="0.1" placeholder={`Default: €${CARBON_PRICES[currentScenario.countryCode]?.price ?? 0}`} value={currentScenario.carbonPrice} onChange={(e) => updateScenario(currentScenario.id, { carbonPrice: e.target.value })} />
                </div>

                {/* EU ETS Price */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">EU ETS Price <span className="text-muted-foreground text-xs">(€/tCO₂)</span></label>
                  <Input type="number" value={currentScenario.euEtsPrice} onChange={(e) => updateScenario(currentScenario.id, { euEtsPrice: e.target.value })} />
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <Button onClick={calculate} size="lg">
                  <Calculator className="w-4 h-4 mr-2" /> Calculate CBAM Cost
                </Button>
                {hasResults && (
                  <Button variant="outline" size="lg" onClick={handleExport}>
                    <Download className="w-4 h-4 mr-2" /> Export CSV
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          {hasResults && (
            <div className="space-y-8">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {scenarios.filter(s => s.result).map((s, i) => (
                  <Card key={s.id} className="border-l-4" style={{ borderLeftColor: colors[i] }}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-muted-foreground">{s.label}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-foreground">{formatEuro(s.result!.totalCost9Year)}</p>
                      <p className="text-xs text-muted-foreground">9-year total CBAM cost</p>
                      <Separator className="my-2" />
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">2034 cost/tonne</span>
                        <span className="font-medium">{formatEuro(s.result!.yearlyResults[8].costPerTonne)}/t</span>
                      </div>
                      <div className="flex justify-between text-xs mt-1">
                        <span className="text-muted-foreground">Intensity</span>
                        <span className="font-medium">{s.result!.emissionsIntensityUsed} tCO₂/t {s.result!.isUsingDefault && <span className="text-warning">(default)</span>}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Projection Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    CBAM Cost Projection (2026–2034)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={comparisonChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                      <YAxis tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v: number) => formatEuro(v)} />
                      <Legend />
                      {scenarios.filter(s => s.result).map((s, i) => (
                        <Line key={s.id} type="monotone" dataKey={s.label} stroke={colors[i]} strokeWidth={2} dot={{ r: 4 }} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Default vs Actual */}
              {scenarios.filter(s => s.result && !s.result.isUsingDefault).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <BarChart3 className="w-5 h-5 text-accent" />
                      Default vs Actual Emissions Intensity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={scenarios.filter(s => s.result).map(s => ({
                        name: s.label,
                        'EU Default': selectedSector?.defaultIntensity ?? 0,
                        'Actual': s.result!.emissionsIntensityUsed,
                        'EU Benchmark': s.result!.euBenchmark,
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" />
                        <YAxis label={{ value: 'tCO₂/t', angle: -90, position: 'insideLeft' }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="EU Default" fill="hsl(var(--muted-foreground))" />
                        <Bar dataKey="Actual" fill="hsl(var(--primary))" />
                        <Bar dataKey="EU Benchmark" fill="hsl(var(--accent))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Detailed Table */}
              {scenarios.filter(s => s.result).map((s) => (
                <Card key={s.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{s.label}: {s.result!.sectorName} — {s.result!.routeName}</CardTitle>
                    {s.result!.isUsingDefault && (
                      <div className="flex items-center gap-1 text-xs text-warning">
                        <AlertTriangle className="w-3 h-3" /> Using EU default emission intensity. Provide actual data for accurate estimates.
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left">
                          <th className="pb-2 font-medium text-muted-foreground">Year</th>
                          <th className="pb-2 font-medium text-muted-foreground">Phase-in</th>
                          <th className="pb-2 font-medium text-muted-foreground text-right">Emissions</th>
                          <th className="pb-2 font-medium text-muted-foreground text-right">Free Allow.</th>
                          <th className="pb-2 font-medium text-muted-foreground text-right">Net Liable</th>
                          <th className="pb-2 font-medium text-muted-foreground text-right">Net Cost</th>
                          <th className="pb-2 font-medium text-muted-foreground text-right">€/tonne</th>
                        </tr>
                      </thead>
                      <tbody>
                        {s.result!.yearlyResults.map(yr => (
                          <tr key={yr.year} className="border-b border-border/50">
                            <td className="py-2 font-medium">{yr.year}</td>
                            <td className="py-2">{(yr.phaseInPct * 100).toFixed(1)}%</td>
                            <td className="py-2 text-right">{yr.totalEmissions.toLocaleString()}</td>
                            <td className="py-2 text-right">{yr.freeAllowances.toLocaleString()}</td>
                            <td className="py-2 text-right">{yr.netLiableEmissions.toLocaleString()}</td>
                            <td className="py-2 text-right font-medium">{formatEuro(yr.netCbamCost)}</td>
                            <td className="py-2 text-right">{formatEuro(yr.costPerTonne)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              ))}

              {/* Methodology Note */}
              <Card className="bg-muted/30">
                <CardContent className="pt-6">
                  <div className="flex gap-2">
                    <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p><strong>Methodology:</strong> Calculations based on EU CBAM Regulation (EU) 2023/956 and Implementing Regulation (EU) 2023/1773. Phase-in follows the legislated schedule from transitional period through full implementation.</p>
                      <p><strong>Disclaimer:</strong> This is an estimate for planning purposes. Actual CBAM costs depend on EU ETS certificate prices at the time of purchase, verified emissions data, and applicable carbon price deductions. Consult qualified advisors for compliance decisions.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* FAQ Section for SEO */}
          {!hasResults && (
            <div className="mt-16 max-w-3xl mx-auto">
              <h2 className="text-xl font-semibold text-foreground mb-6">Frequently Asked Questions</h2>
              <div className="space-y-6">
                {[
                  { q: 'What is CBAM?', a: 'The Carbon Border Adjustment Mechanism (CBAM) is the EU\'s carbon tariff on imports of carbon-intensive goods — steel, aluminium, cement, fertilizers, electricity, and hydrogen. It ensures imported goods face the same carbon price as EU-produced goods.' },
                  { q: 'When does CBAM start?', a: 'The CBAM transitional period began in October 2023 with reporting-only requirements. Financial obligations start in 2026 at 2.5% and scale to 100% by 2034 as free EU ETS allowances phase out.' },
                  { q: 'How is CBAM cost calculated?', a: 'CBAM cost = (Actual embedded emissions − Free allowances) × EU ETS price × Phase-in percentage − Carbon price credit for any carbon tax paid in the country of origin.' },
                  { q: 'Does India have a carbon price?', a: 'India does not yet have an explicit carbon price. The Indian Carbon Market (ICM) is under development. Currently, Indian exporters cannot claim carbon price deductions under CBAM.' },
                ].map((faq, i) => (
                  <div key={i}>
                    <h3 className="font-medium text-foreground mb-1">{faq.q}</h3>
                    <p className="text-sm text-muted-foreground">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
};

export default CBAMCalculator;
