import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============= DOCUMENT HASH GENERATION (DETERMINISTIC) =============
async function generateDocumentHash(content: string, mimeType: string): Promise<string> {
  // Use first 10KB of content for faster hashing while maintaining uniqueness
  const hashInput = content.substring(0, 10000) + mimeType;
  const encoder = new TextEncoder();
  const data = encoder.encode(hashInput);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============= METHODOLOGY VERSION (APPEND-ONLY VERSIONING) =============
const METHODOLOGY_VERSION = {
  name: 'BIOCOG_MVR_INDIA',
  version: 'v1.0.1',
  country: 'IN',
  factorVersion: 'IND_EF_2025',
  confidenceVersion: 'CONF_v1.0', // Deterministic confidence scoring
};

// ============= HSN CODE MASTER (RULE-BASED - NO AI) =============
const HSN_MASTER: Record<string, { productCategory: string; industryCode: string; industryName: string; defaultScope: number }> = {
  // Fuel & Energy: Scope 1/2
  '27': { productCategory: 'FUEL', industryCode: 'ENERGY', industryName: 'Mineral Fuels & Oils', defaultScope: 1 },
  '10': { productCategory: 'BIOMASS', industryCode: 'AGRI', industryName: 'Agricultural Biomass', defaultScope: 1 },
  '12': { productCategory: 'BIOMASS', industryCode: 'AGRI', industryName: 'Oil Seeds & Biomass', defaultScope: 1 },
  // Metals & Minerals: Scope 3
  '72': { productCategory: 'RAW_MATERIAL', industryCode: 'STEEL', industryName: 'Iron & Steel', defaultScope: 3 },
  '73': { productCategory: 'RAW_MATERIAL', industryCode: 'STEEL_PRODUCTS', industryName: 'Steel Articles', defaultScope: 3 },
  '74': { productCategory: 'RAW_MATERIAL', industryCode: 'COPPER', industryName: 'Copper', defaultScope: 3 },
  '76': { productCategory: 'RAW_MATERIAL', industryCode: 'ALUMINIUM', industryName: 'Aluminium', defaultScope: 3 },
  '25': { productCategory: 'RAW_MATERIAL', industryCode: 'CEMENT', industryName: 'Cement & Minerals', defaultScope: 3 },
  // Plastics, Chemicals
  '39': { productCategory: 'RAW_MATERIAL', industryCode: 'PLASTIC', industryName: 'Plastics & Polymers', defaultScope: 3 },
  '28': { productCategory: 'CHEMICALS', industryCode: 'CHEMICALS', industryName: 'Inorganic Chemicals', defaultScope: 3 },
  '29': { productCategory: 'CHEMICALS', industryCode: 'CHEMICALS', industryName: 'Organic Chemicals', defaultScope: 3 },
  '40': { productCategory: 'RAW_MATERIAL', industryCode: 'RUBBER', industryName: 'Rubber & Elastomers', defaultScope: 3 },
  // Paper, Textiles, Wood
  '48': { productCategory: 'RAW_MATERIAL', industryCode: 'PAPER', industryName: 'Paper & Pulp', defaultScope: 3 },
  '44': { productCategory: 'RAW_MATERIAL', industryCode: 'WOOD', industryName: 'Wood & Timber', defaultScope: 3 },
  '52': { productCategory: 'RAW_MATERIAL', industryCode: 'TEXTILE', industryName: 'Cotton Textiles', defaultScope: 3 },
  '54': { productCategory: 'RAW_MATERIAL', industryCode: 'TEXTILE', industryName: 'Synthetic Textiles', defaultScope: 3 },
  // Machinery, Electricals
  '84': { productCategory: 'CAPITAL_GOODS', industryCode: 'MACHINERY', industryName: 'Industrial Machinery', defaultScope: 3 },
  '85': { productCategory: 'ELECTRICAL_EQUIPMENT', industryCode: 'ELECTRICAL', industryName: 'Electrical Equipment', defaultScope: 3 },
  '90': { productCategory: 'INSTRUMENTS', industryCode: 'INSTRUMENTATION', industryName: 'Measuring Instruments', defaultScope: 3 },
  // Transport
  '86': { productCategory: 'TRANSPORT_EQUIPMENT', industryCode: 'RAILWAYS', industryName: 'Railway Equipment', defaultScope: 3 },
  '87': { productCategory: 'TRANSPORT_EQUIPMENT', industryCode: 'AUTOMOTIVE', industryName: 'Vehicles & Transport', defaultScope: 3 },
  '88': { productCategory: 'TRANSPORT_EQUIPMENT', industryCode: 'AVIATION', industryName: 'Aircraft & Parts', defaultScope: 3 },
  '89': { productCategory: 'TRANSPORT_EQUIPMENT', industryCode: 'MARINE', industryName: 'Ships & Boats', defaultScope: 3 },
  // Services
  '99': { productCategory: 'SERVICES', industryCode: 'PROFESSIONAL', industryName: 'Professional & Business Services', defaultScope: 3 },
};

// ============= EXPANDED KEYWORD FALLBACK MAP (RULE-BASED - NO AI) =============
const KEYWORD_MAP: Record<string, { productCategory: string; industryCode: string; scope: number; fuelType?: string }> = {
  // Fuels - Scope 1 (including common OCR misreads and regional terms)
  diesel: { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'DIESEL' },
  deisel: { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'DIESEL' },
  disel: { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'DIESEL' },
  'd1esel': { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'DIESEL' },
  hsd: { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'DIESEL' },
  petrol: { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'PETROL' },
  petro: { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'PETROL' },
  petr0l: { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'PETROL' },
  gasoline: { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'PETROL' },
  ms: { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'PETROL' },
  cng: { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'CNG' },
  lpg: { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'LPG' },
  'l.p.g': { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'LPG' },
  coal: { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'COAL' },
  furnace: { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'FURNACE_OIL' },
  'furnace oil': { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'FURNACE_OIL' },
  fo: { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'FURNACE_OIL' },
  naphtha: { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'NAPHTHA' },
  png: { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'PNG' },
  'piped gas': { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'PNG' },
  'natural gas': { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'PNG' },
  kerosene: { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'DIESEL' },
  tel: { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'DIESEL' },
  fuel: { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'DIESEL' },
  // Electricity - Scope 2 (including regional terms)
  electricity: { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 },
  electy: { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 },
  elec: { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 },
  'elec bill': { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 },
  power: { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 },
  kwh: { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 },
  kw: { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 },
  'electric bill': { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 },
  'power bill': { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 },
  bijli: { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 },
  vidyut: { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 },
  discom: { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 },
  msedcl: { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 },
  tpddl: { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 },
  bses: { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 },
  cesc: { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 },
  bescom: { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 },
  tneb: { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 },
  unit: { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 },
  units: { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 },
  // Transport - Scope 3
  freight: { productCategory: 'TRANSPORT', industryCode: 'LOGISTICS', scope: 3 },
  transport: { productCategory: 'TRANSPORT', industryCode: 'LOGISTICS', scope: 3 },
  logistics: { productCategory: 'TRANSPORT', industryCode: 'LOGISTICS', scope: 3 },
  courier: { productCategory: 'TRANSPORT', industryCode: 'LOGISTICS', scope: 3 },
  shipping: { productCategory: 'TRANSPORT', industryCode: 'LOGISTICS', scope: 3 },
  delivery: { productCategory: 'TRANSPORT', industryCode: 'LOGISTICS', scope: 3 },
  trucking: { productCategory: 'TRANSPORT', industryCode: 'LOGISTICS', scope: 3 },
  lorry: { productCategory: 'TRANSPORT', industryCode: 'LOGISTICS', scope: 3 },
  carrier: { productCategory: 'TRANSPORT', industryCode: 'LOGISTICS', scope: 3 },
  dhl: { productCategory: 'TRANSPORT', industryCode: 'LOGISTICS', scope: 3 },
  fedex: { productCategory: 'TRANSPORT', industryCode: 'LOGISTICS', scope: 3 },
  bluedart: { productCategory: 'TRANSPORT', industryCode: 'LOGISTICS', scope: 3 },
  delhivery: { productCategory: 'TRANSPORT', industryCode: 'LOGISTICS', scope: 3 },
  // Raw Materials - Scope 3
  steel: { productCategory: 'RAW_MATERIAL', industryCode: 'STEEL', scope: 3 },
  iron: { productCategory: 'RAW_MATERIAL', industryCode: 'STEEL', scope: 3 },
  tmt: { productCategory: 'RAW_MATERIAL', industryCode: 'STEEL', scope: 3 },
  rebar: { productCategory: 'RAW_MATERIAL', industryCode: 'STEEL', scope: 3 },
  plastic: { productCategory: 'RAW_MATERIAL', industryCode: 'PLASTIC', scope: 3 },
  polymer: { productCategory: 'RAW_MATERIAL', industryCode: 'PLASTIC', scope: 3 },
  hdpe: { productCategory: 'RAW_MATERIAL', industryCode: 'PLASTIC', scope: 3 },
  ldpe: { productCategory: 'RAW_MATERIAL', industryCode: 'PLASTIC', scope: 3 },
  pvc: { productCategory: 'RAW_MATERIAL', industryCode: 'PLASTIC', scope: 3 },
  paper: { productCategory: 'RAW_MATERIAL', industryCode: 'PAPER', scope: 3 },
  cardboard: { productCategory: 'RAW_MATERIAL', industryCode: 'PAPER', scope: 3 },
  carton: { productCategory: 'RAW_MATERIAL', industryCode: 'PAPER', scope: 3 },
  cement: { productCategory: 'RAW_MATERIAL', industryCode: 'CEMENT', scope: 3 },
  concrete: { productCategory: 'RAW_MATERIAL', industryCode: 'CEMENT', scope: 3 },
  aluminium: { productCategory: 'RAW_MATERIAL', industryCode: 'ALUMINIUM', scope: 3 },
  aluminum: { productCategory: 'RAW_MATERIAL', industryCode: 'ALUMINIUM', scope: 3 },
  copper: { productCategory: 'RAW_MATERIAL', industryCode: 'COPPER', scope: 3 },
  textile: { productCategory: 'RAW_MATERIAL', industryCode: 'TEXTILE', scope: 3 },
  fabric: { productCategory: 'RAW_MATERIAL', industryCode: 'TEXTILE', scope: 3 },
  cotton: { productCategory: 'RAW_MATERIAL', industryCode: 'TEXTILE', scope: 3 },
  yarn: { productCategory: 'RAW_MATERIAL', industryCode: 'TEXTILE', scope: 3 },
  wood: { productCategory: 'RAW_MATERIAL', industryCode: 'WOOD', scope: 3 },
  timber: { productCategory: 'RAW_MATERIAL', industryCode: 'WOOD', scope: 3 },
  plywood: { productCategory: 'RAW_MATERIAL', industryCode: 'WOOD', scope: 3 },
  rubber: { productCategory: 'RAW_MATERIAL', industryCode: 'RUBBER', scope: 3 },
  glass: { productCategory: 'RAW_MATERIAL', industryCode: 'GLASS', scope: 3 },
  // Waste - Scope 3
  waste: { productCategory: 'WASTE', industryCode: 'WASTE_MANAGEMENT', scope: 3 },
  disposal: { productCategory: 'WASTE', industryCode: 'WASTE_MANAGEMENT', scope: 3 },
  recycling: { productCategory: 'WASTE', industryCode: 'WASTE_MANAGEMENT', scope: 3 },
  scrap: { productCategory: 'WASTE', industryCode: 'WASTE_MANAGEMENT', scope: 3 },
  garbage: { productCategory: 'WASTE', industryCode: 'WASTE_MANAGEMENT', scope: 3 },
  kachra: { productCategory: 'WASTE', industryCode: 'WASTE_MANAGEMENT', scope: 3 },
};

// ============= EMISSION FACTORS (BIOCOG_MVR_INDIA_v1.0) =============
const EMISSION_FACTORS = {
  scope1_fuels: {
    DIESEL: { value: 2.68, unit: 'litre' },
    PETROL: { value: 2.31, unit: 'litre' },
    CNG: { value: 2.75, unit: 'kg' },
    PNG: { value: 2.30, unit: 'scm' },
    LPG: { value: 1.51, unit: 'kg' },
    COAL: { value: 2.42, unit: 'kg' },
    FURNACE_OIL: { value: 3.15, unit: 'litre' },
    NAPHTHA: { value: 3.00, unit: 'litre' },
    BIOMASS: { value: 0.00, unit: 'kg', creditable: false },
  },
  scope2_electricity: {
    INDIA_GRID_AVG: 0.708,
    SOLAR_CAPTIVE: 0.000,
    WIND_CAPTIVE: 0.000,
    RENEWABLE_PPA: 0.000,
  },
  scope3_transport: {
    ROAD_LIGHT: 0.12,
    ROAD_HEAVY: 0.18,
    RAIL: 0.04,
    INLAND_WATER: 0.03,
    SEA: 0.015,
    AIR: 0.60,
  },
  scope3_waste: {
    LANDFILL_ORGANIC: 1.90,
    LANDFILL_INORGANIC: 0.45,
    RECYCLING_PAPER: -0.90,
    RECYCLING_PLASTIC: -1.50,
    RECYCLING_METAL: -4.00,
    INCINERATION: 2.50,
  },
};

// ============= DETERMINISTIC CONFIDENCE SCORING (NO AI INFLUENCE) =============
// Per BIOCOG MRV spec: Base 100, fixed penalties, same input = same output
const CONFIDENCE_PENALTIES = {
  // MANDATORY FIELD PENALTIES
  MISSING_QUANTITY: 20,
  MISSING_UNIT: 15,
  MISSING_INVOICE_NUMBER: 10,
  MISSING_SUPPLIER_GSTIN: 10,
  MISSING_DATE: 5,
  MISSING_AMOUNT: 5,
  // CLASSIFICATION PENALTIES
  UNVERIFIABLE_ITEM: 15, // Per item
  MISSING_EMISSION_FACTOR: 10, // Per item
  // OCR QUALITY PENALTIES
  NO_LINE_ITEMS: 30,
  LOW_EXTRACTION_RATE: 15, // Less than 50% fields
  // ENHANCEMENT BONUSES (fixed, not random)
  HSN_CLASSIFICATION_BONUS: 5, // Per HSN-classified item (max 10)
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
  extractedFieldRatio: number; // 0 to 1
}): number {
  let confidence = 100;

  // Apply mandatory field penalties
  if (!params.hasQuantity) confidence -= CONFIDENCE_PENALTIES.MISSING_QUANTITY;
  if (!params.hasUnit) confidence -= CONFIDENCE_PENALTIES.MISSING_UNIT;
  if (!params.hasInvoiceNumber) confidence -= CONFIDENCE_PENALTIES.MISSING_INVOICE_NUMBER;
  if (!params.hasSupplierGstin) confidence -= CONFIDENCE_PENALTIES.MISSING_SUPPLIER_GSTIN;
  if (!params.hasDate) confidence -= CONFIDENCE_PENALTIES.MISSING_DATE;
  if (!params.hasAmount) confidence -= CONFIDENCE_PENALTIES.MISSING_AMOUNT;

  // Apply classification penalties
  confidence -= params.unverifiableCount * CONFIDENCE_PENALTIES.UNVERIFIABLE_ITEM;
  confidence -= params.missingEmissionFactorCount * CONFIDENCE_PENALTIES.MISSING_EMISSION_FACTOR;

  // Apply OCR quality penalties
  if (params.lineItemCount === 0) confidence -= CONFIDENCE_PENALTIES.NO_LINE_ITEMS;
  if (params.extractedFieldRatio < 0.5) confidence -= CONFIDENCE_PENALTIES.LOW_EXTRACTION_RATE;

  // Apply HSN classification bonus (capped)
  const hsnBonus = Math.min(params.hsnClassifiedCount * CONFIDENCE_PENALTIES.HSN_CLASSIFICATION_BONUS, 10);
  confidence += hsnBonus;

  // Clamp to 0-100 range
  return Math.max(0, Math.min(100, Math.round(confidence)));
}

