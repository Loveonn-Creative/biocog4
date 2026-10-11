import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  indicativeValueFromKg,
  sumVerifiedKgOncePerEmission,
  INDICATIVE_RATE_INR_PER_T,
  INDICATIVE_RATE_SOURCE,
  INDICATIVE_VALUE_LABEL,
} from "../_shared/carbonValue.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MonetizationPathway {
  type: 'carbon_credit' | 'green_loan' | 'govt_incentive';
  name: string;
  /** Only the carbon pathway carries a figure: verified tCO2e x the reference rate. */
  estimatedValue: number | null;
  valueLabel: string | null;
  currency: string;
  partner: string | null;
  details: {
    description: string;
    eligibility: string;
    requirements: string[];
  };
}

// One value everywhere: verified tCO2e x INDICATIVE_RATE_INR_PER_T, labelled
// as indicative and not an issued credit. Loan savings and scheme subsidies
// are not estimated: the earlier fixed loan figure and subsidy multipliers
// were not based on the user's data or any lender or scheme terms.

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { verificationId, sessionId: bodySessionId } = await req.json();

    if (!verificationId) {
      return new Response(JSON.stringify({ error: 'Verification ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // ============= AUTH =============
    let userId: string | null = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const tok = authHeader.replace('Bearer ', '');
      if (tok !== anonKey) {
        const userClient = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: claimsRes } = await userClient.auth.getClaims(tok);
        if (claimsRes?.claims?.sub) userId = claimsRes.claims.sub as string;
      }
    }
    const sessionId = userId ? null : (bodySessionId || null);
    if (!userId && !sessionId) {
      return new Response(JSON.stringify({ error: 'Authentication or session required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: verification, error: verificationError } = await supabase
      .from('carbon_verifications')
      .select('*')
      .eq('id', verificationId)
      .single();

    if (verificationError || !verification) {
      return new Response(JSON.stringify({ error: 'Verification not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ============= OWNERSHIP =============
    const ownerMatch = userId
      ? verification.user_id === userId
      : verification.session_id === sessionId;
    if (!ownerMatch) {
      return new Response(JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (verification.verification_status !== 'verified') {
      return new Response(JSON.stringify({ error: 'Only verified emissions can be monetized' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Recompute from the verification's own emission rows that are owned by
    // the requester and currently verified, each counted once.
    const emissionIds: string[] = Array.isArray(verification.emission_ids) ? verification.emission_ids : [];
    let emissionsQuery = supabase.from('emissions').select('id, co2_kg, verified, user_id, session_id').in('id', emissionIds);
    emissionsQuery = userId ? emissionsQuery.eq('user_id', userId) : emissionsQuery.eq('session_id', sessionId).is('user_id', null);
    const { data: emissionRows, error: emissionsError } = emissionIds.length
      ? await emissionsQuery
      : { data: [], error: null };
    if (emissionsError) throw emissionsError;

    const verifiedKg = sumVerifiedKgOncePerEmission(
      emissionRows || [],
      (e: { id: string }) => e.id,
      (e: { co2_kg: number | string | null }) => Number(e.co2_kg),
      (e: { verified: boolean | null }) => e.verified === true,
    );
    const verifiedTCO2e = verifiedKg / 1000;
    const indicativeValueInr = indicativeValueFromKg(verifiedKg);

    const pathways: MonetizationPathway[] = [
      {
        type: 'carbon_credit',
        name: 'Indicative carbon value',
        estimatedValue: indicativeValueInr,
        valueLabel: INDICATIVE_VALUE_LABEL,
        currency: 'INR',
        partner: null,
        details: {
          description: `${verifiedTCO2e.toFixed(3)} verified tCO2e x ₹${INDICATIVE_RATE_INR_PER_T}/t. No credit has been issued and no buyer has agreed a price.`,
          eligibility: 'Credit issuance requires registration under a recognised programme; not assessed here',
          requirements: ['Verified emission data', 'Programme registration and third-party validation'],
        },
      },
      {
        type: 'green_loan',
        name: 'Green loan',
        estimatedValue: null,
        valueLabel: null,
        currency: 'INR',
        partner: null,
        details: {
          description: 'Lender terms depend on the lender. No saving is estimated here.',
          eligibility: 'Not assessed',
          requirements: ['Carbon verification record', 'Standard loan documentation'],
        },
      },
      {
        type: 'govt_incentive',
        name: 'Government schemes',
        estimatedValue: null,
        valueLabel: null,
        currency: 'INR',
        partner: null,
        details: {
          description: 'Scheme benefits depend on scheme rules. No benefit is estimated here.',
          eligibility: 'Not assessed',
          requirements: ['MSME registration', 'Carbon verification record'],
        },
      },
    ];

    // Record each pathway once per verification; repeat calls do not add rows.
    const { data: existingPathways } = await supabase
      .from('monetization_pathways')
      .select('pathway_type')
      .eq('verification_id', verificationId);
    const existingTypes = new Set((existingPathways || []).map((p: { pathway_type: string }) => p.pathway_type));
    for (const pathway of pathways) {
      if (existingTypes.has(pathway.type)) continue;
      await supabase.from('monetization_pathways').insert({
        verification_id: verificationId,
        pathway_type: pathway.type,
        estimated_value: pathway.estimatedValue,
        currency: pathway.currency,
        partner_name: pathway.partner,
        partner_details: pathway.details,
        status: 'available',
      });
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        pathways,
        verifiedTCO2e,
        indicativeValueInr,
        indicativeValueLabel: INDICATIVE_VALUE_LABEL,
        currency: 'INR',
        verificationScore: verification.verification_score,
        methodology: {
          rateInrPerT: INDICATIVE_RATE_INR_PER_T,
          rateSource: INDICATIVE_RATE_SOURCE,
          version: 'BIOCOG_MONETIZATION_v2.0',
        },
      },
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Monetization error:', error instanceof Error ? error.message : 'unknown');
    return new Response(JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
