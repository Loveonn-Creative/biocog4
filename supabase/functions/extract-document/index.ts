import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { countPdfPages, isPdf, MAX_PDF_PAGES, pageLimitMessage } from '../_shared/pdfPages.ts';
import { checkedSourcePage, INCOMPLETE_EXTRACTION_MESSAGE, isTruncatedFinish, UNKNOWN_PAGE_COUNT_MESSAGE } from '../_shared/extractionChecks.ts';
import { effectivePlanTier, invoiceScanLimit, monthlyLimitMessage, monthStartIst, strongerPlan } from '../_shared/planLimits.ts';
import { parseInvoiceDate } from '../_shared/invoiceDate.ts';
import { SOURCE_BUCKET, sourceFilePath } from '../_shared/sourceFiles.ts';
import { consolidateElectricity, electricityBillMeta, prepareElectricityLines, type ElectricityBillMeta } from '../_shared/electricityBill.ts';
import { sealExtraction } from '../_shared/scope3.ts';
import { sealAndRecord } from '../_shared/scope3Record.ts';
import { shadowWaterRun } from '../_shared/water/shadow.ts';
import { orgCan, UUID_RE } from '../_shared/workspaceAccess.ts';
import {
  calculateEmissions,
  classifyByHSN,
  classifyByKeyword,
  totalsFor,
  FACTOR_SET_VERSION,
  METHODOLOGY_NAME,
  METHODOLOGY_VERSION_TAG,
} from "../_shared/emissionFactors.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============= DOCUMENT HASH GENERATION (DETERMINISTIC) =============
// SHA-256 over the full decoded file bytes. The previous hash covered only the
// first 10,000 base64 characters, so different files sharing a header could
// collide. Hashes made before this change will not match new uploads of the
// same file.
/**
 * Keeps the original file of a signed-in user's invoice as evidence, in the
 * private bucket at <user id>/<hash>.<ext>. Does nothing until the pending
 * migration 20261016100000 (server-write-only bucket) is applied. A path that
 * already exists is the same file (same hash), so it is reused, never
 * replaced. Returns the stored path, or null when nothing was stored.
 */
async function storeSourceFile(
  // deno-lint-ignore no-explicit-any
  client: any, userId: string, documentHash: string, mimeType: string, base64Content: string,
): Promise<string | null> {
  const path = sourceFilePath(userId, documentHash, mimeType);
  if (!path) return null;
  const { data: ready, error: readyError } = await client.rpc('invoice_source_storage_ready');
  if (readyError || ready !== true) return null;
  const binary = atob(base64Content.replace(/\s+/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const { error } = await client.storage.from(SOURCE_BUCKET).upload(path, bytes, { contentType: mimeType, upsert: false });
  if (!error) return path;
  if (/exist|duplicate/i.test(error.message || '') || (error as { statusCode?: string }).statusCode === '409') return path;
  console.error('Source file not stored:', error.message);
  return null;
}

async function generateDocumentHash(base64Content: string): Promise<string> {
  const clean = base64Content.replace(/\s+/g, '');
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Decode a JWT payload without verifying it. Used only to tell the anon or
// publishable key apart from a user token; getUser() does the real check.
function jwtRole(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const json = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(parts[1].length / 4) * 4, '='));
    const payload = JSON.parse(json);
    return typeof payload?.role === 'string' ? payload.role : null;
  } catch {
    return null;
  }
}

// ============= METHODOLOGY VERSION (APPEND-ONLY VERSIONING) =============
const METHODOLOGY_VERSION = {
  name: METHODOLOGY_NAME,
  // v1.1.0: corrected LPG, PNG, furnace oil, naphtha, kerosene and grid
  // factors; unit aliases; avoided emissions reported separately; full-file hash.
  version: `${METHODOLOGY_VERSION_TAG}.0`,
  country: 'IN',
  factorVersion: FACTOR_SET_VERSION,
  confidenceVersion: 'CONF_v1.0',
};

// Factors, HSN map, keyword map and unit conversion live in
// ../_shared/emissionFactors.ts so they can be unit tested.

// ============= DETERMINISTIC CONFIDENCE SCORING (NO AI INFLUENCE) =============
// Per BIOCOG MRV spec: Base 100, fixed penalties, same input = same output
const CONFIDENCE_PENALTIES = {
  MISSING_QUANTITY: 20,
  MISSING_UNIT: 15,
  MISSING_INVOICE_NUMBER: 10,
  MISSING_SUPPLIER_GSTIN: 10,
  MISSING_DATE: 5,
  MISSING_AMOUNT: 5,
  UNVERIFIABLE_ITEM: 15,
  MISSING_EMISSION_FACTOR: 10,
  NO_LINE_ITEMS: 30,
  LOW_EXTRACTION_RATE: 15,
  HSN_CLASSIFICATION_BONUS: 5,
} as const;