// ============= DOCUMENT RELEVANCE CHECK =============
const VALID_DOCUMENT_TYPES = ['invoice', 'bill', 'certificate', 'receipt'];
const IRRELEVANT_DOCUMENT_KEYWORDS = [
  'passport', 'aadhaar', 'aadhar', 'pan card', 'voter id', 'driving license',
  'birth certificate', 'marriage certificate', 'degree', 'marksheet',
  'resume', 'cv', 'curriculum vitae', 'photograph', 'selfie', 'photo'
];

// ============= HUMOROUS REJECTION MESSAGES FOR IRRELEVANT IMAGES =============
const HUMOROUS_REJECTIONS: Record<string, string[]> = {
  ceiling: [
    "That's a lovely ceiling, but we can't find any carbon emissions there! 😄 Try uploading a fuel bill or invoice instead.",
    "Great architectural shot! But for carbon accounting, we need business documents like invoices or utility bills."
  ],
  selfie: [
    "Looking good! 📸 But we're more interested in your invoices than your selfies. Upload a business document to get started.",
    "Nice photo! For carbon tracking though, we need to see your electricity bills or purchase invoices."
  ],
  nature: [
    "Beautiful scenery! 🌿 Trees do absorb carbon, but we need your business invoices to calculate emissions.",
    "Love the nature shot! To track your carbon footprint though, please upload a fuel bill or invoice."
  ],
  food: [
    "That looks delicious! 🍽️ But to calculate carbon, we need your business invoices, not your lunch.",
    "Yum! For carbon accounting, please upload a utility bill or purchase invoice instead."
  ],
  personal: [
    "This looks like a personal document. For carbon MRV, we need business invoices, fuel bills, or electricity receipts.",
    "We respect your privacy! Please share business documents only — invoices, utility bills, or purchase receipts."
  ],
  default: [
    "Hmm, this doesn't look like a business document. 📄 Try uploading an invoice, fuel bill, or electricity bill.",
    "We're not quite sure what this is. For carbon MRV, please upload a business invoice or utility bill."
  ]
};

