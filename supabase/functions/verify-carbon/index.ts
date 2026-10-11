import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { avoidedFromDocuments, estimateGreenScore } from '../_shared/greenScore.ts';
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { indicativeValueFromKg, INDICATIVE_VALUE_LABEL, INDICATIVE_RATE_INR_PER_T } from "../_shared/carbonValue.ts";
import { INDIA_GRID_FACTOR_KG_PER_KWH, METHODOLOGY_VERSION_TAG, FACTOR_SET_VERSION } from "../_shared/emissionFactors.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Country grid factors. India uses the shared factor (see
// ../_shared/emissionFactors.ts for its source note); the others are the
// earlier values labelled "IEA 2023" and are unchanged.
const COUNTRY_GRID_FACTORS: Record<string, number> = {
  IN: INDIA_GRID_FACTOR_KG_PER_KWH,
  PH: 0.505,
  ID: 0.761,
  BD: 0.623,
  PK: 0.495,
  SG: 0.408,
  VN: 0.625,
  TH: 0.493,
  MY: 0.585,
  LK: 0.462,
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
  verification_notes?: string | null;
  documents?: {
    vendor: string | null;
    invoice_number: string | null;
    amount: number | null;
    confidence: number | null;
    document_hash?: string | null;
    invoice_date?: string | null;
    currency?: string | null;
    cached_result?: unknown;
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
    greenScore: number | null;
    greenPotential?: number | null;
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
    gridFactor?: number;
  };
  indicativeValue: {
    verifiedTCO2e: number;
    indicativeValueInr: number;
    rateInrPerT: number;
    label: string;
    creditsIssued: number;
  };
  complianceAssessment: 'not_assessed';
}

// Older stored verifications may carry floor(tCO2e) as "eligibleCredits" and
// heuristic CCTS/CBAM flags. Replayed results report neither.
function replayAnalysis(analysis: Record<string, any> | null | undefined) {
  const a = analysis && typeof analysis === 'object' ? analysis : {};
  return {
    ...a,
    creditEligibility: { ...(a.creditEligibility || {}), eligibleCredits: 0, carryForward: 0 },
    complianceAssessment: 'not_assessed',
  };
}

