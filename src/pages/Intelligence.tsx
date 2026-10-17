import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { SEOHead } from '@/components/SEOHead';
import { TypingIndicator } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { VoiceAgent } from '@/components/chat/VoiceAgent';
import { AnswerReceipt, BasisTag } from '@/components/intelligence/AnswerReceipt';
import { ContextCard, type BriefSummary } from '@/components/intelligence/ContextCard';
import { useVoiceOutput, useVoiceInput } from '@/components/VoiceOutput';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useSession } from '@/hooks/useSession';
import { useI18nContext } from '@/lib/i18n/LanguageProvider';
import { Language, SUPPORTED_LANGUAGES, detectBrowserLanguage, getLanguageByCode } from '@/lib/languages';
import { matchVoiceCommand } from '@/lib/voiceCommands';
import { formatContentForDisplay } from '@/lib/formatContent';
import { STATIC_PAGE_META } from '@/lib/seo/seoMeta';
import { Check, Copy, Info, MoreHorizontal, Phone, PhoneOff, RotateCcw, Volume2, VolumeX, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  chatBits, chatFailure, CHAT_TIMEOUT_MS, displayAnswer, historyLink, EMPTY_FAILURE, NETWORK_FAILURE, planLine, readSse, suggestionsFor, TIMEOUT_FAILURE,
  type Audience, type ChatFailure, type Evidence, type Suggestion,
} from '@/lib/intelligenceClient';
import { limitSentence } from '../../supabase/functions/_shared/intelligence';

// What the server says this visitor may see (intelligence-chat action "brief").
interface Brief {
  audience: Audience;
  access: { ownRecords: boolean; savingsInsights: boolean; projection: boolean; voice: boolean };
  limits: { messagesPerMonth: number; resetsAt: string; voice: { minutesPerMonth: number; sessionsPerMonth: number; sessionMaxMinutes: number } | null };
  usage: { messagesUsed: number; voiceSessionsUsed: number };
  brief: null | {
    basis: 'verified' | 'unverified' | 'none';
    summary?: BriefSummary;
    hotspots: Array<{ category: string; scope: number; kg: number; share: number; records: number; recordIds: string[] }>;
    monthly?: Array<{ month: string; kg: number; records: number }>;
  };
  insights: null | Array<{ category?: string; finding: string; label: string; next: { label: string; path: string }; unitCostInr?: { value: number; unit: string } | null }>;
  projection: null | { next12Kg: number; lowKg: number; highKg: number; method: string };
}

interface ThreadMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  evidence?: Evidence;
  /** Transcripts from the real-time voice agent: shown, never sent back as chat history. */
  source?: 'voice';
}

// English unless a reviewed static bundle has the key (no runtime translation here).
const WELCOME = {
  records: { key: 'intelligence.welcome.records', en: 'Ask about your emissions, your records or what to do next. Each figure comes with the records behind it.' },
  general: { key: 'intelligence.welcome.general', en: 'Ask about carbon accounting, ESG reporting, CBAM or how Senseible works.' },
};

