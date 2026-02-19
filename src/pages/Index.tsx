import { useState } from "react";
import { CarbonParticles } from "@/components/CarbonParticles";
import { DocumentInput } from "@/components/DocumentInput";
import { VoiceInput } from "@/components/VoiceInput";
import { ProcessingState } from "@/components/ProcessingState";
import { ResultState } from "@/components/ResultState";
import { OnboardingTour } from "@/components/OnboardingTour";
import { HomeNavIcons } from "@/components/HomeNavIcons";
import { UseCaseTyper } from "@/components/UseCaseTyper";
import { BulkUpload } from "@/components/BulkUpload";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSession } from "@/hooks/useSession";
import { Files } from "lucide-react";
import { IndiaAIBadge } from "@/components/IndiaAIBadge";


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
// Per BIOCOG_MVR_INDIA_v1.0: Category determines scope
// Scope 1: Direct fuel combustion
// Scope 2: Purchased electricity (ALWAYS scope 2)
// Scope 3: Transport, materials, waste, services
const SCOPE_MAP: Record<string, number> = {
  'fuel': 1,
  'FUEL': 1,
  'electricity': 2,
  'ELECTRICITY': 2,
  'transport': 3,
  'TRANSPORT': 3,
  'materials': 3,
  'RAW_MATERIAL': 3,
  'waste': 3,
  'WASTE': 3,
  'CHEMICALS': 3,
  'other': 3,
  // Enterprise IT/Service scopes
  'cloud': 3,
  'CLOUD_SERVICES': 3,
  'software': 3,
  'SOFTWARE': 3,
  'it_hardware': 3,
  'IT_HARDWARE': 3,
  'services': 3,
  'PROFESSIONAL_SERVICES': 3,
  'travel': 3,
  'BUSINESS_TRAVEL': 3,
  // Green categories
  'solar': 2,
  'SOLAR_ENERGY': 2,
  'ev': 1,
  'EV_TRANSPORT': 1,
  'forestation': 3,
  'FORESTATION': 3,
  'wind': 2,
  'WIND_ENERGY': 2,
  'biogas': 1,
  'BIOGAS': 1,
  'organic': 3,
  'ORGANIC_INPUT': 3,
  'efficiency': 2,
  'ENERGY_EFFICIENCY': 2,
  'water': 3,
  'WATER_CONSERVATION': 3,
  'recycled': 3,
  'RECYCLED_MATERIAL': 3,
};

// Map productCategory to display format
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
  // Enterprise IT/Service categories
  'CLOUD_SERVICES': 'cloud',
  'SOFTWARE': 'software',
  'IT_HARDWARE': 'it_hardware',
  'PROFESSIONAL_SERVICES': 'services',
  'BUSINESS_TRAVEL': 'travel',
  // Green categories
  'SOLAR_ENERGY': 'solar',
  'EV_TRANSPORT': 'ev',
  'FORESTATION': 'forestation',
  'WIND_ENERGY': 'wind',
  'BIOGAS': 'biogas',
  'ORGANIC_INPUT': 'organic',
  'ENERGY_EFFICIENCY': 'efficiency',
  'WATER_CONSERVATION': 'water',
  'RECYCLED_MATERIAL': 'recycled',
};

// Helper to get category from OCR response
const getCategoryFromOCR = (data: ExtractedData): string => {
  if (data.primaryCategory && CATEGORY_MAP[data.primaryCategory]) {
    return CATEGORY_MAP[data.primaryCategory];
  }
  
  const firstItem = data.lineItems?.[0];
  if (firstItem?.productCategory && CATEGORY_MAP[firstItem.productCategory]) {
    return CATEGORY_MAP[firstItem.productCategory];
  }
  
  return 'other';
};

// Helper to get DETERMINISTIC scope from category
const getScopeFromCategory = (category: string): number => {
  return SCOPE_MAP[category] || SCOPE_MAP[category.toUpperCase()] || 3;
};

// Fixed carbon credit rate (same as backend)
const CARBON_CREDIT_RATE = 750;

