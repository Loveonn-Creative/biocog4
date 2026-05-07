import { useEffect, useState, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { Download, Trash2, ExternalLink, Lock, History as HistoryIcon, RotateCw, FileJson, FileSpreadsheet } from "lucide-react";
import { MinimalNav } from "@/components/MinimalNav";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSession } from "@/hooks/useSession";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { stashRerun } from "@/hooks/useCalculatorRerun";

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

const flatRowFor = (r: Run) => ({
  created_at: r.created_at,
  calculator: SLUG_TITLES[r.calculator_slug] || r.calculator_slug,
  label: r.label || "",
  ...flatten(r.inputs, "input"),
  ...flatten(r.results, "result"),
});

const CalculatorHistory = () => {
  const { user, isAuthenticated } = useSession();
  const { isPremium, isLoading: tierLoading } = usePremiumStatus();
  const navigate = useNavigate();
  const [runs, setRuns] = useState<Run[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmId, setConfirmId] = useState<string | null>(null);

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

  // Realtime sync — apply granular updates so UI never goes stale
  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase.channel("calculator_runs_history")
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "calculator_runs", filter: `user_id=eq.${user.id}` },
        (p) => setRuns(curr => [p.new as Run, ...curr.filter(r => r.id !== (p.new as Run).id)]))
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "calculator_runs", filter: `user_id=eq.${user.id}` },
        (p) => setRuns(curr => curr.map(r => r.id === (p.new as Run).id ? (p.new as Run) : r)))
      .on("postgres_changes",
        { event: "DELETE", schema: "public", table: "calculator_runs", filter: `user_id=eq.${user.id}` },
        (p) => setRuns(curr => curr.filter(r => r.id !== (p.old as Run).id)))
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

  const selectedRows = useMemo(() => filtered.filter(r => selected.has(r.id)), [filtered, selected]);
  const toggle = (id: string) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected(s => s.size === filtered.length ? new Set() : new Set(filtered.map(r => r.id)));

  const exportCsv = (rows: Run[], name: string) => {
    if (!rows.length) return;
    download(`${name}-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows.map(flatRowFor)));
    toast({ title: "Exported", description: `${rows.length} run(s) downloaded as CSV.` });
  };

  const exportJson = (rows: Run[], name: string) => {
    if (!rows.length) return;
    const payload = rows.map(r => ({
      id: r.id,
      calculator: SLUG_TITLES[r.calculator_slug] || r.calculator_slug,
      slug: r.calculator_slug,
      label: r.label,
      created_at: r.created_at,
      inputs: r.inputs,
      results: r.results,
      factor_sources: r.factor_sources,
    }));
    download(`${name}-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(payload, null, 2), "application/json");
    toast({ title: "Exported", description: `${rows.length} run(s) downloaded as JSON.` });
  };

  const remove = async (id: string) => {
    // Optimistic update so UI never shows stale state
    const prev = runs;
    setRuns(curr => curr.filter(r => r.id !== id));
    setSelected(s => { const n = new Set(s); n.delete(id); return n; });
    const { error } = await supabase.from("calculator_runs").delete().eq("id", id);
    if (error) {
      setRuns(prev);
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Deleted", description: "Run removed from your history." });
    }
    setConfirmId(null);
  };

  const rerun = (r: Run) => {
    stashRerun(r.calculator_slug, r.inputs);
    navigate(`/calculators/${r.calculator_slug}`);
  };

  const exportTargets = selectedRows.length ? selectedRows : filtered;
  const exportName = selectedRows.length ? `selected-${selectedRows.length}-runs` : "calculator-history";

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
            <div className="flex gap-2 flex-wrap">
              <Link to="/calculators"><Button variant="outline" size="sm">All calculators</Button></Link>
              <Button size="sm" variant="outline" onClick={() => exportCsv(exportTargets, exportName)} disabled={!exportTargets.length}>
                <FileSpreadsheet className="w-4 h-4 mr-1" /> {selectedRows.length ? `Export ${selectedRows.length} (CSV)` : "Export all (CSV)"}
              </Button>
              <Button size="sm" onClick={() => exportJson(exportTargets, exportName)} disabled={!exportTargets.length}>
                <FileJson className="w-4 h-4 mr-1" /> {selectedRows.length ? `Export ${selectedRows.length} (JSON)` : "Export all (JSON)"}
              </Button>
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
              <div className="mb-4 flex items-center gap-3 flex-wrap">
                <Input
                  value={filter}
                  onChange={e => setFilter(e.target.value)}
                  placeholder="Filter by name or calculator…"
                  className="max-w-md"
                />
                {filtered.length > 0 && (
                  <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
                    <Checkbox
                      checked={selected.size === filtered.length && filtered.length > 0}
                      onCheckedChange={toggleAll}
                    />
                    {selected.size === filtered.length ? "Clear selection" : "Select all"}
                  </label>
                )}
                {selected.size > 0 && (
                  <Badge variant="secondary">{selected.size} selected</Badge>
                )}
              </div>

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
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              <Checkbox
                                checked={selected.has(r.id)}
                                onCheckedChange={() => toggle(r.id)}
                                className="mt-1"
                                aria-label={`Select ${r.label || r.calculator_slug}`}
                              />
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
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Button size="sm" variant="ghost" onClick={() => rerun(r)} title="Re-run this calculation">
                                <RotateCw className="w-4 h-4 mr-1" /> Re-run
                              </Button>
                              <Link to={`/calculators/${r.calculator_slug}`} className="inline-flex">
                                <Button size="sm" variant="ghost" title="Open calculator"><ExternalLink className="w-4 h-4" /></Button>
                              </Link>
                              <Button size="sm" variant="ghost" onClick={() => exportCsv([r], r.calculator_slug)} title="Export this run as CSV">
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setConfirmId(r.id)} title="Delete">
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
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

      <AlertDialog open={!!confirmId} onOpenChange={(o) => !o && setConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this saved run?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the inputs and results from your history. You can't undo this action.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmId && remove(confirmId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Footer />
    </>
  );
};

export default CalculatorHistory;