const Intelligence = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = usePremiumStatus();
  const { user } = useSession();
  const { translations } = useI18nContext();
  const [brief, setBrief] = useState<Brief | null>(null);
  const [failure, setFailure] = useState<(ChatFailure & { question: string }) | null>(null);
  const [used, setUsed] = useState<number | null>(null);
  const sendingRef = useRef(false);

  const [language, setLanguage] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('biocog_language');
      return saved ? getLanguageByCode(saved) : detectBrowserLanguage();
    } catch { return detectBrowserLanguage(); }
  });

  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  // Voice navigation is opt-in.
  const [voiceNavEnabled, setVoiceNavEnabled] = useState(false);
  const [showVoiceAgent, setShowVoiceAgent] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  const { speak, stop: stopSpeaking, isSpeaking } = useVoiceOutput({
    language,
    onSpeakingChange: (speaking) => { if (!speaking) setSpeakingMessageId(null); },
  });

  // A short, exact command only (see lib/voiceCommands); anything else is a question.
  const processVoiceCommand = useCallback((transcript: string): boolean => {
    if (!voiceNavEnabled) return false;
    const command = matchVoiceCommand(transcript);
    if (!command) return false;
    if (command.action === 'navigate' && command.route) {
      toast.success(`Navigating: ${command.description}`);
      setTimeout(() => navigate(command.route!), 300);
      return true;
    }
    if (command.action === 'signout') {
      if (isAuthenticated) {
        toast.info('Signing out...');
        supabase.auth.signOut().then(() => navigate('/'));
      }
      return true;
    }
    return false;
  }, [voiceNavEnabled, navigate, isAuthenticated]);

  const sendRef = useRef<(content: string) => void>(() => {});
  const handleVoiceResult = useCallback((transcript: string) => {
    const t = transcript.trim();
    if (t && !processVoiceCommand(t)) sendRef.current(t);
  }, [processVoiceCommand]);

  const { startListening, stopListening, isListening } = useVoiceInput({
    language,
    onResult: handleVoiceResult,
    onError: () => { /* the hook shows the error */ },
  });

  const authHeaders = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    return { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${sessionData?.session?.access_token || key}` };
  };
  const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/intelligence-chat`;

  // Plan, limits and the figures behind answers, decided on the server.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(endpoint, { method: 'POST', headers: await authHeaders(), body: JSON.stringify({ action: 'brief' }) });
        if (!res.ok) return; // an older deployment has no brief; chat still works
        const data = await res.json();
        if (!cancelled && data?.audience) { setBrief(data); setUsed(data.usage?.messagesUsed ?? null); }
      } catch { /* offline: the first question will say so */ }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    try { localStorage.setItem('biocog_language', language.code); } catch { /* storage blocked */ }
  }, [language]);

  // Keep the newest message in view: the ScrollArea's viewport is what scrolls.
  useEffect(() => {
    const viewport = scrollRef.current?.querySelector<HTMLElement>('[data-radix-scroll-area-viewport]');
    if (viewport) viewport.scrollTop = viewport.scrollHeight;
  }, [messages, isLoading, failure]);

  const audience: Audience = brief?.audience ?? (isAuthenticated ? 'snapshot' : 'guest');
  const ownRecords = !!brief?.access.ownRecords;
  const welcome = ownRecords ? WELCOME.records : WELCOME.general;
  const welcomeText = translations[welcome.key] || welcome.en;
  const suggestions: Suggestion[] = useMemo(
    () => suggestionsFor({ audience, brief: brief?.brief ?? null, insights: brief?.insights ?? null, projection: brief?.projection ?? null }),
    [audience, brief],
  );
  const limit = brief?.limits.messagesPerMonth ?? null;
  const atLimit = failure?.kind === 'limit' || (limit !== null && used !== null && used >= limit);
  const canVoice = !!brief?.access.voice;
  const sidePanel = ownRecords;

  const handleSend = async (content: string, opts: { retry?: boolean } = {}) => {
    // One question at a time: a double tap or Enter while answering does nothing.
    if (sendingRef.current || !content.trim()) return;
    sendingRef.current = true;
    setFailure(null);
    setDraft('');
    const userMessage: ThreadMessage = { id: `user-${Date.now()}`, role: 'user', content };
    const history = opts.retry ? messages : [...messages, userMessage];
    if (!opts.retry) setMessages(history);
    setIsLoading(true);

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);
    const assistantId = `assistant-${Date.now()}`;
    let assistantContent = '';
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: await authHeaders(),
        signal: controller.signal,
        body: JSON.stringify({
          // Text only: evidence and voice-agent transcripts are never sent back.
          messages: history.filter((m) => m.source !== 'voice').map((m) => ({ role: m.role, content: m.content })),
          language: language.name,
        }),
      });
      const usedNow = Number(response.headers.get('x-intelligence-used'));
      if (Number.isFinite(usedNow) && usedNow > 0) setUsed(usedNow);

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setFailure({ ...chatFailure(response.status, body, brief?.audience ?? (isAuthenticated ? null : 'guest')), question: content });
        return;
      }
      const reader = response.body?.getReader();
      if (!reader) { setFailure({ ...EMPTY_FAILURE, question: content }); return; }

      const decoder = new TextDecoder();
      let buffer = '';
      let started = false;
      let evidence: Evidence | undefined;
      setStreamingId(assistantId);
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        window.clearTimeout(timer);
        buffer += decoder.decode(value, { stream: true });
        const read = readSse(buffer);
        buffer = read.rest;
        if (read.evidence) evidence = read.evidence;
        if (read.deltas.length) {
          assistantContent += read.deltas.join('');
          if (!started) {
            started = true;
            setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: assistantContent }]);
          } else {
            setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: assistantContent } : m)));
          }
        }
        if (read.done) break;
      }
      if (!assistantContent.trim()) { setFailure({ ...EMPTY_FAILURE, question: content }); return; }
      if (evidence) setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, evidence } : m)));

      if (autoSpeak) {
        setSpeakingMessageId(assistantId);
        speak(formatContentForDisplay(displayAnswer(assistantContent)));
      }
    } catch (error) {
      const aborted = error instanceof DOMException && error.name === 'AbortError';
      // Keep any part of the answer that arrived; say it was cut short.
      setFailure({ ...(aborted ? TIMEOUT_FAILURE : NETWORK_FAILURE), question: content, ...(assistantContent ? { message: 'The answer was cut short. Try again for the full reply.' } : {}) });
    } finally {
      window.clearTimeout(timer);
      sendingRef.current = false;
      setStreamingId(null);
      setIsLoading(false);
    }
  };
  sendRef.current = (t: string) => { void handleSend(t); };

  const toggleSpeak = (text: string, id: string) => {
    if (isSpeaking && speakingMessageId === id) { stopSpeaking(); setSpeakingMessageId(null); return; }
    setSpeakingMessageId(id);
    speak(text);
  };
  const copy = async (text: string, id: string) => {
    try { await navigator.clipboard.writeText(text); setCopiedId(id); setTimeout(() => setCopiedId(null), 2000); } catch { toast.error('Could not copy.'); }
  };

  const plan = brief && used !== null && limit !== null ? planLine(brief.audience, used, limit) : null;
  const meter = brief && used !== null && limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  const planBlock = plan && (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{plan}</p>
      <div className="mt-1 h-[3px] w-40 max-w-full overflow-hidden rounded-full bg-border" role="meter" aria-label="Questions used this month" aria-valuemin={0} aria-valuemax={limit ?? 0} aria-valuenow={used ?? 0}>
        <div className="h-full rounded-full bg-primary" style={{ width: `${meter}%` }} />
      </div>
    </div>
  );

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background">
      <SEOHead title={STATIC_PAGE_META['/intelligence'].title} description={STATIC_PAGE_META['/intelligence'].description} canonical="/intelligence" />
      <Navigation />

      <div className="flex min-h-0 flex-1">
        {/* Desktop side panel (Pro and Scale): the data answers rest on, and what to ask. */}
        {sidePanel && (
          <aside className="hidden w-72 shrink-0 flex-col overflow-y-auto border-r border-border bg-card p-4 lg:flex" aria-label="Your data">
            <p className="text-base font-semibold tracking-tight" aria-hidden="true">Biocog Intelligence</p>
            <p className="mb-2 text-xs text-muted-foreground">ESG intelligence</p>
            {planBlock}
            <SidePanelData brief={brief!} />
            <h2 className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Ask about</h2>
            <ul className="text-sm">
              {suggestions.map((s) => (
                <li key={s.label} className="border-b border-border/60">
                  <button type="button" onClick={() => setDraft(s.prompt)} className="flex w-full items-center justify-between gap-2 py-2 text-left hover:text-primary">
                    <span>{s.label}</span><ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        )}

        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          {/* Header */}
          <header className="shrink-0 border-b border-border/50 bg-background">
            <div className="mx-auto flex w-full max-w-3xl items-start justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <h1 className={cn('flex flex-wrap items-baseline gap-x-2 text-base font-semibold tracking-tight', sidePanel && 'lg:sr-only')}>
                  Biocog Intelligence<span className="text-xs font-normal text-muted-foreground">ESG intelligence</span>
                </h1>
                <div className={cn(sidePanel && 'lg:hidden')}>{planBlock}</div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {canVoice && (
                  <Button
                    variant={showVoiceAgent ? 'default' : 'outline'}
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setShowVoiceAgent((v) => !v)}
                    aria-label={showVoiceAgent ? 'End voice conversation' : 'Start voice conversation'}
                    aria-pressed={showVoiceAgent}
                  >
                    {showVoiceAgent ? <PhoneOff className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
                  </Button>
                )}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon" className="h-9 w-9" aria-label="Language and voice settings">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-72 space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="intel-language" className="text-xs">Answer language</Label>
                      <Select value={language.code} onValueChange={(code) => setLanguage(getLanguageByCode(code))}>
                        <SelectTrigger id="intel-language" className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent className="max-h-72">
                          {SUPPORTED_LANGUAGES.map((l) => (
                            <SelectItem key={l.code} value={l.code}>{l.name}{l.nativeName !== l.name ? ` · ${l.nativeName}` : ''}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <Label htmlFor="intel-autospeak" className="text-sm font-normal">Read answers aloud</Label>
                      <Switch id="intel-autospeak" checked={autoSpeak} onCheckedChange={setAutoSpeak} />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <Label htmlFor="intel-voicenav" className="text-sm font-normal">Voice navigation</Label>
                      <Switch id="intel-voicenav" checked={voiceNavEnabled} onCheckedChange={setVoiceNavEnabled} />
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </header>

          {/* Thread */}
          <ScrollArea ref={scrollRef} className="min-h-0 flex-1 [&>[data-radix-scroll-area-viewport]>div]:!block">
            <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-4">
              {brief && <ContextCard data={brief} className={cn(sidePanel && 'lg:hidden')} />}

              {showVoiceAgent && canVoice && (
                <VoiceAgent
                  className="py-2"
                  onTranscript={(text, role) => {
                    setMessages((prev) => [...prev, { id: `voice-${role}-${Date.now()}`, role, content: text, source: 'voice' }]);
                  }}
                />
              )}

              <div className="max-w-[92%] rounded-2xl border border-border bg-card px-4 py-3 text-sm leading-relaxed sm:max-w-[80%]">{welcomeText}</div>

              {messages.map((m) => m.role === 'user' ? (
                <div key={m.id} className="flex justify-end">
                  <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-sm text-primary-foreground">{m.content}</p>
                </div>
              ) : (
                <AnswerCard
                  key={m.id}
                  message={m}
                  streaming={streamingId === m.id}
                  speaking={isSpeaking && speakingMessageId === m.id}
                  copied={copiedId === m.id}
                  onCopy={copy}
                  onSpeak={toggleSpeak}
                  onOpenRecords={(id) => navigate(historyLink(id))}
                />
              ))}

              {isLoading && !streamingId && <TypingIndicator />}
              {isLoading && streamingId && !messages.some((m) => m.id === streamingId) && <TypingIndicator />}

              {/* Limit reached: one sentence and one link. */}
              {atLimit && !isLoading && limit !== null && (
                <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-secondary/50 p-3 text-sm">
                  <span>{failure?.kind === 'limit' ? failure.message : limitSentence(used ?? limit, limit)}</span>
                  {audience === 'guest'
                    ? <Link to="/auth?next=/intelligence" className="font-semibold text-primary hover:underline">Sign in</Link>
                    : <Link to="/pricing" className="font-semibold text-primary hover:underline">See plans</Link>}
                </div>
              )}

              {/* What went wrong and what to do; never shown as an answer. */}
              {failure && failure.kind !== 'limit' && !isLoading && (
                <div role="alert" className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-secondary/40 p-3 text-sm">
                  <Info className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="min-w-0 flex-1 text-muted-foreground">{failure.message}</span>
                  {failure.retry && (
                    <Button size="sm" variant="outline" className="h-8" onClick={() => void handleSend(failure.question, { retry: true })}>
                      <RotateCcw className="mr-1.5 h-3.5 w-3.5" />Try again
                    </Button>
                  )}
                  {failure.action && <Button size="sm" asChild className="h-8"><Link to={failure.action.to}>{failure.action.label}</Link></Button>}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input, above the mobile bottom navigation */}
          <div className="shrink-0 border-t border-border/50 bg-background pb-[calc(4.75rem+env(safe-area-inset-bottom))] pt-2 md:pb-4">
            <div className="mx-auto w-full max-w-3xl px-4">
              {!atLimit && (
                <div className={cn('-mx-4 mb-2 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden', sidePanel && 'lg:hidden')}>
                  {suggestions.map((s) => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => void handleSend(s.prompt)}
                      disabled={isLoading}
                      className="shrink-0 whitespace-nowrap rounded-full border border-border bg-card px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
              <ChatInput
                onSend={(t) => void handleSend(t)}
                onVoiceStart={startListening}
                onVoiceEnd={stopListening}
                isLoading={isLoading}
                isListening={isListening}
                language={language}
                value={draft}
                onValueChange={setDraft}
                showLanguage={false}
                placeholder={ownRecords ? 'Ask about your records…' : 'Ask a question…'}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

/** One answer: the text, what it rests on, and the actions that do something. */
function AnswerCard({ message, streaming, speaking, copied, onCopy, onSpeak, onOpenRecords }: {
  message: ThreadMessage;
  streaming: boolean;
  speaking: boolean;
  copied: boolean;
  onCopy: (text: string, id: string) => void;
  onSpeak: (text: string, id: string) => void;
  onOpenRecords: (id: string) => void;
}) {
  const text = useMemo(() => formatContentForDisplay(displayAnswer(message.content)), [message.content]);
  const bits = chatBits(text);
  const records = message.evidence?.records ?? [];
  return (
    <article className="max-w-full overflow-hidden rounded-2xl border border-border bg-card sm:max-w-[85%]">
      <div className="space-y-2 break-words px-4 py-3 text-sm leading-relaxed">
        {bits.map((b, i) => <p key={i} className="whitespace-pre-line">{b}</p>)}
      </div>
      {message.evidence && <AnswerReceipt evidence={message.evidence} />}
      {!streaming && (
        <div className="flex flex-wrap gap-1.5 border-t border-border px-3 py-2">
          {records.length > 0 && (
            <Button variant="outline" size="sm" className="h-7 rounded-full px-3 text-xs" onClick={() => onOpenRecords(records[0].id)}>Open records</Button>
          )}
          <Button variant="outline" size="sm" className="h-7 rounded-full px-3 text-xs" onClick={() => onCopy(text, message.id)} aria-label="Copy answer">
            {copied ? <Check className="mr-1 h-3 w-3" /> : <Copy className="mr-1 h-3 w-3" />}{copied ? 'Copied' : 'Copy'}
          </Button>
          <Button variant="outline" size="sm" className="h-7 w-7 rounded-full p-0" onClick={() => onSpeak(text, message.id)} aria-label={speaking ? 'Stop reading aloud' : 'Read answer aloud'}>
            {speaking ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </Button>
        </div>
      )}
    </article>
  );
}

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function SidePanelData({ brief }: { brief: Brief }) {
  const b = brief.brief;
  const s = b?.summary;
  return (
    <>
      <h2 className="mb-1 mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Your data</h2>
      {!b || b.basis === 'none' || !s ? (
        <p className="py-2 text-sm text-muted-foreground">No records yet. <Link to="/" className="font-semibold text-primary hover:underline">Upload an invoice</Link></p>
      ) : (
        <dl className="text-sm">
          <div className="flex items-center justify-between border-b border-border/60 py-2"><dt>Invoices read</dt><dd className="font-semibold tabular-nums">{s.documents.toLocaleString('en-IN')}</dd></div>
          <div className="flex items-center justify-between border-b border-border/60 py-2"><dt>Basis</dt><dd><BasisTag basis={b.basis} /></dd></div>
          <div className="flex items-center justify-between border-b border-border/60 py-2"><dt>Months covered</dt><dd className="font-semibold tabular-nums">{b.monthly?.length ?? 0}</dd></div>
          <div className="flex items-center justify-between border-b border-border/60 py-2">
            <dt>Total</dt>
            <dd className="font-semibold tabular-nums">{(s.kg / 1000).toLocaleString('en-IN', { maximumFractionDigits: 2 })} t CO₂e</dd>
          </div>
          {s.firstMonth && s.lastMonth && (
            <div className="flex items-center justify-between py-2">
              <dt>Period</dt>
              <dd className="tabular-nums">{MON[Number(s.firstMonth.slice(5)) - 1]} {s.firstMonth.slice(0, 4)} to {MON[Number(s.lastMonth.slice(5)) - 1]} {s.lastMonth.slice(0, 4)}</dd>
            </div>
          )}
        </dl>
      )}
    </>
  );
}

export default Intelligence;