// Detection patterns for humorous responses
const IMAGE_CONTEXT_PATTERNS: Record<string, RegExp> = {
  ceiling: /ceiling|roof|light|fixture|fan|lamp|chandelier|overhead/i,
  selfie: /face|person|portrait|selfie|profile|headshot|smile/i,
  nature: /tree|plant|flower|garden|nature|landscape|sky|cloud|mountain|forest|farm|field/i,
  food: /food|meal|dish|restaurant|menu|plate|eating|breakfast|lunch|dinner/i
};

function getHumorousRejection(ocrText: string, category?: string): string {
  const text = (ocrText || '').toLowerCase();
  
  // If category provided, use it
  if (category && HUMOROUS_REJECTIONS[category]) {
    const messages = HUMOROUS_REJECTIONS[category];
    return messages[Math.floor(Math.random() * messages.length)];
  }
  
  // Try to detect category from text
  for (const [cat, pattern] of Object.entries(IMAGE_CONTEXT_PATTERNS)) {
    if (pattern.test(text)) {
      const messages = HUMOROUS_REJECTIONS[cat] || HUMOROUS_REJECTIONS.default;
      return messages[Math.floor(Math.random() * messages.length)];
    }
  }
  
  // Check for personal document keywords
  for (const keyword of IRRELEVANT_DOCUMENT_KEYWORDS) {
    if (text.includes(keyword)) {
      const messages = HUMOROUS_REJECTIONS.personal;
      return messages[Math.floor(Math.random() * messages.length)];
    }
  }
  
  return HUMOROUS_REJECTIONS.default[Math.floor(Math.random() * HUMOROUS_REJECTIONS.default.length)];
}

