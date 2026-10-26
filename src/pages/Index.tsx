import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n/useT";
import { DocumentInput } from "@/components/DocumentInput";
import { VoiceInput } from "@/components/VoiceInput";
import { ProcessingState } from "@/components/ProcessingState";
import { HomeNavIcons } from "@/components/HomeNavIcons";
import { UseCaseTyper } from "@/components/UseCaseTyper";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { loadSupabase } from "@/integrations/supabase/lazyClient";
import { getLocaleMeta } from "@/lib/i18n/locales";
import { toast } from "sonner";
import { useAuthStatus, useSession } from "@/hooks/useSession";
import { Files } from "lucide-react";
import { IndiaAIBadge } from "@/components/IndiaAIBadge";
import { HOME_ALSO_ON, HomeAlso } from "@/components/home/HomeAlso";
import { buildEmissionRows } from "@/lib/mrvPersistence";
import { resolveWorkspaceScope } from "@/lib/workspaceChoice";
import { IDENTITY_CHANGED_EVENT } from "@/lib/identity";
import { CAPABILITY_REASON, ownerColumns, type WorkspaceScope } from "@/lib/workspaceScope";

import { emitRecordsChanged } from '@/lib/recordsEvents';
import { checkUploadPages, chunkPagesFor } from '@/lib/pdfLimit';
import { pageCountingActive } from '@/hooks/useInvoiceAllowance';
import { prepareImageForUpload } from '@/lib/imageUpload';
import { GUEST_MAX_BYTES } from '../../supabase/functions/_shared/guestScan';
import { functionErrorStatus, getFunctionErrorMessage, runPool, stopsBatch } from '@/lib/functionErrors';
import { splitPdf } from '@/lib/pdfSplit';
import { offsetSourcePages } from '../../supabase/functions/_shared/extractionChecks';
import { parseInvoiceDate } from '../../supabase/functions/_shared/invoiceDate';
import { cacheGuestSource } from '@/lib/guestSourceCache';
import { getGuestResult, guestDocumentId, guestRowsFor, putGuestResult } from '@/lib/guestResults';
// Perf: components not needed for first paint are code-split out of the
// homepage's initial bundle. Each is rendered inside its own
// <Suspense fallback={null}> so the route-level PageLoader never flashes.
// - OnboardingTour renders nothing until a 5s timer fires.
// - BulkUpload only appears for signed-in users after a click.
// - ResultState (and its trust widgets) only appears after processing.
const OnboardingTour = lazy(() =>
  import("@/components/OnboardingTour").then((m) => ({ default: m.OnboardingTour }))
);
const BulkUpload = lazy(() =>
  import("@/components/BulkUpload").then((m) => ({ default: m.BulkUpload }))
);
const ResultState = lazy(() =>
  import("@/components/ResultState").then((m) => ({ default: m.ResultState }))
);
// Below-the-fold story, sticky phone CTA and the sample result load after
// first paint in their own chunks.
const loadHomeStory = () => import("@/components/home/HomeStory");
const loadSignedInNextStep = () => import("@/components/home/SignedInNextStep");
const FooterDelivery = lazy(() => import("@/components/FooterDelivery").then((m) => ({ default: m.FooterDelivery })));
const HomeStory = lazy(() => loadHomeStory().then((m) => ({ default: m.HomeStory })));
const StickyCta = lazy(() => loadHomeStory().then((m) => ({ default: m.StickyCta })));
const SignedInNextStep = lazy(loadSignedInNextStep);
// Start fetching the below-the-fold chunk with the page instead of after the
// sign-in check: a stored Supabase sign-in token means the signed-in strip,
// otherwise the story. A wrong guess only costs one small extra chunk.
// Only on the homepage itself: this module is in the startup bundle, so
// without the check every first visit to any page downloaded the story
// (and the CBAM tables it imports) alongside that page's own code.
try {
  if (window.location.pathname !== "/") throw new Error("not the homepage");
  const signedInHint = Object.keys(localStorage).some((k) => /^sb-.*-auth-token$/.test(k));
  void (signedInHint ? loadSignedInNextStep() : loadHomeStory()).catch(() => {});
} catch { /* not the homepage, or storage blocked: the chunk loads on render instead */ }

