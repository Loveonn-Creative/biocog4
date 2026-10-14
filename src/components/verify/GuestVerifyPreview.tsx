import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CheckCircle, Info, Loader2, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { getFunctionErrorMessage } from '@/lib/functionErrors';
import { listGuestResults, rowsForPreview, type GuestResult } from '@/lib/guestResults';

interface PreviewResult {
  outcome: 'would_verify' | 'needs_review' | 'would_reject' | 'needs_inputs';
  score: number;
  flags: string[];
  riskFactors: string[];
  missingInputs: Array<{ emissionId: string; fields: string[] }>;
  totalCO2Kg: number;
  note: string;
}

const OUTCOME: Record<PreviewResult['outcome'], { title: string; tone: string }> = {
  would_verify: { title: 'These records pass every evidence check', tone: 'text-success' },
  needs_review: { title: 'Most records pass; some need a closer look', tone: 'text-warning' },
  would_reject: { title: 'These records do not pass the evidence checks yet', tone: 'text-destructive' },
  needs_inputs: { title: 'Some records are missing evidence', tone: 'text-warning' },
};

/**
 * Verify for a visitor without an account: the same evidence checks on the
 * results kept in this browser, run as a preview. Nothing is recorded or
 * marked verified; signing in records it and opens reports, monetize,
 * dashboard and MRV.
 */
export function GuestVerifyPreview() {
  const [results, setResults] = useState<GuestResult[] | null>(null);
  const [running, setRunning] = useState(false);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { void listGuestResults().then(setResults); }, []);
  const rows = results ? rowsForPreview(results) : [];
  const label = (id: string) => rows.find((r) => r.id === id)?.category ?? 'record';

  const run = async () => {
    if (running || rows.length === 0) return;
    setRunning(true); setError(null); setPreview(null);
    try {
      const { data, error: err } = await supabase.functions.invoke('verify-carbon', { body: { preview: { records: rows.slice(0, 100) } } });
      if (err) { setError(await getFunctionErrorMessage(err, 'The check could not run. Try again.')); return; }
      if (!data?.preview || !data?.data) { setError('The check returned no result. Try again.'); return; }
      setPreview(data.data as PreviewResult);
    } catch {
      setError('No connection. Check your internet and try again.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Shield className="h-4 w-4 shrink-0 text-accent" />
          Emissions to Verify
        </CardTitle>
      </CardHeader>
      <CardContent>
        {results === null ? (
          <div className="py-8 text-center text-muted-foreground"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />Loading your results...</div>
        ) : rows.length === 0 ? (
          <div className="py-8 text-center">
            <p className="mb-4 text-muted-foreground">Upload a bill on the home page to see verification work on it.</p>
            <Button asChild><Link to="/">Upload a bill</Link></Button>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted-foreground">{rows.length} {rows.length === 1 ? 'record' : 'records'} from {results.length} {results.length === 1 ? 'invoice' : 'invoices'}, kept in this browser for 24 hours.</p>
            <div className="mb-6 max-h-48 space-y-2 overflow-y-auto">
              {rows.map((e) => (
                <div key={e.id} className="flex items-center justify-between rounded-lg bg-secondary/30 p-3">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <div><span className="font-medium capitalize">{e.category}</span><span className="ml-2 text-xs text-muted-foreground">Scope {e.scope}</span></div>
                  </div>
                  <span className="font-mono font-medium">{e.co2_kg.toFixed(1)} kg</span>
                </div>
              ))}
            </div>
            <Button className="w-full glow-primary" size="lg" onClick={run} disabled={running}>
              {running ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Checking the evidence...</> : <>Run the verification check<ArrowRight className="ml-2 h-4 w-4" /></>}
            </Button>
            {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}

            {preview && (
              <div className="mt-6 rounded-xl border border-border p-4" role="status">
                <div className={`flex items-center gap-2 font-medium ${OUTCOME[preview.outcome].tone}`}>
                  {preview.outcome === 'would_verify' ? <CheckCircle className="h-5 w-5" /> : <Info className="h-5 w-5" />}
                  {OUTCOME[preview.outcome].title}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {Math.round(preview.score * 100)}% of records passed the evidence checks · {preview.totalCO2Kg.toLocaleString('en-IN', { maximumFractionDigits: 1 })} kg CO2e checked
                </p>
                {preview.missingInputs.length > 0 && (
                  <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                    {preview.missingInputs.slice(0, 8).map((m) => (
                      <li key={m.emissionId}><span className="capitalize text-foreground">{label(m.emissionId)}</span>: needs {m.fields.join(', ')}</li>
                    ))}
                  </ul>
                )}
                {preview.flags.length > 0 && (
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                    {preview.flags.slice(0, 6).map((f) => <li key={f}>{f}</li>)}
                  </ul>
                )}
                <p className="mt-4 rounded-lg bg-secondary/50 p-3 text-sm">
                  Preview only: nothing was recorded or marked verified. Sign in to record it, and to use reports, monetize, your dashboard and MRV.
                </p>
                <Button asChild className="mt-3 w-full" size="lg"><Link to="/auth?next=/verify">Sign in to save and verify<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