function isDocumentRelevant(ocrData: any): { relevant: boolean; message?: string } {
  const docType = (ocrData.documentType || '').toLowerCase();
  const allText = JSON.stringify(ocrData).toLowerCase();
  
  // Check if document type is valid
  if (docType === 'unknown') {
    // Check content for irrelevant keywords
    for (const keyword of IRRELEVANT_DOCUMENT_KEYWORDS) {
      if (allText.includes(keyword)) {
        return {
          relevant: false,
          message: getHumorousRejection(allText, 'personal')
        };
      }
    }
    
    // Check for nature/selfie/food patterns
    for (const [category, pattern] of Object.entries(IMAGE_CONTEXT_PATTERNS)) {
      if (pattern.test(allText)) {
        return {
          relevant: false,
          message: getHumorousRejection(allText, category)
        };
      }
    }
    
    // If no line items and no amount, likely not an invoice
    if ((!ocrData.lineItems || ocrData.lineItems.length === 0) && !ocrData.amount) {
      return {
        relevant: false,
        message: getHumorousRejection(allText)
      };
    }
  }
  
  // Check if explicitly non-invoice
  if (docType && !VALID_DOCUMENT_TYPES.includes(docType) && docType !== 'unknown') {
    return {
      relevant: false,
      message: `This document type (${docType}) is not supported for carbon accounting. Please upload an invoice, bill, or receipt.`
    };
  }
  
  return { relevant: true };
}

