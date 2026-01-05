import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
  deisel: { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'DIESEL' }, // OCR misread
  disel: { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'DIESEL' }, // OCR misread
  'd1esel': { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'DIESEL' }, // OCR misread
  hsd: { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'DIESEL' }, // High Speed Diesel
  petrol: { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'PETROL' },
  petro: { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'PETROL' }, // Truncated
  petr0l: { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'PETROL' }, // OCR misread
  gasoline: { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'PETROL' },
  ms: { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'PETROL' }, // Motor Spirit
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
  tel: { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'DIESEL' }, // Hindi: oil
  fuel: { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'DIESEL' },
  // Electricity - Scope 2 (including regional terms)
  electricity: { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 },
  electy: { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 }, // Truncated
  elec: { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 },
  'elec bill': { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 },
  power: { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 },
  kwh: { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 },
  kw: { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 },
  'electric bill': { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 },
  'power bill': { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 },
  bijli: { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 }, // Hindi
  vidyut: { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 }, // Hindi
  discom: { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 },
  msedcl: { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 }, // Maharashtra
  tpddl: { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 }, // Delhi
  bses: { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 }, // Delhi
  cesc: { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 }, // Kolkata
  bescom: { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 }, // Bangalore
  tneb: { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 }, // Tamil Nadu
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
  tmt: { productCategory: 'RAW_MATERIAL', industryCode: 'STEEL', scope: 3 }, // TMT bars
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
  kachra: { productCategory: 'WASTE', industryCode: 'WASTE_MANAGEMENT', scope: 3 }, // Hindi
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
  // Try to find numbers near unit keywords
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
  // Average diesel price ~₹90/L, petrol ~₹100/L
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
  
  // Try 2-digit prefix match
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
  
  // Check for exact matches first, then partial matches
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
  
  // Scope 3: Transport (simplified - assumes road heavy)
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
  
  // Generic Scope 3 materials - use estimated factor
  if (scope === 3 && productCategory === 'RAW_MATERIAL') {
    // Use a conservative estimated factor for raw materials
    const estimatedFactor = 0.5; // kgCO2e per kg of material (conservative)
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
  // Classification results (rule-based)
  productCategory?: string;
  industryCode?: string;
  industryName?: string;
  scope?: number;
  fuelType?: string;
  // Emission calculation
  co2Kg?: number;
  emissionFactor?: number;
  factorSource?: string;
  // Status
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
  // Classification summary
  primaryScope?: number;
  primaryCategory?: string;
  totalCO2Kg?: number;
  // Confidence & validation
  confidence: number;
  validationFlags: string[];
  classificationStatus: 'VERIFIED' | 'PARTIALLY_VERIFIED' | 'UNVERIFIABLE';
  // Methodology
  methodology: {
    name: string;
    version: string;
    country: string;
    factorVersion: string;
  };
}

// ============= AI OCR EXTRACTION =============
async function extractWithAI(imageBase64: string, mimeType: string, apiKey: string, model: string): Promise<any> {
  // Enhanced prompt for old/unclear invoices
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
  "subtotal": subtotal as number or null,
  "confidence": 0.0 to 1.0 (your confidence in extraction accuracy)
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
              text: 'Extract ALL data from this document. For old or unclear invoices, use context clues and common patterns to infer missing values. Pay special attention to HSN codes, GSTIN numbers, quantities, and units.'
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

    console.log('Processing document with enhanced OCR extraction...');

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

    // Parse and check confidence
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

    // Retry with pro model if confidence is low or extraction failed
    const shouldRetryWithPro = !ocrData || 
      (ocrData.confidence && ocrData.confidence < 0.6) ||
      (ocrData.lineItems && ocrData.lineItems.length === 0);

    if (shouldRetryWithPro) {
      console.log('Low confidence or failed extraction, retrying with pro model...');
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
        // Use whatever we got from flash model
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

    console.log(`AI OCR Response received (${usedModel}), applying rule-based classification...`);

    // ============= RULE-BASED CLASSIFICATION (NO AI GUESSING) =============
    const validationFlags: string[] = [];
    let totalCO2Kg = 0;
    let verifiedItems = 0;
    let unverifiableItems = 0;
    
    const classifiedItems: LineItem[] = (ocrData.lineItems || []).map((item: any) => {
      const classifiedItem: LineItem = {
        description: item.description || '',
        hsn_code: item.hsn_code,
        quantity: item.quantity,
        unit: item.unit || detectUnit(item.description || ''),
        unitPrice: item.unitPrice,
        total: item.total,
      };

      // Try to infer quantity if missing
      if (!classifiedItem.quantity && item.description) {
        const inferredQty = inferQuantityFromContext(item.description, item.total);
        if (inferredQty) {
          classifiedItem.quantity = inferredQty;
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
        }
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

    // Determine classification status
    let classificationStatus: 'VERIFIED' | 'PARTIALLY_VERIFIED' | 'UNVERIFIABLE';
    if (unverifiableItems === 0 && classifiedItems.length > 0) {
      classificationStatus = 'VERIFIED';
    } else if (verifiedItems > 0) {
      classificationStatus = 'PARTIALLY_VERIFIED';
    } else {
      classificationStatus = 'UNVERIFIABLE';
    }

    // Additional validation
    if (!ocrData.invoiceNumber) validationFlags.push('Missing invoice number');
    if (!ocrData.supplierGstin) validationFlags.push('Missing supplier GSTIN');
    if (!ocrData.date) validationFlags.push('Missing invoice date');
    if (classifiedItems.some(item => !item.quantity || item.quantity <= 0)) {
      validationFlags.push('Missing or invalid quantities');
    }

    // Adjust confidence based on classification results
    let finalConfidence = ocrData.confidence || 0.5;
    if (unverifiableItems > 0) {
      finalConfidence -= (unverifiableItems / Math.max(classifiedItems.length, 1)) * 0.3;
    }
    if (validationFlags.length > 3) {
      finalConfidence -= 0.2;
    }
    // Boost confidence if we used pro model
    if (usedModel === 'google/gemini-2.5-pro') {
      finalConfidence = Math.min(1, finalConfidence + 0.1);
    }
    finalConfidence = Math.max(0, Math.min(1, finalConfidence));

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
      methodology: {
        name: 'BIOCOG_MVR_INDIA',
        version: 'v1.0',
        country: 'IN',
        factorVersion: 'IND_EF_2025',
      },
    };

    console.log(`Document processed: ${classificationStatus}, ${verifiedItems} verified, ${unverifiableItems} unverifiable, ${totalCO2Kg.toFixed(2)} kgCO₂e (model: ${usedModel})`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: extractedData 
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
