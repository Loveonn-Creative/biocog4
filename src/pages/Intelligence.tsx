import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Navigation } from '@/components/Navigation';
import { ChatMessage, Message, TypingIndicator } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { LanguageSelector } from '@/components/chat/LanguageSelector';
import { VoiceAgent } from '@/components/chat/VoiceAgent';
import { useVoiceOutput, useVoiceInput } from '@/components/VoiceOutput';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useSession } from '@/hooks/useSession';
import { Language, detectBrowserLanguage, getLanguageByCode } from '@/lib/languages';
import { matchVoiceCommand, getCommandSuggestions } from '@/lib/voiceCommands';
import { Brain, Sparkles, Volume2, VolumeX, Info, Mic, Navigation as NavIcon, Phone, PhoneOff, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  chatBits, chatFailure, CHAT_TIMEOUT_MS, EMPTY_FAILURE, NETWORK_FAILURE, readSse, TIMEOUT_FAILURE,
  type Audience, type ChatFailure,
} from '@/lib/intelligenceClient';

// What the server says this visitor may see (intelligence-chat action "brief").
interface Brief {
  audience: Audience;
  access: { ownRecords: boolean; savingsInsights: boolean; projection: boolean; voice: boolean };
  limits: { messagesPerDay: number; resetsAt: string; voice: { minutesPerMonth: number; sessionsPerMonth: number; sessionMaxMinutes: number } | null };
  usage: { messagesUsed: number; voiceSessionsUsed: number };
  brief: null | {
    basis: 'verified' | 'unverified' | 'none';
    verified: { records: number; kg: number };
    unverified: { records: number; kg: number };
    hotspots: Array<{ category: string; scope: number; kg: number; share: number; records: number; recordIds: string[] }>;
    complete: boolean;
    calculation: string;
  };
  insights: null | Array<{ finding: string; label: string; next: { label: string; path: string } }>;
  projection: null | { next12Kg: number; lowKg: number; highKg: number; method: string };
  sample: null | { label: string; calculation: string };
}

const kgText = (kg: number) => kg >= 1000 ? `${(kg / 1000).toLocaleString('en-IN', { maximumFractionDigits: 2 })} t CO2e` : `${kg.toLocaleString('en-IN', { maximumFractionDigits: 1 })} kg CO2e`;

const WELCOME_MESSAGES: Record<string, string> = {
  en: "I'm your AI ESG Head. Ask me about reducing emissions, saving costs, or building your net-zero strategy.",
  hi: "मैं आपका AI ESG प्रमुख हूं। उत्सर्जन कम करने, लागत बचाने, या नेट-जीरो रणनीति बनाने के बारे में पूछें।",
  zh: "我是您的AI ESG主管。询问我关于减少排放、节省成本或制定净零战略的问题。",
  es: "Soy tu Director de ESG con IA. Pregúntame sobre reducir emisiones, ahorrar costos o construir tu estrategia net-zero.",
  pt: "Sou seu Diretor de ESG com IA. Pergunte-me sobre reduzir emissões, economizar custos ou construir sua estratégia net-zero.",
  ar: "أنا رئيس ESG الخاص بك بالذكاء الاصطناعي. اسألني عن تقليل الانبعاثات أو توفير التكاليف أو بناء استراتيجية صفر صافي.",
  ja: "私はあなたのAI ESG責任者です。排出削減、コスト削減、ネットゼロ戦略についてお聞きください。",
};

