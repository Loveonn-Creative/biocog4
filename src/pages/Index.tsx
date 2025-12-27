import { useState } from "react";
import { CarbonParticles } from "@/components/CarbonParticles";
import { DocumentInput } from "@/components/DocumentInput";
import { VoiceInput } from "@/components/VoiceInput";
import { ProcessingState } from "@/components/ProcessingState";
import { ResultState } from "@/components/ResultState";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";


type State = "idle" | "processing" | "result";

interface ExtractedItem {
  description: string;
  quantity?: number;
  unitPrice?: number;
  total?: number;
  category?: string;
}

interface ExtractedData {
  documentType: string;
  vendor?: string;
  date?: string;
  invoiceNumber?: string;
  amount?: number;
  currency?: string;
  items?: ExtractedItem[];
  taxAmount?: number;
  subtotal?: number;
  emissionCategory?: string;
  estimatedCO2Kg?: number;
  confidence: number;
}

interface ProcessingResult {
  type: "revenue" | "compliance";
  amount: number;
  documentType: string;
  extractedData?: ExtractedData;
}

const Index = () => {
  const [state, setState] = useState<State>("idle");
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [documentType, setDocumentType] = useState<string>("");

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix to get just base64
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const processDocument = async (file: File) => {
    setState("processing");
    setDocumentType("Analyzing document...");

    try {
      const imageBase64 = await fileToBase64(file);
      const mimeType = file.type || 'image/jpeg';

      console.log("Sending document for OCR processing...");
      
      const { data, error } = await supabase.functions.invoke('extract-document', {
        body: { imageBase64, mimeType }
      });

      if (error) {
        console.error("OCR Error:", error);
        toast.error("Failed to process document. Please try again.");
        setState("idle");
        return;
      }

      if (!data?.success || !data?.data) {
        console.error("Invalid response:", data);
        toast.error(data?.error || "Failed to extract data from document.");
        setState("idle");
        return;
      }

      const extractedData: ExtractedData = data.data;
      console.log("Extracted data:", extractedData);

      // Determine result type based on document
      const isCompliance = extractedData.documentType === 'certificate' || 
                          extractedData.emissionCategory === 'other';
      
      // Calculate revenue based on CO2 estimation (carbon credit pricing)
      // Using approximate carbon credit price of ₹500-800 per ton
      const co2Tons = (extractedData.estimatedCO2Kg || 0) / 1000;
      const carbonCreditValue = Math.round(co2Tons * 650); // Average price per ton

      const processingResult: ProcessingResult = {
        type: isCompliance ? "compliance" : "revenue",
        amount: carbonCreditValue > 0 ? carbonCreditValue : (extractedData.amount || 0),
        documentType: formatDocumentType(extractedData.documentType, extractedData.emissionCategory),
        extractedData
      };

      setDocumentType(processingResult.documentType);
      setResult(processingResult);
      setState("result");

      if (extractedData.estimatedCO2Kg && extractedData.estimatedCO2Kg > 0) {
        toast.success(`Extracted ${extractedData.estimatedCO2Kg.toFixed(2)} kg CO₂ from ${extractedData.documentType}`);
      }

    } catch (err) {
      console.error("Processing error:", err);
      toast.error("An error occurred while processing. Please try again.");
      setState("idle");
    }
  };

  const formatDocumentType = (docType: string, category?: string): string => {
    const typeMap: Record<string, string> = {
      'invoice': 'Invoice',
      'bill': 'Bill',
      'certificate': 'Certificate',
      'receipt': 'Receipt',
      'unknown': 'Document'
    };
    
    const categoryMap: Record<string, string> = {
      'electricity': 'Electricity',
      'fuel': 'Fuel',
      'transport': 'Transport',
      'materials': 'Materials',
      'waste': 'Waste',
      'other': ''
    };

    const formattedType = typeMap[docType] || 'Document';
    const formattedCategory = categoryMap[category || ''] || '';
    
    return formattedCategory ? `${formattedCategory} ${formattedType}` : formattedType;
  };

  const handleFileSelect = (file: File) => {
    console.log("File selected:", file.name);
    processDocument(file);
  };

  const handleVoiceInput = (transcript: string) => {
    console.log("Voice input:", transcript);
    // Voice input would require additional processing
    toast.info("Voice processing coming soon. Please upload a document for now.");
  };

  const handleConfirm = () => {
    toast.success("Saved! Your carbon data has been recorded.");
    handleReset();
  };

  const handleReset = () => {
    setState("idle");
    setResult(null);
    setDocumentType("");
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col bg-background overflow-hidden">
      {/* Ambient particles */}
      <CarbonParticles />
      
      {/* Header with brand */}
      <header className="relative z-20 w-full pt-8 pb-4">
        <Link to="/" className="block">
          <h1 className="text-2xl sm:text-3xl font-semibold text-center text-foreground tracking-tight">
            senseible
          </h1>
        </Link>
      </header>

      {/* Main content - centered */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 -mt-16">
        {state === "idle" && (
          <div className="flex flex-col items-center gap-10 animate-fade-in">
            {/* Dual input - properly aligned */}
            <div className="flex items-start gap-6 sm:gap-10">
              <DocumentInput 
                onFileSelect={handleFileSelect} 
                isProcessing={false} 
              />
              
              {/* Center divider */}
              <div className="flex items-center h-28 sm:h-32">
                <div className="w-px h-16 bg-border/60" />
              </div>
              
              <VoiceInput 
                onVoiceInput={handleVoiceInput} 
                isProcessing={false} 
              />
            </div>
            
            {/* Instruction text */}
            <p className="text-sm sm:text-base text-muted-foreground text-center">
              Upload a document or speak to begin
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
      </main>
      
      {/* Footer navigation - always visible */}
      <footer className="relative z-20 w-full pb-8 pt-4">
        <nav className="flex items-center justify-center gap-6 sm:gap-8">
          <Link 
            to="/mission" 
            className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors tracking-wide uppercase"
          >
            Mission
          </Link>
          <Link 
            to="/about" 
            className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors tracking-wide uppercase"
          >
            About
          </Link>
          <Link 
            to="/carbon-credits" 
            className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors tracking-wide uppercase"
          >
            Carbon
          </Link>
          <Link 
            to="/climate-finance" 
            className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors tracking-wide uppercase"
          >
            Climate
          </Link>
          <Link 
            to="/principles" 
            className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors tracking-wide uppercase"
          >
            Principles
          </Link>
        </nav>
      </footer>
    </div>
  );
};

export default Index;
