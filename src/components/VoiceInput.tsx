import { useState, useEffect } from "react";
import { Mic, MicOff } from "lucide-react";

interface VoiceInputProps {
  onVoiceInput: (transcript: string) => void;
  isProcessing: boolean;
}

export const VoiceInput = ({ onVoiceInput, isProcessing }: VoiceInputProps) => {
  const [isListening, setIsListening] = useState(false);
  const [pulseScale, setPulseScale] = useState(1);

  useEffect(() => {
    if (isListening) {
      const interval = setInterval(() => {
        setPulseScale(1 + Math.random() * 0.1);
      }, 150);
      return () => clearInterval(interval);
    } else {
      setPulseScale(1);
    }
  }, [isListening]);

  const handleClick = () => {
    if (isProcessing) return;
    
    if (!isListening) {
      setIsListening(true);
      
      // Simulated voice recognition
      setTimeout(() => {
        const sampleInputs = [
          "I have an electricity bill for 15000 rupees from MSEDCL",
          "Diesel purchase invoice from Indian Oil, 50 liters",
          "Monthly transport expenses around 8000 rupees",
        ];
        const randomInput = sampleInputs[Math.floor(Math.random() * sampleInputs.length)];
        onVoiceInput(randomInput);
        setIsListening(false);
      }, 2500);
    } else {
      setIsListening(false);
    }
  };

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
        {isListening ? (
          <MicOff className="w-8 h-8 sm:w-10 sm:h-10 text-primary animate-pulse" strokeWidth={1.5} />
        ) : (
          <Mic 
            className="w-8 h-8 sm:w-10 sm:h-10 transition-all duration-300 text-muted-foreground group-hover:text-primary"
            strokeWidth={1.5}
          />
        )}
        
        {/* Listening ripple effect */}
        {isListening && (
          <div className="absolute inset-0 rounded-2xl border-2 border-primary/30 animate-ping" />
        )}
      </div>
      
      <span className="text-sm text-muted-foreground font-medium tracking-wide">
        {isListening ? "Listening..." : "Voice"}
      </span>
    </div>
  );
};
