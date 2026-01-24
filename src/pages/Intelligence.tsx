import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Navigation } from '@/components/Navigation';
import { ChatMessage, Message, TypingIndicator } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { LanguageSelector } from '@/components/chat/LanguageSelector';
import { VoiceAgent } from '@/components/chat/VoiceAgent';
import { useVoiceOutput, useVoiceInput } from '@/components/VoiceOutput';
import { PremiumBadge, FeatureLock } from '@/components/PremiumBadge';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { useEmissions } from '@/hooks/useEmissions';
import { useSession } from '@/hooks/useSession';
import { Language, detectBrowserLanguage, getLanguageByCode } from '@/lib/languages';
import { matchVoiceCommand, getCommandSuggestions } from '@/lib/voiceCommands';
import { Brain, Sparkles, Zap, Volume2, VolumeX, Info, Mic, Navigation as NavIcon, Phone, PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const TRIAL_DAYS = 15;

const getTrialStatus = () => {
  const firstUse = localStorage.getItem('biocog_intelligence_first_use');
  if (!firstUse) {
    localStorage.setItem('biocog_intelligence_first_use', Date.now().toString());
    return { inTrial: true, daysLeft: TRIAL_DAYS };
  }
  
  const daysSinceFirst = (Date.now() - parseInt(firstUse)) / (1000 * 60 * 60 * 24);
  const daysLeft = Math.max(0, TRIAL_DAYS - Math.floor(daysSinceFirst));
  
  return { inTrial: daysLeft > 0, daysLeft };
};

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
  const { tier, isPremium, canAccessFeature, isAuthenticated } = usePremiumStatus();
  const { user } = useSession();
  const { emissions } = useEmissions();
  const trialStatus = getTrialStatus();

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

  // Calculate context from emissions - different for guest vs authenticated
  const context = {
    scope1: emissions?.filter(e => e.scope === 1).reduce((sum, e) => sum + e.co2_kg, 0) || 0,
    scope2: emissions?.filter(e => e.scope === 2).reduce((sum, e) => sum + e.co2_kg, 0) || 0,
    scope3: emissions?.filter(e => e.scope === 3).reduce((sum, e) => sum + e.co2_kg, 0) || 0,
    totalEmissions: emissions?.reduce((sum, e) => sum + e.co2_kg, 0) || 0,
    greenScore: Math.min(100, Math.max(0, 100 - (emissions?.length || 0) * 2)),
    sector: 'MSME',
    isAuthenticated,
    userTier: tier,
  };

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

  const handleSend = async (content: string) => {
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/intelligence-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
            context,
            language: language.name,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get response');
      }

      // Stream the response
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let assistantContent = '';
      const assistantId = `assistant-${Date.now()}`;

      // Add empty assistant message
      setMessages(prev => [...prev, {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      }]);

      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // Process line by line
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') continue;

          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantContent += delta;
              setMessages(prev => prev.map(m => 
                m.id === assistantId 
                  ? { ...m, content: assistantContent }
                  : m
              ));
            }
          } catch {
            // Incomplete JSON, keep in buffer
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }

      // Auto-speak if enabled
      if (autoSpeak && assistantContent) {
        setSpeakingMessageId(assistantId);
        speak(assistantContent);
      }

    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "I apologize, but I'm having trouble responding right now. Please try again in a moment.",
        timestamp: new Date(),
      }]);
    } finally {
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

  // Check access
  const hasAccess = canAccessFeature('aiEsgHead') || trialStatus.inTrial;
  const hasMultilingual = canAccessFeature('biocogSuperintelligence') || trialStatus.inTrial;

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navigation />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <Brain className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h1 className="text-2xl font-bold mb-2">AI ESG Head</h1>
            <p className="text-muted-foreground mb-6">
              Get personalized sustainability guidance from your AI-powered ESG advisor.
            </p>
            <PremiumBadge tier="pro" showUpgrade />
            <Button asChild className="mt-4">
              <Link to="/pricing">Upgrade to Pro</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>AI ESG Head — Senseible Intelligence</title>
        <meta name="description" content="Your AI-powered ESG advisor for real-time sustainability guidance and net-zero strategy." />
      </Helmet>

      <Navigation />

      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
              <Brain className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold flex items-center gap-2">
                Biocog Intelligence
                <Badge variant="outline" className="text-xs font-normal">
                  <Sparkles className="w-3 h-3 mr-1" />
                  AI ESG Head
                </Badge>
              </h1>
              <p className="text-xs text-muted-foreground">
                Your net-zero strategy advisor
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Trial badge */}
            {trialStatus.inTrial && !isPremium && (
              <Badge variant="secondary" className="text-xs">
                <Zap className="w-3 h-3 mr-1" />
                {trialStatus.daysLeft} days left
              </Badge>
            )}

            {/* Voice Agent Toggle - Premium Feature */}
            {isPremium && (
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
            <FeatureLock isLocked={!hasMultilingual} tier="pro">
              <LanguageSelector
                selectedLanguage={language}
                onLanguageChange={setLanguage}
                compact
              />
            </FeatureLock>
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
            {showVoiceAgent && isPremium && (
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

            {/* Fallback message for non-premium users */}
            {!isPremium && !trialStatus.inTrial && (
              <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-emerald-500/10 border border-primary/20 text-sm">
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground mb-1">Unlock Real-time Voice AI</p>
                    <p className="text-muted-foreground text-xs">
                      For real-time voice conversations with your AI ESG Head, upload more invoices to unlock personalized guidance. 
                      Your AI learns from your reports to provide founder-level precision.
                    </p>
                    <Link to="/pricing" className="text-primary text-xs hover:underline mt-2 inline-block">
                      Upgrade to Pro →
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Context info - different for guest vs authenticated */}
            {!isAuthenticated && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm">
                <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span className="text-muted-foreground">
                  <Link to="/auth" className="text-primary hover:underline">Sign in</Link> to save your conversation and get personalized insights based on your emission data.
                </span>
              </div>
            )}

            {isAuthenticated && context.totalEmissions > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50 text-sm">
                <Info className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">
                  Using your emission data: {context.totalEmissions.toFixed(1)} kg CO2e across {emissions?.length || 0} sources
                </span>
              </div>
            )}

            {/* Voice command hint */}
            {voiceNavEnabled && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 text-xs">
                <Mic className="w-3 h-3 text-primary flex-shrink-0" />
                <span className="text-muted-foreground">
                  Voice commands: "{getCommandSuggestions().slice(0, 3).join('", "')}"...
                </span>
              </div>
            )}

            {messages.map((message) => (
              <div key={message.id} className="group">
                <ChatMessage
                  message={message}
                  onSpeak={(text) => handleSpeak(text, message.id)}
                  isSpeaking={isSpeaking && speakingMessageId === message.id}
                  onStopSpeaking={handleStopSpeaking}
                />
              </div>
            ))}

            {isLoading && <TypingIndicator />}
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

export default Intelligence;