// ============= ENHANCED UNIT DETECTION =============
function detectUnit(text: string): string | null {
  const unitPatterns: Record<string, RegExp> = {
    'litre': /\b(litre|liter|ltr|lt|l|l1tre|1itre)\b/i,
    'kg': /\b(kg|kilogram|kgs|k\.g|k9)\b/i,
    'kWh': /\b(kwh|kilowatt|unit|units|un1ts|kw\.h)\b/i,
    'ton': /\b(ton|tonne|mt|tons|tonnes|metric\s*ton)\b/i,
    'km': /\b(km|kilometer|kilometres|k\.m)\b/i,
    'scm': /\b(scm|cubic\s*m|cu\.m|cbm)\b/i,
  };
  
  for (const [unit, pattern] of Object.entries(unitPatterns)) {
    if (pattern.test(text)) return unit;
  }
  return null;
}

// ============= QUANTITY INFERENCE FROM CONTEXT =============
function inferQuantityFromContext(text: string, amount?: number): number | null {
  const quantityPatterns = [
    /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:litre|liter|ltr|lt|l)\b/i,
    /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:kg|kilogram|kgs)\b/i,
    /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:kwh|unit|units)\b/i,
    /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:ton|tonne|mt)\b/i,
    /qty[:\s]*(\d+(?:,\d{3})*(?:\.\d+)?)/i,
    /quantity[:\s]*(\d+(?:,\d{3})*(?:\.\d+)?)/i,
  ];
  
  for (const pattern of quantityPatterns) {
    const match = text.match(pattern);
    if (match) {
      return parseFloat(match[1].replace(/,/g, ''));
    }
  }
  
  // If we have amount and it looks like a fuel bill, try to infer
  if (amount && amount > 100) {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('diesel') || lowerText.includes('hsd')) {
      return Math.round(amount / 90 * 10) / 10;
    }
    if (lowerText.includes('petrol') || lowerText.includes('ms')) {
      return Math.round(amount / 100 * 10) / 10;
    }
  }
  
  return null;
}

// ============= HSN CLASSIFICATION (RULE-BASED) =============
function classifyByHSN(hsnCode: string): { productCategory: string; industryCode: string; industryName: string; scope: number } | null {
  if (!hsnCode) return null;
  
  const prefix2 = hsnCode.substring(0, 2);
  if (HSN_MASTER[prefix2]) {
    return {
      productCategory: HSN_MASTER[prefix2].productCategory,
      industryCode: HSN_MASTER[prefix2].industryCode,
      industryName: HSN_MASTER[prefix2].industryName,
      scope: HSN_MASTER[prefix2].defaultScope,
    };
  }
  return null;
}

// ============= KEYWORD CLASSIFICATION (RULE-BASED FALLBACK) =============
function classifyByKeyword(text: string): { productCategory: string; industryCode: string; scope: number; fuelType?: string } | null {
  const lowerText = text.toLowerCase();
  
  for (const [keyword, classification] of Object.entries(KEYWORD_MAP)) {
    if (lowerText.includes(keyword)) {
      return classification;
    }
  }
  return null;
}