function replayIndicativeValue(previous: { verification_status: string | null; total_co2_kg: number | null }) {
  const verifiedKg = previous.verification_status === 'verified' ? Number(previous.total_co2_kg) || 0 : 0;
  return {
    verifiedTCO2e: verifiedKg / 1000,
    indicativeValueInr: indicativeValueFromKg(verifiedKg),
    rateInrPerT: INDICATIVE_RATE_INR_PER_T,
    label: INDICATIVE_VALUE_LABEL,
    creditsIssued: 0,
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
  if (emission.documents?.confidence !== null && emission.documents?.confidence !== undefined && emission.documents.confidence < 70) {
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

function calculateGreenwashingRisk(emissions: EmissionRecord[], validationResults: Map<string, { flags: string[]; confidence: number }>): { risk: 'low' | 'medium' | 'high'; factors: string[] } {
  let riskScore = 0;
  const factors: string[] = [];
  
  // Check for too many perfect numbers (suspicious)
  const perfectNumbers = emissions.filter(e => e.co2_kg === Math.round(e.co2_kg)).length;
  if (perfectNumbers / emissions.length > 0.8) {
    riskScore += 20;
    factors.push(`${Math.round((perfectNumbers / emissions.length) * 100)}% of values are round numbers — unusual for real-world data`);
  }
  
  // Check for missing documentation
  const noDocumentation = emissions.filter(e => !e.documents?.invoice_number).length;
  if (noDocumentation / emissions.length > 0.5) {
    riskScore += 30;
    factors.push(`${noDocumentation}/${emissions.length} records missing invoice documentation`);
  }
  
  // Check overall data quality
  let totalConfidence = 0;
  validationResults.forEach((result) => {
    totalConfidence += result.confidence;
  });
  const avgConfidence = totalConfidence / validationResults.size;
  
  if (avgConfidence < 60) {
    riskScore += 30;
    factors.push(`Average data confidence ${avgConfidence.toFixed(0)}% — below 60% threshold`);
  } else if (avgConfidence < 80) {
    riskScore += 15;
    factors.push(`Average data confidence ${avgConfidence.toFixed(0)}% — moderate quality`);
  }
  
  // Check for consistent emission factors
  const factorSet = new Set(emissions.map(e => e.emission_factor));
  if (factorSet.size === 1 && emissions.length > 3) {
    riskScore += 10;
    factors.push('Identical emission factor across all records — suggests generic classification');
  }
  
  let risk: 'low' | 'medium' | 'high';
  if (riskScore >= 50) risk = 'high';
  else if (riskScore >= 25) risk = 'medium';
  else risk = 'low';
  
  if (factors.length === 0) factors.push('No specific risk triggers identified');
  
  return { risk, factors };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // includeIoT is still accepted from older clients but no longer changes any number.
    const { emissionIds, sessionId: bodySessionId, country = 'IN', inspectOnly = false } = await req.json();

    const countryCode = (typeof country === 'string' && COUNTRY_GRID_FACTORS[country.toUpperCase()]) ? country.toUpperCase() : 'IN';
    const gridFactor = COUNTRY_GRID_FACTORS[countryCode] || INDIA_GRID_FACTOR_KG_PER_KWH;

    if (!Array.isArray(emissionIds) || emissionIds.length === 0 || emissionIds.length > 100 ||
        emissionIds.some((id) => typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(id)) ||
        new Set(emissionIds).size !== emissionIds.length) {
      return new Response(
        JSON.stringify({ error: 'Provide distinct, valid emission IDs (up to 100)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // ============= AUTH: derive userId from JWT if present =============
    let userId: string | null = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const tok = authHeader.replace('Bearer ', '');
      // Don't treat anon publishable key as a user
      if (tok !== anonKey) {
        const userClient = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: claimsRes } = await userClient.auth.getClaims(tok);
        if (claimsRes?.claims?.sub) userId = claimsRes.claims.sub as string;
      }
    }
    // Signed-in requests must own their emissions. Guest handling is unchanged.
    const sessionId: string | null = bodySessionId || null;

    if (!userId && !sessionId) {
      return new Response(
        JSON.stringify({ error: 'Authentication or session required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // ============= OWNERSHIP VALIDATION =============
    const { data: emissions, error: emissionsError } = await supabase
      .from('emissions')
      .select('*, documents(*)')
      .in('id', emissionIds);

    if (emissionsError || !emissions?.length || emissions.length !== emissionIds.length) {
      console.error('Error fetching emissions:', emissionsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch emissions data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ownership passes only for the JWT user, or on the existing guest path.
    for (const emission of emissions) {
      const userMatch = !!userId && emission.user_id === userId;
      // Do not accept a client-supplied guest session as ownership for a
      // signed-in identity. Guest ownership remains on its existing path.
      const sessionMatch = !userId && !!sessionId && emission.session_id === sessionId;
      if (!userMatch && !sessionMatch) {
        console.error('Ownership mismatch: emission', emission.id, 'does not belong to requester');
        return new Response(
          JSON.stringify({ error: 'Access denied: you do not own these emissions' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Verification is an evidence transition, not a way to manufacture
    // missing source data. Signed-in users and guests go through the same
    // gate; preflight and commit use it too.
    {
      const missingInputs: Array<{ emissionId: string; fields: string[] }> = [];
      for (const emission of emissions) {
        const fields: string[] = [];
        const doc = emission.documents;
        if (!emission.document_id || !doc) fields.push('source invoice');
        if (!doc?.document_hash) fields.push('document fingerprint');
        if (!Number.isInteger(emission.scope) || emission.scope < 1 || emission.scope > 3) fields.push('scope');
        if (!emission.category || emission.category === 'other') fields.push('activity classification');
        if (!Number.isFinite(emission.activity_data) || emission.activity_data <= 0) fields.push('activity quantity');
        if (!emission.activity_unit?.trim()) fields.push('activity unit');
        if (!Number.isFinite(emission.emission_factor) || emission.emission_factor <= 0) fields.push('emission factor');
        if (!Number.isFinite(emission.co2_kg) || emission.co2_kg < 0) fields.push('calculated emissions');
        let provenance: Record<string, unknown> | null = null;
        try { provenance = JSON.parse(emission.verification_notes || 'null'); } catch { /* legacy notes */ }
        if (!provenance || typeof provenance.factorSource !== 'string' || !provenance.factorSource.trim()) fields.push('factor source');
        if (!provenance || typeof provenance.sourceDescription !== 'string' || !provenance.sourceDescription.trim()) fields.push('source line item');
        if (Number.isFinite(emission.activity_data) && Number.isFinite(emission.emission_factor) && Number.isFinite(emission.co2_kg) &&
          Math.abs(emission.activity_data * emission.emission_factor - emission.co2_kg) > Math.max(0.01, Math.abs(emission.co2_kg) * 0.001)) {
          fields.push('quantity × factor does not match stored emissions');
        }
        if (fields.length) missingInputs.push({ emissionId: emission.id, fields });
      }
      if (inspectOnly || missingInputs.length) {
        return new Response(JSON.stringify({ ready: missingInputs.length === 0, missingInputs }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Authenticated requests are keyed by their exact emission set. The unique
    // index arbitrates concurrent calls; historical results remain untouched.
    let idempotencyKey: string | null = null;
    if (userId) {
      const canonical = `${userId}:${[...emissionIds].sort().join(',')}`;
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical));
      idempotencyKey = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
      const { data: previous, error: previousError } = await supabase.from('carbon_verifications')
        .select('*').eq('user_id', userId).eq('idempotency_key', idempotencyKey).maybeSingle();
      if (previousError) throw previousError;
      if (previous) {
        const { error: statusError } = previous.verification_status === 'verified'
          ? await supabase.from('emissions').update({ verified: true }).in('id', emissionIds).eq('user_id', userId)
          : { error: null };
        if (statusError) throw statusError;
        return new Response(JSON.stringify({ success: true, data: {
          verificationId: previous.id, status: previous.verification_status, score: previous.verification_score,
          greenwashingRisk: previous.greenwashing_risk,
          greenwashingFactors: previous.ai_analysis?.greenwashingFactors || [], analysis: replayAnalysis(previous.ai_analysis), cctsEligible: false,
          cbamCompliant: false, totalCO2Kg: previous.total_co2_kg,
          netEmissions: previous.ai_analysis?.netEmissions ?? previous.total_co2_kg,
          verifiedReductions: previous.ai_analysis?.verifiedReductions ?? 0,
          methodology: previous.ai_analysis?.methodology,
          indicativeValue: replayIndicativeValue(previous), complianceAssessment: 'not_assessed',
        }, reused: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
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
    // Gross emissions only: legacy negative (avoided) rows count as zero and
    // are never subtracted.
    const grossKg = (e: EmissionRecord) => (Number.isFinite(Number(e.co2_kg)) && Number(e.co2_kg) > 0 ? Number(e.co2_kg) : 0);
    const scopeBreakdown = {
      scope1: emissions.filter(e => e.scope === 1).reduce((sum, e) => sum + grossKg(e), 0),
      scope2: emissions.filter(e => e.scope === 2).reduce((sum, e) => sum + grossKg(e), 0),
      scope3: emissions.filter(e => e.scope === 3).reduce((sum, e) => sum + grossKg(e), 0),
    };

    const totalCO2Kg = scopeBreakdown.scope1 + scopeBreakdown.scope2 + scopeBreakdown.scope3;

    // Step 3: Reductions. None are recorded: there is no certificate or meter
    // evidence path yet, and a simulated reduction is not evidence.
    const verifiedReductions = 0;

    // Step 4: Net emissions equal gross emissions (nothing is netted).
    const netEmissions = totalCO2Kg;

    // Step 5: No credits are issued by this service. eligibleCredits and
    // carryForward stay 0 for older clients that read them.
    const creditsIssued = 0;
    const carryForward = 0;

    // Step 6: Determine greenwashing risk
    const { risk: greenwashingRisk, factors: greenwashingFactors } = calculateGreenwashingRisk(emissions, validationResults);

    // Step 7: Calculate green score
    // Estimated green score from the same verified records: the share of
    // would-be emissions already avoided by clean sources, and the share that
    // clean power would add (see _shared/greenScore.ts for the formula).
    const avoidedKg = avoidedFromDocuments(emissions.map((e) => e.documents ? { id: e.document_id, cached_result: e.documents.cached_result as { avoidedCO2Kg?: unknown } | null } : null));
    const green = estimateGreenScore(totalCO2Kg, avoidedKg, scopeBreakdown.scope2);
    const greenScore: number | null = green ? green.score : null;
    const greenPotential: number | null = green ? green.potential : null;

    // Step 8: Determine verification status
    const validCount = Array.from(validationResults.values()).filter(v => v.valid).length;
    const validRatio = validCount / emissions.length;
    
    let status: 'verified' | 'needs_review' | 'rejected';
    let verificationScore: number;
    
    // The score is the plain share of records that passed the evidence
    // checks (0 to 1). It measures evidence quality only: it is not carbon
    // performance and not credit or payment eligibility. It used to be
    // stretched into bands (e.g. 80% passing showed as 97%).
    verificationScore = validRatio;
    if (validRatio >= 0.8 && greenwashingRisk === 'low') {
      status = 'verified';
    } else if (validRatio >= 0.5 && greenwashingRisk !== 'high') {
      status = 'needs_review';
    } else {
      status = 'rejected';
    }

    // Determine quality grade
    let qualityGrade: string;
    if (verificationScore >= 0.9 && greenwashingRisk === 'low') qualityGrade = 'A';
    else if (verificationScore >= 0.75) qualityGrade = 'B';
    else if (verificationScore >= 0.5) qualityGrade = 'C';
    else qualityGrade = 'D';

    // CCTS and CBAM status is NOT assessed here. Invoice verification says
    // nothing about CCTS registration or CBAM reporting, so the stored columns
    // are null ("not assessed") and the response reports false for clients
    // that expect a boolean.
    const cctsEligible = false;
    const cbamCompliant = false;
    const complianceAssessment = 'not_assessed' as const;

    // Indicative value: verified tCO2e x the single reference rate. Zero
    // unless this verification passed. Not an issued credit.
    const verifiedKg = status === 'verified' ? totalCO2Kg : 0;
    const verifiedTCO2e = verifiedKg / 1000;
    const indicativeValueInr = indicativeValueFromKg(verifiedKg);
    const indicativeValue = {
      verifiedTCO2e,
      indicativeValueInr,
      rateInrPerT: INDICATIVE_RATE_INR_PER_T,
      label: INDICATIVE_VALUE_LABEL,
      creditsIssued: 0,
    };

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
        idempotency_key: idempotencyKey,
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
          greenPotential,
          netEmissions,
          verifiedReductions,
          greenwashingFactors,
          creditEligibility: {
            eligibleCredits: creditsIssued,
            carryForward,
            qualityGrade,
          },
          indicativeValue,
          complianceAssessment,
          methodology: {
            name: countryCode === 'IN' ? 'BIOCOG_MVR_INDIA' : `BIOCOG_MVR_${countryCode}`,
            version: METHODOLOGY_VERSION_TAG,
            country: countryCode,
            factorVersion: countryCode === 'IN' ? FACTOR_SET_VERSION : `${countryCode}_EF_2025`,
            gridFactor,
          },
        },
        // null = not assessed (see complianceAssessment above).
        ccts_eligible: null,
        cbam_compliant: null,
        verified_at: status === 'verified' ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (verificationError?.code === '23505' && userId && idempotencyKey) {
      const { data: previous, error: lookupError } = await supabase.from('carbon_verifications')
        .select('*').eq('user_id', userId).eq('idempotency_key', idempotencyKey).single();
      if (lookupError || !previous) throw lookupError || new Error('Existing verification unavailable');
      return new Response(JSON.stringify({ success: true, data: {
        verificationId: previous.id, status: previous.verification_status, score: previous.verification_score,
        greenwashingRisk: previous.greenwashing_risk, greenwashingFactors: previous.ai_analysis?.greenwashingFactors || [],
        analysis: replayAnalysis(previous.ai_analysis), cctsEligible: false,
        cbamCompliant: false, totalCO2Kg: previous.total_co2_kg,
        netEmissions: previous.ai_analysis?.netEmissions ?? previous.total_co2_kg,
        verifiedReductions: previous.ai_analysis?.verifiedReductions ?? 0,
        methodology: previous.ai_analysis?.methodology,
          indicativeValue: replayIndicativeValue(previous), complianceAssessment: 'not_assessed',
      }, reused: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (verificationError) {
      console.error('Error storing verification:', verificationError);
      return new Response(
        JSON.stringify({ error: 'Failed to store verification' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update status only. verification_notes stores immutable extraction provenance.
    if (status === 'verified') {
      const { error: statusError } = await supabase
        .from('emissions')
        .update({ verified: true })
        .in('id', emissionIds)
        .eq('user_id', userId || '');
      if (statusError && userId) throw statusError;
      // Guests: same evidence gate passed above; update only this session's rows.
      if (!userId && sessionId) {
        const { error: guestStatusError } = await supabase.from('emissions').update({ verified: true })
          .in('id', emissionIds).eq('session_id', sessionId).is('user_id', null);
        if (guestStatusError) throw guestStatusError;
      }
    }

    // ============= COMPLIANCE LEDGER POPULATION =============
    // Auto-populate compliance ledger for authenticated users.
    // One ledger row per (user, emission), across all verifications, so an
    // emission verified twice is never counted twice downstream.
    if (userId) {
      // Emission rows store the lowercase display category (see
      // src/lib/mrvPersistence.ts); older code compared against upper-case
      // product categories only, so no row was ever marked green.
      const GREEN_CATEGORIES = new Set([
        'solar', 'ev', 'forestation', 'wind', 'biogas', 'organic', 'efficiency', 'water', 'recycled',
        'solar_energy', 'ev_transport', 'wind_energy', 'organic_input', 'energy_efficiency', 'water_conservation', 'recycled_material',
      ]);

      const { data: priorLedger, error: priorLedgerError } = await supabase
        .from('compliance_ledger')
        .select('id, emission_id, document_id, amount, verification_status')
        .eq('user_id', userId)
        .in('emission_id', emissionIds);
      if (priorLedgerError) throw priorLedgerError;
      const priorByEmission = new Map((priorLedger || []).map((row) => [row.emission_id as string, row]));

      // Invoice amount is a document-level figure. Store it on one ledger row
      // per document (the first one written) and leave it null on the other
      // line rows, so summing ledger amounts never multiplies supplier spend.
      const documentIds = [...new Set(emissions.map((e) => e.document_id).filter(Boolean))] as string[];
      const docsWithAmount = new Set<string>();
      if (documentIds.length) {
        const { data: amountRows, error: amountRowsError } = await supabase
          .from('compliance_ledger')
          .select('document_id')
          .eq('user_id', userId)
          .in('document_id', documentIds)
          .not('amount', 'is', null);
        if (amountRowsError) throw amountRowsError;
        for (const row of amountRows || []) if (row.document_id) docsWithAmount.add(row.document_id as string);
      }

      let written = 0;
      for (const emission of emissions) {
        const doc = emission.documents;
        const isGreen = GREEN_CATEGORIES.has(String(emission.category || '').toLowerCase());
        const co2 = emission.co2_kg || 0;

        const prior = priorByEmission.get(emission.id);
        if (prior) {
          // Already in the ledger. Only promote an earlier unverified row when
          // this verification passed; never add a second row.
          if (status === 'verified' && prior.verification_status !== 'verified') {
            const { error: promoteError } = await supabase.from('compliance_ledger').update({
              verification_id: verification.id,
              verification_status: status,
              verification_score: verificationScore,
              greenwashing_risk: greenwashingRisk,
              validation_result: validationResults.get(emission.id)?.valid === false ? 'failed' : 'passed',
              verified_at: new Date().toISOString(),
            }).eq('id', prior.id).eq('user_id', userId);
            if (promoteError) console.error('Compliance ledger promote error for emission:', emission.id, promoteError);
          }
          continue;
        }
        const docAmount = doc?.amount ?? null;
        let ledgerAmount: number | null = null;
        if (docAmount !== null && emission.document_id && !docsWithAmount.has(emission.document_id)) {
          ledgerAmount = docAmount;
          docsWithAmount.add(emission.document_id);
        } else if (docAmount !== null && !emission.document_id) {
          ledgerAmount = docAmount;
        }
        const cachedResult = doc?.cached_result && typeof doc.cached_result === 'object'
          ? doc.cached_result as Record<string, unknown>
          : null;
        const cachedItems = Array.isArray(cachedResult?.lineItems)
          ? cachedResult.lineItems as Array<Record<string, unknown>>
          : [];
        const matchingItem = cachedItems.find((item) =>
          Number(item.scope) === Number(emission.scope) &&
          Number(item.co2Kg) === Number(emission.co2_kg) &&
          Number(item.emissionFactor) === Number(emission.emission_factor)
        );
        let storedProvenance: Record<string, unknown> | null = null;
        if (emission.verification_notes) {
          try {
            const parsed = JSON.parse(emission.verification_notes);
            if (parsed && typeof parsed === 'object') storedProvenance = parsed;
          } catch {
            storedProvenance = null;
          }
        }
        const factorSource = typeof storedProvenance?.factorSource === 'string'
          ? storedProvenance.factorSource
          : typeof matchingItem?.factorSource === 'string' ? matchingItem.factorSource : null;
        const classificationMethod = storedProvenance?.classificationMethod === 'HSN' || storedProvenance?.classificationMethod === 'KEYWORD'
          ? storedProvenance.classificationMethod
          : matchingItem?.classificationMethod === 'HSN' || matchingItem?.classificationMethod === 'KEYWORD'
            ? matchingItem.classificationMethod
            : null;
        const supplierGstin = typeof cachedResult?.supplierGstin === 'string' ? cachedResult.supplierGstin : null;
        const hsnCode = typeof storedProvenance?.hsnCode === 'string'
          ? storedProvenance.hsnCode
          : typeof matchingItem?.hsn_code === 'string' ? matchingItem.hsn_code : null;
        
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
          const { error: insertError } = await supabase
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
              amount: ledgerAmount,
              currency: doc?.currency || 'INR',
              green_category: isGreen ? emission.category : null,
              scope: emission.scope,
              emission_category: emission.category,
              activity_data: emission.activity_data || null,
              activity_unit: emission.activity_unit || null,
              emission_factor: emission.emission_factor || null,
              factor_source: factorSource,
              co2_kg: co2,
              is_green_benefit: isGreen,
              confidence_score: doc?.confidence || null,
              verification_score: verificationScore,
              verification_status: status,
              validation_result: validationResult,
              validation_failure_reason: validationFailureReason,
              greenwashing_risk: greenwashingRisk,
              methodology_version: `BIOCOG_MVR_${countryCode}_${METHODOLOGY_VERSION_TAG}`,
              classification_method: classificationMethod,
              gstin: supplierGstin,
              hsn_code: hsnCode,
              verified_at: status === 'verified' ? new Date().toISOString() : null,
              fiscal_year: fiscalYear,
              fiscal_quarter: fiscalQuarter,
            });
          // 23505: a concurrent request already wrote this (user, emission).
          if (insertError && insertError.code !== '23505') throw insertError;
          if (!insertError) written++;
        } catch (ledgerError) {
          console.error('Compliance ledger insert error for emission:', emission.id, ledgerError);
        }
      }
      console.log(`Compliance ledger: ${written} new entries, ${emissions.length - written} already present or failed`);
    }

    const result: VerificationResult & { greenwashingFactors: string[] } = {
      verificationId: verification.id,
      status,
      score: verificationScore,
      greenwashingRisk,
      greenwashingFactors,
      analysis: {
        dataQuality: dataQualityAssessment,
        methodologyCompliance,
        recommendations: aiRecommendations,
        flags: [...new Set(allFlags)],
        scopeBreakdown,
        emissionIntensity: null,
        greenScore,
        greenPotential,
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
        name: countryCode === 'IN' ? 'BIOCOG_MVR_INDIA' : `BIOCOG_MVR_${countryCode}`,
        version: METHODOLOGY_VERSION_TAG,
        country: countryCode,
        factorVersion: countryCode === 'IN' ? FACTOR_SET_VERSION : `${countryCode}_EF_2025`,
        gridFactor,
      },
      indicativeValue,
      complianceAssessment,
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
