import { useState } from 'react';
import { ArrowUp, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const STARTERS = ['Where should we focus first?', 'Which suppliers should we chase first?', 'What investment cuts the most?'];
type Turn = { role: 'user' | 'assistant'; content: string };

/** Biocog Superintelligence on the enterprise's own supplier data, for the period on screen. */
export function AskSupplierData({ period }: { period: { start: string; end: string; label: string } }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<{ used: number; included: number } | null>(null);

  async function ask(question: string) {
    const text = question.trim();
    if (!text || busy) return;
    const next: Turn[] = [...turns, { role: 'user', content: text }];
    setTurns(next); setQ(''); setBusy(true); setError(null);
    const { data, error: err } = await supabase.functions.invoke('enterprise-intelligence', {
      body: { messages: next, periodStart: period.start, periodEnd: period.end },
    });
    setBusy(false);
    const message = (data as { error?: string } | null)?.error;
    if (err || message || !data?.answer) {
      setError(message ?? 'No answer came back. Try again.');
      setTurns(turns);
      setQ(text);
      return;
    }
    setTurns([...next, { role: 'assistant', content: data.answer }]);
    if (data.used != null && data.included != null) setUsage({ used: data.used, included: data.included });
  }

  return (
    <section className="rounded-xl border p-4" aria-labelledby="ask-suppliers-data">
      <div className="flex flex-wrap items-baseline gap-2 mb-3">
        <h2 id="ask-suppliers-data" className="text-sm font-semibold mr-auto flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" aria-hidden="true" />Ask about your suppliers
        </h2>
        <span className="text-xs text-muted-foreground">
          {usage ? `${usage.used.toLocaleString('en-IN')} of ${usage.included.toLocaleString('en-IN')} questions this month` : `Answers use ${period.label} records only`}
        </span>
      </div>

      {turns.length > 0 && (
        <ol className="space-y-3 mb-3" aria-live="polite">
          {turns.map((t, i) => (
            <li key={i} className={t.role === 'user' ? 'text-sm font-medium' : 'text-sm whitespace-pre-wrap rounded-lg bg-muted/50 p-3 leading-relaxed'}>{t.content}</li>
          ))}
          {busy && <li className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Reading your supplier records</li>}
        </ol>
      )}

      {turns.length === 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {STARTERS.map((s) => (
            <button key={s} type="button" disabled={busy} onClick={() => void ask(s)}
              className="rounded-full border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50">{s}</button>
          ))}
        </div>
      )}

      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void ask(q); }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} maxLength={600} aria-label="Your question"
          placeholder="Ask about a supplier, a target or a decision"
          className="h-10 flex-1 min-w-0 rounded-md border bg-background px-3 text-sm" />
        <button type="submit" disabled={busy || !q.trim()} aria-label="Ask"
          className="h-10 w-10 shrink-0 rounded-md bg-primary text-primary-foreground grid place-items-center disabled:opacity-50">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-destructive" role="alert">{error}</p>}
    </section>
  );
}
