import { useState } from "react";
import { CarbonParticles } from "@/components/CarbonParticles";
import { DocumentInput } from "@/components/DocumentInput";
import { VoiceInput } from "@/components/VoiceInput";
import { ProcessingState } from "@/components/ProcessingState";
import { ResultState } from "@/components/ResultState";
import { Link } from "react-router-dom";
import senseibleLogo from "@/assets/senseible-logo.png";

type State = "idle" | "processing" | "result";

interface ProcessingResult {
  type: "revenue" | "compliance";
  amount: number;
  documentType: string;
}

const Index = () => {
  const [state, setState] = useState<State>("idle");
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [documentType, setDocumentType] = useState<string>("");

  const simulateProcessing = (inputType: string) => {
    setState("processing");
    
    // Simulate document types and outcomes
    const outcomes: ProcessingResult[] = [
      { type: "revenue", amount: 12450, documentType: "Electricity Invoice" },
      { type: "revenue", amount: 8750, documentType: "Fuel Purchase Bill" },
      { type: "revenue", amount: 15200, documentType: "Transport Receipt" },
      { type: "compliance", amount: 0, documentType: "GSTIN Certificate" },
      { type: "revenue", amount: 22100, documentType: "Manufacturing Invoice" },
    ];
    
    const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];
    setDocumentType(outcome.documentType);
    
    // Simulate processing time (1.5-2.5 seconds)
    setTimeout(() => {
      setResult(outcome);
      setState("result");
    }, 1800 + Math.random() * 700);
  };

  const handleFileSelect = (file: File) => {
    console.log("File selected:", file.name);
    simulateProcessing("document");
  };

  const handleVoiceInput = (transcript: string) => {
    console.log("Voice input:", transcript);
    simulateProcessing("voice");
  };

  const handleConfirm = () => {
    // In production, this would save to database or trigger next action
    alert("Saved! In production, this would save to your account and initiate the monetization process.");
    handleReset();
  };

  const handleReset = () => {
    setState("idle");
    setResult(null);
    setDocumentType("");
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center bg-background overflow-hidden">
      {/* Ambient particles */}
      <CarbonParticles />
      
      {/* Subtle logo - visible on hover */}
      <Link 
        to="/" 
        className="fixed top-6 left-6 z-50 opacity-0 hover:opacity-100 transition-opacity duration-500"
      >
        <img 
          src={senseibleLogo} 
          alt="Senseible" 
          className="h-7 w-auto invert"
        />
      </Link>
      
      {/* Hidden nav access */}
      <Link 
        to="/mission"
        className="fixed top-6 right-6 z-50 opacity-0 hover:opacity-100 transition-opacity duration-500 text-sm text-muted-foreground hover:text-foreground"
      >
        Explore
      </Link>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center px-4 py-20 w-full max-w-lg">
        
        {state === "idle" && (
          <div className="flex flex-col items-center gap-12 animate-fade-in">
            {/* Dual input - perfectly centered and symmetrical */}
            <div className="flex items-center gap-8 sm:gap-12">
              <DocumentInput 
                onFileSelect={handleFileSelect} 
                isProcessing={false} 
              />
              
              {/* Center divider with subtle "or" */}
              <div className="flex flex-col items-center gap-2">
                <div className="w-px h-8 bg-border" />
                <span className="text-xs text-muted-foreground/50 font-medium">or</span>
                <div className="w-px h-8 bg-border" />
              </div>
              
              <VoiceInput 
                onVoiceInput={handleVoiceInput} 
                isProcessing={false} 
              />
            </div>
            
            {/* Subtle instruction - appears after a moment */}
            <p className="text-sm text-muted-foreground/60 text-center max-w-xs animate-fade-in delay-500" style={{ animationDelay: "1s" }}>
              Upload an invoice or speak to convert carbon data into value
            </p>
          </div>
        )}

        {state === "processing" && (
          <ProcessingState documentType={documentType} />
        )}

        {state === "result" && result && (
          <ResultState 
            type={result.type}
            amount={result.amount}
            onConfirm={handleConfirm}
            onReset={handleReset}
          />
        )}
      </div>
      
      {/* Subtle footer - visible on hover */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center opacity-0 hover:opacity-100 transition-opacity duration-500">
        <div className="flex gap-6 text-xs text-muted-foreground/50">
          <Link to="/mission" className="hover:text-muted-foreground transition-colors">Mission</Link>
          <Link to="/principles" className="hover:text-muted-foreground transition-colors">Principles</Link>
          <Link to="/carbon-credits" className="hover:text-muted-foreground transition-colors">Carbon Credits</Link>
        </div>
      </div>
    </div>
  );
};

export default Index;
