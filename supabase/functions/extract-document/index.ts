import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtractedData {
  documentType: 'invoice' | 'bill' | 'certificate' | 'receipt' | 'unknown';
  vendor?: string;
  date?: string;
  invoiceNumber?: string;
  amount?: number;
  currency?: string;
  items?: Array<{
    description: string;
    quantity?: number;
    unitPrice?: number;
    total?: number;
    category?: string;
  }>;
  taxAmount?: number;
  subtotal?: number;
  emissionCategory?: 'electricity' | 'fuel' | 'transport' | 'materials' | 'waste' | 'other';
  estimatedCO2Kg?: number;
  confidence: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, mimeType } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'No image data provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing document with Gemini Vision...');

    const systemPrompt = `You are an expert document analyzer for Indian MSMEs. Extract data from invoices, bills, and receipts with precision.

Your task:
1. Identify the document type (invoice, bill, certificate, receipt)
2. Extract all relevant financial data
3. Classify items into emission categories for carbon calculation
4. Estimate CO2 emissions based on the items

Emission categories:
- electricity: Electricity bills, power consumption
- fuel: Diesel, petrol, LPG, CNG, furnace oil
- transport: Freight, logistics, delivery charges
- materials: Raw materials, purchased goods
- waste: Waste disposal, recycling fees
- other: Miscellaneous items

For CO2 estimation, use these approximate factors (kg CO2 per unit):
- Electricity: 0.82 kg CO2/kWh (India grid average)
- Diesel: 2.68 kg CO2/liter
- Petrol: 2.31 kg CO2/liter
- LPG: 1.51 kg CO2/kg
- CNG: 2.75 kg CO2/kg

Respond ONLY with a valid JSON object matching this structure:
{
  "documentType": "invoice|bill|certificate|receipt|unknown",
  "vendor": "vendor name",
  "date": "YYYY-MM-DD",
  "invoiceNumber": "invoice/bill number",
  "amount": total amount as number,
  "currency": "INR",
  "items": [
    {
      "description": "item description",
      "quantity": number,
      "unitPrice": number,
      "total": number,
      "category": "electricity|fuel|transport|materials|waste|other"
    }
  ],
  "taxAmount": tax amount as number,
  "subtotal": subtotal as number,
  "emissionCategory": "primary emission category",
  "estimatedCO2Kg": estimated CO2 in kg,
  "confidence": 0.0 to 1.0
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all data from this document. Provide accurate financial figures and estimate carbon emissions.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`
                }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI usage limit reached. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to process document' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      console.error('No content in AI response');
      return new Response(
        JSON.stringify({ error: 'Failed to extract data from document' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('AI Response received, parsing...');

    // Extract JSON from the response (handle markdown code blocks)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    let extractedData: ExtractedData;
    try {
      extractedData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('Raw content:', content);
      return new Response(
        JSON.stringify({ error: 'Failed to parse extracted data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Document processed successfully:', extractedData.documentType);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: extractedData 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing document:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
