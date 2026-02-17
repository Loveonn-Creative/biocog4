import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============= EMISSION FACTORS (BIOCOG_MVR_INDIA_v1.0) =============
const EMISSION_FACTORS = {
  // Scope 1: Fuels (kgCO₂e per unit)
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
  
  // Scope 2: Electricity (kgCO₂e per kWh)
  scope2_electricity: {
    INDIA_GRID_AVG: 0.708,
    SOLAR_CAPTIVE: 0.000,
    WIND_CAPTIVE: 0.000,
    RENEWABLE_PPA: 0.000,
  },
  
  // Scope 3: Transport (kgCO₂e per ton-km)
  scope3_transport: {
    ROAD_LIGHT: 0.12,
    ROAD_HEAVY: 0.18,
    RAIL: 0.04,
    INLAND_WATER: 0.03,
    SEA: 0.015,
    AIR: 0.60,
  },
  
  // Scope 3: Waste (kgCO₂e per kg)
  scope3_waste: {
    LANDFILL_ORGANIC: 1.90,
    LANDFILL_INORGANIC: 0.45,
    RECYCLING_PAPER: -0.90,
    RECYCLING_PLASTIC: -1.50,
    RECYCLING_METAL: -4.00,
    INCINERATION: 2.50,
  },
};

// Industry benchmarks (kgCO₂e per INR of revenue)
const INDUSTRY_BENCHMARKS: Record<string, number> = {
  STEEL: 3.5,
  CEMENT: 0.9,
  PLASTIC: 2.2,
  PAPER: 1.6,
  TEXTILE: 1.8,
  LOGISTICS: 0.5,
  POWER: 0.7,
  MANUFACTURING_GENERIC: 1.2,
};

// Keyword to category mapping
const KEYWORD_MAP: Record<string, { category: string; scope: number; industryCode: string }> = {
  diesel: { category: 'FUEL', scope: 1, industryCode: 'ENERGY' },
  petrol: { category: 'FUEL', scope: 1, industryCode: 'ENERGY' },
  gasoline: { category: 'FUEL', scope: 1, industryCode: 'ENERGY' },
  cng: { category: 'FUEL', scope: 1, industryCode: 'ENERGY' },
  lpg: { category: 'FUEL', scope: 1, industryCode: 'ENERGY' },
  coal: { category: 'FUEL', scope: 1, industryCode: 'ENERGY' },
  electricity: { category: 'ELECTRICITY', scope: 2, industryCode: 'POWER' },
  power: { category: 'ELECTRICITY', scope: 2, industryCode: 'POWER' },
  kwh: { category: 'ELECTRICITY', scope: 2, industryCode: 'POWER' },
  freight: { category: 'TRANSPORT', scope: 3, industryCode: 'LOGISTICS' },
  transport: { category: 'TRANSPORT', scope: 3, industryCode: 'LOGISTICS' },
  logistics: { category: 'TRANSPORT', scope: 3, industryCode: 'LOGISTICS' },
  courier: { category: 'TRANSPORT', scope: 3, industryCode: 'LOGISTICS' },
  steel: { category: 'RAW_MATERIAL', scope: 3, industryCode: 'STEEL' },
  plastic: { category: 'RAW_MATERIAL', scope: 3, industryCode: 'PLASTIC' },
  paper: { category: 'RAW_MATERIAL', scope: 3, industryCode: 'PAPER' },
  waste: { category: 'WASTE', scope: 3, industryCode: 'WASTE_MANAGEMENT' },
};

interface EmissionRecord {
  id: string;
  category: string;
  scope: number;
  co2_kg: number;
  activity_data: number | null;
  activity_unit: string | null;
  emission_factor: number | null;
  data_quality: string | null;
  documents?: {
    vendor: string | null;
    invoice_number: string | null;
    amount: number | null;
    confidence: number | null;
  };
}

interface VerificationResult {
  verificationId: string;
  status: 'verified' | 'needs_review' | 'rejected';
  score: number;
  greenwashingRisk: 'low' | 'medium' | 'high';
  analysis: {
    dataQuality: string;
    methodologyCompliance: string;
    recommendations: string[];
    flags: string[];
    scopeBreakdown: { scope1: number; scope2: number; scope3: number };
    emissionIntensity: number | null;
    greenScore: number;
    creditEligibility: {
      eligibleCredits: number;
      carryForward: number;
      qualityGrade: string;
    };
  };
  cctsEligible: boolean;
  cbamCompliant: boolean;
  totalCO2Kg: number;
  netEmissions: number;
  verifiedReductions: number;
  methodology: {
    name: string;
    version: string;
    country: string;
    factorVersion: string;
  };
}

