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

// ============= KEYWORD FALLBACK MAP (RULE-BASED - NO AI) =============
const KEYWORD_MAP: Record<string, { productCategory: string; industryCode: string; scope: number; fuelType?: string }> = {
  // Fuels - Scope 1
  diesel: { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'DIESEL' },
  petrol: { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'PETROL' },
  gasoline: { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'PETROL' },
  cng: { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'CNG' },
  lpg: { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'LPG' },
  coal: { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'COAL' },
  furnace: { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'FURNACE_OIL' },
  naphtha: { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'NAPHTHA' },
  png: { productCategory: 'FUEL', industryCode: 'ENERGY', scope: 1, fuelType: 'PNG' },
  // Electricity - Scope 2
  electricity: { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 },
  power: { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 },
  kwh: { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 },
  'electric bill': { productCategory: 'ELECTRICITY', industryCode: 'POWER', scope: 2 },
  // Transport - Scope 3
  freight: { productCategory: 'TRANSPORT', industryCode: 'LOGISTICS', scope: 3 },
  transport: { productCategory: 'TRANSPORT', industryCode: 'LOGISTICS', scope: 3 },
  logistics: { productCategory: 'TRANSPORT', industryCode: 'LOGISTICS', scope: 3 },
  courier: { productCategory: 'TRANSPORT', industryCode: 'LOGISTICS', scope: 3 },
  shipping: { productCategory: 'TRANSPORT', industryCode: 'LOGISTICS', scope: 3 },
  delivery: { productCategory: 'TRANSPORT', industryCode: 'LOGISTICS', scope: 3 },
  // Raw Materials - Scope 3
  steel: { productCategory: 'RAW_MATERIAL', industryCode: 'STEEL', scope: 3 },
  iron: { productCategory: 'RAW_MATERIAL', industryCode: 'STEEL', scope: 3 },
  plastic: { productCategory: 'RAW_MATERIAL', industryCode: 'PLASTIC', scope: 3 },
  polymer: { productCategory: 'RAW_MATERIAL', industryCode: 'PLASTIC', scope: 3 },
  paper: { productCategory: 'RAW_MATERIAL', industryCode: 'PAPER', scope: 3 },
  cement: { productCategory: 'RAW_MATERIAL', industryCode: 'CEMENT', scope: 3 },
  aluminium: { productCategory: 'RAW_MATERIAL', industryCode: 'ALUMINIUM', scope: 3 },
  aluminum: { productCategory: 'RAW_MATERIAL', industryCode: 'ALUMINIUM', scope: 3 },
  copper: { productCategory: 'RAW_MATERIAL', industryCode: 'COPPER', scope: 3 },
  textile: { productCategory: 'RAW_MATERIAL', industryCode: 'TEXTILE', scope: 3 },
  fabric: { productCategory: 'RAW_MATERIAL', industryCode: 'TEXTILE', scope: 3 },
  cotton: { productCategory: 'RAW_MATERIAL', industryCode: 'TEXTILE', scope: 3 },
  wood: { productCategory: 'RAW_MATERIAL', industryCode: 'WOOD', scope: 3 },
  timber: { productCategory: 'RAW_MATERIAL', industryCode: 'WOOD', scope: 3 },
  rubber: { productCategory: 'RAW_MATERIAL', industryCode: 'RUBBER', scope: 3 },
  // Waste - Scope 3
  waste: { productCategory: 'WASTE', industryCode: 'WASTE_MANAGEMENT', scope: 3 },
  disposal: { productCategory: 'WASTE', industryCode: 'WASTE_MANAGEMENT', scope: 3 },
  recycling: { productCategory: 'WASTE', industryCode: 'WASTE_MANAGEMENT', scope: 3 },
  scrap: { productCategory: 'WASTE', industryCode: 'WASTE_MANAGEMENT', scope: 3 },
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

// ============= UNIT DETECTION =============
function detectUnit(text: string): string | null {
  const unitPatterns: Record<string, RegExp> = {
    'litre': /\b(litre|liter|ltr|l)\b/i,
    'kg': /\b(kg|kilogram|kgs)\b/i,
    'kWh': /\b(kwh|kilowatt|unit|units)\b/i,
    'ton': /\b(ton|tonne|mt|tons)\b/i,
    'km': /\b(km|kilometer|kilometres)\b/i,
    'scm': /\b(scm|cubic\s*m)\b/i,
  };
  
  for (const [unit, pattern] of Object.entries(unitPatterns)) {
    if (pattern.test(text)) return unit;
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

    // Enhanced prompt for HSN code extraction
    const systemPrompt = `You are an expert OCR document analyzer for Indian MSMEs. Extract data from invoices, bills, and receipts with precision.

CRITICAL: Extract these fields with maximum accuracy:
1. GSTIN numbers (15-character alphanumeric)
2. HSN codes (4-8 digit codes identifying products)
3. Invoice/bill numbers
4. Line items with quantities, units, and amounts
5. Dates in any format

For each line item, extract:
- description (product/service name)
- hsn_code (4-8 digit HSN code if present)
- quantity (numeric value)
- unit (litre/kWh/kg/ton/km/scm/nos)
- unitPrice (per unit price)
- total (line total amount)

Look for HSN codes in columns labeled "HSN", "HSN/SAC", "SAC Code", or in the product description.

Respond ONLY with valid JSON:
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
      "hsn_code": "HSN code if found",
      "quantity": number,
      "unit": "litre|kWh|kg|ton|km|scm|nos",
      "unitPrice": number,
      "total": number
    }
  ],
  "taxAmount": tax amount as number,
  "subtotal": subtotal as number,
  "confidence": 0.0 to 1.0
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all data from this document. Pay special attention to HSN codes, GSTIN numbers, quantities, and units.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`
                }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI usage limit reached. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to process document' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      console.error('No content in AI response');
      return new Response(
        JSON.stringify({ error: 'Failed to extract data from document' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('AI OCR Response received, applying rule-based classification...');

    // Parse AI response
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    let ocrData: any;
    try {
      ocrData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return new Response(
        JSON.stringify({ error: 'Failed to parse extracted data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    console.log(`Document processed: ${classificationStatus}, ${verifiedItems} verified, ${unverifiableItems} unverifiable, ${totalCO2Kg.toFixed(2)} kgCO₂e`);

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
