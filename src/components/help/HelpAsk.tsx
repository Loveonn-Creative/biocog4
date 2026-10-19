// The Help Center ask box. Typing searches the articles at once, in the
// browser, and shows the best answer with no AI call. "Get a direct answer"
// asks the help assistant, which answers only from those articles. The mic
// fills the box by dictation in the reader's language.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Loader2, Mic, Search, Sparkles } from 'lucide-react';
import { rankHelp } from '../../../supabase/functions/_shared/helpArticles';
import { contactHref, type HelpContent } from '@/lib/help/content';
import { getLocaleMeta } from '@/lib/i18n/locales';
import { loadSupabase } from '@/integrations/supabase/lazyClient';

type AiState = { kind: 'idle' } | { kind: 'loading' } | { kind: 'answer'; text: string } | { kind: 'none' | 'limit' | 'error' };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const speechCtor = (): any => (typeof window === 'undefined' ? null : (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null);

export function HelpAsk({ content, onOpen, compact = false, autoFocus = false }: {
  content: HelpContent; onOpen: (slug: string) => void; compact?: boolean; autoFocus?: boolean;
}) {
  const { ui, articles, locale } = content;
  const [q, setQ] = useState('');
  const [ai, setAi] = useState<AiState>({ kind: 'idle' });
  const [listening, setListening] = useState(false);
  const [canSpeak, setCanSpeak] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rec = useRef<any>(null);

  useEffect(() => { setCanSpeak(!!speechCtor()); return () => { try { rec.current?.abort(); } catch { /* already stopped */ } }; }, []);

  const hits = useMemo(() => (q.trim().length >= 2 ? rankHelp(q, articles) : []), [q, articles]);
  const bySlug = (slug: string) => articles.find((a) => a.slug === slug)!;
  const top = hits[0] ? bySlug(hits[0].slug) : null;

  // A new question clears the last direct answer.
  useEffect(() => { setAi({ kind: 'idle' }); }, [q]);

  const speak = () => {
    const Ctor = speechCtor();
    if (!Ctor) return;
    if (listening) { try { rec.current?.stop(); } catch { /* stopped */ } return; }
    const r = new Ctor();
    r.lang = getLocaleMeta(locale).speechCode || 'en-IN';
    r.interimResults = true;
    r.continuous = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onresult = (e: any) => setQ(Array.from(e.results).map((x: any) => x[0].transcript).join(' '));
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    rec.current = r;
    setListening(true);
    try { r.start(); } catch { setListening(false); }
  };

  const askAi = async () => {
    const question = q.trim();
    if (question.length < 2 || ai.kind === 'loading') return;
    setAi({ kind: 'loading' });
    try {
      const supabase = await loadSupabase();
      const { data, error } = await supabase.functions.invoke('help-ask', {
        body: { question, slugs: hits.slice(0, 3).map((h) => h.slug), language: getLocaleMeta(locale).name },
      });
      if (error) {
        let code = '';
        try { code = (await (error as { context?: Response }).context?.json())?.code ?? ''; } catch { /* no body */ }
        setAi({ kind: code === 'help_daily_limit' ? 'limit' : 'error' });
        return;
      }
      setAi(data?.answer ? { kind: 'answer', text: String(data.answer) } : { kind: 'none' });
    } catch {
      setAi({ kind: 'error' });
    }
  };

  const contact = contactHref(top?.contact ?? 'general', q.trim() || undefined);

  return (
    <div className={compact ? '' : 'mx-auto max-w-2xl'}>
      <form
        role="search"
        className="relative"
        onSubmit={(e) => { e.preventDefault(); if (top) void askAi(); }}
      >
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value.slice(0, 300))}
          placeholder={listening ? ui.listening : ui.askPlaceholder}
          aria-label={ui.askLabel}
          autoComplete="off"
          autoFocus={autoFocus}
          enterKeyHint="search"
          className={`w-full rounded-2xl border border-border bg-background pl-11 ${canSpeak ? 'pr-14' : 'pr-4'} ${compact ? 'py-2.5 text-sm' : 'py-3.5 text-base'} shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10`}
        />
        {canSpeak && (
          <button
            type="button"
            onClick={speak}
            aria-label={ui.speak}
            aria-pressed={listening}
            className={`absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl border ${listening ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-primary hover:border-primary'}`}
          >
            <Mic className="h-4 w-4" />
          </button>
        )}
      </form>

      <div aria-live="polite">
        {q.trim().length >= 2 && !top && (
          <div className="mt-3 rounded-2xl border border-border bg-background p-4 text-sm">
            <p>{ui.noMatch}</p>
            <Link to={contact} className="mt-2 inline-flex items-center gap-1 font-medium text-primary">{ui.messageUs} <ArrowRight className="h-4 w-4" /></Link>
          </div>
        )}

        {top && (
          <div className="mt-3 space-y-2 text-left">
            <div className="help-answer rounded-2xl border border-border bg-background p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">{ui.answer}</p>
              <p className="mt-1 leading-relaxed">{top.a}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {ui.fromArticle}:{' '}
                <button type="button" onClick={() => onOpen(top.slug)} className="font-medium text-primary underline-offset-2 hover:underline">{top.q}</button>
              </p>

              {ai.kind === 'idle' && (
                <button type="button" onClick={() => void askAi()} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:border-primary">
                  <Sparkles className="h-3.5 w-3.5 text-primary" /> {ui.askAnswerCta}
                </button>
              )}
              {ai.kind === 'loading' && <p className="mt-3 inline-flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> {ui.aiThinking}</p>}
              {ai.kind === 'answer' && <p className="mt-3 rounded-xl bg-primary/5 p-3 text-sm leading-relaxed">{ai.text}</p>}
              {(ai.kind === 'none' || ai.kind === 'limit' || ai.kind === 'error') && (
                <p className="mt-3 text-xs text-muted-foreground">
                  {ai.kind === 'none' ? ui.aiNotCovered : ai.kind === 'limit' ? ui.aiLimit : ui.aiError}{' '}
                  <Link to={contact} className="font-medium text-primary">{ui.messageUs}</Link>
                </p>
              )}
            </div>
            {hits.slice(1).map((h) => {
              const a = bySlug(h.slug);
              return (
                <button key={h.slug} type="button" onClick={() => onOpen(h.slug)} className="block w-full rounded-xl px-4 py-2.5 text-left hover:bg-muted/60">
                  <span className="block text-sm font-medium">{a.q}</span>
                  <span className="block text-xs text-muted-foreground">{a.a}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
