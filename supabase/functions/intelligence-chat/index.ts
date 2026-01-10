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

    const systemPrompt = `You are the AI ESG Head for Senseible, an intelligent sustainability advisor for MSMEs (Micro, Small, and Medium Enterprises) in emerging markets.

Your role is to:
1. Provide strategic sustainability guidance at the level of a climate scientist
2. Make complex ESG concepts simple enough for any business owner to understand
3. Be extremely concise - use 2-3 sentences unless asked for details
4. Base recommendations on the user's actual data when available
5. Focus on ROI, savings, and compliance benefits
6. Give actionable advice with specific numbers when possible

Communication Style:
- Use simple language (8th-grade reading level)
- Lead with the most important information
- Include specific numbers for costs and savings when relevant
- Suggest next steps the user can take today
- Be encouraging but realistic about impact

${contextInfo}

Respond in ${language}. Keep responses under 100 words unless the user asks to explain more.

Key Topics You Can Help With:
- Understanding Scope 1, 2, 3 emissions
- Net-zero strategy and roadmap
- Carbon credit opportunities
- Green financing and loans
- Government incentives and subsidies
- CBAM compliance
- ESG reporting frameworks
- Cost reduction through sustainability
- Renewable energy options
- Supply chain sustainability`;

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
