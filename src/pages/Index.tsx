import { useState } from "react";
import { CarbonParticles } from "@/components/CarbonParticles";
import { DocumentInput } from "@/components/DocumentInput";
import { VoiceInput } from "@/components/VoiceInput";
import { ProcessingState } from "@/components/ProcessingState";
import { ResultState } from "@/components/ResultState";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSession } from "@/hooks/useSession";

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
  documentId?: string;
  emissionId?: string;
}

const Index = () => {
  const navigate = useNavigate();
  const { sessionId, user } = useSession();
  const [state, setState] = useState<State>("idle");
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [documentType, setDocumentType] = useState<string>("");

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const saveToDatabase = async (extractedData: ExtractedData): Promise<{ documentId: string; emissionId: string } | null> => {
    try {
      // Save document
      const { data: docData, error: docError } = await supabase
        .from('documents')
        .insert({
          session_id: sessionId,
          user_id: user?.id || null,
          document_type: extractedData.documentType,
          vendor: extractedData.vendor,
          invoice_date: extractedData.date ? new Date(extractedData.date).toISOString().split('T')[0] : null,
          invoice_number: extractedData.invoiceNumber,
          amount: extractedData.amount,
          currency: extractedData.currency || 'INR',
          tax_amount: extractedData.taxAmount,
          subtotal: extractedData.subtotal,
          confidence: extractedData.confidence,
          raw_ocr_data: extractedData as any
        })
        .select()
        .single();

      if (docError) {
        console.error('Document save error:', docError);
        return null;
      }

      // Calculate scope based on category
      const scopeMap: Record<string, number> = {
        'fuel': 1,
        'electricity': 2,
        'transport': 3,
        'materials': 3,
        'waste': 3,
        'other': 3
      };

      const scope = scopeMap[extractedData.emissionCategory || 'other'] || 3;

      // Save emission
      const { data: emissionData, error: emissionError } = await supabase
        .from('emissions')
        .insert({
          document_id: docData.id,
          session_id: sessionId,
          user_id: user?.id || null,
          scope: scope,
          category: extractedData.emissionCategory || 'other',
          co2_kg: extractedData.estimatedCO2Kg || 0,
          data_quality: extractedData.confidence >= 0.8 ? 'high' : extractedData.confidence >= 0.5 ? 'medium' : 'low',
          verified: false
        })
        .select()
        .single();

      if (emissionError) {
        console.error('Emission save error:', emissionError);
        return null;
      }

      console.log('Saved to database - Document:', docData.id, 'Emission:', emissionData.id);
      return { documentId: docData.id, emissionId: emissionData.id };
    } catch (error) {
      console.error('Database save error:', error);
      return null;
    }
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

      // Save to database
      const savedIds = await saveToDatabase(extractedData);

      // Determine result type based on document
      const isCompliance = extractedData.documentType === 'certificate' || 
                          extractedData.emissionCategory === 'other';
      
      // Calculate revenue based on CO2 estimation
      const co2Tons = (extractedData.estimatedCO2Kg || 0) / 1000;
      const carbonCreditValue = Math.round(co2Tons * 650);

      const processingResult: ProcessingResult = {
        type: isCompliance ? "compliance" : "revenue",
        amount: carbonCreditValue > 0 ? carbonCreditValue : (extractedData.amount || 0),
        documentType: formatDocumentType(extractedData.documentType, extractedData.emissionCategory),
        extractedData,
        documentId: savedIds?.documentId,
        emissionId: savedIds?.emissionId
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
    toast.info("Voice processing coming soon. Please upload a document for now.");
  };

  const handleConfirm = () => {
    toast.success("Saved! Your carbon data has been recorded.");
    // Navigate to verify page with the emission data
    if (result?.emissionId) {
      navigate(`/verify?emission=${result.emissionId}`);
    } else {
      navigate('/verify');
    }
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
            extractedData={result.extractedData}
            onConfirm={handleConfirm}
            onReset={handleReset}
          />
        )}
      </main>
      
      {/* Footer navigation - always visible */}
      <footer className="relative z-20 w-full pb-8 pt-4">
        <nav className="flex items-center justify-center gap-4 sm:gap-6 flex-wrap px-4">
          <Link 
            to="/dashboard" 
            className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors tracking-wide uppercase"
          >
            Dashboard
          </Link>
          <Link 
            to="/mrv-dashboard" 
            className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors tracking-wide uppercase"
          >
            MRV
          </Link>
          <Link 
            to="/verify" 
            className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors tracking-wide uppercase"
          >
            Verify
          </Link>
          <Link 
            to="/monetize" 
            className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors tracking-wide uppercase"
          >
            Monetize
          </Link>
          <Link 
            to="/reports" 
            className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors tracking-wide uppercase"
          >
            Reports
          </Link>
          <Link 
            to="/mission" 
            className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors tracking-wide uppercase"
          >
            Mission
          </Link>
        </nav>
      </footer>
    </div>
  );
};

export default Index;