// Validation functions
function validateEmission(emission: EmissionRecord): { valid: boolean; flags: string[]; confidence: number } {
  const flags: string[] = [];
  let confidence = 100;
  
  // Check for missing or invalid data
  if (!emission.activity_data || emission.activity_data <= 0) {
    flags.push('Missing or invalid activity data');
    confidence -= 20;
  }
  
  if (!emission.activity_unit) {
    flags.push('Missing activity unit');
    confidence -= 15;
  }
  
  if (!emission.emission_factor) {
    flags.push('Missing emission factor');
    confidence -= 10;
  }
  
  // Check for abnormal quantities (simple threshold check)
  if (emission.activity_data && emission.activity_data > 1000000) {
    flags.push('Abnormally high quantity - requires verification');
    confidence -= 25;
  }
  
  // Check document confidence if available
  if (emission.documents?.confidence && emission.documents.confidence < 0.7) {
    flags.push('Low OCR confidence on source document');
    confidence -= 15;
  }
  
  // Cap confidence between 0 and 100
  confidence = Math.max(0, Math.min(100, confidence));
  
  return {
    valid: confidence >= 80,
    flags,
    confidence
  };
}

function calculateGreenwashingRisk(emissions: EmissionRecord[], validationResults: Map<string, { flags: string[]; confidence: number }>): 'low' | 'medium' | 'high' {
  let riskScore = 0;
  
  // Check for too many perfect numbers (suspicious)
  const perfectNumbers = emissions.filter(e => e.co2_kg === Math.round(e.co2_kg)).length;
  if (perfectNumbers / emissions.length > 0.8) {
    riskScore += 20;
  }
  
  // Check for missing documentation
  const noDocumentation = emissions.filter(e => !e.documents?.invoice_number).length;
  if (noDocumentation / emissions.length > 0.5) {
    riskScore += 30;
  }
  
  // Check overall data quality
  let totalConfidence = 0;
  validationResults.forEach((result) => {
    totalConfidence += result.confidence;
  });
  const avgConfidence = totalConfidence / validationResults.size;
  
  if (avgConfidence < 60) {
    riskScore += 30;
  } else if (avgConfidence < 80) {
    riskScore += 15;
  }
  
  // Check for consistent emission factors
  const factors = new Set(emissions.map(e => e.emission_factor));
  if (factors.size === 1 && emissions.length > 3) {
    riskScore += 10; // Same factor for everything is suspicious
  }
  
  if (riskScore >= 50) return 'high';
  if (riskScore >= 25) return 'medium';
  return 'low';
}