function calculateDeterministicConfidence(params: {
  hasQuantity: boolean;
  hasUnit: boolean;
  hasInvoiceNumber: boolean;
  hasSupplierGstin: boolean;
  hasDate: boolean;
  hasAmount: boolean;
  lineItemCount: number;
  unverifiableCount: number;
  missingEmissionFactorCount: number;
  hsnClassifiedCount: number;
  extractedFieldRatio: number;
}): number {
  let confidence = 100;

  if (!params.hasQuantity) confidence -= CONFIDENCE_PENALTIES.MISSING_QUANTITY;
  if (!params.hasUnit) confidence -= CONFIDENCE_PENALTIES.MISSING_UNIT;
  if (!params.hasInvoiceNumber) confidence -= CONFIDENCE_PENALTIES.MISSING_INVOICE_NUMBER;
  if (!params.hasSupplierGstin) confidence -= CONFIDENCE_PENALTIES.MISSING_SUPPLIER_GSTIN;
  if (!params.hasDate) confidence -= CONFIDENCE_PENALTIES.MISSING_DATE;
  if (!params.hasAmount) confidence -= CONFIDENCE_PENALTIES.MISSING_AMOUNT;

  confidence -= params.unverifiableCount * CONFIDENCE_PENALTIES.UNVERIFIABLE_ITEM;
  confidence -= params.missingEmissionFactorCount * CONFIDENCE_PENALTIES.MISSING_EMISSION_FACTOR;

  if (params.lineItemCount === 0) confidence -= CONFIDENCE_PENALTIES.NO_LINE_ITEMS;
  if (params.extractedFieldRatio < 0.5) confidence -= CONFIDENCE_PENALTIES.LOW_EXTRACTION_RATE;

  const hsnBonus = Math.min(params.hsnClassifiedCount * CONFIDENCE_PENALTIES.HSN_CLASSIFICATION_BONUS, 10);
  confidence += hsnBonus;

  return Math.max(0, Math.min(100, Math.round(confidence)));
}

// ============= DOCUMENT RELEVANCE CHECK =============
const VALID_DOCUMENT_TYPES = ['invoice', 'bill', 'certificate', 'receipt'];
const IRRELEVANT_DOCUMENT_KEYWORDS = [
  'passport', 'aadhaar', 'aadhar', 'pan card', 'voter id', 'driving license',
  'birth certificate', 'marriage certificate', 'degree', 'marksheet',
  'resume', 'cv', 'curriculum vitae', 'photograph', 'selfie', 'photo'
];

const HUMOROUS_REJECTIONS: Record<string, string[]> = {
  ceiling: [
    "That's a lovely ceiling, but we can't find any carbon emissions there! 😄 Try uploading a fuel bill or invoice instead.",
  ],
  selfie: [
    "Looking good! 📸 But we're more interested in your invoices than your selfies. Upload a business document to get started.",
  ],
  nature: [
    "Beautiful scenery! 🌿 Trees do absorb carbon, but we need your business invoices to calculate emissions.",
  ],
  food: [
    "That looks delicious! 🍽️ But to calculate carbon, we need your business invoices, not your lunch.",
  ],
  personal: [
    "This looks like a personal document. For carbon MRV, we need business invoices, fuel bills, or electricity receipts.",
  ],
  default: [
    "Hmm, this doesn't look like a business document. 📄 Try uploading an invoice, fuel bill, or electricity bill.",
  ]
};

const IMAGE_CONTEXT_PATTERNS: Record<string, RegExp> = {
  ceiling: /ceiling|roof|light|fixture|fan|lamp|chandelier|overhead/i,
  selfie: /face|person|portrait|selfie|profile|headshot|smile/i,
  nature: /tree|plant|flower|garden|nature|landscape|sky|cloud|mountain|forest|farm|field/i,
  food: /food|meal|dish|restaurant|menu|plate|eating|breakfast|lunch|dinner/i
};

function getHumorousRejection(ocrText: string, category?: string): string {
  const text = (ocrText || '').toLowerCase();
  
  if (category && HUMOROUS_REJECTIONS[category]) {
    return HUMOROUS_REJECTIONS[category][0];
  }
  
  for (const [cat, pattern] of Object.entries(IMAGE_CONTEXT_PATTERNS)) {
    if (pattern.test(text)) {
      return HUMOROUS_REJECTIONS[cat]?.[0] || HUMOROUS_REJECTIONS.default[0];
    }
  }
  
  for (const keyword of IRRELEVANT_DOCUMENT_KEYWORDS) {
    if (text.includes(keyword)) {
      return HUMOROUS_REJECTIONS.personal[0];
    }
  }
  
  return HUMOROUS_REJECTIONS.default[0];
}

// Income tax returns and financial statements are never read here (they are
// reserved for a later, separately approved server-side process).
const FINANCIAL_STATEMENT_PATTERN = /\b(income tax return|itr-?v?\s?[1-7]|balance sheet|statement of profit and loss|profit (and|&) loss (account|statement)|financial statements?)\b/i;
const FINANCIAL_STATEMENT_MESSAGE = 'Income tax returns and financial statements are not read here. Upload an invoice, bill or receipt instead.';

function isDocumentRelevant(ocrData: any): { relevant: boolean; message?: string } {
  const docType = (ocrData.documentType || '').toLowerCase();
  const allText = JSON.stringify(ocrData).toLowerCase();
  if (FINANCIAL_STATEMENT_PATTERN.test(allText)) return { relevant: false, message: FINANCIAL_STATEMENT_MESSAGE };
  
  if (docType === 'unknown') {
    for (const keyword of IRRELEVANT_DOCUMENT_KEYWORDS) {
      if (allText.includes(keyword)) {
        return { relevant: false, message: getHumorousRejection(allText, 'personal') };
      }
    }
    
    for (const [category, pattern] of Object.entries(IMAGE_CONTEXT_PATTERNS)) {
      if (pattern.test(allText)) {
        return { relevant: false, message: getHumorousRejection(allText, category) };
      }
    }
    
    if ((!ocrData.lineItems || ocrData.lineItems.length === 0) && !ocrData.amount) {
      return { relevant: false, message: getHumorousRejection(allText) };
    }
  }
  
  if (docType && !VALID_DOCUMENT_TYPES.includes(docType) && docType !== 'unknown') {
    return {
      relevant: false,
      message: `This document type (${docType}) is not supported for carbon accounting. Please upload an invoice, bill, or receipt.`
    };
  }
  
  return { relevant: true };
}