/** Opens the upload picker from anywhere on the page (must run in a click handler). */
const openUploadPicker = () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
  const input = document.querySelector<HTMLInputElement>('#hero input[type="file"]');
  input?.click();
};


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
  /** How the quantity was obtained (e.g. estimated_kvah_pf) and its plain label; kept with the emission row. */
  basis?: string;
  basisLabel?: string;
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
  avoidedCO2Kg?: number;
  emissionCategory?: string;
  estimatedCO2Kg?: number;
  confidence: number;
  validationFlags?: string[];
  classificationStatus?: 'VERIFIED' | 'PARTIALLY_VERIFIED' | 'UNVERIFIABLE';
  guidance?: { counted: number; needsData: number; notCovered: number; unclassified: number; nextStep: string | null; billCharges?: number; deterministicBlocker?: boolean };
}

// Signed-in files above this are refused by the server (inline AI requests top out near 20 MB).
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const mb = (bytes: number) => (bytes / 1048576).toFixed(1);
// The read runs inside a 150 s edge limit; stop waiting a little after it.
const READ_TIMEOUT_MS = 160_000;

interface ProcessingResult {
  type: "revenue" | "compliance";
  amount: number;
  documentType: string;
  extractedData?: ExtractedData;
  documentId?: string;
  emissionId?: string;
  /** Number of emission rows saved for this document. */
  recordCount?: number;
  /** Milliseconds a fresh read took (unset for a saved or repeated result). */
  readMs?: number;
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

// No money figure is shown at upload. A credit value needs verified
// reductions and a dated price (src/lib/carbonValue.ts); emissions are never
// priced, and the invoice amount is never used as a stand-in.

const Index = () => {
  const navigate = useNavigate();
  const { sessionId, user, isLoading: sessionLoading } = useSession();
  const location = useLocation();
  // Signed in or not is known from the stored sign-in alone; the guest
  // session check (network, up to 8 s) must not hold the page below the hero.
  const authStatus = useAuthStatus();
  // Workspace for the current upload, resolved once per upload. Organisation
  // workspaces only exist once the team migration is live; until then this is
  // always the personal workspace.
  const uploadScopeRef = useRef<(WorkspaceScope & { organizationName?: string }) | null>(null);
  // The last file read, so "Read this file again" needs no second pick.
  const lastFileRef = useRef<File | null>(null);
  const prepareWorkspace = async (): Promise<boolean> => {
    if (!user) {
      uploadScopeRef.current = sessionId ? { kind: 'guest', sessionId } : { kind: 'none' };
      return true;
    }
    try {
      const resolved = await resolveWorkspaceScope(await loadSupabase(), user.id);
      if (resolved.kind === 'organization' && !resolved.capabilities.includes('records.upload')) {
        toast.error(`${resolved.organizationName || 'Organisation'} workspace: ${CAPABILITY_REASON['records.upload']}`, { duration: 8000 });
        return false;
      }
      uploadScopeRef.current = resolved;
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not check your workspace.');
      return false;
    }
  };
  const uploadOrganizationId = () =>
    uploadScopeRef.current?.kind === 'organization' ? uploadScopeRef.current.organizationId : undefined;
  const [state, setState] = useState<State>("idle");
  // The first view paints at once: it holds the largest text on the page, and a
  // fade from opacity 0 delays when browsers count it as shown (LCP). Coming
  // back to the start after a result still fades in.
  const [fadeHero, setFadeHero] = useState(false);
  useEffect(() => { if (state !== "idle") setFadeHero(true); }, [state]);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [documentType, setDocumentType] = useState<string>("");
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [pendingRetry, setPendingRetry] = useState<{ extractedData: ExtractedData; documentHash?: string } | null>(null);
  const t = useT();

  // Guests: nothing is stored on the server. The result and its records stay
  // in this browser for 24 hours (guestResults.ts); signing in can add them.
  const keepGuestResult = async (extractedData: ExtractedData, documentHash: string, fileName: string) => {
    const rows = guestRowsFor(extractedData, documentHash);
    const kept = await putGuestResult({ hash: documentHash, fileName, extracted: extractedData, rows });
    if (!kept) toast.info('This browser is not keeping data, so this result disappears when you leave the page.', { duration: 5000 });
    return { documentId: guestDocumentId(documentHash), emissionId: rows[0]?.id, emissionIds: rows.map((r) => r.id) };
  };
  const fileSha256 = async (file: Blob): Promise<string | null> => {
    try {
      const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
      return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
    } catch { return null; }
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

  // Save emission record to database (document is cached by edge function)
  // The server stores the document and its emission rows itself (signed-in
  // reads). Use its ids; the browser save below is only a fallback for an
  // older function version or a failed server write.
  const serverSaved = (data: { serverSaved?: boolean; documentId?: string; emissionIds?: string[] } | null | undefined) => {
    if (!data?.serverSaved || !data.documentId || !Array.isArray(data.emissionIds)) return null;
    emitRecordsChanged('upload');
    return { documentId: data.documentId, emissionId: data.emissionIds[0], emissionIds: data.emissionIds };
  };

  const saveEmissionToDatabase = async (extractedData: ExtractedData, documentHash?: string): Promise<{ documentId: string; emissionId?: string; emissionIds: string[] } | null> => {
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
        // Only this user's (or this guest session's) document. Another
        // owner's row with the same hash is never matched or reassigned.
        let lookup = (await loadSupabase())
          .from('documents')
          .select('id')
          .eq('document_hash', documentHash);
        // In an organisation workspace the invoice is the organisation's, whoever uploaded it.
        const orgId = uploadOrganizationId();
        lookup = orgId
          ? lookup.eq('organization_id', orgId)
          : user
            ? lookup.eq('user_id', user.id)
            : lookup.eq('session_id', sessionId).is('user_id', null);
        const { data: existingDoc } = await lookup
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingDoc) {
          documentId = existingDoc.id;
        }
      }
      
      // If no document found (shouldn't happen), create one
      if (!documentId) {
        console.warn('[MRV] No cached document found, creating new one');
        const { data: docData, error: docError } = await (await loadSupabase())
          .from('documents')
          .insert({
            ...(uploadScopeRef.current ? ownerColumns(uploadScopeRef.current) : { session_id: user ? null : sessionId, user_id: user?.id || null }),
            document_type: extractedData.documentType,
            vendor: extractedData.vendor,
            // Only a valid YYYY-MM-DD date; an ambiguous one is never guessed.
            invoice_date: parseInvoiceDate(extractedData.date),
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

      // ============= GAP 2 FIX: GUEST DEDUP CHECK =============
      // Before inserting a new emission, check if one already exists for this document
      const { data: existingEmissions } = await (await loadSupabase())
        .from('emissions')
        .select('id')
        .eq('document_id', documentId)
        .order('created_at', { ascending: true });

      if (existingEmissions?.length) {
        toast.info('Already have this one. Counted once, as promised.');
        return {
          documentId,
          emissionId: existingEmissions[0].id,
          emissionIds: existingEmissions.map((emission) => emission.id),
        };
      }

      const emissionRows = buildEmissionRows(extractedData, {
        documentId,
        sessionId: user ? null : sessionId,
        userId: user?.id || null,
      });

      if (emissionRows.length === 0) {
        console.info('[MRV] No independently calculable line items; document retained for review without an emissions row');
        emitRecordsChanged('upload'); // History lists the document
        return { documentId, emissionIds: [] };
      }

      const { data: emissionData, error: emissionError } = await (await loadSupabase())
        .from('emissions')
        .insert(emissionRows)
        .select('id');

      if (emissionError) {
        console.error('[MRV] Emission save error:', emissionError);
        if (emissionError.message?.includes('row-level security')) {
          console.error('[MRV] RLS violation - check session_id:', sessionId, 'user_id:', user?.id);
          toast.error('We could not save this to your account. Refresh the page and try again.');
        }
        return null;
      }

      const emissionIds = (emissionData || []).map((emission) => emission.id);
      emitRecordsChanged('upload');
      if (uploadScopeRef.current?.kind === 'organization') {
        toast.success(`Saved to the ${uploadScopeRef.current.organizationName || 'organisation'} workspace`);
      }
      return { documentId, emissionId: emissionIds[0], emissionIds };
    } catch (error) {
      console.error('Database save error:', error);
      return null;
    }
  };

  // A longer PDF is split in the browser into parts of 5 pages (10 before an
  // account's page counting starts) and read two at a time. Each part is read in full and saved as its own document; the
  // result screen shows all parts together.
  const processLongPdf = async (file: File, chunk: number) => {
    if (!(await prepareWorkspace())) return;
    setState("processing");
    setDocumentType("Splitting a long PDF into parts...");
    const split = await splitPdf(file, chunk);
    if (!split.ok || !split.parts) {
      toast.error(split.message || 'This PDF could not be split.', { duration: 8000 });
      setState("idle");
      return;
    }
    const done: { extracted: ExtractedData; saved: { documentId: string; emissionIds: string[] }; from?: number }[] = [];
    const notes: string[] = [];
    // Two parts at a time; results are put back in page order below.
    let stopped = false;
    await runPool(split.parts, 2, async (part) => {
      const range = `pages ${part.fromPage}-${part.toPage}`;
      setDocumentType(`Reading ${range} of ${part.totalPages}...`);
      try {
        const imageBase64 = await fileToBase64(part.file);
        const { data, error } = await (await loadSupabase()).functions.invoke('extract-document', {
          body: { imageBase64, mimeType: 'application/pdf', sessionId, organizationId: uploadOrganizationId() },
        });
        if (error) {
          const msg = await getFunctionErrorMessage(error, 'could not be read');
          notes.push(`${range}: ${msg}`);
          // Paused or down on our side, or a limit reached: the remaining parts would fail the same way.
          if (await stopsBatch(error)) stopped = true;
          return;
        }
        if (data?.financialDocument) { notes.push(`${range}: ${data.stored ? 'financial document, stored securely' : 'financial document, not kept'}`); return; }
        if (data?.isIrrelevant) { notes.push(`${range}: no bill or invoice found`); return; }
        if (!data?.success || !data?.data) { notes.push(`${range}: ${data?.error || 'could not be read'}`); return; }
        // Page numbers of this part, mapped back to the original PDF.
        const partData = data.data as ExtractedData;
        const extracted: ExtractedData = { ...partData, lineItems: offsetSourcePages(partData.lineItems || [], part.fromPage) };
        const saved = user ? (serverSaved(data) ?? await saveEmissionToDatabase(extracted, data.documentHash)) : await keepGuestResult(extracted, data.documentHash, part.file.name);
        if (!user) void cacheGuestSource(data.documentHash, part.file, part.file.name);
        if (!saved) { notes.push(`${range}: could not be saved`); return; }
        done.push({ extracted, saved, from: part.fromPage });
      } catch {
        notes.push(`${range}: could not be read`);
      }
    }, () => stopped, (part) => notes.push(`pages ${part.fromPage}-${part.toPage}: not sent`));
    done.sort((a, b) => (a.from ?? 0) - (b.from ?? 0));
    if (done.length === 0) {
      toast.error(notes[0] ? `Nothing could be read from this PDF (${notes[0]}).` : 'Nothing could be read from this PDF.', { duration: 8000 });
      setState("idle");
      return;
    }
    const recordCount = done.reduce((n, d) => n + d.saved.emissionIds.length, 0);
    const first = done[0].extracted;
    const merged: ExtractedData = {
      ...first,
      lineItems: done.flatMap(d => d.extracted.lineItems || []),
      totalCO2Kg: done.reduce((t, d) => t + (d.extracted.totalCO2Kg || 0), 0),
      validationFlags: [
        `Long PDF read in ${split.parts.length} parts of up to 10 pages; ${done.length} read`,
        ...notes,
        ...done.flatMap(d => d.extracted.validationFlags || []),
      ],
    };
    if (recordCount > 0) emitRecordsChanged('upload');
    const emissionCat = getCategoryFromOCR(merged);
    setDocumentType(formatDocumentType(merged.documentType, emissionCat));
    setResult({
      type: merged.documentType === 'certificate' || emissionCat === 'other' ? "compliance" : "revenue",
      amount: 0,
      documentType: formatDocumentType(merged.documentType, emissionCat),
      extractedData: merged,
      // One part: Verify can scope to it. Several: Verify lists every pending record.
      documentId: done.length === 1 ? done[0].saved.documentId : undefined,
      emissionId: undefined,
      recordCount,
    });
    setState("result");
  };

  const processDocument = async (file: File, opts: { reread?: boolean; enteredKwh?: number } = {}) => {
    lastFileRef.current = file;
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error(`This file is ${mb(file.size)} MB; the limit is 15 MB. Take a photo of the page, or save the PDF at a lower quality.`, { duration: 7000 });
      return;
    }
    // Guests: photos are shrunk to fit below; a PDF must already fit.
    if (!user && file.size > GUEST_MAX_BYTES && !file.type.startsWith('image/')) {
      toast.error(`This file is ${mb(file.size)} MB. Without an account the limit is ${GUEST_MAX_BYTES / 1048576} MB; take a photo of the bill, or sign in for 15 MB.`, { duration: 7000 });
      return;
    }
    const chunk = chunkPagesFor(await pageCountingActive(user?.id));
    const pageCheck = await checkUploadPages(file, chunk);
    if (!pageCheck.ok && pageCheck.reason === 'unknown_page_count') {
      toast.error(pageCheck.message, { duration: 8000 });
      return;
    }
    if (!pageCheck.ok) {
      await processLongPdf(file, chunk);
      return;
    }
    if (!(await prepareWorkspace())) return;
    setState("processing");
    setDocumentType("Analyzing document...");

    try {
      // A guest re-uploading the same file within 24 hours sees the same
      // result from this browser, without another read.
      if (!user) {
        const hash = await fileSha256(file);
        const earlier = hash ? await getGuestResult(hash) : null;
        if (earlier) {
          const extractedEarlier = earlier.extracted as ExtractedData;
          const cat = getCategoryFromOCR(extractedEarlier);
          toast.info('Showing your earlier result for this invoice. Results stay in this browser for 24 hours.', { duration: 5000 });
          setDocumentType(formatDocumentType(extractedEarlier.documentType, cat));
          setResult({
            type: extractedEarlier.documentType === 'certificate' || cat === 'other' ? "compliance" : "revenue",
            amount: 0,
            documentType: formatDocumentType(extractedEarlier.documentType, cat),
            extractedData: extractedEarlier,
            documentId: guestDocumentId(earlier.hash),
            emissionId: earlier.rows[0]?.id,
            recordCount: earlier.rows.length,
          });
          setState("result");
          return;
        }
      }
      // Large photos are resized first, so the upload is quick on mobile networks.
      const sendFile = await prepareImageForUpload(file, user ? undefined : GUEST_MAX_BYTES);
      if (!user && sendFile.size > GUEST_MAX_BYTES) {
        setState("idle");
        toast.error(`This photo is ${mb(sendFile.size)} MB even after shrinking. Without an account the limit is ${GUEST_MAX_BYTES / 1048576} MB; sign in for 15 MB.`, { duration: 7000 });
        return;
      }
      const imageBase64 = await fileToBase64(sendFile);
      const mimeType = sendFile.type || 'image/jpeg';

      
      // Pass sessionId to edge function for guest user data linking
      const readStart = performance.now();
      const invoke = (await loadSupabase()).functions.invoke('extract-document', {
        body: { imageBase64, mimeType, sessionId, organizationId: uploadOrganizationId(), ...(opts.reread ? { reread: true } : {}), ...(opts.enteredKwh ? { enteredKwh: opts.enteredKwh } : {}) }
      });
      const timedOut = new Promise<{ data: null; error: 'timeout' }>((resolve) => setTimeout(() => resolve({ data: null, error: 'timeout' }), READ_TIMEOUT_MS));
      const { data, error } = await Promise.race([invoke, timedOut]) as Awaited<typeof invoke> | { data: null; error: 'timeout' };

      if (error === 'timeout') {
        toast.error('Reading this file is taking too long. Try again, or upload a photo of just the page with the totals. Nothing was counted.', { duration: 8000 });
        setState("idle");
        return;
      }

      if (error) {
        console.error("OCR Error:", error);
        toast.error(await getFunctionErrorMessage(error, "We couldn't finish reading this file. Nothing was counted. Try again, or upload a clear photo of the page."));
        setState("idle");
        return;
      }

      // Same file, or the same invoice as a different file: the stored
      // result is shown and the invoice stays counted once.
      if (data?.isDuplicate) {
        if (data.success && data.data) {
          toast.info("Already have this one. Counted once, as promised.", { duration: 5000 });
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

      // Financial documents (ITR, bank or financial statements) are kept
      // privately on the server for climate finance; nothing to show here.
      if (data?.financialDocument) {
        if (data.stored) toast.success(data.message, { duration: 8000 });
        else toast.info(data.message, { duration: 8000 });
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

      // Validation warnings for low-confidence or missing data
      const warnings: string[] = [...(extractedData.validationFlags || [])];
      if (extractedData.confidence < 50) {
        warnings.push('Low confidence extraction - please verify the data');
      }
      if (!extractedData.totalCO2Kg && !extractedData.estimatedCO2Kg) {
        warnings.push('No verified activity and factor pair was available; no emissions were recorded');
      }
      if (!extractedData.vendor) {
        warnings.push('Vendor name not detected');
      }
      if (!extractedData.date) {
        warnings.push('Invoice date not detected');
      }
      
      // Shown on the result screen with one next step, not as a stack of toasts.
      const uniqueWarnings = [...new Set(warnings)];

      const savedIds = user
        ? (serverSaved(data) ?? await saveEmissionToDatabase(extractedData, data.documentHash))
        : await keepGuestResult({ ...extractedData, validationFlags: uniqueWarnings }, data.documentHash, file.name);
      // Guests: the original stays in this browser only (never uploaded for storage).
      if (!user) void cacheGuestSource(data.documentHash, file, file.name);

      if (!savedIds) {
        // ============= GAP 4 FIX: SAVE FAILURE RECOVERY =============
        // Don't show ephemeral results. Store data for retry.
        setPendingRetry({ extractedData, documentHash: data.documentHash });
        toast.error('Failed to save data. Click "Retry" to try again without re-scanning.', { duration: 6000 });
        setState("idle");
        return;
      }

      if (!user) {
        toast.success('Result ready. It stays in this browser for 24 hours; sign in to save it.', { duration: 4000 });
      } else if (savedIds.emissionIds.length > 0) {
        toast.success(data.reread ? 'Read again and saved. Verifying it now.' : 'Saved. Verifying it now.', { duration: 2500 });
      }
      setPendingRetry(null);

      const emissionCat = getCategoryFromOCR(extractedData);
      
      const isCompliance = extractedData.documentType === 'certificate' || 
                          emissionCat === 'other';
      
      const processingResult: ProcessingResult = {
        type: isCompliance ? "compliance" : "revenue",
        // Unverified at this point, so no indicative value yet.
        amount: 0,
        documentType: formatDocumentType(extractedData.documentType, emissionCat),
        extractedData: {
          ...extractedData,
          validationFlags: uniqueWarnings,
        },
        documentId: savedIds?.documentId,
        emissionId: savedIds?.emissionId,
        recordCount: savedIds?.emissionIds.length ?? 0,
        readMs: data.isDuplicate || data.cached ? undefined : Math.round(performance.now() - readStart),
      };

      setDocumentType(processingResult.documentType);
      setResult(processingResult);
      setState("result");


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

  const handleReread = () => {
    if (lastFileRef.current) void processDocument(lastFileRef.current, { reread: true });
  };
  // A kVAh bill with no printed kWh or power factor: read it again with the
  // kWh the owner typed. The server checks it against the bill's kVAh and
  // labels it "Entered by you"; signed-in documents with nothing counted are
  // replaced in place (the same rule as reading again).
  const handleEnterKwh = (kwh: number) => {
    if (lastFileRef.current) void processDocument(lastFileRef.current, { reread: !!user, enteredKwh: kwh });
  };


  const handleFileSelect = (file: File) => {
    processDocument(file);
  };

  // A bill picked on another page (the MSME lead page) arrives in the route
  // state: read it once the session is known, then clear the state so a
  // refresh or Back does not read it again.
  const pendingHandled = useRef(false);
  useEffect(() => {
    const pending = (location.state as { pendingFile?: unknown } | null)?.pendingFile;
    if (pendingHandled.current || sessionLoading || !(pending instanceof File)) return;
    pendingHandled.current = true;
    navigate(location.pathname, { replace: true, state: null });
    processDocument(pending);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, sessionLoading]);

  const handleVoiceInput = async (transcript: string) => {
    setState("processing");
    setDocumentType("Processing voice query...");
    
    try {
      // Send to intelligence-chat with stream: false for voice queries.
      // invoke() forwards the signed-in user's JWT, so the assistant can
      // ground its answer in that user's own records.
      const response = await (await loadSupabase()).functions.invoke('intelligence-chat', {
        body: { 
          messages: [{ role: 'user', content: transcript }],
          context: { isHomepage: true, type: 'voice_query' },
          language: getLocaleMeta(localStorage.getItem('senseible_locale') || 'en').name,
          stream: false  // Non-streaming for voice - returns JSON directly
        }
      });


      setState("idle");

      if (response.error) {
        // Daily question limit or our AI being unavailable: say which, never a made-up answer.
        let reason = "";
        try { const body = await (response.error as { context?: Response }).context?.json(); reason = body?.message || ""; } catch { /* no body */ }
        toast.error(reason || "Voice answers are unavailable right now. You can still upload a bill.");
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
      toast.error("Voice is unavailable right now. Upload a bill instead.");
    }
  };

  const handleConfirm = () => {
    // Say what actually happened: guests keep results in this browser; a
    // result with no countable line saved nothing to verify.
    if (!user) toast.info("Checking your result. It stays in this browser until you sign in.");
    else if (result?.recordCount) toast.success("Saved to your account. Verifying it now.");
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

  // A different person signed in or out: drop the previous person's result,
  // pending retry and upload workspace so nothing is shown or saved for them.
  useEffect(() => {
    const onChange = () => {
      uploadScopeRef.current = null;
      setPendingRetry(null);
      handleReset();
    };
    window.addEventListener(IDENTITY_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(IDENTITY_CHANGED_EVENT, onChange);
  }, []);

  return (
    <div className="relative min-h-screen w-full flex flex-col bg-background overflow-x-clip">
      <Suspense fallback={null}>
        <OnboardingTour currentStep={state === 'idle' ? 'upload' : state === 'processing' ? 'processing' : 'upload'} />
      </Suspense>
      
      {/* First viewport: what it is, who it is for, why trust it, and the action. */}
      <div id="hero" className={`relative flex flex-col ${user ? 'min-h-[calc(100dvh-7.5rem)]' : 'min-h-[100dvh]'}`}>
      
      {/* Top-right navigation icons */}
      <HomeNavIcons />
      
      {/* Wordmark is centred on the same axis as the headline. On phones it sits
          below the icon row (pt-16) so the two never collide. */}
      <header className="relative z-20 w-full pt-16 sm:pt-5 pb-2 px-4">
        <Link to="/" className="block">
          <h1 className="text-2xl sm:text-3xl font-semibold text-center text-foreground tracking-tight">
            senseible
          </h1>
        </Link>
      </header>

      {/* Signed in, the hero is shorter (room for the next-step cards) and holds
          more (bulk upload), so the visitor layout's pull-up would push the typed
          headline into the wordmark. Signed-in content keeps a gap and is centred
          only while it fits ("safe"), otherwise it starts below the wordmark. */}
      <main className={`relative z-10 flex-1 flex flex-col items-center px-4 ${user ? '[justify-content:safe_center] pt-6 sm:pt-4 pb-6' : '[justify-content:safe_center] pt-6 sm:pt-4'}`}>
        {state === "idle" && (
          <div className={`w-full flex flex-col items-center gap-7 sm:gap-8 ${fadeHero ? "animate-fade-in" : ""}`}>
            {/* Animated use case headline - ABOVE icons for maximum impact */}
            <UseCaseTyper className="mt-2" />
            
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
            
            {/* Retry button when save failed but extraction succeeded */}
            {pendingRetry && (
              <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                <p className="text-sm text-destructive font-medium">Data extraction succeeded but save failed.</p>
                <button
                  onClick={async () => {
                    // Re-resolve who is saving: never reuse an earlier person's workspace.
                    if (!(await prepareWorkspace())) return;
                    setState("processing");
                    setDocumentType("Retrying save...");
                    const savedIds = await saveEmissionToDatabase(pendingRetry.extractedData, pendingRetry.documentHash);
                    if (savedIds) {
                      toast.success('Saved to your account.');
                      setPendingRetry(null);
                      const extractedData = pendingRetry.extractedData;
                      const emissionCat = getCategoryFromOCR(extractedData);
                      setResult({
                        type: extractedData.documentType === 'certificate' || emissionCat === 'other' ? "compliance" : "revenue",
                        amount: 0,
                        documentType: formatDocumentType(extractedData.documentType, emissionCat),
                        extractedData,
                        documentId: savedIds.documentId,
                        emissionId: savedIds.emissionId,
                        recordCount: savedIds.emissionIds.length,
                      });
                      if (savedIds.emissionIds.length) emitRecordsChanged('upload');
                      setDocumentType(formatDocumentType(extractedData.documentType, emissionCat));
                      setState("result");
                    } else {
                      toast.error('Still could not save. Upload the bill again.');
                      setState("idle");
                    }
                  }}
                  className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  Retry Save
                </button>
              </div>
            )}
            
            <p className="-mt-2 text-sm text-muted-foreground text-center max-w-xs min-h-[2.75rem] flex items-center justify-center [text-wrap:balance]">
              {t("home.hero.action", "Upload an invoice, get an evidence-linked carbon report")}
            </p>


            {/* India AI Innovation Badge */}
            <div className="flex flex-col items-center gap-2 mt-4">
              <IndiaAIBadge size={48} />
              <p className="text-sm sm:text-base text-center leading-relaxed font-medium max-w-full">
                <span className="sm:whitespace-nowrap">
                  <span className="text-muted-foreground">AI verification infrastructure for MSMEs </span>
                  <span className="india-ribbon font-semibold text-foreground">from India.</span>
                </span>
                <br />
                <span className="text-primary font-semibold">Empowering climate impact.</span>
              </p>
            </div>

            {authStatus === 'signedOut' && HOME_ALSO_ON && <HomeAlso />}
            
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
                    <Suspense fallback={null}>
                      <BulkUpload 
                        onComplete={(results) => {
                          // The summary toast comes from BulkUpload; go to History only when something new is there.
                          if (results.processed > 0) navigate('/history');
                        }}
                        maxFiles={10}
                      />
                    </Suspense>
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
          <Suspense fallback={null}>
            <ResultState 
              type={result.type}
              amount={result.amount}
              extractedData={result.extractedData}
              onConfirm={handleConfirm}
              onReset={handleReset}
              hasRecords={result.recordCount !== 0}
              readMs={result.readMs}
              onReread={user && lastFileRef.current ? handleReread : undefined}
              onEnterKwh={lastFileRef.current ? handleEnterKwh : undefined}
            />
          </Suspense>
        )}
      </main>
      </div>

      {/* Signed out: the landing story. Signed in: the next step only; the
          story is for people who have not started yet. */}
      {authStatus !== 'loading' && (
        <Suspense fallback={null}>
          {authStatus === 'signedIn' ? (
            <SignedInNextStep />
          ) : (
            <>
              <HomeStory onUpload={openUploadPicker} />
              <StickyCta heroId="hero" onUpload={openUploadPicker} />
            </>
          )}
        </Suspense>
      )}
      
      {authStatus === 'signedOut' && HOME_ALSO_ON && (
        <div className="relative z-20 w-full max-w-6xl mx-auto px-6 pt-10">
          <Suspense fallback={null}>
            <FooterDelivery />
          </Suspense>
        </div>
      )}

      <footer className="relative z-20 w-full pb-24 sm:pb-6 pt-3 border-t border-border">
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
            to="/pricing" 
            className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors tracking-wide uppercase"
          >
            Pricing
          </Link>
          <Link 
            to="/enterprise" 
            className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors tracking-wide uppercase"
          >
            Enterprise
          </Link>
          <Link 
            to="/contact" 
            className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors tracking-wide uppercase"
          >
            Contact
          </Link>
          {/* Guests get Sign In. Signed-in users already have Verify, History
              and Open dashboard as buttons above, so no Dashboard link here. */}
          {authStatus === 'signedIn' && HOME_ALSO_ON && (
            <Link
              to="/help"
              className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors tracking-wide uppercase"
            >
              Help Center
            </Link>
          )}
          {authStatus === 'signedOut' && (
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
