import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { avoidedFromDocuments, estimateGreenScore } from '../_shared/greenScore.ts';
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { creditValuation, CREDIT_VALUE_WITHHELD } from "../_shared/carbonValue.ts";
import { activityDate, fiscalPeriod } from "../_shared/invoiceDate.ts";
import { INDIA_GRID_FACTOR_KG_PER_KWH, METHODOLOGY_VERSION_TAG, FACTOR_SET_VERSION } from "../_shared/emissionFactors.ts";
import { decideRecordAccess, idempotencyCanonical, orgCan } from "../_shared/workspaceAccess.ts";
import { calculateGreenwashingRisk, evidenceGaps, previewVerification, validateEmission, type EmissionRecord } from "../_shared/verifyGate.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// The only grid factor set records are calculated with is India's (see
// ../_shared/emissionFactors.ts). Electricity supplied elsewhere is not
// calculated, so the methodology label always names the set actually used,
// whatever country the request names. Other countries' Scope 2 lives in the
// Scope 2 engine (../_shared/electricity.ts) with approved, sourced factors.
const METHODOLOGY = {
  name: 'BIOCOG_MVR_INDIA',
  version: METHODOLOGY_VERSION_TAG,
  country: 'IN',
  factorVersion: FACTOR_SET_VERSION,
  gridFactor: INDIA_GRID_FACTOR_KG_PER_KWH,
} as const;

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
  indicativeValue: CreditValueField;
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

// Field names kept for older clients. A credit value needs verified
// reductions and a dated, sourced price; neither exists, so the rupee value
// is null and the reason says why (see _shared/carbonValue.ts).
interface CreditValueField {
  verifiedTCO2e: number;
  indicativeValueInr: number | null;
  rateInrPerT: number | null;
  label: string;
  withheldReason: string | null;
  creditsIssued: number;
}
function creditValueField(verifiedKg: number, verifiedReductionsKg: number): CreditValueField {
  const v = creditValuation(verifiedReductionsKg);
  return {
    verifiedTCO2e: verifiedKg / 1000,
    indicativeValueInr: v.available ? v.valueInr : null,
    rateInrPerT: v.available ? v.price.inrPerT : null,
    label: v.available ? `Value of verified reductions at ₹${v.price.inrPerT}/t (${v.price.source}, ${v.price.asOf})` : CREDIT_VALUE_WITHHELD,
    withheldReason: v.available ? null : v.reason,
    creditsIssued: 0,
  };
}

function replayIndicativeValue(previous: { verification_status: string | null; total_co2_kg: number | null; ai_analysis?: { verifiedReductions?: number } | null }) {
  const verifiedKg = previous.verification_status === 'verified' ? Number(previous.total_co2_kg) || 0 : 0;
  return creditValueField(verifiedKg, Number(previous.ai_analysis?.verifiedReductions) || 0);
}