// ============= ENHANCED UNIT DETECTION =============
// Used only when the OCR gave no explicit unit. Bare "unit"/"units" are not
// read as kWh: they also appear as "unit price" on ordinary invoices.
function detectUnit(text: string): string | null {
  const unitPatterns: Record<string, RegExp> = {
    'kWh': /\b(kwh|kilowatt[- ]?hours?|kw\.h)\b/i,
    'MWh': /\b(mwh)\b/i,
    'kl': /\b(kl|kilolitres?|kiloliters?)\b/i,
    'litre': /\b(litres?|liters?|ltrs?|l1tre|1itre)\b/i,
    'kg': /\b(kg|kilograms?|kgs|k\.g)\b/i,
    'tonne': /\b(tonnes?|mt|metric\s*tons?)\b/i,
    'scm': /\b(scm|sm3|cubic\s*met(re|er)s?|cu\.m)\b/i,
  };

  for (const [unit, pattern] of Object.entries(unitPatterns)) {
    if (pattern.test(text)) return unit;
  }
  return null;
}

interface LineItem {
  description: string;
  hsn_code?: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  total?: number;
  productCategory?: string;
  industryCode?: string;
  industryName?: string;
  scope?: number;
  fuelType?: string;
  co2Kg?: number;
  emissionFactor?: number;
  /** Avoided emissions for green purchases. Reported separately, never netted. */
  avoidedCo2Kg?: number;
  avoidedFactor?: number;
  /** Quantity and unit as printed, when converted to the factor's unit. */
  originalQuantity?: number;
  originalUnit?: string;
  factorSource?: string;
  classificationMethod?: 'HSN' | 'KEYWORD' | 'UNVERIFIABLE';
  sourcePage?: number;
  sourceText?: string;
  validationFlags?: string[];
}

interface ExtractedData {
  documentType: 'invoice' | 'bill' | 'certificate' | 'receipt' | 'unknown';
  vendor?: string;
  date?: string;
  invoiceNumber?: string;
  supplierGstin?: string;
  buyerGstin?: string;
  amount?: number;
  currency?: string;
  lineItems: LineItem[];
  taxAmount?: number;
  subtotal?: number;
  primaryScope?: number;
  primaryCategory?: string;
  /** Gross emissions (>= 0). Avoided emissions are never subtracted. */
  totalCO2Kg?: number;
  /** Avoided emissions from green line items, reported separately (>= 0). */
  avoidedCO2Kg?: number;
  /** Electricity bills only: billing details as printed, validated. */
  electricityBill?: ElectricityBillMeta;
  confidence: number;
  validationFlags: string[];
  classificationStatus: 'VERIFIED' | 'PARTIALLY_VERIFIED' | 'UNVERIFIABLE';
  methodology: {
    name: string;
    version: string;
    country: string;
    factorVersion: string;
    confidenceVersion: string;
  };
}

