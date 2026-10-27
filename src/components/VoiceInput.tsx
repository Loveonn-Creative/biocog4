import { useState, useEffect, useCallback, useRef } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { useT } from "@/lib/i18n/useT";

interface VoiceInputProps {
  onVoiceInput: (transcript: string) => void;
  isProcessing: boolean;
  /** Speech code for the site language, e.g. "hi-IN". */
  lang?: string;
  /** Called as listening starts, so a spoken answer can go quiet. */
  onListenStart?: () => void;
}

export const VoiceInput = ({ onVoiceInput, isProcessing, lang = "en-IN", onListenStart }: VoiceInputProps) => {
  const t = useT();
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [pulseScale, setPulseScale] = useState(1);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check for browser support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = lang;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);

    recognition.onerror = (event: any) => {
      setIsListening(false);
      
      if (event.error === 'not-allowed') {
        toast.error('Allow microphone access in your browser to use voice.');
      } else if (event.error === 'no-speech') {
        toast.info('No speech detected. Please try again.');
      } else if (event.error !== 'aborted') {
        toast.error('Voice recognition error. Please try again.');
      }
    };

    recognition.onresult = (event: any) => {
      const results = event.results;
      let finalTranscript = '';
      
      for (let i = 0; i < results.length; i++) {
        if (results[i].isFinal) {
          finalTranscript += results[i][0].transcript;
        }
      }
      
      if (finalTranscript) {
        onVoiceInput(finalTranscript.trim());
        recognition.stop();
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onVoiceInput, lang]);

  // Pulse animation when listening
  useEffect(() => {
    if (isListening) {
      const interval = setInterval(() => {
        setPulseScale(1 + Math.random() * 0.15);
      }, 150);
      return () => clearInterval(interval);
    } else {
      setPulseScale(1);
    }
  }, [isListening]);

  const handleClick = useCallback(() => {
    if (isProcessing) return;
    
    if (!isSupported) {
      toast.error('Voice input is not supported in your browser. Try Chrome or Edge.');
      return;
    }
    
    if (!isListening) {
      try {
        // Stop any answer being read aloud before listening.
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        onListenStart?.();
        recognitionRef.current?.start();
      } catch {
        toast.error('Voice could not start. Try again.');
      }
    } else {
      recognitionRef.current?.stop();
    }
  }, [isProcessing, isListening, isSupported, onListenStart]);

  if (!isSupported) {
    return (
      <Link to="/intelligence" className="flex flex-col items-center gap-3 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span className="relative flex items-center justify-center w-28 h-28 sm:w-32 sm:h-32 rounded-2xl border-2 border-border/60 bg-background">
          <MicOff className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
        </span>
        <span className="text-sm text-muted-foreground font-medium tracking-wide">
          {t("home.voice.type", "Type instead")}
        </span>
      </Link>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={isProcessing}
        // Labels come from t(); the page translator is kept off this button
        // because it would pin the first label and miss the listening change.
        data-no-translate
        aria-label={isListening ? t("home.voice.stopListening", "Stop listening") : t("home.voice.ask", "Ask by voice")}
        aria-pressed={isListening}
        className={`
          relative flex items-center justify-center
          w-28 h-28 sm:w-32 sm:h-32
          rounded-2xl cursor-pointer
          transition-all duration-300 ease-out
          ${isListening 
            ? "bg-primary/5 border-primary/40" 
            : "bg-background border-border/60 hover:border-primary/30 hover:bg-secondary/30"
          }
          ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}
          border-2
          group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
        `}
        style={{ transform: isListening ? `scale(${pulseScale})` : "scale(1)" }}
      >
        {isProcessing ? (
          <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 text-primary animate-spin" strokeWidth={1.5} />
        ) : isListening ? (
          <MicOff className="w-8 h-8 sm:w-10 sm:h-10 text-primary animate-pulse" strokeWidth={1.5} />
        ) : (
          <Mic 
            className="w-8 h-8 sm:w-10 sm:h-10 transition-all duration-300 text-muted-foreground group-hover:text-primary"
            strokeWidth={1.5}
          />
        )}
        
        {/* Listening ripple effect */}
        {isListening && (
          <>
            <span className="absolute inset-0 rounded-2xl border-2 border-primary/30 animate-ping motion-reduce:animate-none" aria-hidden="true" />
            <span className="absolute inset-2 rounded-xl border border-primary/20 animate-pulse motion-reduce:animate-none" aria-hidden="true" />
          </>
        )}
      </button>
      
      <span className="text-sm text-muted-foreground font-medium tracking-wide" aria-hidden="true">
        {isProcessing ? "Processing..." : isListening ? "Listening..." : "Voice"}
      </span>
    </div>
  );
};
