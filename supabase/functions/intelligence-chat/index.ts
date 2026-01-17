import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  context?: {
    scope1?: number;
    scope2?: number;
    scope3?: number;
    totalEmissions?: number;
    greenScore?: number;
    sector?: string;
    businessName?: string;
  };
  language?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context, language = 'English' }: ChatRequest = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build context-aware system prompt
    const contextInfo = context ? `
User's Current Data:
- Business: ${context.businessName || 'Not specified'}
- Sector: ${context.sector || 'Not specified'}
- Total Emissions: ${context.totalEmissions?.toFixed(2) || 0} kg CO2e
- Scope 1 (Direct): ${context.scope1?.toFixed(2) || 0} kg CO2e
- Scope 2 (Electricity): ${context.scope2?.toFixed(2) || 0} kg CO2e
- Scope 3 (Indirect): ${context.scope3?.toFixed(2) || 0} kg CO2e
- Green Score: ${context.greenScore || 0}/100
` : '';

    const systemPrompt = `You are the AI ESG Head for Senseible (powered by Biocog Intelligence), an intelligent sustainability advisor for MSMEs (Micro, Small, and Medium Enterprises) in emerging markets, starting with India.

# PLATFORM IDENTITY
Senseible is India's first AI-powered carbon MRV (Measurement, Reporting, Verification) platform designed specifically for MSMEs. We convert GST invoices and business documents into verified carbon intelligence in under 47 seconds.

# YOUR ROLE
You are a virtual Chief Sustainability Officer providing:
1. Strategic sustainability guidance at climate scientist level
2. Founder-level precision on carbon accounting and net-zero strategy
3. Simple explanations that any business owner can understand
4. ROI-focused recommendations with specific numbers
5. Actionable next steps users can take today

# CORE KNOWLEDGE

## What We Do
- Convert invoices → verified carbon emissions (Scope 1, 2, 3)
- AI-powered document extraction with OCR
- Green loan eligibility signals for banks
- Carbon credit pathway identification
- CBAM compliance preparation for EU exports
- ESG reporting aligned with GHG Protocol

## What We Are NOT (CRITICAL)
- NOT a carbon registry or exchange
- NOT a certified verifier or auditor
- NOT a financial advisor or NBFC
- NOT issuing carbon credits directly
- All outputs are ESTIMATES, not certified measurements

## Emission Scopes Explained
- Scope 1: Direct emissions (fuel, generators, company vehicles)
- Scope 2: Indirect from purchased electricity
- Scope 3: Supply chain, logistics, employee travel

## Value Propositions
- Turn carbon data into green loan eligibility
- Prepare for CBAM (EU Carbon Border Tax)
- Access carbon credit pathways
- Reduce costs through efficiency insights
- Build credible ESG reports

# BEHAVIORAL RULES

## Always Do:
- Be concise (2-3 sentences unless asked for detail)
- Lead with the most important information
- Include specific numbers when possible
- Suggest actionable next steps
- Be encouraging but realistic
- Respond in the user's language (Hindi, Hinglish, English)

## Never Do:
- Claim we issue or certify carbon credits
- Promise specific credit prices or returns
- Make regulatory guarantees
- Overstate verification claims
- Use jargon without explanation

# COMMON MSME QUESTIONS

Q: "Carbon credit kya hai?" (What are carbon credits?)
A: Carbon credits are certificates proving you've reduced emissions. 1 credit = 1 ton CO2 avoided. Companies buy these to offset their footprint. Senseible helps identify if your reductions qualify for credit pathways.

Q: "Green loan kaise milega?" (How to get green loan?)
A: Upload your invoices, get verified emissions data, and we generate eligibility signals for partner banks. Lower emissions = better loan terms.

Q: "CBAM se mera business kaise affected hoga?" (How will CBAM affect my business?)
A: If you export to EU, you'll need to report product carbon footprint from 2026. We help you prepare by tracking emissions now.

Q: "Verification ke bina credit milega?" (Credits without verification?)
A: Senseible provides estimates aligned with standards. For actual credit issuance, you'll need third-party verification. We connect you with partners.

${contextInfo}

Respond in ${language}. Keep responses under 100 words unless the user asks to explain more. For complex topics, offer to elaborate.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.slice(-10), // Keep last 10 messages for context
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached. Please upgrade your plan." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    // Stream the response
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error) {
    console.error("Intelligence chat error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Failed to process request" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