// ============= AI OCR EXTRACTION (DATA ONLY - NO CALCULATIONS) =============
// AI extracts ONLY: invoice_id, date, vendor, gstin, line_items (description, hsn, quantity, unit, amount)
// AI does NOT calculate CO2 values - that's done by deterministic math above
async function extractWithAI(imageBase64: string, mimeType: string, apiKey: string, model: string): Promise<any> {
  const systemPrompt = `You are an expert OCR document analyzer for Indian MSMEs. Your ONLY job is to extract data fields from invoices. You do NOT calculate emissions or carbon values.

CRITICAL EXTRACTION RULES:
1. Extract ONLY these fields - do NOT calculate or estimate anything else:
   - documentType: invoice/bill/receipt/certificate/unknown
   - vendor: Company name on the document
   - date: Invoice/bill date (normalize to YYYY-MM-DD)
   - invoiceNumber: Invoice/bill number
   - supplierGstin: 15-character GSTIN if present
   - buyerGstin: Buyer GSTIN if present
   - amount: Total amount in INR (numbers only)
   - taxAmount: GST/tax amount if shown
   - subtotal: Subtotal before tax if shown
   - lineItems: Array of items with:
     - description: Product/service name exactly as shown
     - hsn_code: 4-8 digit HSN/SAC code if visible
     - quantity: Numeric quantity ONLY if explicitly stated (DO NOT INFER)
     - unit: Unit type ONLY if explicitly stated (litre/kWh/kg/ton/km/scm/nos/pcs)
     - unitPrice: Per unit price if shown
      - total: Line total if shown
     - sourcePage: PDF page number where the item is visible; use 1 for a single image
     - sourceText: Short exact text fragment supporting the quantity and unit
     - logistics: ONLY for freight, transport or courier lines, and ONLY the
       values printed on the document, otherwise null:
       { "mode": "road"/"rail"/"air"/"sea" as printed, "distanceKm": number,
         "weightKg": number (convert only if printed in tonnes: x 1000),
         "origin": city as printed, "destination": city as printed }

2. For electricity bills specifically:
   - Find the billed consumption: "Units Consumed", "Billed Units", "Net Units"
     or "Consumption (kWh)". Use the billed figure printed on the bill (it
     already includes any multiplying factor). Do not subtract meter readings
     yourself.
   - Return it at the top level as "unitsConsumedKwh" (number exactly as
     printed) and "unitsConsumedText" (the exact printed text, e.g.
     "Units Consumed: 342").
   - Also add it as a line item: description "Electricity consumed",
     quantity = that number, unit "kWh", hsn_code "2716".
   - Charge lines (energy charges, fixed charges, duty) keep quantity null
     unless a kWh quantity is printed on that same line.
   - Vendor should include the power company name
   - If printed, also return at the top level: "billingPeriodStart" and
     "billingPeriodEnd" (the billing period, YYYY-MM-DD), "tariffCategory"
     (exactly as printed, e.g. "LT-II Commercial") and "sanctionedLoadKw"
     (number, in kW). Leave any that are not printed as null.
   - Never return the consumer's name, address, phone number, consumer or
     account number, or meter number.

3. CRITICAL - DO NOT:
   - Calculate or estimate CO2 emissions
   - Infer quantities from amounts
   - Guess units if not explicitly stated
   - Make up HSN codes

4. If a field is not clearly visible, set it to null - DO NOT GUESS.
   Handwritten bills: read digits slowly and check them against the line total
   (quantity x unit price) when both are written. If a handwritten quantity or
   unit is ambiguous (for example 1 vs 7, 0 vs 6, a smudged decimal point), set
   it to null and copy what you can see into sourceText. Never pick the more
   likely reading.
   Also return "legibility": "printed", "handwritten" or "mixed" at the top level.

5. If this is NOT a business document (selfie, ID card, etc.), set documentType to "unknown".

Respond with ONLY valid JSON, no markdown code blocks.`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extract invoice data from this image. Return ONLY the JSON with extracted fields, no calculations.' },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } }
          ]
        }
      ],
      max_tokens: 4096,
      temperature: 0, // Minimize variability
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`AI API error (${response.status}):`, errorText);
    const error = new Error(`AI extraction failed: ${response.status}`);
    (error as any).status = response.status;
    throw error;
  }

  const data = await response.json();
  // A cut-off answer is not a partial result to keep: the caller retries or
  // refuses it.
  if (isTruncatedFinish(data.choices?.[0]?.finish_reason)) {
    const error = new Error('AI answer was cut off');
    (error as any).truncated = true;
    throw error;
  }
  return data.choices?.[0]?.message?.content;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, mimeType, sessionId, organizationId: rawOrganizationId } = await req.json();
    // Set when a signed-in member uploads in an organisation workspace.
    const organizationId: string | null =
      typeof rawOrganizationId === 'string' && UUID_RE.test(rawOrganizationId) ? rawOrganizationId : null;
    if (rawOrganizationId != null && !organizationId) {
      return new Response(
        JSON.stringify({ error: 'Invalid workspace' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'Image data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============= GENERATE DOCUMENT HASH FIRST =============
    let documentHash: string;
    try {
      documentHash = await generateDocumentHash(imageBase64);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Image data is not valid base64' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log(`Document hash generated: ${documentHash.substring(0, 16)}...`);

    // ============= PAGE LIMIT FOR PDFs =============
    // Long PDFs can exceed what one extraction answer holds and come back
    // incomplete. Refuse them with guidance instead of storing partial data.
    // null for images (one page).
    let pdfPageCount: number | null = null;
    {
      const clean = imageBase64.replace(/\s+/g, '');
      const head = atob(clean);
      const bytes = new Uint8Array(head.length);
      for (let i = 0; i < head.length; i++) bytes[i] = head.charCodeAt(i);
      if (isPdf(bytes)) {
        let pages = countPdfPages(bytes);
        if (pages === 0) {
          // Compressed page tree: count exactly. Loaded only for such files.
          try {
            const { PDFDocument } = await import('https://esm.sh/pdf-lib@1.17.1');
            pages = (await PDFDocument.load(bytes, { updateMetadata: false, ignoreEncryption: true })).getPageCount();
          } catch (e) {
            console.warn('Exact PDF page count failed:', e);
          }
        }
        if (pages < 1) {
          // Without a page count nothing can confirm the whole file was read.
          return new Response(
            JSON.stringify({ error: UNKNOWN_PAGE_COUNT_MESSAGE, code: 'unknown_page_count' }),
            { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        pdfPageCount = pages;
        if (pages > MAX_PDF_PAGES) {
          return new Response(
            JSON.stringify({ error: pageLimitMessage(pages), code: 'too_many_pages', pages, maxPages: MAX_PDF_PAGES }),
            { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

    // Check for authenticated user. The browser client always sends a bearer
    // token: the anon/publishable key for guests, a user JWT when signed in.
    // A user token that fails validation is rejected rather than silently
    // downgraded to the guest path.
    let userId: string | null = null;
    let isAuthenticated = false;
    let userTier = 'guest';
    let scanLimit: number | null = null; // signed-in users only
    let sourcePath: string | null = null; // stored original file (signed-in only)
    const authHeader = req.headers.get('Authorization');
    const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const isGuestKey = !bearer || bearer === anonKey || bearer === req.headers.get('apikey') || jwtRole(bearer) === 'anon';

    if (!isGuestKey) {
      if (!supabaseUrl || !supabaseKey) {
        return new Response(
          JSON.stringify({ error: 'Authentication service not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const authClient = createClient(supabaseUrl, supabaseKey);
      const { data: authData, error: authError } = await authClient.auth.getUser(bearer);
      if (authError || !authData?.user) {
        return new Response(
          JSON.stringify({ error: 'Your session has expired. Please sign in again.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      userId = authData.user.id;
      isAuthenticated = true;

      if (organizationId && !(await orgCan(authClient, userId, organizationId, 'records.upload'))) {
        return new Response(
          JSON.stringify({ error: 'Your team role cannot add invoices to this organisation. Ask an admin for analyst or data manager access.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      try {
        const supabase = authClient;
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_tier, subscription_expires_at')
          .eq('id', userId)
          .single();

        // An active paid subscription row counts too, so a profile copy that
        // failed to update after payment cannot cut a paying customer's limit.
        const { data: activeSub } = await supabase
          .from('subscriptions')
          .select('tier, expires_at')
          .eq('user_id', userId)
          .eq('status', 'active')
          .order('expires_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        const plan = strongerPlan(
          { tier: profile?.subscription_tier, expiresAt: profile?.subscription_expires_at },
          { tier: activeSub?.tier, expiresAt: activeSub?.expires_at },
        );

        // The plan in force (an expired paid plan reads as Snapshot).
        userTier = effectivePlanTier(plan.tier, plan.expiresAt);
        scanLimit = invoiceScanLimit(plan.tier, plan.expiresAt);

        // ============= DUPLICATE DETECTION FOR AUTHENTICATED USERS =============
        // In an organisation the same invoice counts once, whichever member uploads it.
        const dupLookup = supabase
          .from('documents')
          .select('id, vendor, invoice_number, created_at, cached_result')
          .eq('document_hash', documentHash);
        const { data: existingDoc } = await (organizationId
          ? dupLookup.eq('organization_id', organizationId)
          : dupLookup.eq('user_id', userId))
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingDoc) {
          console.log(`DUPLICATE DETECTED: Hash ${documentHash.substring(0, 16)}... for user ${userId}`);

          // The same file always returns the result stored for it, on every
          // tier, so one invoice never shows two different sets of numbers.
          if (existingDoc.cached_result) {
            return new Response(
              JSON.stringify({
                success: true,
                data: existingDoc.cached_result,
                cached: true,
                isDuplicate: true,
                originalDocumentId: existingDoc.id,
                documentHash,
                message: `This invoice was already processed on ${new Date(existingDoc.created_at).toLocaleDateString('en-IN')}. Using verified results.`
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          return new Response(
            JSON.stringify({
              success: false,
              isDuplicate: true,
              originalDocumentId: existingDoc.id,
              documentHash,
              error: `This invoice was already processed on ${new Date(existingDoc.created_at).toLocaleDateString('en-IN')}. Each invoice can only be counted once.`,
            }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (lookupError) {
        console.error('Profile or duplicate lookup failed:', lookupError);
      }

      // ============= MONTHLY PLAN ALLOWANCE =============
      // New reads this calendar month (India time), counted from the
      // invoices this user stored. Stored invoices returned above are free.
      // A failed count does not block the upload (quota, not access control).
      if (scanLimit !== null) {
        const { count, error: countError } = await authClient
          .from('documents')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('created_at', monthStartIst());
        if (countError) {
          console.error('Monthly allowance count failed:', countError.code);
        } else if ((count ?? 0) >= scanLimit) {
          return new Response(
            JSON.stringify({ error: monthlyLimitMessage(scanLimit), code: 'monthly_limit', limit: scanLimit, used: count, tier: userTier }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    if (!isAuthenticated && organizationId) {
      return new Response(
        JSON.stringify({ error: 'Sign in to add invoices to an organisation.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============= GUEST USER: CHECK FOR CACHED RESULT =============
    // Same invoice in the same guest session returns the same result. The
    // cache is scoped to this session only: another visitor's result for the
    // same file is never returned.
    if (!isAuthenticated) {
      console.log(`Guest user processing. Hash: ${documentHash.substring(0, 16)}... SessionId: ${sessionId ? String(sessionId).substring(0, 8) + '...' : 'MISSING'}`);
      if (!sessionId) {
        console.warn('[WARN] No sessionId provided for guest user - result will not be cached or saved');
      }

      if (supabaseUrl && supabaseKey && sessionId) {
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data: cachedDoc } = await supabase
          .from('documents')
          .select('cached_result, document_hash, created_at')
          .eq('document_hash', documentHash)
          .eq('session_id', sessionId)
          .is('user_id', null)
          .not('cached_result', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cachedDoc?.cached_result) {
          console.log(`CACHE HIT: Returning this session's cached result`);
          return new Response(
            JSON.stringify({
              success: true,
              data: cachedDoc.cached_result,
              documentHash,
              userTier: 'guest',
              cached: true,
              message: 'Returning the earlier result for this invoice from your session.'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    console.log(`Processing document for ${userTier} user...`);

    // ============= GAP 1 FIX: INSERT DOCUMENT STUB BEFORE MRV =============
    // Every invoice becomes a permanent system entry BEFORE AI processing begins.
    // This prevents greenwashing by ensuring the document is recorded even if processing fails.
    let stubDocumentId: string | null = null;
    if (!isAuthenticated && sessionId) {
      const stubUrl = Deno.env.get('SUPABASE_URL');
      const stubKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      if (stubUrl && stubKey) {
        try {
          const stubClient = createClient(stubUrl, stubKey);
          const { data: stubDoc, error: stubError } = await stubClient
            .from('documents')
            .insert({
              document_hash: documentHash,
              document_type: 'pending',
              session_id: sessionId,
              confidence: 0,
            })
            .select('id')
            .single();
          if (stubError) {
            console.error('Document stub insert failed:', stubError);
          } else {
            stubDocumentId = stubDoc.id;
            console.log(`Document stub created: ${stubDocumentId} (hash: ${documentHash.substring(0, 16)}...)`);
          }
        } catch (e) {
          console.error('Stub creation error:', e);
        }
      }
    }

    // ============= AI EXTRACTION (DATA ONLY) =============
    let content: string | null = null;
    let usedModel = 'google/gemini-2.5-flash';
    let truncated = false;

    try {
      content = await extractWithAI(imageBase64, mimeType || 'image/jpeg', LOVABLE_API_KEY, 'google/gemini-2.5-flash');
      console.log('Flash model extraction complete');
    } catch (error: any) {
      if (error.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (error.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI usage limit reached. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (error.truncated) truncated = true;
      console.error('Flash model failed:', error);
    }

    // Parse response
    let ocrData: any = null;
    if (content) {
      try {
        let jsonStr = content;
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          jsonStr = jsonMatch[1].trim();
        }
        ocrData = JSON.parse(jsonStr);
      } catch (e) {
        console.error('Failed to parse flash response:', e);
      }
    }

    // Retry with pro model if needed
    if (!ocrData || (ocrData.lineItems?.length === 0 && ocrData.documentType !== 'unknown')) {
      console.log('Retrying with pro model...');
      try {
        content = await extractWithAI(imageBase64, mimeType || 'image/jpeg', LOVABLE_API_KEY, 'google/gemini-2.5-pro');
        usedModel = 'google/gemini-2.5-pro';
        truncated = false;
        
        let jsonStr = content || '';
        const jsonMatch = content?.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          jsonStr = jsonMatch[1].trim();
        }
        ocrData = JSON.parse(jsonStr);
      } catch (error: any) {
        if (error.status === 429) {
          return new Response(
            JSON.stringify({ error: 'Rate limit exceeded. Please try again.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        console.error('Pro model failed:', error);
        if (error.truncated || (truncated && !ocrData)) {
          // The reads were cut off: refuse rather than keep a partial answer.
          return new Response(
            JSON.stringify({ error: INCOMPLETE_EXTRACTION_MESSAGE, code: 'incomplete_extraction' }),
            { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (!ocrData) {
          return new Response(
            JSON.stringify({ error: 'Failed to extract data. Please try a clearer image.' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    if (!ocrData) {
      return new Response(
        JSON.stringify({ error: 'Failed to parse extracted data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check document relevance
    const relevanceCheck = isDocumentRelevant(ocrData);
    if (!relevanceCheck.relevant) {
      return new Response(
        JSON.stringify({ success: false, error: relevanceCheck.message, isIrrelevant: true }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`AI OCR complete (${usedModel}), applying DETERMINISTIC classification...`);

    // The OCR fields as read, before any classification, for the Scope 3
    // evidence trail. Electricity bills (Scope 2, personal data) are not sealed;
    // a supplier invoice that merely mentions "electric" still is.
    const utilityBill = ocrData.unitsConsumedKwh != null || electricityBillMeta(ocrData) !== null
      || (Array.isArray(ocrData.lineItems) && ocrData.lineItems.some((l: { hsn_code?: unknown }) => String(l?.hsn_code ?? '').startsWith('2716')));
    const sealed = utilityBill || !['invoice', 'bill', 'receipt'].includes(String(ocrData.documentType || '').toLowerCase())
      ? null : sealExtraction(ocrData, pdfPageCount);

    // ============= RULE-BASED CLASSIFICATION & CALCULATION =============
    // This is where all math happens - deterministic, no AI
    const validationFlags: string[] = [];
    // Electricity bills: read printed billed units; "units" means kWh there.
    {
      const prepared = prepareElectricityLines(ocrData);
      ocrData.lineItems = prepared.lines;
      validationFlags.push(...prepared.notes);
    }
    let verifiedItems = 0;
    let unverifiableItems = 0;
    let missingEmissionFactorCount = 0;
    let hsnClassifiedCount = 0;
    let hasAnyQuantity = false;
    let hasAnyUnit = false;
    
    const classifiedItems: LineItem[] = (ocrData.lineItems || []).map((item: any) => {
      const classifiedItem: LineItem = {
        description: item.description || '',
        hsn_code: item.hsn_code,
        quantity: Number.isFinite(Number(item.quantity)) && Number(item.quantity) > 0 ? Number(item.quantity) : undefined,
        unit: item.unit || detectUnit(item.description || '') || undefined,
        unitPrice: item.unitPrice,
        total: item.total,
        // Checked against the real page count; an out-of-range page is
        // reported as unknown, never moved to page 1.
        sourcePage: checkedSourcePage(item.sourcePage, pdfPageCount) ?? undefined,
        sourceText: typeof item.sourceText === 'string' ? item.sourceText.slice(0, 240) : undefined,
        validationFlags: [],
      };

      if (item.sourcePage != null && classifiedItem.sourcePage === undefined) {
        classifiedItem.validationFlags!.push(`Page reference ${String(item.sourcePage).slice(0, 8)} is outside this document; page unknown`);
      }
      if (classifiedItem.quantity && classifiedItem.quantity > 0) hasAnyQuantity = true;
      if (classifiedItem.unit) hasAnyUnit = true;

      // DO NOT infer quantity from amount - this causes hallucination
      // Quantity must be explicitly extracted by OCR

      // Step 1: HSN classification
      if (item.hsn_code) {
        const hsnClass = classifyByHSN(item.hsn_code);
        if (hsnClass) {
          classifiedItem.productCategory = hsnClass.productCategory;
          classifiedItem.industryCode = hsnClass.industryCode;
          classifiedItem.industryName = hsnClass.industryName;
          classifiedItem.scope = hsnClass.scope;
          classifiedItem.classificationMethod = 'HSN';
          hsnClassifiedCount++;
          // Chapter 27 says "fuel" but not which one; take the fuel type from
          // the description when it names one. Without it no factor applies.
          if (hsnClass.productCategory === 'FUEL') {
            const named = classifyByKeyword(item.description || '');
            if (named?.productCategory === 'FUEL' && named.fuelType) classifiedItem.fuelType = named.fuelType;
          }
        }
      }

      // Step 2: Keyword classification fallback
      if (!classifiedItem.productCategory) {
        const keywordClass = classifyByKeyword(item.description || '');
        if (keywordClass) {
          classifiedItem.productCategory = keywordClass.productCategory;
          classifiedItem.industryCode = keywordClass.industryCode;
          classifiedItem.scope = keywordClass.scope;
          classifiedItem.fuelType = keywordClass.fuelType;
          classifiedItem.classificationMethod = 'KEYWORD';
        }
      }

      // Step 3: Mark unverifiable if no classification
      if (!classifiedItem.productCategory) {
        classifiedItem.classificationMethod = 'UNVERIFIABLE';
        unverifiableItems++;
        validationFlags.push(`Unclassified: ${item.description?.substring(0, 30) || 'Unknown'}`);
      } else {
        verifiedItems++;
      }

      // Step 4: DETERMINISTIC emission calculation
      if (classifiedItem.productCategory && classifiedItem.quantity && classifiedItem.unit && classifiedItem.scope) {
        const result = calculateEmissions(
          classifiedItem.quantity,
          classifiedItem.unit,
          classifiedItem.scope,
          classifiedItem.productCategory,
          classifiedItem.fuelType
        );

        if (result) {
          // Store the quantity in the factor's unit (e.g. MWh -> kWh, t -> kg)
          // so quantity x factor = CO2 holds for the stored row; keep the
          // printed values alongside for the audit trail.
          if (result.quantity !== classifiedItem.quantity || result.unit !== classifiedItem.unit) {
            classifiedItem.originalQuantity = classifiedItem.quantity;
            classifiedItem.originalUnit = classifiedItem.unit;
            classifiedItem.quantity = result.quantity;
            classifiedItem.unit = result.unit;
          }
          classifiedItem.factorSource = result.factorSource;
          if (result.kind === 'emission') {
            classifiedItem.co2Kg = result.co2Kg;
            classifiedItem.emissionFactor = result.emissionFactor;
          } else {
            // Avoided emissions are not emissions: no co2Kg, so no emission
            // row is created and nothing is netted against gross totals.
            classifiedItem.avoidedCo2Kg = result.avoidedCo2Kg;
            classifiedItem.avoidedFactor = result.avoidedFactor;
            classifiedItem.validationFlags?.push('Avoided emissions reported separately; not included in totals');
          }
        } else {
          missingEmissionFactorCount++;
          const reason = `No verified factor for ${classifiedItem.productCategory}${classifiedItem.fuelType ? ` (${classifiedItem.fuelType})` : ''} with unit ${classifiedItem.unit}`;
          classifiedItem.validationFlags?.push(reason);
          validationFlags.push(`${reason}: ${classifiedItem.description.substring(0, 40)}`);
        }
      } else if (classifiedItem.productCategory) {
        missingEmissionFactorCount++;
        const reason = !classifiedItem.quantity
          ? 'Missing explicit activity quantity'
          : !classifiedItem.unit
            ? 'Missing explicit activity unit'
            : 'Missing deterministic scope mapping';
        classifiedItem.validationFlags?.push(reason);
        validationFlags.push(`${reason}: ${classifiedItem.description.substring(0, 40)}`);
      }

      return classifiedItem;
    });
    // The same consumption printed on several lines is counted once.
    consolidateElectricity(classifiedItems);

    // Gross emissions and avoided emissions are totalled separately and both
    // stay >= 0. Avoided emissions are never subtracted from gross.
    const { grossCo2Kg: totalCO2Kg, avoidedCo2Kg: totalAvoidedKg } = totalsFor(classifiedItems);
    if (totalAvoidedKg > 0) validationFlags.push('Avoided emissions from green items are reported separately and not netted');

    // Determine primary scope and category
    const scopeCounts: Record<number, number> = {};
    const categoryCounts: Record<string, number> = {};
    
    classifiedItems.forEach(item => {
      if (item.scope) scopeCounts[item.scope] = (scopeCounts[item.scope] || 0) + 1;
      if (item.productCategory) categoryCounts[item.productCategory] = (categoryCounts[item.productCategory] || 0) + 1;
    });

    const primaryScope = Object.entries(scopeCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const primaryCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

    // Classification status
    let classificationStatus: 'VERIFIED' | 'PARTIALLY_VERIFIED' | 'UNVERIFIABLE';
    if (unverifiableItems === 0 && classifiedItems.length > 0 && totalCO2Kg > 0) {
      classificationStatus = 'VERIFIED';
    } else if (verifiedItems > 0 || totalCO2Kg > 0) {
      classificationStatus = 'PARTIALLY_VERIFIED';
    } else if (classifiedItems.length > 0 || ocrData.amount) {
      classificationStatus = 'PARTIALLY_VERIFIED';
    } else {
      classificationStatus = 'UNVERIFIABLE';
    }

    // Validation flags
    if (!ocrData.invoiceNumber) validationFlags.push('Missing invoice number');
    if (!ocrData.supplierGstin) validationFlags.push('Missing supplier GSTIN');
    if (!ocrData.date) validationFlags.push('Missing invoice date');

    // Deterministic confidence calculation
    const totalPossibleFields = 7;
    let extractedFields = 0;
    if (ocrData.vendor) extractedFields++;
    if (ocrData.date) extractedFields++;
    if (ocrData.invoiceNumber) extractedFields++;
    if (ocrData.supplierGstin) extractedFields++;
    if (ocrData.buyerGstin) extractedFields++;
    if (ocrData.amount) extractedFields++;
    if (ocrData.lineItems?.length > 0) extractedFields++;

    const finalConfidence = calculateDeterministicConfidence({
      hasQuantity: hasAnyQuantity,
      hasUnit: hasAnyUnit,
      hasInvoiceNumber: !!ocrData.invoiceNumber,
      hasSupplierGstin: !!ocrData.supplierGstin,
      hasDate: !!ocrData.date,
      hasAmount: !!ocrData.amount,
      lineItemCount: classifiedItems.length,
      unverifiableCount: unverifiableItems,
      missingEmissionFactorCount,
      hsnClassifiedCount,
      extractedFieldRatio: extractedFields / totalPossibleFields,
    });

    const extractedData: ExtractedData = {
      documentType: ocrData.documentType || 'unknown',
      vendor: ocrData.vendor,
      date: ocrData.date,
      invoiceNumber: ocrData.invoiceNumber,
      supplierGstin: ocrData.supplierGstin,
      buyerGstin: ocrData.buyerGstin,
      amount: ocrData.amount,
      currency: ocrData.currency || 'INR',
      lineItems: classifiedItems,
      taxAmount: ocrData.taxAmount,
      subtotal: ocrData.subtotal,
      primaryScope: primaryScope ? parseInt(primaryScope) : undefined,
      primaryCategory,
      totalCO2Kg: totalCO2Kg > 0 ? totalCO2Kg : undefined,
      avoidedCO2Kg: totalAvoidedKg > 0 ? totalAvoidedKg : undefined,
      confidence: finalConfidence,
      validationFlags,
      classificationStatus,
      methodology: METHODOLOGY_VERSION,
      electricityBill: electricityBillMeta(ocrData) ?? undefined,
    };

    console.log(`DETERMINISTIC RESULT: ${classificationStatus}, ${verifiedItems} items, ${totalCO2Kg.toFixed(2)} kgCO₂e, confidence: ${finalConfidence}%`);

    // ============= CACHE THE RESULT =============
    // Store in database so future requests for same document get same result
    // For guests with a stub: UPDATE the existing stub. For auth users: INSERT new.
    
    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        if (stubDocumentId) {
          // UPDATE the stub created before processing
          const { error: updateError } = await supabase
            .from('documents')
            .update({
              document_type: extractedData.documentType,
              vendor: extractedData.vendor,
              invoice_number: extractedData.invoiceNumber,
              invoice_date: parseInvoiceDate(extractedData.date),
              amount: extractedData.amount,
              confidence: Math.min(extractedData.confidence, 999.99),
              cached_result: extractedData,
              cache_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            })
            .eq('id', stubDocumentId);
          
          if (updateError) {
            console.error('Failed to update document stub:', updateError);
          } else {
            console.log('Document stub updated with MRV result');
          }
        } else {
          // Original file as evidence (signed-in only; guests' files are never stored).
          if (isAuthenticated && userId) {
            sourcePath = await storeSourceFile(supabase, userId, documentHash, mimeType || 'image/jpeg', imageBase64);
          }
          // Insert cache record (authenticated users or fallback)
          const { data: savedDoc, error: cacheError } = await supabase
            .from('documents')
            .insert({
              document_hash: documentHash,
              document_type: extractedData.documentType,
              vendor: extractedData.vendor,
              invoice_number: extractedData.invoiceNumber,
              invoice_date: parseInvoiceDate(extractedData.date),
              amount: extractedData.amount,
              confidence: Math.min(extractedData.confidence, 999.99),
              cached_result: extractedData,
              cache_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              user_id: userId,
              file_url: sourcePath,
              session_id: isAuthenticated ? null : (sessionId || null),
              ...(isAuthenticated && organizationId ? { organization_id: organizationId } : {}),
            })
            .select('id')
            .single();
          
          if (cacheError) {
            console.error('Failed to cache result:', cacheError);
          } else {
            console.log('Result cached for deterministic retrieval');
            // Scope 3 trail: seal the OCR fields and record each line. No-op
            // until the pending migration is applied; never affects this response.
            if (sealed && isAuthenticated && userId && savedDoc?.id) {
              const trail = sealAndRecord(supabase, {
                documentId: savedDoc.id, userId, organizationId: organizationId || null, documentHash,
                sealed, model: usedModel, sourcePath,
              });
              const rt = (globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } }).EdgeRuntime;
              if (rt?.waitUntil) rt.waitUntil(trail); else await trail;
            }
          }
        }
      } catch (e) {
        console.error('Cache error:', e);
      }
    }

    // Water MRV shadow run: stores to water_* tables only, shows nothing, and is a
    // no-op unless water_mrv_settings.enabled is true. Never affects this response.
    if (supabaseUrl && supabaseKey && isAuthenticated && userId) {
      const shadow = shadowWaterRun(createClient(supabaseUrl, supabaseKey), ocrData, userId, documentHash);
      const rt = (globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } }).EdgeRuntime;
      if (rt?.waitUntil) rt.waitUntil(shadow); else await shadow;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: extractedData,
        documentHash,
        userTier
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing document:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
