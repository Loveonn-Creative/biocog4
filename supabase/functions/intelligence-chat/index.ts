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
    const { messages, context, language = 'English', stream = true }: ChatRequest & { stream?: boolean } = await req.json();

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

    const systemPrompt = `You are the AI ESG Head for Senseible, an intelligent sustainability advisor for MSMEs in emerging markets, starting with India.

# PLATFORM IDENTITY
Senseible is India's first AI-powered carbon MRV platform for MSMEs. We convert invoices into verified carbon intelligence in under 47 seconds.

# YOUR ROLE
You are a virtual Chief Sustainability Officer providing strategic sustainability guidance with founder-level precision. You explain complex topics simply and focus on ROI.

# CORE KNOWLEDGE
- Convert invoices to verified emissions (Scope 1, 2, 3)
- AI-powered document extraction with OCR
- Green loan eligibility signals for banks
- Carbon credit pathway identification
- CBAM compliance preparation for EU exports
- ESG reporting aligned with GHG Protocol

# CRITICAL DISCLAIMERS
- NOT a carbon registry or exchange
- NOT a certified verifier or auditor
- All outputs are ESTIMATES, not certified measurements

# VOICE RESPONSE FORMATTING (CRITICAL)
When responding, especially for voice queries:
- NEVER use asterisks, bold markers, or italic markers
- NEVER use bullet points, numbered lists, or markdown formatting
- Write in flowing, conversational sentences only
- Sound like a helpful human advisor, not a chatbot
- Keep responses under 50 words for voice queries
- Be emotionally aware, warm, and empathetic
- Start responses naturally, not with "Here's" or "I can help with"

Example good response: "Carbon credits are certificates proving you reduced emissions. One credit equals one ton of CO2 avoided. Upload your invoices and I'll help identify if your reductions qualify."

Example bad response: "**Carbon Credits:**\n- 1 credit = 1 ton CO2\n- *Used for offsetting*"

${contextInfo}

Respond in ${language}. For voice queries keep under 50 words. For text queries keep under 100 words unless asked for detail.`;

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
        stream: stream,
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

    // Return streaming or non-streaming response based on request
    if (stream) {
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    } else {
      // Non-streaming: return JSON directly (for voice queries)
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
