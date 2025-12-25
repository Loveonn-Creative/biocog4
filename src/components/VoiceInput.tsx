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
        setPulseScale(1 + Math.random() * 0.15);
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
    <div
      onClick={handleClick}
      className={`
        relative flex flex-col items-center justify-center
        w-32 h-32 sm:w-36 sm:h-36
        rounded-full cursor-pointer
        transition-all duration-500 ease-out
        ${isListening 
          ? "bg-primary/10 border-primary/40" 
          : "bg-secondary/50 border-border hover:bg-secondary hover:border-primary/20"
        }
        ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}
        border-2
        group
      `}
      style={{ transform: isListening ? `scale(${pulseScale})` : "scale(1)" }}
    >
      <div className="flex flex-col items-center gap-3 transition-transform duration-300 group-hover:scale-105">
        {isListening ? (
          <MicOff className="w-7 h-7 text-primary animate-pulse" />
        ) : (
          <Mic 
            className={`
              w-7 h-7 transition-all duration-300
              text-muted-foreground group-hover:text-primary
            `}
          />
        )}
        <span className="text-xs text-muted-foreground font-medium tracking-wide">
          {isListening ? "Listening..." : "Voice"}
        </span>
      </div>
      
      {/* Listening ripple effect */}
      {isListening && (
        <>
          <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
          <div className="absolute inset-2 rounded-full border border-primary/20 animate-pulse" />
        </>
      )}
      
      {/* Hover ring */}
      <div className="absolute inset-0 rounded-full border border-primary/0 group-hover:border-primary/10 transition-all duration-500" />
    </div>
  );
};
