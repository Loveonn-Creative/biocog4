import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MonetizationRequest {
  verificationId: string;
}

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

// Current market rates and schemes (updated periodically)
const CARBON_CREDIT_RATE_INR = 750; // INR per ton CO2
const GREEN_LOAN_RATE_REDUCTION = 0.5; // 0.5% interest rate reduction
const AVG_LOAN_AMOUNT = 500000; // Average MSME loan amount

const GOVT_SCHEMES = [
  {
    name: 'MSME ZED Certification Subsidy',
    maxSubsidy: 500000,
    description: 'Up to 80% subsidy for ZED certification',
    eligibility: 'MSMEs with verified carbon data'
  },
  {
    name: 'BEE Energy Audit Subsidy',
    maxSubsidy: 250000,
    description: 'Subsidy for energy efficiency improvements',
    eligibility: 'Energy-intensive MSMEs'
  },
  {
    name: 'State Green Manufacturing Incentive',
    maxSubsidy: 1000000,
    description: 'Capital subsidy for clean technology adoption',
    eligibility: 'Manufacturing units with carbon verification'
  }
];

const CARBON_BUYERS = [
  { name: 'Tata Power REC', type: 'Corporate Buyer' },
  { name: 'ReNew Power', type: 'Renewable Developer' },
  { name: 'IEX Green Market', type: 'Exchange' },
  { name: 'Climate Impact Partners', type: 'Aggregator' }
];

const GREEN_LOAN_PARTNERS = [
  { name: 'SBI Green Finance', rateReduction: '0.5%', maxLoan: '50 Lakhs' },
  { name: 'HDFC Sustainable Banking', rateReduction: '0.4%', maxLoan: '25 Lakhs' },
  { name: 'SIDBI Green Loan', rateReduction: '0.75%', maxLoan: '1 Crore' },
  { name: 'Yes Bank Climate Fund', rateReduction: '0.6%', maxLoan: '50 Lakhs' }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { verificationId }: MonetizationRequest = await req.json();

    if (!verificationId) {
      return new Response(
        JSON.stringify({ error: 'Verification ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch verification data
    const { data: verification, error: verificationError } = await supabase
      .from('carbon_verifications')
      .select('*')
      .eq('id', verificationId)
      .single();

    if (verificationError || !verification) {
      console.error('Error fetching verification:', verificationError);
      return new Response(
        JSON.stringify({ error: 'Verification not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (verification.verification_status !== 'verified') {
      return new Response(
        JSON.stringify({ error: 'Only verified emissions can be monetized' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const co2Tons = verification.total_co2_kg / 1000;
    const pathways: MonetizationPathway[] = [];

    // 1. Carbon Credit Pathway
    const carbonCreditValue = Math.round(co2Tons * CARBON_CREDIT_RATE_INR);
    const selectedBuyer = CARBON_BUYERS[Math.floor(Math.random() * CARBON_BUYERS.length)];
    
    if (verification.ccts_eligible && carbonCreditValue > 100) {
      pathways.push({
        type: 'carbon_credit',
        name: 'Carbon Credit Sale',
        estimatedValue: carbonCreditValue,
        currency: 'INR',
        partner: selectedBuyer.name,
        details: {
          description: `Sell ${co2Tons.toFixed(2)} tons of verified carbon credits through ${selectedBuyer.type}`,
          eligibility: 'CCTS Eligible ✓',
          timeline: '2-4 weeks for listing, 1-2 months for sale',
          requirements: [
            'Verified emission data',
            'CCTS registration',
            'Business documentation',
            verification.cbam_compliant ? 'CBAM compliant ✓' : 'CBAM certification pending'
          ]
        }
      });
    }

    // 2. Green Loan Pathway
    const interestSavings = Math.round(AVG_LOAN_AMOUNT * GREEN_LOAN_RATE_REDUCTION / 100);
    const selectedBank = GREEN_LOAN_PARTNERS[Math.floor(Math.random() * GREEN_LOAN_PARTNERS.length)];
    
    pathways.push({
      type: 'green_loan',
      name: 'Green Loan Benefits',
      estimatedValue: interestSavings,
      currency: 'INR',
      partner: selectedBank.name,
      details: {
        description: `Get ${selectedBank.rateReduction} lower interest rate on business loans up to ${selectedBank.maxLoan}`,
        eligibility: 'Based on verified carbon footprint',
        timeline: 'Standard loan processing time',
        requirements: [
          'Carbon verification certificate',
          'Standard loan documentation',
          'Business financials'
        ]
      }
    });

    // 3. Government Incentive Pathways
    for (const scheme of GOVT_SCHEMES) {
      const estimatedBenefit = Math.min(
        scheme.maxSubsidy,
        Math.round(carbonCreditValue * 2) // Subsidy often higher than credit value
      );
      
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
            requirements: [
              'Carbon verification certificate',
              'MSME registration',
              'Bank account details',
              'Application form submission'
            ]
          }
        });
      }
    }

    // Store monetization pathways in database
    for (const pathway of pathways) {
      await supabase
        .from('monetization_pathways')
        .insert({
          verification_id: verificationId,
          pathway_type: pathway.type,
          estimated_value: pathway.estimatedValue,
          currency: pathway.currency,
          partner_name: pathway.partner,
          partner_details: pathway.details,
          status: 'available'
        });
    }

    // Calculate total potential value
    const totalValue = pathways.reduce((sum, p) => sum + p.estimatedValue, 0);

    console.log(`Monetization calculated: ${pathways.length} pathways, total value: ₹${totalValue}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: {
          pathways,
          totalPotentialValue: totalValue,
          currency: 'INR',
          verificationScore: verification.verification_score,
          co2Tons
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Monetization calculation error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
