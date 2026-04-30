import { useState, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { MinimalNav } from "@/components/MinimalNav";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calculator, Search, Globe, Truck, Factory, TrendingDown, Coins, Leaf, Building2, Zap, FileText } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";

interface CalcCard {
  href: string;
  title: string;
  description: string;
  category: 'Compliance' | 'Operations' | 'Finance' | 'Reporting';
  icon: typeof Calculator;
  keywords: string;
  standard?: string;
}

const CALCULATORS: CalcCard[] = [
  { href: '/calculators/product-carbon-footprint', title: 'Product Carbon Footprint', description: 'Cradle-to-gate emissions per product unit. ISO 14067.', category: 'Compliance', icon: Factory, keywords: 'pcf product footprint iso 14067 cradle gate', standard: 'ISO 14067' },
  { href: '/calculators/supplier-emissions-risk', title: 'Supplier Emissions & Risk', description: 'Score every vendor on emissions and risk. GHG Scope 3 Cat 1.', category: 'Compliance', icon: Building2, keywords: 'supplier scope 3 vendor risk eora', standard: 'GHGP Scope 3' },
  { href: '/calculators/energy-transition-savings', title: 'Energy Transition Savings', description: 'Solar / PPA / hybrid ROI, payback, IRR, NPV and CO₂ avoided.', category: 'Finance', icon: Zap, keywords: 'solar roi payback ppa renewable mnre iea', standard: 'MNRE / IEA' },
  { href: '/calculators/logistics-emissions', title: 'Logistics & Freight Emissions', description: 'Road, rail, sea, air emissions across multimodal legs.', category: 'Operations', icon: Truck, keywords: 'logistics freight transport glec iso 14083 multimodal', standard: 'GLEC v3.0' },
  { href: '/calculators/carbon-pricing-impact', title: 'Carbon Pricing Impact', description: 'EU ETS + CBAM cost exposure 2026–2034 with sensitivity.', category: 'Finance', icon: Coins, keywords: 'carbon price ets cbam tax exposure liability', standard: 'EU ETS / CBAM' },
  { href: '/cbam-calculator', title: 'CBAM Cost Estimator', description: 'EU CBAM cost for steel, aluminium, cement, fertilizers.', category: 'Compliance', icon: Globe, keywords: 'cbam eu carbon border adjustment 2026', standard: 'EU 2023/956' },
  { href: '/net-zero', title: 'Net-Zero Goal Engine', description: '5-step journey from baseline to verified net-zero plan.', category: 'Reporting', icon: TrendingDown, keywords: 'net zero baseline reduction roadmap', standard: 'SBTi-aligned' },
  { href: '/industries', title: 'Scope 2 Quick Estimator', description: 'Monthly kWh → tCO₂e using country grid factor.', category: 'Operations', icon: Leaf, keywords: 'scope 2 electricity grid factor estimator', standard: 'IEA 2023' },
  { href: '/verify', title: 'Invoice MRV Verification', description: 'Upload invoices to extract verified emissions.', category: 'Reporting', icon: FileText, keywords: 'invoice ocr mrv verification audit hsn' },
];

interface SavedRun {
  id: string;
  calculator_slug: string;
  label: string | null;
  created_at: string;
}

const CalculatorsHub = () => {
  const { user, isAuthenticated } = useSession();
  const [search, setSearch] = useState('');
  const [savedRuns, setSavedRuns] = useState<SavedRun[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from('calculator_runs')
      .select('id, calculator_slug, label, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => setSavedRuns((data as SavedRun[]) || []));
  }, [user]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return CALCULATORS;
    return CALCULATORS.filter(c =>
      c.title.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.keywords.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q)
    );
  }, [search]);

  const grouped = useMemo(() => {
    const g: Record<string, CalcCard[]> = {};
    for (const c of filtered) (g[c.category] ??= []).push(c);
    return g;
  }, [filtered]);

  const titleOfSlug = (slug: string) => CALCULATORS.find(c => c.href.endsWith(slug))?.title || slug;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Senseible Climate Calculators",
    "itemListElement": CALCULATORS.map((c, i) => ({
      "@type": "ListItem", "position": i + 1, "name": c.title,
      "url": `https://senseible.earth${c.href}`,
    })),
  };

  return (
    <>
      <Helmet>
        <title>Climate Calculators for MSMEs | CBAM, PCF, Solar ROI | Senseible</title>
        <meta name="description" content="Free deterministic climate calculators for MSMEs: CBAM, Product Carbon Footprint, Supplier Risk, Solar ROI, Logistics emissions, Carbon pricing." />
        <meta name="keywords" content="climate calculators, carbon calculator, cbam calculator, pcf calculator, solar roi, logistics emissions, MSME carbon" />
        <link rel="canonical" href="https://senseible.earth/calculators" />
        <meta property="og:title" content="Climate Calculators for MSMEs | Senseible" />
        <meta property="og:description" content="Free deterministic calculators aligned with ISO 14067, GLEC v3.0, GHG Protocol, EU CBAM and IEA grid factors." />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <MinimalNav />
      <main className="min-h-screen bg-background pt-20 pb-16">
        <div className="container max-w-6xl mx-auto px-4 sm:px-6">
          <header className="text-center mb-10">
            <Badge variant="outline" className="mb-3 border-primary/30 text-primary">
              <Calculator className="w-3 h-3 mr-1" /> Free tools
            </Badge>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3 font-display">Climate Calculators</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Deterministic calculators for MSMEs and partners. Aligned with ISO, GLEC, GHG Protocol, EU CBAM and IEA grid factors.
            </p>
          </header>

          <div className="max-w-xl mx-auto mb-10 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search calculators (e.g. CBAM, solar, freight)…"
              className="pl-10"
            />
          </div>

          {Object.entries(grouped).map(([cat, cards]) => (
            <section key={cat} className="mb-10">
              <h2 className="text-xl font-semibold text-foreground mb-4">{cat}</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {cards.map(c => {
                  const Icon = c.icon;
                  return (
                    <Link key={c.href} to={c.href} className="block group">
                      <Card className="h-full transition-all hover:border-primary/50 hover:shadow-md">
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <Icon className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{c.title}</h3>
                              {c.standard && <p className="text-xs text-muted-foreground mt-0.5">{c.standard}</p>}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">{c.description}</p>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}

          {isAuthenticated && savedRuns.length > 0 && (
            <section className="mt-12">
              <h2 className="text-xl font-semibold text-foreground mb-4">Your saved results</h2>
              <Card>
                <CardContent className="pt-6">
                  <ul className="divide-y divide-border">
                    {savedRuns.map(r => (
                      <li key={r.id} className="py-3 flex items-center justify-between text-sm">
                        <div>
                          <p className="font-medium text-foreground">{r.label || titleOfSlug(r.calculator_slug)}</p>
                          <p className="text-xs text-muted-foreground">{titleOfSlug(r.calculator_slug)} · {new Date(r.created_at).toLocaleDateString()}</p>
                        </div>
                        <Link to={`/calculators/${r.calculator_slug}`} className="text-primary hover:underline">Re-run →</Link>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </section>
          )}

          <noscript>
            <h2>All calculators</h2>
            <ul>
              {CALCULATORS.map(c => <li key={c.href}><a href={c.href}>{c.title}</a> — {c.description}</li>)}
            </ul>
          </noscript>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default CalculatorsHub;