// ============= CALCULATE EMISSIONS (DETERMINISTIC) =============
function calculateEmissions(
  quantity: number,
  unit: string,
  scope: number,
  productCategory: string,
  fuelType?: string
): { co2Kg: number; emissionFactor: number; factorSource: string } | null {
  
  if (!quantity || quantity <= 0) return null;
  
  // Scope 1: Fuels
  if (scope === 1 && productCategory === 'FUEL' && fuelType) {
    const factor = EMISSION_FACTORS.scope1_fuels[fuelType as keyof typeof EMISSION_FACTORS.scope1_fuels];
    if (factor) {
      return {
        co2Kg: quantity * factor.value,
        emissionFactor: factor.value,
        factorSource: `IND_EF_2025:${fuelType}`,
      };
    }
  }
  
  // Scope 2: Electricity
  if (scope === 2 && productCategory === 'ELECTRICITY') {
    return {
      co2Kg: quantity * EMISSION_FACTORS.scope2_electricity.INDIA_GRID_AVG,
      emissionFactor: EMISSION_FACTORS.scope2_electricity.INDIA_GRID_AVG,
      factorSource: 'IND_EF_2025:INDIA_GRID_AVG',
    };
  }
  
  // Scope 3: Transport
  if (scope === 3 && productCategory === 'TRANSPORT') {
    return {
      co2Kg: quantity * EMISSION_FACTORS.scope3_transport.ROAD_HEAVY,
      emissionFactor: EMISSION_FACTORS.scope3_transport.ROAD_HEAVY,
      factorSource: 'IND_EF_2025:ROAD_HEAVY',
    };
  }
  
  // Scope 3: Waste
  if (scope === 3 && productCategory === 'WASTE') {
    return {
      co2Kg: quantity * EMISSION_FACTORS.scope3_waste.LANDFILL_ORGANIC,
      emissionFactor: EMISSION_FACTORS.scope3_waste.LANDFILL_ORGANIC,
      factorSource: 'IND_EF_2025:LANDFILL_ORGANIC',
    };
  }
  
  // Generic Scope 3 materials
  if (scope === 3 && productCategory === 'RAW_MATERIAL') {
    const estimatedFactor = 0.5;
    return {
      co2Kg: quantity * estimatedFactor,
      emissionFactor: estimatedFactor,
      factorSource: 'IND_EF_2025:MATERIAL_AVG',
    };
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
  factorSource?: string;
  classificationMethod?: 'HSN' | 'KEYWORD' | 'UNVERIFIABLE';
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
  totalCO2Kg?: number;
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

// ============= AI OCR EXTRACTION =============
async function extractWithAI(imageBase64: string, mimeType: string, apiKey: string, model: string): Promise<any> {
  const systemPrompt = `You are an expert OCR document analyzer for Indian MSMEs. Extract data from invoices, bills, and receipts with MAXIMUM accuracy, even from old, faded, or unclear documents.

CRITICAL EXTRACTION RULES:
1. For FADED or UNCLEAR text:
   - Look for patterns: numbers near "Qty", "Rate", "Amount" columns
   - Infer values from context (e.g., if total is visible, work backwards)
   - Check for common invoice layouts and extract accordingly

2. GSTIN numbers: 15-character alphanumeric (e.g., 27AABCU9603R1ZM)
   - Look in header, near "GSTIN", "GST No", "Tax ID"

3. HSN codes: 4-8 digit codes (e.g., 2710, 84713010)
   - Found in columns labeled "HSN", "HSN/SAC", "SAC Code"
   - Or embedded in product descriptions

4. Line items - Extract ALL visible items:
   - description: Full product/service name
   - hsn_code: 4-8 digit code if visible
   - quantity: Numeric value (look near "Qty", "Quantity")
   - unit: litre/kWh/kg/ton/km/scm/nos/pcs
   - unitPrice: Per unit price (look near "Rate", "Price")
   - total: Line total (look in last column)

5. For FUEL/ELECTRICITY bills specifically:
   - Look for consumption in litres/kWh/units
   - Check meter readings if present
   - Extract billing period dates

6. DATES: Accept any format (DD/MM/YYYY, MM-DD-YYYY, DD-MMM-YY, etc.)
   - Normalize to YYYY-MM-DD in output

7. AMOUNTS: Remove commas, convert to numbers
   - Handle both ₹ and Rs. prefixes

8. DOCUMENT TYPE DETECTION:
   - If this is NOT an invoice/bill/receipt (e.g., ID card, photo, resume), set documentType to "unknown"
   - Only set documentType to invoice/bill/receipt/certificate if it actually is one

Respond ONLY with valid JSON (no markdown, no explanation):
{
  "documentType": "invoice|bill|certificate|receipt|unknown",
  "vendor": "vendor/supplier name",
  "date": "YYYY-MM-DD",
  "invoiceNumber": "invoice/bill number",
  "supplierGstin": "15-char GSTIN or null",
  "buyerGstin": "15-char GSTIN or null",
  "amount": total amount as number,
  "currency": "INR",
  "lineItems": [
    {
      "description": "item description",
      "hsn_code": "HSN code if found or null",
      "quantity": number or null,
      "unit": "unit or null",
      "unitPrice": number or null,
      "total": number or null
    }
  ],
  "taxAmount": tax amount as number or null,
  "subtotal": subtotal as number or null
}`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract ALL data from this document. For old or unclear invoices, use context clues and common patterns to infer missing values. Pay special attention to HSN codes, GSTIN numbers, quantities, and units. If this is NOT a business document (invoice/bill/receipt), indicate documentType as "unknown".'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`
              }
            }
          ]
        }
      ],
    }),
  });

  if (!response.ok) {
    const status = response.status;
    const errorText = await response.text();
    console.error(`AI Gateway error (${model}):`, status, errorText);
    throw { status, message: errorText };
  }

  const aiResponse = await response.json();
  return aiResponse.choices?.[0]?.message?.content;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, mimeType } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'No image data provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============= DOCUMENT HASH FOR DUPLICATE DETECTION =============
    const documentHash = await generateDocumentHash(imageBase64, mimeType || 'image/jpeg');
    console.log(`Document hash generated: ${documentHash.substring(0, 16)}...`);

    // Check for duplicate / cached result
    let userId: string | null = null;
    let userTier: string = 'guest';
    let isAuthenticated = false;
    const authHeader = req.headers.get('Authorization');
    
    if (authHeader) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (supabaseUrl && supabaseKey) {
        try {
          const supabase = createClient(supabaseUrl, supabaseKey);
          const token = authHeader.replace('Bearer ', '');
          const { data: { user } } = await supabase.auth.getUser(token);
          
          if (user) {
            userId = user.id;
            isAuthenticated = true;
            
            // Get user tier from profile
            const { data: profile } = await supabase
              .from('profiles')
              .select('subscription_tier')
              .eq('id', userId)
              .single();
            
            userTier = profile?.subscription_tier || 'snapshot';
            
            // ============= DUPLICATE DETECTION FOR AUTHENTICATED USERS =============
            // For authenticated/paid users: Block duplicate processing to prevent greenwashing
            // Check if this exact document hash has been processed before
            const { data: existingDoc } = await supabase
              .from('documents')
              .select('id, vendor, invoice_number, created_at, cached_result')
              .eq('document_hash', documentHash)
              .eq('user_id', userId)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();
            
            if (existingDoc) {
              console.log(`DUPLICATE DETECTED: Document hash ${documentHash.substring(0, 16)}... already processed for user ${userId}`);
              
              // For paid tiers: Return cached result with duplicate flag
              const isPaidTier = ['essential', 'pro', 'scale'].includes(userTier);
              
              if (isPaidTier && existingDoc.cached_result) {
                return new Response(
                  JSON.stringify({ 
                    success: true, 
                    data: existingDoc.cached_result,
                    cached: true,
                    isDuplicate: true,
                    originalDocumentId: existingDoc.id,
                    originalProcessedAt: existingDoc.created_at,
                    documentHash,
                    message: `This invoice was already processed on ${new Date(existingDoc.created_at).toLocaleDateString('en-IN')}. Using verified results to ensure accuracy and prevent duplicate counting.`
                  }),
                  { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              }
              
              // For free tiers: Block with clear message
              return new Response(
                JSON.stringify({ 
                  success: false, 
                  isDuplicate: true,
                  originalDocumentId: existingDoc.id,
                  originalProcessedAt: existingDoc.created_at,
                  documentHash,
                  error: `This invoice was already processed on ${new Date(existingDoc.created_at).toLocaleDateString('en-IN')}. Each invoice can only be counted once to maintain audit integrity. View your history to see the original results.`,
                  vendor: existingDoc.vendor,
                  invoiceNumber: existingDoc.invoice_number
                }),
                { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
          }
        } catch (authError) {
          console.log('Auth check failed, proceeding as guest:', authError);
        }
      }
    }
    
    // ============= GUEST USER HANDLING =============
    // For guest users: Allow repeat processing for testing purposes
    // Returns same deterministic result due to rule-based calculations
    if (!isAuthenticated) {
      console.log(`Guest user processing document. Hash: ${documentHash.substring(0, 16)}...`);
      // Note: Same input always produces same output due to deterministic calculation
    }

    console.log(`Processing document for ${userTier} user with deterministic MRV extraction...`);

    let content: string | null = null;
    let usedModel = 'google/gemini-2.5-flash';

    // First attempt with flash model (faster)
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
      console.error('Flash model failed, will try pro model:', error);
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
        console.error('Failed to parse flash model response:', e);
      }
    }

    // Retry with pro model if extraction failed or no line items
    const shouldRetryWithPro = !ocrData || 
      (ocrData.lineItems && ocrData.lineItems.length === 0 && ocrData.documentType !== 'unknown');

    if (shouldRetryWithPro) {
      console.log('Failed extraction, retrying with pro model...');
      try {
        content = await extractWithAI(imageBase64, mimeType || 'image/jpeg', LOVABLE_API_KEY, 'google/gemini-2.5-pro');
        usedModel = 'google/gemini-2.5-pro';
        console.log('Pro model extraction complete');
        
        let jsonStr = content || '';
        const jsonMatch = content?.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          jsonStr = jsonMatch[1].trim();
        }
        ocrData = JSON.parse(jsonStr);
      } catch (error: any) {
        if (error.status === 429) {
          return new Response(
            JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        console.error('Pro model also failed:', error);
        if (!ocrData) {
          return new Response(
            JSON.stringify({ error: 'Failed to extract data from document. Please try a clearer image.' }),
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

    // ============= DOCUMENT RELEVANCE CHECK =============
    const relevanceCheck = isDocumentRelevant(ocrData);
    if (!relevanceCheck.relevant) {
      console.log(`Document rejected as irrelevant: ${relevanceCheck.message}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: relevanceCheck.message,
          isIrrelevant: true 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`AI OCR Response received (${usedModel}), applying deterministic rule-based classification...`);

    // ============= RULE-BASED CLASSIFICATION (NO AI GUESSING) =============
    const validationFlags: string[] = [];
    let totalCO2Kg = 0;
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
        quantity: item.quantity,
        unit: item.unit || detectUnit(item.description || ''),
        unitPrice: item.unitPrice,
        total: item.total,
      };

      // Track if we have quantity/unit
      if (classifiedItem.quantity && classifiedItem.quantity > 0) hasAnyQuantity = true;
      if (classifiedItem.unit) hasAnyUnit = true;

      // Try to infer quantity if missing
      if (!classifiedItem.quantity && item.description) {
        const inferredQty = inferQuantityFromContext(item.description, item.total);
        if (inferredQty) {
          classifiedItem.quantity = inferredQty;
          hasAnyQuantity = true;
          console.log(`Inferred quantity ${inferredQty} for: ${item.description?.substring(0, 30)}`);
        }
      }

      // Step 1: Try HSN classification first
      if (item.hsn_code) {
        const hsnClass = classifyByHSN(item.hsn_code);
        if (hsnClass) {
          classifiedItem.productCategory = hsnClass.productCategory;
          classifiedItem.industryCode = hsnClass.industryCode;
          classifiedItem.industryName = hsnClass.industryName;
          classifiedItem.scope = hsnClass.scope;
          classifiedItem.classificationMethod = 'HSN';
          hsnClassifiedCount++;
        }
      }

      // Step 2: Fallback to keyword classification
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

      // Step 3: Mark as unverifiable if no classification
      if (!classifiedItem.productCategory) {
        classifiedItem.classificationMethod = 'UNVERIFIABLE';
        unverifiableItems++;
        validationFlags.push(`Unclassified item: ${item.description?.substring(0, 30) || 'Unknown'}`);
      } else {
        verifiedItems++;
      }

      // Step 4: Calculate emissions if possible
      if (classifiedItem.productCategory && classifiedItem.quantity && classifiedItem.unit && classifiedItem.scope) {
        const emissions = calculateEmissions(
          classifiedItem.quantity,
          classifiedItem.unit,
          classifiedItem.scope,
          classifiedItem.productCategory,
          classifiedItem.fuelType
        );
        
        if (emissions) {
          classifiedItem.co2Kg = emissions.co2Kg;
          classifiedItem.emissionFactor = emissions.emissionFactor;
          classifiedItem.factorSource = emissions.factorSource;
          totalCO2Kg += emissions.co2Kg;
        } else {
          missingEmissionFactorCount++;
        }
      } else if (classifiedItem.productCategory) {
        // Has category but missing data for emission calculation
        missingEmissionFactorCount++;
      }

      return classifiedItem;
    });

    // Determine primary scope and category
    const scopeCounts: Record<number, number> = {};
    const categoryCounts: Record<string, number> = {};
    
    classifiedItems.forEach(item => {
      if (item.scope) scopeCounts[item.scope] = (scopeCounts[item.scope] || 0) + 1;
      if (item.productCategory) categoryCounts[item.productCategory] = (categoryCounts[item.productCategory] || 0) + 1;
    });

    const primaryScope = Object.entries(scopeCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const primaryCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

    // Determine classification status (more lenient - don't reject normal invoices)
    let classificationStatus: 'VERIFIED' | 'PARTIALLY_VERIFIED' | 'UNVERIFIABLE';
    if (unverifiableItems === 0 && classifiedItems.length > 0 && totalCO2Kg > 0) {
      classificationStatus = 'VERIFIED';
    } else if (verifiedItems > 0 || totalCO2Kg > 0) {
      classificationStatus = 'PARTIALLY_VERIFIED';
    } else if (classifiedItems.length > 0 || ocrData.amount) {
      // Has line items or amount - it's a valid invoice, just can't calculate emissions
      classificationStatus = 'PARTIALLY_VERIFIED';
    } else {
      classificationStatus = 'UNVERIFIABLE';
    }

    // Additional validation flags (informational, not rejection criteria)
    if (!ocrData.invoiceNumber) validationFlags.push('Missing invoice number');
    if (!ocrData.supplierGstin) validationFlags.push('Missing supplier GSTIN');
    if (!ocrData.date) validationFlags.push('Missing invoice date');
    if (classifiedItems.some(item => !item.quantity || item.quantity <= 0)) {
      validationFlags.push('Missing or invalid quantities');
    }

    // ============= DETERMINISTIC CONFIDENCE CALCULATION =============
    // Count extracted fields for ratio
    const totalPossibleFields = 7; // vendor, date, invoiceNumber, supplierGstin, buyerGstin, amount, lineItems
    let extractedFields = 0;
    if (ocrData.vendor) extractedFields++;
    if (ocrData.date) extractedFields++;
    if (ocrData.invoiceNumber) extractedFields++;
    if (ocrData.supplierGstin) extractedFields++;
    if (ocrData.buyerGstin) extractedFields++;
    if (ocrData.amount) extractedFields++;
    if (ocrData.lineItems && ocrData.lineItems.length > 0) extractedFields++;

    const finalConfidence = calculateDeterministicConfidence({
      hasQuantity: hasAnyQuantity,
      hasUnit: hasAnyUnit,
      hasInvoiceNumber: !!ocrData.invoiceNumber,
      hasSupplierGstin: !!ocrData.supplierGstin,
      hasDate: !!ocrData.date,
      hasAmount: !!ocrData.amount,
      lineItemCount: classifiedItems.length,
      unverifiableCount: unverifiableItems,
      missingEmissionFactorCount: missingEmissionFactorCount,
      hsnClassifiedCount: hsnClassifiedCount,
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
      totalCO2Kg: totalCO2Kg > 0 ? Math.round(totalCO2Kg * 100) / 100 : undefined,
      confidence: finalConfidence,
      validationFlags,
      classificationStatus,
      methodology: METHODOLOGY_VERSION,
    };

    console.log(`Document processed: ${classificationStatus}, ${verifiedItems} verified, ${unverifiableItems} unverifiable, ${totalCO2Kg.toFixed(2)} kgCO₂e, confidence: ${finalConfidence}% (model: ${usedModel})`);

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