const Index = () => {
  const navigate = useNavigate();
  const { sessionId, user } = useSession();
  const [state, setState] = useState<State>("idle");
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [documentType, setDocumentType] = useState<string>("");
  const [showBulkUpload, setShowBulkUpload] = useState(false);

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

  // Save emission record to database (document is cached by edge function)
  const saveEmissionToDatabase = async (extractedData: ExtractedData, documentHash?: string): Promise<{ documentId: string; emissionId: string } | null> => {
    // CRITICAL: Validate session before saving
    if (!user && !sessionId) {
      console.error('[MRV] CRITICAL: No session_id or user_id available. Data cannot be saved!');
      toast.error('Session expired. Please refresh the page and try again.');
      return null;
    }

    try {
      // First, find the document that was cached by the edge function
      let documentId: string | null = null;
      
      if (documentHash) {
        const { data: existingDoc } = await supabase
          .from('documents')
          .select('id')
          .eq('document_hash', documentHash)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (existingDoc) {
          documentId = existingDoc.id;
          
          // Update with session/user info if not set
          const { error: updateError } = await supabase
            .from('documents')
            .update({
              session_id: user ? null : sessionId,
              user_id: user?.id || null,
            })
            .eq('id', documentId);
          
          if (updateError) {
            console.error('[MRV] Document update error:', updateError);
          }
        }
      }
      
      // If no document found (shouldn't happen), create one
      if (!documentId) {
        console.warn('[MRV] No cached document found, creating new one');
        const { data: docData, error: docError } = await supabase
          .from('documents')
          .insert({
            session_id: user ? null : sessionId,
            user_id: user?.id || null,
            document_type: extractedData.documentType,
            vendor: extractedData.vendor,
            invoice_date: extractedData.date ? new Date(extractedData.date).toISOString().split('T')[0] : null,
            invoice_number: extractedData.invoiceNumber,
            amount: extractedData.amount,
            currency: extractedData.currency || 'INR',
            confidence: Math.min(extractedData.confidence ?? 0, 999.99),
            document_hash: documentHash || null,
            cached_result: extractedData,
            cache_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          } as any)
          .select()
          .single();

        if (docError) {
          console.error('[MRV] Document save error:', docError);
          return null;
        }
        documentId = docData.id;
      }

      // Get emission data - use totalCO2Kg from deterministic calculation
      const co2Kg = extractedData.totalCO2Kg ?? 0;
      const category = getCategoryFromOCR(extractedData);
      
      // DETERMINISTIC scope from category
      const scope = getScopeFromCategory(category);
      
      const firstItem = extractedData.lineItems?.[0];
      const activityData = firstItem?.quantity ?? null;
      const activityUnit = firstItem?.unit ?? null;
      const emissionFactor = firstItem?.emissionFactor ?? null;

      const { data: emissionData, error: emissionError } = await supabase
        .from('emissions')
        .insert({
          document_id: documentId,
          session_id: user ? null : sessionId,
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
        console.error('[MRV] Emission save error:', emissionError);
        if (emissionError.message?.includes('row-level security')) {
          console.error('[MRV] RLS violation - check session_id:', sessionId, 'user_id:', user?.id);
          toast.error('Permission denied. Please try refreshing the page.');
        }
        return null;
      }

      console.log('[MRV] Saved - Document:', documentId, 'Emission:', emissionData.id, 'Session:', sessionId?.substring(0, 8) + '...', 'Scope:', scope, 'CO2:', co2Kg);
      return { documentId, emissionId: emissionData.id };
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
      
      // Pass sessionId to edge function for guest user data linking
      const { data, error } = await supabase.functions.invoke('extract-document', {
        body: { imageBase64, mimeType, sessionId }
      });

      if (error) {
        console.error("OCR Error:", error);
        toast.error("Failed to process document. Please try again.");
        setState("idle");
        return;
      }

      // Handle cached results (guest or paid users)
      if (data?.cached) {
        console.log("Cached result returned:", data);
        toast.info(data.message || "Using previously verified results for accuracy.", {
          duration: 5000,
          icon: "🔒"
        });
        // Continue processing with cached data
      }
      
      // Handle duplicate invoice detection for authenticated users
      if (data?.isDuplicate) {
        console.log("Duplicate invoice detected:", data);
        if (data.success && data.data) {
          // Paid user - show cached result with notification
          toast.info(data.message || "Using previously verified results for this invoice.", {
            duration: 5000,
            icon: "🔒"
          });
          // Continue processing with cached data
        } else {
          // Free/snapshot user - block duplicate processing
          toast.error(data.error || "This invoice was already processed.", {
            duration: 6000,
            action: {
              label: "View History",
              onClick: () => navigate('/history')
            }
          });
          setState("idle");
          return;
        }
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

      const savedIds = await saveEmissionToDatabase(extractedData, data.documentHash);

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
      'cloud': 'Cloud Services',
      'software': 'Software',
      'it_hardware': 'IT Hardware',
      'services': 'Services',
      'travel': 'Travel',
      'solar': 'Solar Energy',
      'ev': 'EV Transport',
      'forestation': 'Forestation',
      'wind': 'Wind Energy',
      'biogas': 'Biogas',
      'organic': 'Organic',
      'efficiency': 'Energy Efficiency',
      'water': 'Water Conservation',
      'recycled': 'Recycled Material',
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
    // Pass extracted data via navigation state to ensure Verify page has data
    navigate('/verify', { 
      state: { 
        emissionId: result?.emissionId,
        documentId: result?.documentId,
        extractedData: result?.extractedData,
        fromUpload: true
      }
    });
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

            {/* India AI Innovation Badge */}
            <div className="flex flex-col items-center gap-2 mt-4">
              <IndiaAIBadge size={48} />
              <p className="text-sm sm:text-base text-center leading-relaxed font-medium">
                <span className="text-muted-foreground">AI infrastructure for MSMEs </span>
                <span style={{ color: '#FF9933' }} className="font-semibold">from India.</span>
                <br />
                <span className="text-primary font-semibold">Empowering climate impact.</span>
              </p>
            </div>
            
            {/* Bulk Upload Toggle for signed-in users */}
            {user && (
              <div className="mt-6 w-full max-w-md">
                <button
                  onClick={() => setShowBulkUpload(!showBulkUpload)}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto"
                >
                  <Files className="h-4 w-4" />
                  {showBulkUpload ? 'Hide Bulk Upload' : 'Upload Multiple Invoices'}
                </button>
                
                {showBulkUpload && (
                  <div className="mt-4">
                    <BulkUpload 
                      onComplete={(results) => {
                        toast.success(`Processed ${results.processed} invoices, ${results.duplicates} duplicates skipped`);
                        navigate('/history');
                      }}
                      maxFiles={10}
                    />
                  </div>
                )}
              </div>
            )}
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