const Intelligence = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = usePremiumStatus();
  const { user } = useSession();
  const [brief, setBrief] = useState<Brief | null>(null);
  const [failure, setFailure] = useState<(ChatFailure & { question: string }) | null>(null);
  const [usedToday, setUsedToday] = useState<number | null>(null);
  const sendingRef = useRef(false);

  // Language state
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('biocog_language');
    return saved ? getLanguageByCode(saved) : detectBrowserLanguage();
  });

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [voiceNavEnabled, setVoiceNavEnabled] = useState(true);
  const [showVoiceAgent, setShowVoiceAgent] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Voice hooks
  const { speak, stop: stopSpeaking, isSpeaking } = useVoiceOutput({ 
    language,
    onSpeakingChange: (speaking) => {
      if (!speaking) setSpeakingMessageId(null);
    }
  });

  // Process voice commands for navigation
  const processVoiceCommand = useCallback((transcript: string): boolean => {
    if (!voiceNavEnabled) return false;
    
    const command = matchVoiceCommand(transcript);
    if (!command) return false;

    if (command.action === 'navigate' && command.route) {
      toast.success(`Navigating: ${command.description}`);
      speak(`Going to ${command.description}`);
      setTimeout(() => navigate(command.route!), 500);
      return true;
    }

    if (command.action === 'signout') {
      if (isAuthenticated) {
        toast.info('Signing out...');
        speak('Signing you out');
        supabase.auth.signOut().then(() => navigate('/'));
        return true;
      } else {
        speak("You're not signed in");
        return true;
      }
    }

    return false;
  }, [voiceNavEnabled, navigate, speak, isAuthenticated]);

  const handleVoiceResult = useCallback((transcript: string) => {
    if (transcript.trim()) {
      // First check for voice navigation commands
      const isCommand = processVoiceCommand(transcript.trim());
      if (!isCommand) {
        // Not a command, treat as chat message
        handleSend(transcript.trim());
      }
    }
  }, [processVoiceCommand]);

  const handleVoiceError = useCallback((error: string) => {
    console.error('Voice error:', error);
    // Error is already shown via toast in the hook
  }, []);

  const { startListening, stopListening, isListening, isSupported: voiceSupported } = useVoiceInput({
    language,
    onResult: handleVoiceResult,
    onError: handleVoiceError,
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
        if (!cancelled && data?.audience) { setBrief(data); setUsedToday(data.usage?.messagesUsed ?? null); }
      } catch { /* offline: the first question will say so */ }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Save language preference
  useEffect(() => {
    localStorage.setItem('biocog_language', language.code);
  }, [language]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Add welcome message on mount
  useEffect(() => {
    const welcomeContent = WELCOME_MESSAGES[language.code] || WELCOME_MESSAGES.en;
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: welcomeContent,
      timestamp: new Date(),
    }]);
  }, []);

  const handleSend = async (content: string, opts: { retry?: boolean } = {}) => {
    // One question at a time: a double tap or Enter while answering does nothing.
    if (sendingRef.current || !content.trim()) return;
    sendingRef.current = true;
    setFailure(null);
    const userMessage: Message = { id: `user-${Date.now()}`, role: 'user', content, timestamp: new Date() };
    // On retry the question is already on screen.
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
          messages: history.filter((m) => m.id !== 'welcome').map((m) => ({ role: m.role, content: m.content })),
          language: language.name,
        }),
      });
      const used = Number(response.headers.get('x-intelligence-used'));
      if (Number.isFinite(used) && used > 0) setUsedToday(used);

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
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        window.clearTimeout(timer);
        buffer += decoder.decode(value, { stream: true });
        const read = readSse(buffer);
        buffer = read.rest;
        if (read.deltas.length) {
          assistantContent += read.deltas.join('');
          if (!started) {
            started = true;
            setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: assistantContent, timestamp: new Date() }]);
          } else {
            setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: assistantContent } : m)));
          }
        }
        if (read.done) break;
      }
      if (!assistantContent.trim()) { setFailure({ ...EMPTY_FAILURE, question: content }); return; }

      if (autoSpeak) {
        setSpeakingMessageId(assistantId);
        speak(assistantContent);
      }
    } catch (error) {
      const aborted = error instanceof DOMException && error.name === 'AbortError';
      // Keep any part of the answer that arrived; say it was cut short.
      setFailure({ ...(aborted ? TIMEOUT_FAILURE : NETWORK_FAILURE), question: content, ...(assistantContent ? { message: 'The answer was cut short. Try again for the full reply.' } : {}) });
    } finally {
      window.clearTimeout(timer);
      sendingRef.current = false;
      setIsLoading(false);
    }
  };

  const handleSpeak = (text: string, messageId?: string) => {
    if (messageId) setSpeakingMessageId(messageId);
    speak(text);
  };

  const handleStopSpeaking = () => {
    stopSpeaking();
    setSpeakingMessageId(null);
  };

  const left = brief && usedToday !== null ? Math.max(0, brief.limits.messagesPerDay - usedToday) : null;
  const canVoice = !!brief?.access.voice;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
      </Helmet>

      <Navigation />

      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <div className="hidden sm:flex w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 items-center justify-center">
              <Brain className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <h1 className="whitespace-nowrap text-base sm:text-lg font-semibold flex items-center gap-2">
                <span className="truncate">Biocog Intelligence</span>
                <Badge variant="outline" className="hidden sm:inline-flex text-xs font-normal">
                  <Sparkles className="w-3 h-3 mr-1" />
                  AI ESG Head
                </Badge>
              </h1>
              <p className="hidden sm:block text-xs text-muted-foreground">
                Your net-zero strategy advisor
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-0.5 sm:gap-2">
            {/* Questions left today (server count) */}
            {left !== null && (
              <Badge variant="secondary" className="text-xs tabular-nums" title={`Resets at midnight India time`}>
                {left}<span className="hidden sm:inline">&nbsp;left today</span><span className="sr-only sm:hidden"> questions left today</span>
              </Badge>
            )}

            {/* Voice Agent Toggle - Premium Feature */}
            {canVoice && (
              <Button
                variant={showVoiceAgent ? "default" : "ghost"}
                size="sm"
                className={cn("h-8", showVoiceAgent && "bg-primary")}
                onClick={() => setShowVoiceAgent(!showVoiceAgent)}
                title="Real-time Voice AI"
              >
                {showVoiceAgent ? (
                  <PhoneOff className="w-4 h-4" />
                ) : (
                  <Phone className="w-4 h-4" />
                )}
              </Button>
            )}

            {/* Voice Navigation Toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() => {
                setVoiceNavEnabled(!voiceNavEnabled);
                toast.info(voiceNavEnabled ? 'Voice navigation disabled' : 'Voice navigation enabled');
              }}
              title={voiceNavEnabled ? 'Voice navigation on' : 'Voice navigation off'}
            >
              <NavIcon className={cn(
                "w-4 h-4",
                voiceNavEnabled ? "text-primary" : "text-muted-foreground"
              )} />
            </Button>

            {/* Auto-speak toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() => setAutoSpeak(!autoSpeak)}
            >
              {autoSpeak ? (
                <Volume2 className="w-4 h-4 text-primary" />
              ) : (
                <VolumeX className="w-4 h-4 text-muted-foreground" />
              )}
            </Button>

            {/* Language selector */}
            <LanguageSelector
              selectedLanguage={language}
              onLanguageChange={setLanguage}
              compact
            />
          </div>
        </div>
      </header>

      {/* Chat Container */}
      <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        {/* Messages */}
        <ScrollArea 
          ref={scrollRef}
          className="flex-1 px-4 py-6"
        >
          <div ref={chatContainerRef} className="space-y-6">
            {/* Voice Agent Panel - Premium Feature */}
            {showVoiceAgent && canVoice && (
              <div className="mb-6">
                <VoiceAgent 
                  onTranscript={(text, role) => {
                    setMessages(prev => [...prev, {
                      id: `voice-${role}-${Date.now()}`,
                      role: role === 'user' ? 'user' : 'assistant',
                      content: text,
                      timestamp: new Date(),
                    }]);
                  }}
                />
              </div>
            )}

            {/* Context info - different for guest vs authenticated */}
            {!isAuthenticated && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm">
                <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span className="text-muted-foreground">
                  <Link to="/auth?next=/intelligence" className="text-primary hover:underline">Sign in</Link> for more questions a day. Answers from your own records are part of Pro and Scale.
                </span>
              </div>
            )}

            {brief && <FiguresBehindAnswers brief={brief} />}


            {/* Voice command hint */}
            {voiceNavEnabled && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 text-xs">
                <Mic className="w-3 h-3 text-primary flex-shrink-0" />
                <span className="text-muted-foreground">
                  Voice commands: "{getCommandSuggestions().slice(0, 3).join('", "')}"...
                </span>
              </div>
            )}

            {messages.map((message) => {
              const bits = message.role === 'assistant' ? chatBits(message.content) : [message.content];
              return bits.map((bit, i) => (
                <div key={`${message.id}-${i}`} className="group">
                  <ChatMessage
                    message={{ ...message, id: `${message.id}-${i}`, content: bit }}
                    onSpeak={(text) => handleSpeak(i === 0 ? message.content : text, message.id)}
                    isSpeaking={isSpeaking && speakingMessageId === message.id}
                    onStopSpeaking={handleStopSpeaking}
                  />
                </div>
              ));
            })}

            {isLoading && <TypingIndicator />}

            {/* What went wrong and what to do; never shown as an answer. */}
            {failure && !isLoading && (
              <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-secondary/40 p-3 text-sm">
                <Info className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="min-w-0 flex-1 text-muted-foreground">{failure.message}</span>
                {failure.retry && (
                  <Button size="sm" variant="outline" className="h-8" onClick={() => void handleSend(failure.question, { retry: true })}>
                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" />Try again
                  </Button>
                )}
                {failure.action && (
                  <Button size="sm" asChild className="h-8"><Link to={failure.action.to}>{failure.action.label}</Link></Button>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="sticky bottom-0 p-4 pb-20 md:pb-4 bg-gradient-to-t from-background via-background to-transparent">
          <div className="max-w-2xl mx-auto">
            <ChatInput
              onSend={handleSend}
              onVoiceStart={startListening}
              onVoiceEnd={stopListening}
              isLoading={isLoading}
              isListening={isListening}
              language={language}
            />

            {/* Quick prompts */}
            <div className="flex flex-wrap gap-2 mt-3 justify-center">
              {[
                "How can I reduce Scope 2?",
                "Green loan eligibility",
                "Net-zero roadmap",
                "Carbon credit value",
              ].map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSend(prompt)}
                  disabled={isLoading}
                  className="px-3 py-1.5 text-xs rounded-full bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

/** The figures an answer may use, with where each comes from. Collapsed by default. */
function FiguresBehindAnswers({ brief }: { brief: Brief }) {
  const b = brief.brief;
  if (brief.access.ownRecords && b && b.basis !== 'none') {
    const label = b.basis === 'verified' ? 'Verified' : 'Estimate';
    return (
      <details className="rounded-lg bg-secondary/50 p-3 text-sm">
        <summary className="cursor-pointer text-muted-foreground">
          Figures behind answers: {kgText(b.basis === 'verified' ? b.verified.kg : b.unverified.kg)} ({label.toLowerCase()}, {b.basis === 'verified' ? b.verified.records : b.unverified.records} records)
        </summary>
        <ul className="mt-2 space-y-1.5 text-muted-foreground">
          {b.hotspots.slice(0, 3).map((h) => (
            <li key={`${h.scope}-${h.category}`}>
              <span className="capitalize text-foreground">{h.category.replace(/[_-]+/g, ' ')}</span>: {kgText(h.kg)}, {Math.round(h.share * 100)}% · {label} · records {h.recordIds.slice(0, 3).map((id) => id.slice(0, 8)).join(', ')}{h.records > 3 ? '…' : ''}
            </li>
          ))}
          {brief.insights?.map((i) => (
            <li key={i.finding}>{i.finding} <Link to={i.next.path} className="text-primary hover:underline">{i.next.label}</Link></li>
          ))}
          {brief.projection && (
            <li>Projection, next 12 months: {kgText(brief.projection.next12Kg)} (range {kgText(brief.projection.lowKg)} to {kgText(brief.projection.highKg)}). {brief.projection.method}</li>
          )}
          <li className="text-xs">{b.calculation}{b.complete ? '' : ' Only the most recent records were read.'} <Link to="/history" className="text-primary hover:underline">See records</Link></li>
        </ul>
      </details>
    );
  }
  if (brief.access.savingsInsights && brief.insights?.length) {
    return (
      <details className="rounded-lg bg-secondary/50 p-3 text-sm">
        <summary className="cursor-pointer text-muted-foreground">Savings Insights from your records</summary>
        <ul className="mt-2 space-y-1.5 text-muted-foreground">
          {brief.insights.map((i) => (
            <li key={i.finding}>{i.finding} <Link to={i.next.path} className="text-primary hover:underline">{i.next.label}</Link></li>
          ))}
        </ul>
      </details>
    );
  }
  if (brief.sample) {
    return (
      <details className="rounded-lg bg-secondary/50 p-3 text-sm">
        <summary className="cursor-pointer text-muted-foreground">{brief.sample.label}: how an answer shows its maths</summary>
        <p className="mt-2 text-muted-foreground">{brief.sample.calculation}</p>
      </details>
    );
  }
  return null;
}

export default Intelligence;
