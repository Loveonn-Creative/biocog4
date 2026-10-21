import { aiConfigured, aiFetch } from '../_shared/aiFetch.ts';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { countPdfPages, isPdf, MAX_PDF_PAGES, pageLimitMessage } from '../_shared/pdfPages.ts';
import { checkedSourcePage, INCOMPLETE_EXTRACTION_MESSAGE, isTruncatedFinish, UNKNOWN_PAGE_COUNT_MESSAGE } from '../_shared/extractionChecks.ts';
import { effectivePlanTier, invoiceScanLimit, monthlyLimitMessage, monthStartIst, canonicalPlan, strongestRow } from '../_shared/planLimits.ts';
import { pageCountingFrom } from '../_shared/addonPurchases.ts';
import { clientIp, guestSubject, readUse, takeUse } from '../_shared/intelligenceUsage.ts';
import { dayIst } from '../_shared/intelligence.ts';
import { GUEST_DAILY_SCANS, GUEST_IP_DAILY_SCANS, guestFileCheck } from '../_shared/guestScan.ts';
import { parseInvoiceDate } from '../_shared/invoiceDate.ts';
import { SOURCE_BUCKET, sourceFilePath } from '../_shared/sourceFiles.ts';
import { BASIS_LABEL, consolidateElectricity, documentCaptureOf, electricityBillMeta, isElectricityBill, prepareElectricityLines, isGridRenewableLine, type Basis, type ElectricityBillMeta, type EnergyEvidence } from '../_shared/electricityBill.ts';
import { sealExtraction } from '../_shared/scope3.ts';
import { sealAndRecord } from '../_shared/scope3Record.ts';
import { recordBillAndRecalculate } from '../_shared/scope2Record.ts';
import { gridCountryFor } from '../_shared/electricity.ts';
import { shadowWaterRun } from '../_shared/water/shadow.ts';
import { orgCan, UUID_RE } from '../_shared/workspaceAccess.ts';
import { buildEmissionRows } from '../_shared/emissionRows.ts';
import { documentKind, isEvidenceOnlyKind, DOCUMENT_KIND_LABEL, EVIDENCE_ONLY_NOTE, type DocumentKind } from '../_shared/documentKind.ts';
import { priceCheck, type PriceCheck } from '../_shared/priceCheck.ts';
import { financialKind, financialPath, readFinancialFigures, readMonthlyCashflow, FINANCIAL_BUCKET, FINANCIAL_GUEST_MESSAGE, FINANCIAL_STORED_MESSAGE, FINANCIAL_UNAVAILABLE_MESSAGE } from '../_shared/financialDocuments.ts';
import { cylinderToKg, electricityBillIdentity, fileCheck, guideDocument, guideLine, invoiceIdentity, normalizeDocumentType, parseAiJson, parseAmount, parseQuantity, providerFailure, type LineGuidance } from '../_shared/extractionRead.ts';
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

// Financial documents are handled before this check (financialDocuments.ts).

function isDocumentRelevant(ocrData: any): { relevant: boolean; message?: string } {
  const docType = (ocrData.documentType || '').toLowerCase();
  const allText = JSON.stringify(ocrData).toLowerCase();
  
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
  /** Warning only: quantity × unit price differs from the printed line total. */
  priceCheck?: PriceCheck;
  /** Plain statements behind a counted figure (conversions, grid country, basis). */
  assumptions?: string[];
  /** Why the line was or was not counted, and the next step. */
  guidance?: LineGuidance;
  /** Counted lines: how the quantity was obtained, and its plain label. */
  basis?: Basis;
  basisLabel?: string;
  /** Printed figures behind a derived quantity (kVAh, power factor, meter readings). */
  evidence?: EnergyEvidence;
  /** Kept for its printed figure only (e.g. kVAh once kWh is counted); not counted. */
  referenceNote?: string;
  printedQuantity?: number;
  printedUnit?: string;
}

