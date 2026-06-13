import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MonetizationPathway {
  type: 'carbon_credit' | 'green_loan' | 'govt_incentive';
  name: string;
  estimatedValue: number;
  currency: string;
  partner: string;
  details: {
    description: string;
    eligibility: string;
    timeline: string;
    requirements: string[];
  };
}

const CARBON_CREDIT_RATE_INR = 750;
const GREEN_LOAN_RATE_REDUCTION = 0.5;
const AVG_LOAN_AMOUNT = 500000;

const GOVT_SCHEMES = [
  { name: 'MSME ZED Certification Subsidy', maxSubsidy: 500000, subsidyRate: 0.8, description: 'Up to 80% subsidy for ZED certification', eligibility: 'MSMEs with verified carbon data' },
  { name: 'BEE Energy Audit Subsidy', maxSubsidy: 250000, subsidyRate: 0.5, description: 'Subsidy for energy efficiency improvements', eligibility: 'Energy-intensive MSMEs' },
  { name: 'State Green Manufacturing Incentive', maxSubsidy: 1000000, subsidyRate: 1.5, description: 'Capital subsidy for clean technology adoption', eligibility: 'Manufacturing units with carbon verification' },
];

const CARBON_BUYER = { name: 'IEX Green Market', type: 'Exchange' };
const GREEN_LOAN_PARTNER = { name: 'SIDBI Green Loan', rateReduction: '0.75%', maxLoan: '1 Crore' };

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

    const co2Tons = verification.total_co2_kg / 1000;
    const pathways: MonetizationPathway[] = [];

    const carbonCreditValue = Math.round(co2Tons * CARBON_CREDIT_RATE_INR);

    if (verification.ccts_eligible && carbonCreditValue > 100) {
      pathways.push({
        type: 'carbon_credit',
        name: 'Carbon Credit Sale',
        estimatedValue: carbonCreditValue,
        currency: 'INR',
        partner: CARBON_BUYER.name,
        details: {
          description: `Sell ${co2Tons.toFixed(2)} tons of verified carbon credits through ${CARBON_BUYER.type}`,
          eligibility: 'CCTS Eligible ✓',
          timeline: '2-4 weeks for listing, 1-2 months for sale',
          requirements: [
            'Verified emission data', 'CCTS registration', 'Business documentation',
            verification.cbam_compliant ? 'CBAM compliant ✓' : 'CBAM certification pending',
          ],
        },
      });
    }

    const interestSavings = Math.round(AVG_LOAN_AMOUNT * GREEN_LOAN_RATE_REDUCTION / 100);
    pathways.push({
      type: 'green_loan',
      name: 'Green Loan Benefits',
      estimatedValue: interestSavings,
      currency: 'INR',
      partner: GREEN_LOAN_PARTNER.name,
      details: {
        description: `Get ${GREEN_LOAN_PARTNER.rateReduction} lower interest rate on business loans up to ${GREEN_LOAN_PARTNER.maxLoan}`,
        eligibility: 'Based on verified carbon footprint',
        timeline: 'Standard loan processing time',
        requirements: ['Carbon verification certificate', 'Standard loan documentation', 'Business financials'],
      },
    });

    for (const scheme of GOVT_SCHEMES) {
      const estimatedBenefit = Math.min(scheme.maxSubsidy, Math.round(carbonCreditValue * scheme.subsidyRate));
      if (estimatedBenefit > 10000) {
        pathways.push({
          type: 'govt_incentive',
          name: scheme.name,
          estimatedValue: estimatedBenefit,
          currency: 'INR',
          partner: 'Government of India',
          details: {
            description: scheme.description,
            eligibility: scheme.eligibility,
            timeline: '1-3 months processing',
            requirements: ['Carbon verification certificate', 'MSME registration', 'Bank account details', 'Application form submission'],
          },
        });
      }
    }

    for (const pathway of pathways) {
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

    const totalValue = pathways.reduce((sum, p) => sum + p.estimatedValue, 0);

    return new Response(JSON.stringify({
      success: true,
      data: {
        pathways, totalPotentialValue: totalValue, currency: 'INR',
        verificationScore: verification.verification_score, co2Tons,
        methodology: {
          carbonCreditRate: CARBON_CREDIT_RATE_INR,
          greenLoanRateReduction: GREEN_LOAN_RATE_REDUCTION,
          version: 'BIOCOG_MONETIZATION_v1.0',
        },
      },
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Monetization error:', error instanceof Error ? error.message : 'unknown');
    return new Response(JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
