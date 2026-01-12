import { useState, useEffect, useCallback, useRef } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface VoiceInputProps {
  onVoiceInput: (transcript: string) => void;
  isProcessing: boolean;
}

export const VoiceInput = ({ onVoiceInput, isProcessing }: VoiceInputProps) => {
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
    recognition.lang = 'en-IN'; // Default to Indian English
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log('Voice recognition started');
      setIsListening(true);
    };

    recognition.onend = () => {
      console.log('Voice recognition ended');
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      
      if (event.error === 'not-allowed') {
        toast.error('Microphone access denied. Please enable microphone permissions.');
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
        console.log('Voice transcript:', finalTranscript);
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
  }, [onVoiceInput]);

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
        recognitionRef.current?.start();
        toast.info('Listening... Speak now');
      } catch (error) {
        console.error('Failed to start recognition:', error);
        toast.error('Failed to start voice input. Please try again.');
      }
    } else {
      recognitionRef.current?.stop();
    }
  }, [isProcessing, isListening, isSupported]);

  if (!isSupported) {
    return (
      <div className="flex flex-col items-center gap-3 opacity-50">
        <div className="relative flex items-center justify-center w-28 h-28 sm:w-32 sm:h-32 rounded-2xl border-2 border-border/60 bg-background cursor-not-allowed">
          <MicOff className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground" strokeWidth={1.5} />
        </div>
        <span className="text-sm text-muted-foreground font-medium tracking-wide">
          Not supported
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        onClick={handleClick}
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
          group
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
            <div className="absolute inset-0 rounded-2xl border-2 border-primary/30 animate-ping" />
            <div className="absolute inset-2 rounded-xl border border-primary/20 animate-pulse" />
          </>
        )}
      </div>
      
      <span className="text-sm text-muted-foreground font-medium tracking-wide">
        {isProcessing ? "Processing..." : isListening ? "Listening..." : "Voice"}
      </span>
    </div>
  );
};
