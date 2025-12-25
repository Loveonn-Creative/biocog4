import { useEffect, useState } from "react";

interface ProcessingStateProps {
  documentType?: string;
}

export const ProcessingState = ({ documentType }: ProcessingStateProps) => {
  const [step, setStep] = useState(0);
  
  const steps = [
    "Reading document...",
    "Extracting carbon data...",
    "Calculating emissions...",
    "Identifying value...",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => (prev + 1) % steps.length);
    }, 600);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center gap-6 animate-fade-in">
      {/* Carbon absorption visual */}
      <div className="relative w-24 h-24">
        <div className="absolute inset-0 rounded-full bg-primary/5 animate-breathe" />
        <div className="absolute inset-2 rounded-full bg-primary/10 animate-breathe delay-100" />
        <div className="absolute inset-4 rounded-full bg-primary/15 animate-breathe delay-200" />
        <div className="absolute inset-6 rounded-full bg-primary/20 animate-breathe delay-300" />
        
        {/* Center dot */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 rounded-full bg-primary animate-pulse" />
        </div>
      </div>
      
      {/* Processing text */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground transition-all duration-300">
          {steps[step]}
        </p>
        {documentType && (
          <p className="text-xs text-muted-foreground/60 mt-2">
            {documentType}
          </p>
        )}
      </div>
      
      {/* Progress dots */}
      <div className="flex gap-1.5">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`
              w-1.5 h-1.5 rounded-full transition-all duration-300
              ${i === step ? "bg-primary scale-125" : "bg-border"}
            `}
          />
        ))}
      </div>
    </div>
  );
};
