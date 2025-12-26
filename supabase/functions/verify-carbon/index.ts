import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerificationRequest {
  emissionIds: string[];
  sessionId?: string;
  userId?: string;
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
  };
  cctsEligible: boolean;
  cbamCompliant: boolean;
  totalCO2Kg: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { emissionIds, sessionId, userId }: VerificationRequest = await req.json();

    if (!emissionIds || emissionIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No emissions to verify' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch emissions data
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

    const totalCO2Kg = emissions.reduce((sum, e) => sum + (e.co2_kg || 0), 0);

    // Use AI for verification analysis
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const verificationPrompt = `You are a carbon verification expert following CCTS (India Carbon Credit Trading Scheme) and CBAM (EU Carbon Border Adjustment Mechanism) standards.

Analyze the following emission records for verification:

${JSON.stringify(emissions, null, 2)}

Total CO2: ${totalCO2Kg} kg

Evaluate:
1. Data quality (are emission factors appropriate?)
2. Methodology compliance (do calculations follow recognized standards?)
3. Greenwashing risk (are claims overstated or unsubstantiated?)
4. CCTS eligibility (meets India's carbon credit standards)
5. CBAM compliance (ready for EU export requirements)

Respond with ONLY valid JSON:
{
  "verificationScore": 0.0-1.0,
  "status": "verified|needs_review|rejected",
  "greenwashingRisk": "low|medium|high",
  "dataQuality": "brief assessment",
  "methodologyCompliance": "brief assessment",
  "recommendations": ["list of recommendations"],
  "flags": ["any red flags"],
  "cctsEligible": true|false,
  "cbamCompliant": true|false
}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: verificationPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error('AI verification failed');
    }

    const aiData = await aiResponse.json();
    let analysis;
    
    try {
      let content = aiData.choices?.[0]?.message?.content || '{}';
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) content = jsonMatch[1].trim();
      analysis = JSON.parse(content);
    } catch {
      console.error('Failed to parse AI response');
      analysis = {
        verificationScore: 0.7,
        status: 'needs_review',
        greenwashingRisk: 'medium',
        dataQuality: 'Unable to fully assess',
        methodologyCompliance: 'Requires manual review',
        recommendations: ['Manual verification recommended'],
        flags: [],
        cctsEligible: false,
        cbamCompliant: false
      };
    }

    // Store verification result
    const { data: verification, error: verificationError } = await supabase
      .from('carbon_verifications')
      .insert({
        emission_ids: emissionIds,
        session_id: sessionId || null,
        user_id: userId || null,
        total_co2_kg: totalCO2Kg,
        verification_status: analysis.status || 'needs_review',
        verification_score: analysis.verificationScore || 0.7,
        greenwashing_risk: analysis.greenwashingRisk || 'medium',
        ai_analysis: {
          dataQuality: analysis.dataQuality,
          methodologyCompliance: analysis.methodologyCompliance,
          recommendations: analysis.recommendations,
          flags: analysis.flags
        },
        ccts_eligible: analysis.cctsEligible || false,
        cbam_compliant: analysis.cbamCompliant || false,
        verified_at: analysis.status === 'verified' ? new Date().toISOString() : null
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
    if (analysis.status === 'verified') {
      await supabase
        .from('emissions')
        .update({ verified: true })
        .in('id', emissionIds);
    }

    const result: VerificationResult = {
      verificationId: verification.id,
      status: analysis.status,
      score: analysis.verificationScore,
      greenwashingRisk: analysis.greenwashingRisk,
      analysis: {
        dataQuality: analysis.dataQuality,
        methodologyCompliance: analysis.methodologyCompliance,
        recommendations: analysis.recommendations || [],
        flags: analysis.flags || []
      },
      cctsEligible: analysis.cctsEligible,
      cbamCompliant: analysis.cbamCompliant,
      totalCO2Kg
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
