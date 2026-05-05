import { useEffect, useState, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Download, Trash2, ExternalLink, Lock, History as HistoryIcon } from "lucide-react";
import { MinimalNav } from "@/components/MinimalNav";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useSession } from "@/hooks/useSession";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Run {
  id: string;
  calculator_slug: string;
  label: string | null;
  inputs: Record<string, unknown>;
  results: Record<string, unknown>;
  factor_sources: unknown;
  created_at: string;
}

const SLUG_TITLES: Record<string, string> = {
  "product-carbon-footprint": "Product Carbon Footprint",
  "supplier-emissions-risk": "Supplier Emissions & Risk",
  "energy-transition-savings": "Energy Transition Savings",
  "logistics-emissions": "Logistics & Freight Emissions",
  "carbon-pricing-impact": "Carbon Pricing Impact",
};

const flatten = (obj: unknown, prefix = ""): Record<string, string> => {
  const out: Record<string, string> = {};
  if (obj === null || obj === undefined) return out;
  if (typeof obj !== "object") { out[prefix || "value"] = String(obj); return out; }
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => Object.assign(out, flatten(v, `${prefix}[${i}]`)));
    return out;
  }
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object") Object.assign(out, flatten(v, key));
    else out[key] = v === undefined ? "" : String(v);
  }
  return out;
};

const toCsv = (rows: Record<string, string>[]): string => {
  if (!rows.length) return "";
  const headers = Array.from(new Set(rows.flatMap(r => Object.keys(r))));
  const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const lines = [headers.join(",")];
  for (const r of rows) lines.push(headers.map(h => escape(r[h] ?? "")).join(","));
  return lines.join("\n");
};

const download = (filename: string, content: string, mime = "text/csv") => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

const CalculatorHistory = () => {
  const { user, isAuthenticated } = useSession();
  const { isPremium, isLoading: tierLoading } = usePremiumStatus();
  const [runs, setRuns] = useState<Run[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("calculator_runs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setRuns((data as Run[]) || []);
    setLoading(false);
  };

  useEffect(() => { if (user?.id) load(); }, [user?.id]);

  // Realtime sync so autosaves appear instantly
  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase.channel("calculator_runs_history")
      .on("postgres_changes",
        { event: "*", schema: "public", table: "calculator_runs", filter: `user_id=eq.${user.id}` },
        () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return runs;
    return runs.filter(r =>
      (r.label || "").toLowerCase().includes(q) ||
      (SLUG_TITLES[r.calculator_slug] || r.calculator_slug).toLowerCase().includes(q)
    );
  }, [runs, filter]);

  const exportRow = (r: Run) => {
    const rows = [{
      created_at: r.created_at,
      calculator: SLUG_TITLES[r.calculator_slug] || r.calculator_slug,
      label: r.label || "",
      ...flatten(r.inputs, "input"),
      ...flatten(r.results, "result"),
    }];
    download(`${r.calculator_slug}-${r.id.slice(0, 8)}.csv`, toCsv(rows));
  };

  const exportAll = () => {
    if (!filtered.length) return;
    const rows = filtered.map(r => ({
      created_at: r.created_at,
      calculator: SLUG_TITLES[r.calculator_slug] || r.calculator_slug,
      label: r.label || "",
      ...flatten(r.inputs, "input"),
      ...flatten(r.results, "result"),
    }));
    download(`calculator-history-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows));
    toast({ title: "Exported", description: `${rows.length} runs downloaded as CSV.` });
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("calculator_runs").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else setRuns(runs.filter(r => r.id !== id));
  };

  return (
    <>
      <Helmet>
        <title>My Calculator History | Senseible</title>
        <meta name="description" content="View, re-run and export every calculator result you've saved on Senseible." />
        <link rel="canonical" href="https://senseible.earth/calculators/history" />
        <meta name="robots" content="noindex,follow" />
      </Helmet>
      <MinimalNav />
      <main className="min-h-screen bg-background pt-20 pb-16">
        <div className="container max-w-5xl mx-auto px-4 sm:px-6">
          <header className="mb-8 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2"><HistoryIcon className="w-6 h-6 text-primary" /> Calculator history</h1>
              <p className="text-muted-foreground mt-1">Every saved input and result, synced in real time.</p>
            </div>
            <div className="flex gap-2">
              <Link to="/calculators"><Button variant="outline" size="sm">All calculators</Button></Link>
              <Button size="sm" onClick={exportAll} disabled={!filtered.length}><Download className="w-4 h-4 mr-1" /> Export all (CSV)</Button>
            </div>
          </header>

          {!isAuthenticated && (
            <Card><CardContent className="pt-6 text-center">
              <Lock className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="mb-4">Sign in to view and export your saved calculator results.</p>
              <Link to="/auth"><Button>Sign in</Button></Link>
            </CardContent></Card>
          )}

          {isAuthenticated && !tierLoading && !isPremium && (
            <Card className="mb-4 border-primary/30 bg-primary/5">
              <CardContent className="pt-6">
                <p className="text-sm">
                  <strong>Free plan:</strong> manual saves are stored, but real-time autosave and unlimited history come with{" "}
                  <Link to="/pricing" className="text-primary underline">Essential and above</Link>.
                </p>
              </CardContent>
            </Card>
          )}

          {isAuthenticated && (
            <>
              <Input
                value={filter}
                onChange={e => setFilter(e.target.value)}
                placeholder="Filter by name or calculator…"
                className="mb-4 max-w-md"
              />
              <Card>
                <CardContent className="pt-6">
                  {loading ? (
                    <p className="text-sm text-muted-foreground">Loading…</p>
                  ) : filtered.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No saved results yet. Run a calculator and click <em>Save result</em>.</p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {filtered.map(r => {
                        const isLive = (r.label || "").startsWith("__live__:");
                        return (
                          <li key={r.id} className="py-3 flex items-center justify-between gap-3 flex-wrap">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium text-foreground truncate">
                                  {isLive ? "Working draft" : (r.label || SLUG_TITLES[r.calculator_slug] || r.calculator_slug)}
                                </p>
                                {isLive && <Badge variant="outline" className="text-xs">Live</Badge>}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {SLUG_TITLES[r.calculator_slug] || r.calculator_slug} · {new Date(r.created_at).toLocaleString()}
                              </p>
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <Link to={`/calculators/${r.calculator_slug}`} className="inline-flex">
                                <Button size="sm" variant="ghost"><ExternalLink className="w-4 h-4 mr-1" /> Open</Button>
                              </Link>
                              <Button size="sm" variant="ghost" onClick={() => exportRow(r)}><Download className="w-4 h-4" /></Button>
                              <Button size="sm" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
};

export default CalculatorHistory;