// Validation functions


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // includeIoT is still accepted from older clients but no longer changes any number.
    // A "country" field from older clients is ignored: it never changed a number.
    const body = await req.json();
    const { emissionIds, sessionId: bodySessionId, inspectOnly = false, repairOnly = false } = body;

    // ============= GUEST PREVIEW =============
    // A guest's results live only in their browser, so there are no stored
    // records to verify. The same evidence gate and scoring run on the records
    // the browser sends; nothing is written, no AI is called, and the answer is
    // a preview: it never marks anything verified.
    if (body?.preview) {
      const authHeader = req.headers.get('Authorization');
      const tok = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
      if (tok && tok !== Deno.env.get('SUPABASE_ANON_KEY') && tok !== req.headers.get('apikey')) {
        const role = (() => { try { return JSON.parse(atob(tok.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role; } catch { return null; } })();
        if (role === 'authenticated') {
          return new Response(JSON.stringify({ error: 'Signed in: verify your stored records instead.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      }
      const records = Array.isArray(body.preview?.records) ? body.preview.records : null;
      if (!records || records.length === 0 || records.length > 100) {
        return new Response(JSON.stringify({ error: 'Send between 1 and 100 records to preview' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : NaN);
      const str = (v: unknown, max = 500) => (typeof v === 'string' ? v.slice(0, max) : null);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- untrusted JSON, every field is checked below
      const rows: Array<EmissionRecord & { document_id: string | null }> = records.map((r: Record<string, any>, i: number) => ({
        id: str(r?.id, 80) || `preview-${i}`,
        document_id: str(r?.document_id, 80),
        category: str(r?.category, 60) || '',
        scope: num(r?.scope),
        co2_kg: num(r?.co2_kg),
        activity_data: num(r?.activity_data),
        activity_unit: str(r?.activity_unit, 30),
        emission_factor: num(r?.emission_factor),
        data_quality: str(r?.data_quality, 10),
        verification_notes: str(r?.verification_notes, 4000),
        documents: r?.documents && typeof r.documents === 'object' ? {
          vendor: str(r.documents.vendor, 200), invoice_number: str(r.documents.invoice_number, 100),
          amount: Number.isFinite(r.documents.amount) ? r.documents.amount : null, confidence: Number.isFinite(r.documents.confidence) ? r.documents.confidence : null,
          document_hash: str(r.documents.document_hash, 64), invoice_date: str(r.documents.invoice_date, 20),
        } : undefined,
      }));
      const result = previewVerification(rows);
      return new Response(JSON.stringify({
        success: true, preview: true,
        data: {
          ...result,
          methodology: { name: METHODOLOGY.name, version: METHODOLOGY.version },
          note: 'Preview only. Nothing was recorded or verified. Sign in to record and verify these results.',
        },
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

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

    // Ownership passes for the JWT user's own records, on the existing guest
    // path, or for organisation records when the caller's team role may verify.
    // A client-supplied guest session never counts for a signed-in identity.
    const access = decideRecordAccess(emissions, { userId, sessionId });
    const orgId = access.kind === 'organization' ? access.organizationId : null;
    if (access.kind === 'denied' || (orgId && !(await orgCan(supabase, userId!, orgId, 'records.verify')))) {
      console.error('Access denied for verification:', access.kind === 'denied' ? access.reason : 'team role');
      return new Response(
        JSON.stringify({ error: orgId
          ? 'Your team role cannot verify records in this organisation. Ask an admin for data manager or carbon auditor access.'
          : 'Access denied: you do not own these emissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verification is an evidence transition, not a way to manufacture
    // missing source data. Signed-in users and guests go through the same
    // gate; preflight and commit use it too.
    {
      const missingInputs: Array<{ emissionId: string; fields: string[] }> = [];
      for (const emission of emissions) {
        const fields = evidenceGaps(emission, repairOnly);
        if (fields.length) missingInputs.push({ emissionId: emission.id, fields });
      }
      if (inspectOnly || missingInputs.length) {
        return new Response(JSON.stringify({ ready: missingInputs.length === 0, missingInputs }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    if (repairOnly && !userId) {
      return new Response(JSON.stringify({ error: 'Sign in to restore audit entries.' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Authenticated requests are keyed by their exact emission set. The unique
    // index arbitrates concurrent calls; historical results remain untouched.
    let idempotencyKey: string | null = null;
    // A stored verification whose ledger evidence is incomplete (see below).
    let repairOf: { id: string; verification_status: string; verification_score: number | null; greenwashing_risk: string | null; verified_at: string | null; ai_analysis: { verifiedEmissionIds?: string[] } | null } | null = null;
    if (userId) {
      // Organisation sets are keyed by organisation, so two members verifying the
      // same records reuse one result instead of counting it twice.
      const canonical = idempotencyCanonical(access, userId, emissionIds);
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical));
      idempotencyKey = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
      const previousQuery = supabase.from('carbon_verifications').select('*').eq('idempotency_key', idempotencyKey);
      const { data: previous, error: previousError } = await (orgId
        ? previousQuery.eq('organization_id', orgId)
        : previousQuery.eq('user_id', userId)).maybeSingle();
      if (previousError) throw previousError;
      // repairOnly (History's "Restore audit entries"): complete a stored
      // result, never create a new one.
      if (repairOnly && !previous) {
        return new Response(JSON.stringify({ success: false, repaired: false, reason: 'no_stored_verification' }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      // Evidence check: every record of the set has a ledger row, and every
      // record the stored result verified has a verified one. If not, an
      // earlier run was interrupted; the commit below completes the stored
      // result instead of returning it as it is.
      let evidenceComplete = true;
      if (previous) {
        const storedVerified = previous.verification_status === 'verified'
          ? new Set<string>(Array.isArray(previous.ai_analysis?.verifiedEmissionIds) ? previous.ai_analysis.verifiedEmissionIds : emissionIds)
          : new Set<string>();
        const heldQuery = supabase.from('compliance_ledger').select('emission_id, verification_status').in('emission_id', emissionIds);
        const { data: held, error: heldError } = await (orgId ? heldQuery.eq('organization_id', orgId) : heldQuery.eq('user_id', userId));
        if (heldError) throw heldError;
        const heldStatus = new Map<string, string | null>((held || []).map((r) => [r.emission_id as string, r.verification_status as string | null]));
        evidenceComplete = emissionIds.every((id) => heldStatus.has(id) && (!storedVerified.has(id) || heldStatus.get(id) === 'verified'));
        if (!evidenceComplete) {
          repairOf = previous;
          console.log('Stored verification has missing ledger evidence; completing it');
        }
      }
      if (previous && evidenceComplete) {
        // Re-flag only the records that passed when this set was first verified.
        const replayIds: string[] = Array.isArray(previous.ai_analysis?.verifiedEmissionIds) ? previous.ai_analysis.verifiedEmissionIds : emissionIds;
        const { error: statusError } = previous.verification_status === 'verified' && replayIds.length
          ? await (orgId
            ? supabase.from('emissions').update({ verified: true }).in('id', replayIds).eq('organization_id', orgId)
            : supabase.from('emissions').update({ verified: true }).in('id', replayIds).eq('user_id', userId))
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

    // Credit value: withheld unless verified reductions and a dated price
    // exist. Only records that passed every check count as verified.
    const verifiedKg = status === 'verified'
      ? emissions.filter((e) => validationResults.get(e.id)?.valid !== false).reduce((sum, e) => sum + grossKg(e), 0)
      : 0;
    const verifiedTCO2e = verifiedKg / 1000;
    const indicativeValue = creditValueField(verifiedKg, verifiedReductions);

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

    // ============= COMMIT =============
    // Everything below is computed first and committed once. With the
    // commit_verification database function (pending migration
    // 20261015100000), the verification row, the emission flags and the
    // ledger evidence are written in one transaction: all or nothing.
    // Without it, the earlier step-by-step writes run as before.
    const verificationId = crypto.randomUUID();
    const nowIso = new Date().toISOString();
    // Only records that passed every evidence check become verified, even
    // when the batch as a whole passes. The rest stay pending for review.
    const passedIds = emissions.filter((e) => validationResults.get(e.id)?.valid !== false).map((e) => e.id as string);
    const verifiedIds = status === 'verified' ? passedIds : [];

    const verificationRow = {
      id: verificationId,
      created_at: nowIso,
      emission_ids: emissionIds,
      idempotency_key: idempotencyKey,
      session_id: sessionId || null,
      user_id: userId || null,
      organization_id: orgId,
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
        verifiedEmissionIds: verifiedIds,
        methodology: { ...METHODOLOGY },
      },
      // null = not assessed (see complianceAssessment above).
      ccts_eligible: null,
      cbam_compliant: null,
      verified_at: status === 'verified' ? nowIso : null,
    };

    // ---- Ledger evidence (signed-in only): one row per (owner, emission). ----
    type LedgerRow = Record<string, unknown> & { id: string; emission_id: string; verification_status: string };
    const ledgerRows: LedgerRow[] = [];
    const priorByEmission = new Map<string, { id: string; verification_status: string | null }>();
    if (userId) {
      // Emission rows store the lowercase display category (see
      // src/lib/mrvPersistence.ts).
      const GREEN_CATEGORIES = new Set([
        'solar', 'ev', 'forestation', 'wind', 'biogas', 'organic', 'efficiency', 'water', 'recycled',
        'solar_energy', 'ev_transport', 'wind_energy', 'organic_input', 'energy_efficiency', 'water_conservation', 'recycled_material',
      ]);

      // Organisation records: one ledger row per emission, owned by its uploader
      // and tagged with the organisation, whichever member verifies it.
      const priorQuery = supabase
        .from('compliance_ledger')
        .select('id, emission_id, verification_status')
        .in('emission_id', emissionIds);
      const { data: priorLedger, error: priorLedgerError } = await (orgId
        ? priorQuery.eq('organization_id', orgId)
        : priorQuery.eq('user_id', userId));
      if (priorLedgerError) throw priorLedgerError;
      for (const row of priorLedger || []) priorByEmission.set(row.emission_id as string, { id: row.id as string, verification_status: row.verification_status as string | null });

      // Invoice amount is a document-level figure. Store it on one ledger row
      // per document and leave it null on the other line rows, so summing
      // ledger amounts never multiplies supplier spend.
      const documentIds = [...new Set(emissions.map((e) => e.document_id).filter(Boolean))] as string[];
      const docsWithAmount = new Set<string>();
      if (documentIds.length) {
        const amountQuery = supabase
          .from('compliance_ledger')
          .select('document_id')
          .in('document_id', documentIds)
          .not('amount', 'is', null);
        const { data: amountRows, error: amountRowsError } = await (orgId
          ? amountQuery.eq('organization_id', orgId)
          : amountQuery.eq('user_id', userId));
        if (amountRowsError) throw amountRowsError;
        for (const row of amountRows || []) if (row.document_id) docsWithAmount.add(row.document_id as string);
      }

      for (const emission of emissions) {
        const doc = emission.documents;
        const isGreen = GREEN_CATEGORIES.has(String(emission.category || '').toLowerCase());
        const co2 = emission.co2_kg || 0;
        const rowPassed = validationResults.get(emission.id)?.valid !== false;
        // A record that failed its checks is never "verified" in the ledger.
        const rowStatus = status === 'verified' && !rowPassed ? 'needs_review' : status;

        const docAmount = priorByEmission.has(emission.id) ? null : (doc?.amount ?? null);
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
        // Period from the invoice date; the upload date only when there is none.
        const { fiscalYear, fiscalQuarter } = fiscalPeriod(activityDate(doc?.invoice_date, emission.created_at || new Date().toISOString()));

        ledgerRows.push({
          id: crypto.randomUUID(),
          created_at: nowIso,
          user_id: orgId ? emission.user_id : userId,
          // compliance_ledger.organization_id exists only once the workspace migration is applied.
          ...(orgId ? { organization_id: orgId } : {}),
          document_id: emission.document_id || null,
          emission_id: emission.id,
          verification_id: verificationId,
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
          verification_status: rowStatus,
          validation_result: validationResult,
          validation_failure_reason: validationFailureReason,
          greenwashing_risk: greenwashingRisk,
          methodology_version: `BIOCOG_MVR_IN_${METHODOLOGY_VERSION_TAG}`,
          classification_method: classificationMethod,
          gstin: supplierGstin,
          hsn_code: hsnCode,
          verified_at: rowStatus === 'verified' ? nowIso : null,
          fiscal_year: fiscalYear,
          fiscal_quarter: fiscalQuarter,
        });
      }
    }

    // Step-by-step ledger write (used until the atomic migration is applied):
    // insert missing rows, promote an earlier unverified row, change nothing else.
    const writeLedgerStepByStep = async (rows: LedgerRow[], verId: string, score: number | null, risk: string | null, at: string) => {
      let written = 0;
      for (const row of rows) {
        const prior = priorByEmission.get(row.emission_id);
        if (prior) {
          // Already in the ledger: only promote an earlier unverified row.
          if (row.verification_status === 'verified' && prior.verification_status !== 'verified') {
            const { error: promoteError } = await supabase.from('compliance_ledger').update({
              verification_id: verId,
              verification_status: 'verified',
              verification_score: score,
              greenwashing_risk: risk,
              validation_result: row.validation_result,
              verified_at: at,
            }).eq('id', prior.id);
            if (promoteError) console.error('Compliance ledger promote error for emission:', row.emission_id, promoteError);
          }
          continue;
        }
        const { error: insertError } = await supabase.from('compliance_ledger').insert(row);
        // 23505: a concurrent request already wrote this (owner, emission).
        if (insertError && insertError.code !== '23505') console.error('Compliance ledger insert error for emission:', row.emission_id, insertError);
        if (!insertError) written++;
      }
      console.log(`Compliance ledger: ${written} new entries`);
    };

    const replayExisting = async () => {
      const q = supabase.from('carbon_verifications').select('*').eq('idempotency_key', idempotencyKey);
      const { data: previous, error: lookupError } = await (orgId ? q.eq('organization_id', orgId) : q.eq('user_id', userId)).single();
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
    };

    const { data: committed, error: commitError } = await supabase.rpc('commit_verification', {
      p: {
        verification: verificationRow,
        verified_emission_ids: verifiedIds,
        ledger: ledgerRows,
        scope: { user_id: userId, session_id: userId ? null : sessionId, organization_id: orgId },
      },
    });
    const rpcMissing = !!commitError && (commitError.code === 'PGRST202' || commitError.code === '42883');

    if (!commitError) {
      // Same emission set already verified: the stored result is returned, and
      // the transaction has filled in any missing flags or ledger rows.
      if ((committed as { reused?: boolean } | null)?.reused && userId && idempotencyKey) return await replayExisting();
    } else if (!rpcMissing) {
      // The transaction rolled back: nothing was written.
      console.error('commit_verification failed:', commitError.code);
      const changed = commitError.code === '40001' || !!commitError.message?.includes('records_changed');
      return new Response(
        JSON.stringify({ error: changed
          ? 'Some of these records were changed or removed. Refresh and try again.'
          : 'Verification could not be saved. Nothing was changed. Try again.' }),
        { status: changed ? 409 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // ---- Step-by-step path, until the migration is applied. ----
      if (repairOf) {
        // Complete the stored result: statuses follow it, not this run.
        const stored = repairOf;
        const storedVerified = new Set<string>(stored.verification_status === 'verified'
          ? (Array.isArray(stored.ai_analysis?.verifiedEmissionIds) ? stored.ai_analysis!.verifiedEmissionIds! : emissionIds)
          : []);
        const flagIds = [...storedVerified];
        if (flagIds.length) {
          const flag = supabase.from('emissions').update({ verified: true }).in('id', flagIds);
          const { error: flagError } = await (orgId ? flag.eq('organization_id', orgId) : flag.eq('user_id', userId as string));
          if (flagError) throw flagError;
        }
        const repairRows = ledgerRows.map((row) => {
          const ok = storedVerified.has(row.emission_id);
          return {
            ...row,
            verification_id: stored.id,
            verification_score: stored.verification_score,
            greenwashing_risk: stored.greenwashing_risk,
            verification_status: ok ? 'verified' : stored.verification_status === 'verified' ? 'needs_review' : stored.verification_status,
            verified_at: ok ? (stored.verified_at ?? nowIso) : null,
          };
        });
        await writeLedgerStepByStep(repairRows, stored.id, stored.verification_score, stored.greenwashing_risk, stored.verified_at ?? nowIso);
        return await replayExisting();
      }
      const { error: verificationError } = await supabase.from('carbon_verifications').insert(verificationRow);
      if (verificationError?.code === '23505' && userId && idempotencyKey) return await replayExisting();
      if (verificationError) {
        console.error('Error storing verification:', verificationError);
        return new Response(
          JSON.stringify({ error: 'Failed to store verification' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (verifiedIds.length) {
        const statusUpdate = supabase.from('emissions').update({ verified: true }).in('id', verifiedIds);
        const { error: statusError } = await (orgId
          ? statusUpdate.eq('organization_id', orgId)
          : userId ? statusUpdate.eq('user_id', userId) : statusUpdate.eq('session_id', sessionId as string).is('user_id', null));
        if (statusError) throw statusError;
      }
      await writeLedgerStepByStep(ledgerRows, verificationId, verificationScore, greenwashingRisk, nowIso);
    }

    const result: VerificationResult & { greenwashingFactors: string[] } = {
      verificationId,
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
      methodology: { ...METHODOLOGY },
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