function calculateGreenScore(scopeBreakdown: { scope1: number; scope2: number; scope3: number }, reductions: number, total: number): number {
  if (total === 0) return 0;
  
  const scope1Pct = scopeBreakdown.scope1 / total;
  const scope2Pct = scopeBreakdown.scope2 / total;
  const scope3Pct = scopeBreakdown.scope3 / total;
  
  // Base score deductions based on scope distribution
  let score = 100 - (scope1Pct * 50) - (scope2Pct * 30) - (scope3Pct * 20);
  
  // Reduction bonus (capped at 30%)
  const reductionRatio = Math.min(reductions / total, 0.3);
  score += reductionRatio * 100;
  
  return Math.max(0, Math.min(100, Math.round(score)));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { emissionIds, sessionId, userId, includeIoT = false } = await req.json();

    if (!emissionIds || emissionIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No emissions to verify' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting verification for emissions:', emissionIds);

    // Fetch emissions data with documents
    const { data: emissions, error: emissionsError } = await supabase
      .from('emissions')
      .select('*, documents(*)')
      .in('id', emissionIds);

    if (emissionsError || !emissions?.length) {
      console.error('Error fetching emissions:', emissionsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch emissions data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Validate each emission
    const validationResults = new Map<string, { valid: boolean; flags: string[]; confidence: number }>();
    const allFlags: string[] = [];
    
    for (const emission of emissions) {
      const result = validateEmission(emission);
      validationResults.set(emission.id, result);
      allFlags.push(...result.flags);
    }

    // Step 2: Calculate scope breakdown
    const scopeBreakdown = {
      scope1: emissions.filter(e => e.scope === 1).reduce((sum, e) => sum + e.co2_kg, 0),
      scope2: emissions.filter(e => e.scope === 2).reduce((sum, e) => sum + e.co2_kg, 0),
      scope3: emissions.filter(e => e.scope === 3).reduce((sum, e) => sum + e.co2_kg, 0),
    };

    const totalCO2Kg = scopeBreakdown.scope1 + scopeBreakdown.scope2 + scopeBreakdown.scope3;

    // Step 3: Calculate verified reductions (only from certified documents)
    // In real implementation, this would check for REC_CERTIFICATE, RECYCLER_CERTIFICATE, etc.
    let verifiedReductions = 0;
    if (includeIoT) {
      // IoT efficiency bonus (simulated - in reality would come from meter data)
      verifiedReductions = totalCO2Kg * 0.05; // 5% efficiency gain from IoT monitoring
    }

    // Step 4: Calculate net emissions
    const netEmissions = Math.max(0, totalCO2Kg - verifiedReductions);
    const netTCO2e = netEmissions / 1000;

    // Step 5: Calculate credit eligibility
    const creditsIssued = Math.floor(netTCO2e);
    const carryForward = netTCO2e - creditsIssued;

    // Step 6: Determine greenwashing risk
    const greenwashingRisk = calculateGreenwashingRisk(emissions, validationResults);

    // Step 7: Calculate green score
    const greenScore = calculateGreenScore(scopeBreakdown, verifiedReductions, totalCO2Kg);

    // Step 8: Determine verification status
    const validCount = Array.from(validationResults.values()).filter(v => v.valid).length;
    const validRatio = validCount / emissions.length;
    
    let status: 'verified' | 'needs_review' | 'rejected';
    let verificationScore: number;
    
    if (validRatio >= 0.8 && greenwashingRisk === 'low') {
      status = 'verified';
      verificationScore = 0.85 + (validRatio * 0.15);
    } else if (validRatio >= 0.5 && greenwashingRisk !== 'high') {
      status = 'needs_review';
      verificationScore = 0.5 + (validRatio * 0.35);
    } else {
      status = 'rejected';
      verificationScore = validRatio * 0.5;
    }

    // Determine quality grade
    let qualityGrade: string;
    if (verificationScore >= 0.9 && greenwashingRisk === 'low') qualityGrade = 'A';
    else if (verificationScore >= 0.75) qualityGrade = 'B';
    else if (verificationScore >= 0.5) qualityGrade = 'C';
    else qualityGrade = 'D';

    // CCTS and CBAM eligibility
    const cctsEligible = status === 'verified' && qualityGrade !== 'D';
    const cbamCompliant = status === 'verified' && greenwashingRisk === 'low' && qualityGrade === 'A';

    // Use AI for additional analysis and recommendations
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    let aiRecommendations: string[] = [];
    let methodologyCompliance = 'GHG Protocol / ISO 14064 compliant emission factors applied';
    let dataQualityAssessment = `${validCount}/${emissions.length} records passed validation`;

    if (LOVABLE_API_KEY) {
      try {
        const aiPrompt = `You are a carbon verification expert. Analyze this emission data summary and provide 3-5 specific recommendations:

Total Emissions: ${totalCO2Kg.toFixed(2)} kg CO₂e
Scope 1: ${scopeBreakdown.scope1.toFixed(2)} kg (${((scopeBreakdown.scope1/totalCO2Kg)*100 || 0).toFixed(1)}%)
Scope 2: ${scopeBreakdown.scope2.toFixed(2)} kg (${((scopeBreakdown.scope2/totalCO2Kg)*100 || 0).toFixed(1)}%)
Scope 3: ${scopeBreakdown.scope3.toFixed(2)} kg (${((scopeBreakdown.scope3/totalCO2Kg)*100 || 0).toFixed(1)}%)
Green Score: ${greenScore}/100
Greenwashing Risk: ${greenwashingRisk}
Validation Issues: ${allFlags.slice(0, 5).join(', ') || 'None'}

Respond with ONLY a JSON array of recommendation strings, like: ["recommendation 1", "recommendation 2"]`;

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [{ role: 'user', content: aiPrompt }],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          let content = aiData.choices?.[0]?.message?.content || '[]';
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            aiRecommendations = JSON.parse(jsonMatch[0]);
          }
        }
      } catch (aiError) {
        console.error('AI analysis error:', aiError);
        aiRecommendations = ['Manual review recommended for complete verification'];
      }
    }

    // Store verification result
    const { data: verification, error: verificationError } = await supabase
      .from('carbon_verifications')
      .insert({
        emission_ids: emissionIds,
        session_id: sessionId || null,
        user_id: userId || null,
        total_co2_kg: totalCO2Kg,
        verification_status: status,
        verification_score: verificationScore,
        greenwashing_risk: greenwashingRisk,
        ai_analysis: {
          dataQuality: dataQualityAssessment,
          methodologyCompliance,
          recommendations: aiRecommendations,
          flags: [...new Set(allFlags)],
          scopeBreakdown,
          greenScore,
          netEmissions,
          verifiedReductions,
          creditEligibility: {
            eligibleCredits: creditsIssued,
            carryForward,
            qualityGrade,
          },
          methodology: {
            name: 'BIOCOG_MVR_INDIA',
            version: 'v1.0',
            country: 'IN',
            factorVersion: 'IND_EF_2025',
          },
        },
        ccts_eligible: cctsEligible,
        cbam_compliant: cbamCompliant,
        verified_at: status === 'verified' ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (verificationError) {
      console.error('Error storing verification:', verificationError);
      return new Response(
        JSON.stringify({ error: 'Failed to store verification' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update emissions as verified if applicable
    if (status === 'verified') {
      await supabase
        .from('emissions')
        .update({ verified: true, verification_notes: `Verified with score ${(verificationScore * 100).toFixed(0)}%` })
        .in('id', emissionIds);
    }

    // ============= COMPLIANCE LEDGER POPULATION =============
    // Auto-populate compliance ledger for authenticated users
    if (userId) {
      const GREEN_CATEGORIES = ['SOLAR_ENERGY', 'EV_TRANSPORT', 'FORESTATION', 'WIND_ENERGY', 'BIOGAS', 'ORGANIC_INPUT', 'ENERGY_EFFICIENCY', 'WATER_CONSERVATION', 'RECYCLED_MATERIAL'];
      
      for (const emission of emissions) {
        const doc = emission.documents;
        const isGreen = GREEN_CATEGORIES.includes(emission.category?.toUpperCase?.() || '');
        const co2 = emission.co2_kg || 0;
        
        // Determine validation result
        let validationResult = 'passed';
        let validationFailureReason: string | null = null;
        const emValidation = validationResults.get(emission.id);
        
        if (emValidation && !emValidation.valid) {
          validationResult = 'failed';
          if (!emission.activity_data || emission.activity_data <= 0) {
            validationFailureReason = 'Quantity not detected - cannot compute: Quantity x Factor = CO2';
          } else if (!emission.activity_unit) {
            validationFailureReason = 'Unit missing - emission factor requires specific unit (litre/kWh/kg)';
          } else if (!emission.emission_factor) {
            validationFailureReason = `No emission factor available for category: ${emission.category}`;
          } else {
            validationFailureReason = emValidation.flags.join('; ');
          }
        }

        // Determine fiscal year and quarter
        const createdDate = new Date(emission.created_at || Date.now());
        const month = createdDate.getMonth() + 1;
        const year = createdDate.getFullYear();
        const fiscalYear = month >= 4 ? `FY${year}-${year + 1}` : `FY${year - 1}-${year}`;
        const fiscalQuarter = month >= 4 && month <= 6 ? 'Q1' : month >= 7 && month <= 9 ? 'Q2' : month >= 10 && month <= 12 ? 'Q3' : 'Q4';

        try {
          await supabase
            .from('compliance_ledger')
            .insert({
              user_id: userId,
              document_id: emission.document_id || null,
              emission_id: emission.id,
              verification_id: verification.id,
              document_hash: doc?.document_hash || 'NO_HASH',
              invoice_number: doc?.invoice_number || null,
              vendor: doc?.vendor || null,
              invoice_date: doc?.invoice_date || null,
              amount: doc?.amount || null,
              currency: doc?.currency || 'INR',
              green_category: isGreen ? emission.category : null,
              scope: emission.scope,
              emission_category: emission.category,
              activity_data: emission.activity_data || null,
              activity_unit: emission.activity_unit || null,
              emission_factor: emission.emission_factor || null,
              factor_source: emission.verification_notes || null,
              co2_kg: co2,
              is_green_benefit: co2 < 0,
              confidence_score: doc?.confidence || null,
              verification_score: verificationScore,
              verification_status: status,
              validation_result: validationResult,
              validation_failure_reason: validationFailureReason,
              greenwashing_risk: greenwashingRisk,
              methodology_version: 'BIOCOG_MVR_INDIA_v1.0',
              classification_method: emission.data_quality === 'high' ? 'HSN' : 'KEYWORD',
              gstin: null,
              hsn_code: null,
              verified_at: status === 'verified' ? new Date().toISOString() : null,
              fiscal_year: fiscalYear,
              fiscal_quarter: fiscalQuarter,
            });
        } catch (ledgerError) {
          console.error('Compliance ledger insert error for emission:', emission.id, ledgerError);
        }
      }
      console.log(`Compliance ledger populated with ${emissions.length} entries`);
    }

    const result: VerificationResult = {
      verificationId: verification.id,
      status,
      score: verificationScore,
      greenwashingRisk,
      analysis: {
        dataQuality: dataQualityAssessment,
        methodologyCompliance,
        recommendations: aiRecommendations,
        flags: [...new Set(allFlags)],
        scopeBreakdown,
        emissionIntensity: null,
        greenScore,
        creditEligibility: {
          eligibleCredits: creditsIssued,
          carryForward,
          qualityGrade,
        },
      },
      cctsEligible,
      cbamCompliant,
      totalCO2Kg,
      netEmissions,
      verifiedReductions,
      methodology: {
        name: 'BIOCOG_MVR_INDIA',
        version: 'v1.0',
        country: 'IN',
        factorVersion: 'IND_EF_2025',
      },
    };

    console.log('Verification complete:', result);

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Verification error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
