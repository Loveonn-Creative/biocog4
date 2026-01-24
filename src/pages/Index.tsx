import { useState } from "react";
import { CarbonParticles } from "@/components/CarbonParticles";
import { DocumentInput } from "@/components/DocumentInput";
import { VoiceInput } from "@/components/VoiceInput";
import { ProcessingState } from "@/components/ProcessingState";
import { ResultState } from "@/components/ResultState";
import { OnboardingTour } from "@/components/OnboardingTour";
import { HomeNavIcons } from "@/components/HomeNavIcons";
import { UseCaseTyper } from "@/components/UseCaseTyper";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSession } from "@/hooks/useSession";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";
import { validateInvoiceForPremium, extractGstinFromInvoice } from "@/lib/gstinValidation";

type State = "idle" | "processing" | "result";

interface ExtractedLineItem {
  description: string;
  hsn_code?: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  total?: number;
  productCategory?: string;
  industryCode?: string;
  scope?: number;
  fuelType?: string;
  co2Kg?: number;
  emissionFactor?: number;
  factorSource?: string;
  classificationMethod?: 'HSN' | 'KEYWORD' | 'UNVERIFIABLE';
}

interface ExtractedData {
  documentType: string;
  vendor?: string;
  date?: string;
  invoiceNumber?: string;
  supplierGstin?: string;
  buyerGstin?: string;
  amount?: number;
  currency?: string;
  lineItems?: ExtractedLineItem[];
  taxAmount?: number;
  subtotal?: number;
  primaryScope?: number;
  primaryCategory?: string;
  totalCO2Kg?: number;
  emissionCategory?: string;
  estimatedCO2Kg?: number;
  confidence: number;
  validationFlags?: string[];
  classificationStatus?: 'VERIFIED' | 'PARTIALLY_VERIFIED' | 'UNVERIFIABLE';
}

interface ProcessingResult {
  type: "revenue" | "compliance";
  amount: number;
  documentType: string;
  extractedData?: ExtractedData;
  documentId?: string;
  emissionId?: string;
}

// ============= DETERMINISTIC SCOPE MAPPING =============
// Per BIOCOG MRV spec: Category determines scope, not AI
const SCOPE_MAP: Record<string, number> = {
  'fuel': 1,          // Scope 1 - Direct emissions
  'electricity': 2,   // Scope 2 - Purchased energy (FIXED: was sometimes 1)
  'transport': 3,     // Scope 3 - Value chain
  'materials': 3,
  'waste': 3,
  'other': 3
};

// Map productCategory to our category format
const CATEGORY_MAP: Record<string, string> = {
  'FUEL': 'fuel',
  'ELECTRICITY': 'electricity',
  'TRANSPORT': 'transport',
  'RAW_MATERIAL': 'materials',
  'WASTE': 'waste',
  'CHEMICALS': 'materials',
  'CAPITAL_GOODS': 'materials',
  'ELECTRICAL_EQUIPMENT': 'materials',
  'TRANSPORT_EQUIPMENT': 'transport',
  'SERVICES': 'other',
};

// Helper to get category from OCR response
const getCategoryFromOCR = (data: ExtractedData): string => {
  if (data.primaryCategory && CATEGORY_MAP[data.primaryCategory]) {
    return CATEGORY_MAP[data.primaryCategory];
  }
  
  if (data.emissionCategory) {
    return data.emissionCategory;
  }
  
  const firstItem = data.lineItems?.[0];
  if (firstItem?.productCategory && CATEGORY_MAP[firstItem.productCategory]) {
    return CATEGORY_MAP[firstItem.productCategory];
  }
  
  return 'other';
};

// Helper to get scope from category (DETERMINISTIC)
// This OVERRIDES any AI-provided scope to ensure correctness
const getScopeFromCategory = (category: string): number => {
  return SCOPE_MAP[category] || 3;
};

// Fixed carbon credit rate (same as backend)
const CARBON_CREDIT_RATE = 750;