interface ExtractedData {
  documentType: 'invoice' | 'bill' | 'certificate' | 'receipt' | 'unknown';
  /** Rules-library label (documentKind.ts); credit notes and purchase orders are evidence only. */
  documentKind: DocumentKind;
  /** The heading as printed, when read. */
  documentTitle?: string;
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
  /** How the document was captured: printed, handwritten or a meter photo. */
  documentCapture?: 'printed' | 'handwritten' | 'meter_photo';
  /** Counts per line status and the one next step that unlocks the most. */
  guidance?: ReturnType<typeof guideDocument>;
  /** Printed identity of the invoice (supplier, number, date), so a second copy is counted once. */
  invoiceKey?: string;
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
// Flash only (owner rule, October 2026). The first read is capped at 4,096
// output tokens; one second read, with a larger cap and more reasoning, runs
// only when the first was cut off or found no lines.
const FIRST_READ = { maxTokens: 4096, effort: 'low' } as const;
const SECOND_READ = { maxTokens: 16384, effort: 'medium' } as const;
async function extractWithAI(imageBase64: string, mimeType: string, apiKey: string, model: string, read: { maxTokens: number; effort: string } = FIRST_READ): Promise<any> {
  const systemPrompt = `You are an expert OCR document analyzer for Indian MSMEs. Your ONLY job is to extract data fields from invoices. You do NOT calculate emissions or carbon values.

CRITICAL EXTRACTION RULES:
1. Extract ONLY these fields - do NOT calculate or estimate anything else:
   - documentType: invoice/bill/receipt/certificate/unknown
   - documentTitle: the document's main heading exactly as printed (e.g. "Tax Invoice",
     "Credit Note", "Purchase Order", "E-Way Bill", "Lorry Receipt", "Consignment Note",
     "Cash Memo", "Bill of Supply"), else null
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
   - Find the billed consumption: "Units Consumed", "Billed Units" or
     "Consumption (kWh)". Use the billed figure printed on the bill (it
     already includes any multiplying factor). Do not subtract meter readings
     yourself.
   - If the bill shows both import and export (net metering or rooftop
     solar), use the import units, never the net units.
   - Return it at the top level as "unitsConsumedKwh" (number exactly as
     printed), "unitsConsumedUnit" (the unit printed with it: "kWh", or
     "kVAh" if the bill is in kVAh) and "unitsConsumedText" (the exact printed
     text, e.g. "Units Consumed: 342").
   - Also add it as a line item: description "Electricity consumed",
     quantity = that number, unit as printed ("kWh" or "kVAh"), hsn_code "2716".
   - kVAh billing (some HT and LT tariffs bill in kVAh): still return the
     billed figure as above with unit "kVAh". In addition, ONLY if printed on
     the bill, return at the top level:
       "activeEnergyKwh": the kWh consumption printed for this period (often
       in the meter-reading table as kWh consumption, even when billing is
       in kVAh), number exactly as printed, and "activeEnergyText": the exact
       printed text;
       "powerFactor": the average or billed power factor exactly as printed
       (greater than 0 and at most 1, e.g. 0.95), and "powerFactorText": the
       exact printed text.
     Never work these out yourself: do not multiply, divide or subtract
     anything. If not printed, set them to null.
   - Charge lines (energy charges, fixed charges, demand charges, wheeling,
     FAC, duty, taxes, rebates, discounts) keep quantity null unless a kWh
     quantity is printed on that same line.
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

5a. Return "documentCapture" at the top level: "printed" for a printed bill or
   invoice, "handwritten" when the quantities are handwritten (a handwritten
   bill or slip), or "meter_photo" for a photograph of an electricity meter
   display or register (not a bill).
   For "meter_photo": set documentType to "bill", lineItems to [], and return
   "meterReadings": an array of the cumulative kWh register readings visible
   in the photo, each { "readingKwh": number as shown, "readingDate":
   "YYYY-MM-DD" if a date is visible with it, else null, "sourceText": the
   exact visible text of that reading }. Only kWh register values: never the
   meter number, serial number, consumer or account number. Do not subtract
   readings yourself. If a digit is unclear, leave that reading out.

5. If this is NOT a business document (selfie, ID card, etc.), set documentType to "unknown".

Respond with ONLY valid JSON, no markdown code blocks.`;

  const response = await aiFetch({
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
      // Reasoning counts against the cap on current Gemini models.
      max_tokens: read.maxTokens,
      temperature: 0, // Minimize variability
      response_format: { type: 'json_object' },
      reasoning_effort: read.effort,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    // Status only: the gateway's error body can echo request content.
    console.error(`AI API error (${response.status})`);
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

// Emission rows are created here, on the server, from this function's own
// read, so a browser cannot change the activity, factor or result. Only when
// the document has no rows yet. Returns the new ids, or null when nothing was
// written (the browser then falls back to its own copy of the same rows).
async function createEmissionRows(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: SupabaseClient<any, any, any>,
  extracted: unknown,
  owner: { documentId: string; userId: string; organizationId: string | null },
): Promise<string[] | null> {
  try {
    const { count, error: countError } = await db.from('emissions').select('id', { count: 'exact', head: true }).eq('document_id', owner.documentId);
    if (countError || (count ?? 0) > 0) return null;
    const rows = buildEmissionRows(extracted as Parameters<typeof buildEmissionRows>[0], {
      documentId: owner.documentId, sessionId: null, userId: owner.userId, organizationId: owner.organizationId,
    });
    if (rows.length === 0) return [];
    const { data, error } = await db.from('emissions').insert(rows).select('id');
    if (error) { console.error('Server emission insert failed:', error.code); return null; }
    return (data ?? []).map((r: { id: string }) => r.id);
  } catch (e) {
    console.error('Server emission insert failed:', (e as Error)?.name ?? 'error');
    return null;
  }
}

// The read reserved for this request (signed-in uploads). It is committed
// when the read produced something and released (nothing counted, credits
// back) when it failed, was empty or was a duplicate; see the invoice_reads
// migration. Settled once, after the response is built.
interface ReadCtx { id: string | null; commit: boolean; documentId: string | null }
async function settleRead(read: ReadCtx) {
  if (!read.id) return;
  const url = Deno.env.get('SUPABASE_URL'); const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return;
  try {
    const db = createClient(url, key);
    const { error } = read.commit
      ? await db.rpc('commit_invoice_read', { p_id: read.id, p_document_id: read.documentId })
      : await db.rpc('release_invoice_read', { p_id: read.id });
    if (error) console.error('Read settle failed:', error.code);
  } catch (e) {
    console.error('Read settle failed:', (e as Error)?.name ?? 'error');
  }
}

serve(async (req) => {
  const read: ReadCtx = { id: null, commit: false, documentId: null };
  try { return await handleRequest(req, read); } finally { await settleRead(read); }
});

async function handleRequest(req: Request, read: ReadCtx): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, mimeType, sessionId, organizationId: rawOrganizationId, reread, enteredKwh: rawEnteredKwh } = await req.json();
    // kWh the owner typed for a kVAh bill that prints neither kWh nor a power
    // factor. Used only in that case, checked against the printed kVAh, and
    // labelled "Entered by you" (electricityBill.ts kwhForKvahBill).
    const enteredKwh = typeof rawEnteredKwh === 'number' && Number.isFinite(rawEnteredKwh) && rawEnteredKwh > 0 && rawEnteredKwh <= 10_000_000 ? rawEnteredKwh : null;
    const started = Date.now();
    // Set when the user asks to read again an invoice that produced no emissions.
    let rereadDocId: string | null = null;
    // Set once the document and its emission rows are stored on the server.
    let savedDocumentId: string | null = null;
    let savedEmissionIds: string[] | null = null;
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

    if (!aiConfigured()) {
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
    // Country saved in Settings; decides which grid factor applies to electricity.
    let profileLocation: string | null = null;
    let userTier = 'guest';
    let scanLimit: number | null = null; // signed-in users only
    let planCycle: 'monthly' | 'yearly' | null = null;
    let planExpiresAt: string | null = null;
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

      const check = fileCheck(imageBase64, mimeType);
      if (!check.ok) {
        return new Response(JSON.stringify({ error: check.message, code: check.code }), { status: check.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

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
          .select('subscription_tier, subscription_expires_at, location')
          .eq('id', userId)
          .single();
        profileLocation = typeof profile?.location === 'string' ? profile.location : null;

        // The active subscription rows are the record of the plan; the profile
        // copy counts only when no row is in force (planLimits.canonicalPlan).
        const { data: activeRows } = await supabase
          .from('subscriptions')
          .select('tier, expires_at, billing_cycle')
          .eq('user_id', userId)
          .eq('status', 'active');
        const activeSub = strongestRow(activeRows ?? []);
        planCycle = activeSub ? (activeSub.billing_cycle === 'monthly' ? 'monthly' : 'yearly') : null;
        planExpiresAt = activeSub?.expires_at ?? null;
        const plan = canonicalPlan(
          { tier: profile?.subscription_tier, expiresAt: profile?.subscription_expires_at },
          activeRows ?? [],
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

        // "Read again" is allowed only while the stored read produced no
        // emissions, so a counted invoice can never change under the user.
        if (existingDoc && reread === true) {
          const { count: rows } = await supabase.from('emissions').select('id', { count: 'exact', head: true }).eq('document_id', existingDoc.id);
          if ((rows ?? 0) === 0) rereadDocId = existingDoc.id;
        }

        if (existingDoc && !rereadDocId) {
          console.log(`DUPLICATE DETECTED: Hash ${documentHash.substring(0, 16)}... for user ${userId}`);

          // The same file always returns the result stored for it, on every
          // tier, so one invoice never shows two different sets of numbers.
          if (existingDoc.cached_result) {
            // A stored read whose rows were never saved (an earlier browser
            // save failed): create them now from the stored read.
            const ids = await createEmissionRows(supabase, existingDoc.cached_result, { documentId: existingDoc.id, userId, organizationId });
            return new Response(
              JSON.stringify({
                success: true,
                data: existingDoc.cached_result,
                cached: true,
                isDuplicate: true,
                originalDocumentId: existingDoc.id,
                documentHash,
                ...(ids && ids.length ? { serverSaved: true, documentId: existingDoc.id, emissionIds: ids } : {}),
                message: `You uploaded this invoice on ${new Date(existingDoc.created_at).toLocaleDateString('en-IN')}. Showing the result saved then; it is counted once.`
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
        console.error('Profile or duplicate lookup failed:', (lookupError as { code?: string })?.code ?? 'error');
      }

      // ============= MONTHLY PLAN ALLOWANCE (reads ledger) =============
      // Each PDF page and each image is one invoice (from the account's next
      // period; until then a file counts as one). Reserved now, so parallel
      // uploads cannot pass the limit together; committed only when the read
      // produces something. Deleting a document never gives a read back.
      // Plan reads run out first, then purchased credits.
      if (scanLimit !== null && !rereadDocId) {
        const { data: r, error: rErr } = await authClient.rpc('reserve_invoice_read', {
          p_user: userId, p_org: organizationId || null, p_hash: documentHash, p_pages: pdfPageCount ?? 1,
          p_plan_limit: scanLimit, p_period_start: monthStartIst(),
          p_page_counting_from: pageCountingFrom({ cycle: planCycle, expiresAt: planExpiresAt }),
        });
        if (rErr && (rErr.code === 'PGRST202' || rErr.code === '42883')) {
          // Ledger not migrated yet: count stored documents, as before.
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
        } else if (rErr) {
          // A failed check does not block the upload (quota, not access control).
          console.error('Read reservation failed:', rErr.code);
        } else if (r && r.ok === false) {
          return new Response(
            JSON.stringify({ error: monthlyLimitMessage(scanLimit), code: 'monthly_limit', limit: scanLimit, used: r.used, credits: r.credits, needed: r.units, tier: userTier, topUp: true }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else if (r?.id) {
          read.id = r.id;
        }
      }
    }

    if (!isAuthenticated && organizationId) {
      return new Response(
        JSON.stringify({ error: 'Sign in to add invoices to an organisation.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Set for guests once their limit has been checked; the read is counted after it succeeds.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let guestCounters: { admin: SupabaseClient<any, any, any>; device: string; network: string } | null = null;
    const countGuestRead = async () => {
      if (!guestCounters) return;
      const c = guestCounters;
      guestCounters = null; // once per request
      try {
        await takeUse(c.admin, c.device, 'guest_scan', GUEST_DAILY_SCANS + 1000);
        await takeUse(c.admin, c.network, 'guest_scan', GUEST_IP_DAILY_SCANS + 1000);
      } catch (e) {
        console.error('Guest read count failed:', (e as Error)?.name ?? 'error');
      }
    };

    // ============= GUEST: EPHEMERAL, CAPPED =============
    // Guests can test freely, but nothing they upload is kept on the server:
    // no file, no document row, no cached result. Their result lives in their
    // own browser for 24 hours. A device may read 30 invoices a day (keyed by
    // a hashed guest session, or the hashed network address without one) and
    // one network address 300, so scripts cannot run up AI cost. Counters hold
    // no content.
    if (!isAuthenticated) {
      const fileCheck = guestFileCheck(imageBase64, mimeType);
      if (!fileCheck.ok) {
        return new Response(JSON.stringify({ error: fileCheck.message, code: fileCheck.code }), { status: fileCheck.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (supabaseUrl && supabaseKey) {
        try {
          const admin = createClient(supabaseUrl, supabaseKey);
          const day = dayIst();
          const ip = clientIp(req.headers);
          const device = await guestSubject(typeof sessionId === 'string' && sessionId ? `session|${sessionId}` : `ip|${ip}`, day, supabaseKey);
          const network = await guestSubject(`net|${ip}`, day, supabaseKey);
          // Checked now, counted only after a successful read (below), so a
          // read that fails on our side never uses up one of the 30.
          const perDevice = await readUse(admin, device, 'guest_scan', GUEST_DAILY_SCANS);
          const perNetwork = perDevice.allowed ? await readUse(admin, network, 'guest_scan', GUEST_IP_DAILY_SCANS) : perDevice;
          guestCounters = { admin, device, network };
          if (!perDevice.allowed || !perNetwork.allowed) {
            return new Response(JSON.stringify({
              error: `You've tried ${GUEST_DAILY_SCANS} invoices today without an account. Sign in free to keep going and save your results.`,
              code: 'guest_daily_limit', limit: GUEST_DAILY_SCANS,
            }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
        } catch (e) {
          // The counter itself failed: refuse rather than read without a limit.
          console.error('Guest limit check failed:', (e as Error)?.name ?? 'error');
          return new Response(JSON.stringify({ error: 'Could not start reading right now. Please try again in a moment.', code: 'guest_limit_unavailable' }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      }
    }

    console.log(`Processing document for ${userTier} user...`);

    // ============= AI EXTRACTION (DATA ONLY) =============
    let content: string | null = null;
    let usedModel = 'google/gemini-2.5-flash';
    let truncated = false;
    // Last AI provider status, so a failure on our side is never reported as a bad image.
    let providerStatus: number | undefined;
    const failOnOurSide = (status: number | undefined) => {
      const f = providerFailure(status);
      return new Response(JSON.stringify({ error: f.message, code: f.code }), { status: f.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    };

    try {
      content = await extractWithAI(imageBase64, mimeType || 'image/jpeg', '', 'google/gemini-2.5-flash');
      console.log('Flash model extraction complete');
    } catch (error: any) {
      if (error.status === 429 || error.status === 402) return failOnOurSide(error.status);
      if (typeof error.status === 'number') providerStatus = error.status;
      if (error.truncated) truncated = true;
      console.error('Flash model failed:', error?.status ?? error?.name ?? 'error');
    }

    // Parse response
    let ocrData: any = null;
    if (content) {
      try {
        ocrData = parseAiJson(content);
      } catch (e) {
        console.error('Failed to parse flash response:', (e as Error)?.name ?? 'error');
      }
    }

    // One second read if the first was cut off or found nothing
    const meterPhotoRead = !!ocrData && Array.isArray(ocrData.meterReadings) && ocrData.meterReadings.length > 0 && documentCaptureOf(ocrData) === 'meter_photo';
    if (!ocrData || (ocrData.lineItems?.length === 0 && ocrData.documentType !== 'unknown' && !meterPhotoRead)) {
      // A second, slower read only while it can finish inside the edge limit.
      if (Date.now() - started > 70_000) {
        if (ocrData) { /* keep the first read */ } else if (truncated) {
          return new Response(JSON.stringify({ error: INCOMPLETE_EXTRACTION_MESSAGE, code: 'incomplete_extraction' }), { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        } else return failOnOurSide(providerStatus);
      } else {
      console.log('Second read (flash, larger cap)...');
      try {
        content = await extractWithAI(imageBase64, mimeType || 'image/jpeg', '', 'google/gemini-2.5-flash', SECOND_READ);
        truncated = false;
        
        ocrData = parseAiJson(content || '');
      } catch (error: any) {
        if (error.status === 429 || error.status === 402) return failOnOurSide(error.status);
        if (typeof error.status === 'number') providerStatus = error.status;
        console.error('Second read failed:', error?.status ?? error?.name ?? 'error');
        if (error.truncated || (truncated && !ocrData)) {
          // The reads were cut off: refuse rather than keep a partial answer.
          return new Response(
            JSON.stringify({ error: INCOMPLETE_EXTRACTION_MESSAGE, code: 'incomplete_extraction' }),
            { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (!ocrData) {
          // Both reads failed: if a provider refused, that is on our side.
          if (providerStatus !== undefined) return failOnOurSide(providerStatus);
          return new Response(
            JSON.stringify({ error: 'This file is hard to read. Nothing was counted. A sharp photo of the full page, or the original PDF, usually works first time.', code: 'unreadable' }),
            { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
      }
    }

    if (!ocrData) {
      return new Response(
        JSON.stringify({ error: 'This file is hard to read. Nothing was counted. A sharp photo of the full page, or the original PDF, usually works first time.', code: 'unreadable' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    // Model wording varies ("Tax Invoice", "Electricity Bill", "₹12,345"):
    // normalise the type and read money fields as numbers, never guessing.
    // The kind is read from the heading and type as printed, before normalising.
    const printedTitle = typeof ocrData.documentTitle === 'string' ? ocrData.documentTitle.slice(0, 80) : undefined;
    const printedType = ocrData.documentType;
    ocrData.documentType = normalizeDocumentType(ocrData.documentType);
    // A photo of an electricity meter with readings is evidence for a bill.
    const capture = documentCaptureOf(ocrData);
    if (capture === 'meter_photo' && Array.isArray(ocrData.meterReadings) && ocrData.meterReadings.length > 0) ocrData.documentType = 'bill';
    for (const k of ['amount', 'taxAmount', 'subtotal']) {
      if (ocrData[k] != null) ocrData[k] = parseAmount(ocrData[k]) ?? undefined;
    }

    // ============= FINANCIAL DOCUMENTS (owner approval, Oct 2026) =============
    // Income tax returns, bank statements and financial statements are not
    // rejected. Signed in: the file goes to a private, server-only bucket and
    // only the allow-listed figures are read and kept, for financial
    // modelling, risk and climate finance. Nothing from the first read is
    // kept, no document or emission row is made, and nothing is shown in the
    // user's records or returned to a browser. Guests: nothing is kept.
    const finKind = financialKind(ocrData);
    if (finKind) {
      await countGuestRead();
      const reply = (body: Record<string, unknown>) => new Response(JSON.stringify(body), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (!isAuthenticated || !userId || !supabaseUrl || !supabaseKey) {
        return reply({ success: true, financialDocument: true, stored: false, error: FINANCIAL_GUEST_MESSAGE, message: FINANCIAL_GUEST_MESSAGE });
      }
      const admin = createClient(supabaseUrl, supabaseKey);
      const mime = (mimeType || 'image/jpeg').toLowerCase();
      const path = financialPath(userId, documentHash, mime);
      const unavailable = () => reply({ success: true, financialDocument: true, stored: false, error: FINANCIAL_UNAVAILABLE_MESSAGE, message: FINANCIAL_UNAVAILABLE_MESSAGE });
      if (!path) return unavailable();
      const clean = imageBase64.replace(/\s+/g, '');
      const bin = atob(clean);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const up = await admin.storage.from(FINANCIAL_BUCKET).upload(path, bytes, { contentType: mime, upsert: false });
      const alreadyThere = up.error && /exist|duplicate/i.test(up.error.message || '');
      if (up.error && !alreadyThere) { console.error('Financial file not stored:', up.error.message); return unavailable(); }
      const figures = await readFinancialFigures(mime, clean);
      const { error: rowError } = await admin.from('financial_documents').insert({
        user_id: userId, organization_id: organizationId || null, doc_kind: finKind, storage_path: path,
        sha256: documentHash, mime_type: mime, size_bytes: bytes.length, figures,
        figures_read_at: Object.keys(figures).length ? new Date().toISOString() : null,
      });
      if (rowError && rowError.code !== '23505') {
        console.error('Financial document row not stored:', rowError.code);
        if (!alreadyThere) await admin.storage.from(FINANCIAL_BUCKET).remove([path]);
        return unavailable();
      }
      // Month-by-month totals for bank statements, written separately so a
      // database without the monthly column (finance-insights migration not
      // yet applied) still stores the record and its figures.
      // Kill switch: secret FINANCE_INSIGHTS=off stops the monthly read.
      if (finKind === 'bank_statement' && !rowError && Deno.env.get('FINANCE_INSIGHTS') !== 'off') {
        const monthly = await readMonthlyCashflow(mime, clean);
        if (monthly.length) {
          const { error: mErr } = await admin.from('financial_documents').update({ monthly }).eq('user_id', userId).eq('sha256', documentHash);
          if (mErr) console.error('Monthly totals not stored:', mErr.code);
        }
      }
      read.commit = true;
      return reply({ success: true, financialDocument: true, stored: true, alreadyStored: rowError?.code === '23505', error: FINANCIAL_STORED_MESSAGE, message: FINANCIAL_STORED_MESSAGE });
    }

    // Check document relevance
    const relevanceCheck = isDocumentRelevant(ocrData);
    if (!relevanceCheck.relevant) {
      await countGuestRead(); // the AI did read it
      read.commit = true; // a non-invoice photo still used a read (abuse guard)
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
      || (capture === 'meter_photo' && isElectricityBill(ocrData))
      || (Array.isArray(ocrData.lineItems) && ocrData.lineItems.some((l: { hsn_code?: unknown }) => String(l?.hsn_code ?? '').startsWith('2716')));
    let sealed = utilityBill || !['invoice', 'bill', 'receipt'].includes(String(ocrData.documentType || '').toLowerCase())
      ? null : sealExtraction(ocrData, pdfPageCount);
    // Scope 2 engine: the bill's billing details as printed (period, units,
    // vendor, currency, lines), before any line is rewritten. No personal data.
    let billForScope2 = utilityBill ? {
      vendor: ocrData.vendor ?? null, currency: ocrData.currency ?? null,
      unitsConsumedKwh: ocrData.unitsConsumedKwh ?? null, unitsConsumedText: ocrData.unitsConsumedText ?? null, unitsConsumedUnit: ocrData.unitsConsumedUnit ?? null,
      activeEnergyKwh: ocrData.activeEnergyKwh ?? null, activeEnergyText: ocrData.activeEnergyText ?? null,
      powerFactor: ocrData.powerFactor ?? null, powerFactorText: ocrData.powerFactorText ?? null, enteredKwh,
      documentCapture: capture, meterReadings: Array.isArray(ocrData.meterReadings) ? ocrData.meterReadings : null,
      billingPeriodStart: ocrData.billingPeriodStart ?? null, billingPeriodEnd: ocrData.billingPeriodEnd ?? null,
      lineItems: Array.isArray(ocrData.lineItems) ? ocrData.lineItems.map((l: Record<string, unknown>) => ({
        description: l?.description ?? null, quantity: l?.quantity ?? null, unit: l?.unit ?? null, hsn_code: l?.hsn_code ?? null, sourceText: l?.sourceText ?? null,
      })) : [],
    } : null;

    // ============= RULE-BASED CLASSIFICATION & CALCULATION =============
    // This is where all math happens - deterministic, no AI
    const validationFlags: string[] = [];
    // Electricity bills: read printed billed units; "units" means kWh there.
    // kVAh bills use the printed kWh, else kVAh x the printed power factor
    // (labelled estimate); meter photos use two readings (later - earlier).
    const elecBill = isElectricityBill(ocrData);
    if (enteredKwh !== null) ocrData.enteredKwh = enteredKwh;
    const prepared = prepareElectricityLines(ocrData);
    ocrData.lineItems = prepared.lines;
    validationFlags.push(...prepared.notes);
    // Dated meter readings give the period when no billing period is printed.
    if (prepared.readingPeriod && !ocrData.billingPeriodStart && !ocrData.billingPeriodEnd) {
      ocrData.billingPeriodStart = prepared.readingPeriod.start;
      ocrData.billingPeriodEnd = prepared.readingPeriod.end;
      if (billForScope2) { billForScope2.billingPeriodStart = prepared.readingPeriod.start; billForScope2.billingPeriodEnd = prepared.readingPeriod.end; }
    }
    if (capture === 'handwritten') validationFlags.push(`${BASIS_LABEL.handwritten}: quantities are labelled and carry lower data quality`);
    // Country of supply: the saved country, then the bill (INR or an Indian
    // distribution company). With neither, India: the country Settings shows
    // until another is chosen. The India grid factor applies only to India.
    const supply = gridCountryFor({ vendor: ocrData.vendor ?? null, currency: ocrData.currency ?? null }, profileLocation);
    const gridCountry = supply.country ?? 'IN';
    let gridNoteAdded = false;
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
        quantity: parseQuantity(item.quantity),
        unit: item.unit || detectUnit(item.description || '') || undefined,
        unitPrice: parseAmount(item.unitPrice) ?? undefined,
        total: parseAmount(item.total) ?? undefined,
        // Checked against the real page count; an out-of-range page is
        // reported as unknown, never moved to page 1.
        sourcePage: checkedSourcePage(item.sourcePage, pdfPageCount) ?? undefined,
        sourceText: typeof item.sourceText === 'string' ? item.sourceText.slice(0, 240) : undefined,
        validationFlags: [],
        ...(typeof item.basis === 'string' && item.basis in BASIS_LABEL ? { basis: item.basis as Basis } : {}),
        ...(item.evidence && typeof item.evidence === 'object' ? { evidence: item.evidence as EnergyEvidence } : {}),
        ...(typeof item.referenceNote === 'string' ? { referenceNote: item.referenceNote } : {}),
        ...(typeof item.printedQuantity === 'number' ? { printedQuantity: item.printedQuantity, printedUnit: typeof item.printedUnit === 'string' ? item.printedUnit : undefined } : {}),
      };
      // On an electricity bill a line with no quantity is a charge (money, not
      // energy), and a line kept only for its printed kVAh is evidence: neither
      // is an unrecognised item or a missing factor.
      const billCharge = elecBill && (!classifiedItem.quantity || !!classifiedItem.referenceNote);
      // Quantity × price against the printed line total, on the figures as
      // printed (before any unit conversion). A flag only; nothing changes.
      // Not on electricity bills: slab tariffs price units at several rates.
      const pc = elecBill ? null : priceCheck(classifiedItem.quantity, classifiedItem.unitPrice, classifiedItem.total);
      if (pc) { classifiedItem.priceCheck = pc; classifiedItem.validationFlags!.push(pc.message); }

      // Cylinders with their size printed on the line ("LPG cylinder 19 kg",
      // 2 Nos) are converted to kg from that printed size; nothing else is.
      const cyl = cylinderToKg(classifiedItem);
      if (cyl) {
        classifiedItem.validationFlags!.push(`Converted ${classifiedItem.quantity} ${classifiedItem.unit} to ${cyl.quantity} kg using the cylinder size printed on this line`);
        classifiedItem.quantity = cyl.quantity;
        classifiedItem.unit = cyl.unit;
      }

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

      // Grid-delivered solar or wind on an electricity bill is grid electricity:
      // it counts in location-based Scope 2. A lower market-based figure needs
      // certificate evidence (Scope 2 engine), not an avoided-emission claim.
      if (isGridRenewableLine(utilityBill, classifiedItem.productCategory, classifiedItem.unit)) {
        const grid = classifyByHSN('2716');
        if (grid) {
          classifiedItem.productCategory = grid.productCategory;
          classifiedItem.industryCode = grid.industryCode;
          classifiedItem.industryName = grid.industryName;
          classifiedItem.scope = grid.scope;
          classifiedItem.validationFlags!.push('Renewable electricity on a grid bill counts in location-based Scope 2; a lower market-based figure needs certificate evidence');
        }
      }

      // Step 3: Mark unverifiable if no classification
      if (!classifiedItem.productCategory) {
        classifiedItem.classificationMethod = 'UNVERIFIABLE';
        if (!billCharge) {
          unverifiableItems++;
          validationFlags.push(`Unclassified: ${item.description?.substring(0, 30) || 'Unknown'}`);
        }
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
          classifiedItem.fuelType,
          { gridCountry }
        );
        if (!gridNoteAdded && classifiedItem.productCategory === 'ELECTRICITY' && supply.source === 'unknown') {
          gridNoteAdded = true;
          validationFlags.push('India grid factor used: no country is set in Settings');
        }

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
          const reason = ['ELECTRICITY', 'SOLAR_ENERGY', 'WIND_ENERGY'].includes(classifiedItem.productCategory) && gridCountry !== 'IN'
            ? `No approved grid factor for ${gridCountry} yet; this electricity is not calculated`
            : `No verified factor for ${classifiedItem.productCategory}${classifiedItem.fuelType ? ` (${classifiedItem.fuelType})` : ''} with unit ${classifiedItem.unit}`;
          classifiedItem.validationFlags?.push(reason);
          validationFlags.push(`${reason}: ${classifiedItem.description.substring(0, 40)}`);
        }
      } else if (classifiedItem.productCategory && !billCharge) {
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
    consolidateElectricity(classifiedItems, { billedKwh: prepared.billedKwh });
    // Every counted line says how its quantity was obtained: a derived basis
    // set above (kVAh x PF, meter readings), else handwritten or printed.
    for (const item of classifiedItems) {
      if (typeof item.co2Kg === 'number' || typeof item.avoidedCo2Kg === 'number') {
        item.basis ??= capture === 'handwritten' ? 'handwritten' : 'read_from_bill';
        item.basisLabel = BASIS_LABEL[item.basis];
        if (item.basis !== 'read_from_bill') item.validationFlags?.push(item.basisLabel);
      } else if (item.basis) {
        // Not counted (e.g. no factor): no basis claim on it.
        delete item.basis;
      }
    }
    // What each counted figure assumes, stored with its record.
    for (const item of classifiedItems) {
      if (typeof item.co2Kg !== 'number') continue;
      const a: string[] = [];
      if (item.originalQuantity !== undefined) a.push(`Converted ${item.originalQuantity} ${item.originalUnit ?? ''} to ${item.quantity} ${item.unit ?? ''}`.replace(/\s+/g, ' ').trim());
      for (const f of item.validationFlags ?? []) if (/^Converted .* cylinder size/.test(f)) a.push(f);
      if (item.productCategory === 'ELECTRICITY') a.push(supply.source === 'unknown' ? 'India grid factor: no country set in Settings' : `Grid factor for ${gridCountry}`);
      if (item.basisLabel && item.basis !== 'read_from_bill') a.push(item.basisLabel);
      if (!item.hsn_code && item.classificationMethod === 'KEYWORD') a.push('Classified from the line description (no HSN code printed)');
      item.assumptions = a;
    }

    // Document kind from the rules library. Credit notes and purchase orders
    // are kept as evidence and never counted (owner rule, October 2026).
    const kind = documentKind({
      documentTitle: printedTitle, documentType: printedType, utilityBill,
      lineCategories: classifiedItems.map((i) => i.productCategory),
    });
    if (isEvidenceOnlyKind(kind)) {
      const note = `${DOCUMENT_KIND_LABEL[kind]}: ${EVIDENCE_ONLY_NOTE.toLowerCase()}`;
      for (const item of classifiedItems) {
        delete item.co2Kg; delete item.emissionFactor; delete item.avoidedCo2Kg; delete item.avoidedFactor;
        delete item.basis; delete item.basisLabel; delete item.assumptions;
        item.referenceNote = note;
      }
      validationFlags.push(`${note} as emissions`);
      sealed = null;
      billForScope2 = null;
    }

    const guideCtx = { electricityBill: elecBill, blocker: prepared.blocker };
    for (const item of classifiedItems) item.guidance = guideLine(item, guideCtx);

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
      documentKind: kind,
      ...(printedTitle ? { documentTitle: printedTitle } : {}),
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
      guidance: guideDocument(classifiedItems, guideCtx),
      documentCapture: capture,
      // A credit note or order never matches the invoice it refers to.
      invoiceKey: ((k) => (k && isEvidenceOnlyKind(kind) ? `${kind}|${k}` : k))(invoiceIdentity({
        supplierGstin: ocrData.supplierGstin, vendor: ocrData.vendor, invoiceNumber: ocrData.invoiceNumber,
        date: parseInvoiceDate(ocrData.date) ?? undefined, billingPeriodStart: ocrData.billingPeriodStart,
        billingPeriodEnd: ocrData.billingPeriodEnd, unitsConsumedKwh: ocrData.unitsConsumedKwh, amount: ocrData.amount,
      })) ?? undefined,
      // Electricity bills only: supplier + period + units, so a second photo
      // with a misread amount or bill number still matches (kept in cached_result).
      billKey: (electricityBillMeta(ocrData) && !isEvidenceOnlyKind(kind) ? electricityBillIdentity({
        supplierGstin: ocrData.supplierGstin, vendor: ocrData.vendor, billingPeriodStart: ocrData.billingPeriodStart,
        billingPeriodEnd: ocrData.billingPeriodEnd, unitsConsumedKwh: ocrData.unitsConsumedKwh,
      }) : null) ?? undefined,
    };

    // ============= SAME INVOICE, DIFFERENT FILE =============
    // A second photo or a PDF of an invoice already stored is the same
    // invoice: when that copy already has emissions, return its stored result
    // (and its file hash, so the browser links to the stored document and its
    // emissions) and store nothing.
    if (supabaseUrl && supabaseKey && isAuthenticated && userId && (extractedData.invoiceKey || extractedData.billKey) && !rereadDocId) {
      try {
        const db = createClient(supabaseUrl, supabaseKey);
        const owned = (q: any) => (organizationId ? q.eq('organization_id', organizationId) : q.eq('user_id', userId));
        const cols = 'id, document_hash, created_at, cached_result';
        let twin: any = null;
        if (extractedData.invoiceKey) {
          const byKey = await owned(db.from('documents').select(cols).eq('cached_result->>invoiceKey', extractedData.invoiceKey).neq('document_hash', documentHash)).limit(1);
          twin = (byKey.data ?? [])[0] ?? null;
        }
        if (!twin && extractedData.billKey) {
          const byBill = await owned(db.from('documents').select(cols).eq('cached_result->>billKey', extractedData.billKey).neq('document_hash', documentHash)).limit(1);
          twin = (byBill.data ?? [])[0] ?? null;
        }
        // Invoices stored before invoiceKey existed: match number and date, then compare identities.
        if (!twin && extractedData.invoiceNumber && parseInvoiceDate(extractedData.date)) {
          const byNumber = await owned(db.from('documents').select(cols).eq('invoice_number', extractedData.invoiceNumber).eq('invoice_date', parseInvoiceDate(extractedData.date)).neq('document_hash', documentHash)).limit(5);
          twin = (byNumber.data ?? []).find((d: any) => d.cached_result && invoiceIdentity({
            supplierGstin: d.cached_result.supplierGstin, vendor: d.cached_result.vendor, invoiceNumber: d.cached_result.invoiceNumber,
            date: parseInvoiceDate(d.cached_result.date) ?? undefined,
          }) === extractedData.invoiceKey) ?? null;
        }
        // Only a copy that is already counted blocks this one; a clearer copy
        // of an invoice that produced nothing is read and saved normally.
        const twinCounted = twin ? ((await db.from('emissions').select('id', { count: 'exact', head: true }).eq('document_id', twin.id)).count ?? 0) > 0 : false;
        if (twin?.cached_result && twinCounted) {
          return new Response(JSON.stringify({
            success: true, cached: true, isDuplicate: true, duplicateReason: 'same_invoice',
            data: twin.cached_result, originalDocumentId: twin.id, documentHash: twin.document_hash,
            message: `This invoice is already in your records (uploaded ${new Date(twin.created_at).toLocaleDateString('en-IN')} as a different file). It is counted once.`,
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      } catch (e) {
        console.error('Same-invoice check failed:', (e as Error)?.name ?? 'error');
      }
    }

    console.log(`DETERMINISTIC RESULT: ${classificationStatus}, ${verifiedItems} items, ${totalCO2Kg.toFixed(2)} kgCO₂e, confidence: ${finalConfidence}%`);

    // A guest read that succeeded counts toward the daily limit.
    await countGuestRead();

    // ============= CACHE THE RESULT (signed-in only) =============
    // Stored so the same invoice always returns the same result for this
    // account. Guests are never stored (see GUEST above).
    if (supabaseUrl && supabaseKey && isAuthenticated && userId) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        // Original file as evidence.
        if (rereadDocId) {
          // Read again: replace the stored read of the same file (it had no
          // emissions, see above). The file and row stay the same.
          const { error: updError } = await supabase.from('documents').update({
            document_type: extractedData.documentType, vendor: extractedData.vendor, invoice_number: extractedData.invoiceNumber,
            invoice_date: parseInvoiceDate(extractedData.date), amount: extractedData.amount,
            confidence: Math.min(extractedData.confidence, 999.99), cached_result: extractedData,
          }).eq('id', rereadDocId);
          if (updError) console.error('Re-read update failed:', updError.code);
          else {
            savedDocumentId = rereadDocId;
            savedEmissionIds = await createEmissionRows(supabase, extractedData, { documentId: rereadDocId, userId, organizationId: organizationId || null });
          }
        } else {
        sourcePath = await storeSourceFile(supabase, userId, documentHash, mimeType || 'image/jpeg', imageBase64);
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
            session_id: null,
            ...(organizationId ? { organization_id: organizationId } : {}),
          })
          .select('id')
          .single();
        if (cacheError) {
          console.error('Failed to cache result:', cacheError.code);
        } else {
          console.log('Result cached for deterministic retrieval');
          if (savedDoc?.id) {
            savedDocumentId = savedDoc.id;
            // Counted once read and stored with content; an empty read is not counted.
            read.documentId = savedDoc.id;
            read.commit = (extractedData.lineItems?.length ?? 0) > 0 || !!extractedData.electricityBill;
            savedEmissionIds = await createEmissionRows(supabase, extractedData, { documentId: savedDoc.id, userId, organizationId: organizationId || null });
          }
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
          // Scope 2 engine: record the bill's consumption and recalculate
          // location- and market-based results. No-op until the pending
          // migration is applied; never affects this response.
          if (billForScope2 && isAuthenticated && userId && savedDoc?.id) {
            const work = (async () => {
              const { data: prof } = await supabase.from('profiles').select('location').eq('id', userId).maybeSingle();
              await recordBillAndRecalculate(supabase, { documentId: savedDoc.id, userId, organizationId: organizationId || null, bill: billForScope2, profileLocation: (prof as { location?: string } | null)?.location ?? null });
            })();
            const rt = (globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } }).EdgeRuntime;
            if (rt?.waitUntil) rt.waitUntil(work); else await work;
          }
        }
        }
      } catch (e) {
        console.error('Cache error:', (e as Error)?.name ?? 'error');
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
        userTier,
        ...(rereadDocId ? { reread: true, originalDocumentId: rereadDocId } : {}),
        // Rows stored here: the browser uses these ids and writes nothing.
        ...(savedDocumentId && savedEmissionIds !== null ? { serverSaved: true, documentId: savedDocumentId, emissionIds: savedEmissionIds } : {}),
        // Guests: nothing was stored; the browser keeps the result.
        ...(isAuthenticated ? {} : { ephemeral: true }),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing document:', error instanceof Error ? error.name : 'error');
    return new Response(
      JSON.stringify({ error: 'Something went wrong while reading this file. Please try again; nothing was counted.', code: 'internal' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