const Index = () => {
  const navigate = useNavigate();
  const { sessionId, user } = useSession();
  const { isPremium } = usePremiumStatus();
  const [state, setState] = useState<State>("idle");
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [documentType, setDocumentType] = useState<string>("");
  
  const getProfileGstin = (): string | undefined => {
    try {
      const stored = localStorage.getItem('senseible_company_profile');
      if (stored) {
        const profile = JSON.parse(stored);
        return profile.gstin;
      }
    } catch {}
    return undefined;
  };

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

  const saveToDatabase = async (extractedData: ExtractedData, documentHash?: string, userTier?: string): Promise<{ documentId: string; emissionId: string } | null> => {
    try {
      // Calculate cache expiration (30 days for paid users)
      const isPaidTier = ['essential', 'pro', 'scale'].includes(userTier || '');
      const cacheExpiresAt = isPaidTier && user?.id
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        : null;

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
          raw_ocr_data: extractedData as any,
          document_hash: documentHash || null,
          cached_result: isPaidTier ? extractedData : null,
          cache_expires_at: cacheExpiresAt,
        } as any)
        .select()
        .single();

      if (docError) {
        console.error('Document save error:', docError);
        return null;
      }

      // Get emission data - use new fields with fallback to legacy
      const co2Kg = extractedData.totalCO2Kg ?? extractedData.estimatedCO2Kg ?? 0;
      const category = getCategoryFromOCR(extractedData);
      
      // CRITICAL: Use our deterministic scope mapping, NOT the OCR's primaryScope
      // This ensures electricity is always Scope 2, fuel is always Scope 1, etc.
      const scope = getScopeFromCategory(category);
      
      const firstItem = extractedData.lineItems?.[0];
      const activityData = firstItem?.quantity ?? null;
      const activityUnit = firstItem?.unit ?? null;
      const emissionFactor = firstItem?.emissionFactor ?? null;

      const { data: emissionData, error: emissionError } = await supabase
        .from('emissions')
        .insert({
          document_id: docData.id,
          session_id: sessionId,
          user_id: user?.id || null,
          scope: scope,
          category: category,
          co2_kg: co2Kg,
          activity_data: activityData,
          activity_unit: activityUnit,
          emission_factor: emissionFactor,
          data_quality: extractedData.confidence >= 80 ? 'high' : extractedData.confidence >= 50 ? 'medium' : 'low',
          verified: false
        })
        .select()
        .single();

      if (emissionError) {
        console.error('Emission save error:', emissionError);
        return null;
      }

      console.log('Saved to database - Document:', docData.id, 'Emission:', emissionData.id, 'Scope:', scope);
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

      // Handle irrelevant document rejection
      if (data?.isIrrelevant) {
        toast.error(data.error || "This document is not supported for carbon accounting.");
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

      // Validation warnings for low-confidence or missing data
      const warnings: string[] = [];
      if (extractedData.confidence < 50) {
        warnings.push('Low confidence extraction - please verify the data');
      }
      if (!extractedData.amount && !extractedData.totalCO2Kg && !extractedData.estimatedCO2Kg) {
        warnings.push('Amount or CO₂ data could not be extracted');
      }
      if (!extractedData.vendor) {
        warnings.push('Vendor name not detected');
      }
      if (!extractedData.date) {
        warnings.push('Invoice date not detected');
      }
      
      // Show warnings to user
      if (warnings.length > 0) {
        warnings.forEach(w => toast.warning(w, { duration: 4000 }));
      }

      const savedIds = await saveToDatabase(extractedData, data.documentHash, data.userTier);

      if (savedIds) {
        toast.success('Data saved successfully!', { duration: 2000 });
      } else {
        toast.error('Failed to save data. Please try again.');
      }

      const calculatedCO2 = extractedData.totalCO2Kg ?? extractedData.estimatedCO2Kg ?? 0;
      const emissionCat = getCategoryFromOCR(extractedData);
      
      const isCompliance = extractedData.documentType === 'certificate' || 
                          emissionCat === 'other';
      
      // DETERMINISTIC: CO2 × Fixed Rate = Carbon Credit Value
      const co2Tons = calculatedCO2 / 1000;
      const carbonCreditValue = Math.round(co2Tons * CARBON_CREDIT_RATE);

      const processingResult: ProcessingResult = {
        type: isCompliance ? "compliance" : "revenue",
        amount: carbonCreditValue > 0 ? carbonCreditValue : (extractedData.amount || 0),
        documentType: formatDocumentType(extractedData.documentType, emissionCat),
        extractedData: {
          ...extractedData,
          validationFlags: warnings,
        },
        documentId: savedIds?.documentId,
        emissionId: savedIds?.emissionId
      };

      setDocumentType(processingResult.documentType);
      setResult(processingResult);
      setState("result");

      if (calculatedCO2 > 0) {
        toast.success(`Extracted ${calculatedCO2.toFixed(2)} kg CO₂ from ${extractedData.documentType}`);
      } else if (warnings.length === 0) {
        toast.info('Document processed. No carbon emissions detected.');
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

  const handleVoiceInput = async (transcript: string) => {
    console.log("Voice input:", transcript);
    setState("processing");
    setDocumentType("Processing voice query...");
    
    try {
      // Send to intelligence-chat with stream: false for voice queries
      const response = await supabase.functions.invoke('intelligence-chat', {
        body: { 
          messages: [{ role: 'user', content: transcript }],
          context: { isHomepage: true, type: 'voice_query' },
          language: 'English',
          stream: false  // Non-streaming for voice - returns JSON directly
        }
      });

      setState("idle");

      if (response.error) {
        console.error("Voice AI error:", response.error);
        toast.error("Voice processing unavailable. Please upload a document.");
        return;
      }

      // Get the AI response from OpenAI-compatible format
      const data = response.data;
      if (data) {
        let responseText = '';
        
        // Handle OpenAI-compatible response format
        if (data.choices?.[0]?.message?.content) {
          responseText = data.choices[0].message.content;
        } else if (typeof data === 'string') {
          responseText = data;
        } else if (data.error) {
          toast.error(data.error);
          return;
        }

        if (responseText) {
          // Clean response: remove markdown formatting for voice
          responseText = responseText
            .replace(/\*\*/g, '')
            .replace(/\*/g, '')
            .replace(/_/g, '')
            .replace(/#{1,6}\s/g, '')
            .replace(/\n- /g, '. ')
            .replace(/\n\d+\. /g, '. ')
            .trim();
          
          // Show response in toast (truncated for UI)
          toast.info(responseText.substring(0, 200) + (responseText.length > 200 ? '...' : ''));
          
          // Use browser TTS to speak the response
          if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            
            const utterance = new SpeechSynthesisUtterance(responseText);
            utterance.lang = 'en-IN';
            utterance.rate = 0.9;
            utterance.pitch = 1;
            window.speechSynthesis.speak(utterance);
          }
        } else {
          toast.info("I understood your query. For carbon accounting, please upload an invoice or bill.");
        }
      }
    } catch (error) {
      console.error("Voice processing error:", error);
      setState("idle");
      toast.error("Voice processing unavailable. Please upload a document.");
    }
  };

  const handleConfirm = () => {
    toast.success("Saved! Your carbon data has been recorded.");
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
      <OnboardingTour currentStep={state === 'idle' ? 'upload' : state === 'processing' ? 'processing' : 'upload'} />
      
      <CarbonParticles />
      
      {/* Top-right navigation icons */}
      <HomeNavIcons />
      
      <header className="relative z-20 w-full pt-5 pb-2">
        <Link to="/" className="block">
          <h1 className="text-2xl sm:text-3xl font-semibold text-center text-foreground tracking-tight">
            senseible
          </h1>
        </Link>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 -mt-10">
        {state === "idle" && (
          <div className="flex flex-col items-center gap-8 animate-fade-in">
            {/* Animated use case headline - ABOVE icons for maximum impact */}
            <UseCaseTyper className="mb-2" />
            
            <div className="flex items-start gap-4 sm:gap-6">
              <DocumentInput 
                onFileSelect={handleFileSelect} 
                isProcessing={false} 
              />
              
              <div className="flex items-center h-28 sm:h-32">
                <div className="w-px h-14 bg-border/60" />
              </div>
              
              <VoiceInput 
                onVoiceInput={handleVoiceInput} 
                isProcessing={false} 
              />
            </div>
            
            <p className="text-xs text-muted-foreground/60 text-center mt-2">
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
      
      <footer className="relative z-20 w-full pb-6 pt-3">
        <nav className="flex items-center justify-center gap-5 sm:gap-7 flex-wrap px-4">
          <Link 
            to="/monetize" 
            className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors tracking-wide uppercase"
          >
            Monetize
          </Link>
          <Link 
            to="/about" 
            className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors tracking-wide uppercase"
          >
            About
          </Link>
          <Link 
            to="/climate-intelligence" 
            className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors tracking-wide uppercase"
          >
            Climate Intelligence
          </Link>
          <Link 
            to="/contact" 
            className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors tracking-wide uppercase"
          >
            Contact
          </Link>
          {/* Auth-aware: Dashboard for signed-in, Sign In for guests */}
          {user ? (
            <Link 
              to="/dashboard" 
              className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors tracking-wide uppercase"
            >
              Dashboard
            </Link>
          ) : (
            <Link 
              to="/auth" 
              className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors tracking-wide uppercase"
            >
              Sign In
            </Link>
          )}
        </nav>
      </footer>
    </div>
  );
};

export default Index;
