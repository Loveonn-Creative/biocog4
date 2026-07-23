// Real-time UI string translation with persistent cache.
// Request: { locale: string, strings: string[] }
// Response: { translations: Record<string, string> }  // keyed by source string

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  hi: "Hindi (हिन्दी)",
  bn: "Bengali (বাংলা)",
  ta: "Tamil (தமிழ்)",
  mr: "Marathi (मराठी)",
  te: "Telugu (తెలుగు)",
  gu: "Gujarati (ગુજરાતી)",
  pa: "Punjabi (ਪੰਜਾਬੀ)",
  ml: "Malayalam (മലയാളം)",
  kn: "Kannada (ಕನ್ನಡ)",
  id: "Bahasa Indonesia",
  ur: "Urdu (اردو)",
  tl: "Tagalog / Filipino",
  vi: "Vietnamese (Tiếng Việt)",
  th: "Thai (ไทย)",
  es: "Spanish (Español)",
  zh: "Simplified Chinese (简体中文)",
  ar: "Modern Standard Arabic (العربية)",
  pt: "Brazilian Portuguese (Português)",
};

// Never translate — brand, units, identifiers, standards
const PROTECTED_TERMS = [
  "Senseible", "Biocog", "MRV", "ESG", "GRI", "TCFD", "BRSR", "CBAM", "CDP",
  "SBTi", "GHG Protocol", "ISO 14064", "ISO 14001", "PAS 2060", "IFRS S2",
  "GSTIN", "GST", "HSN", "PAN", "CIN", "LEI", "ISIN", "MSME", "SME",
  "tCO2e", "CO2", "CO2e", "kWh", "MWh", "GJ", "kg", "SHA-256", "PDF", "API",
  "EU", "UK", "US", "IEA", "UNFCCC", "Scope 1", "Scope 2", "Scope 3",
];

async function sha256(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const locale: string = body?.locale;
    const strings: string[] = Array.isArray(body?.strings) ? body.strings : [];

    if (!locale || !LANGUAGE_NAMES[locale]) {
      return new Response(JSON.stringify({ error: "invalid locale" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (locale === "en" || strings.length === 0) {
      const out: Record<string, string> = {};
      for (const s of strings) out[s] = s;
      return new Response(JSON.stringify({ translations: out }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Dedupe + cap batch size
    const unique = Array.from(new Set(strings.filter(s => typeof s === "string" && s.trim().length > 0))).slice(0, 100);
    const hashes = await Promise.all(unique.map(sha256));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Check cache
    const { data: cached } = await supabase
      .from("translation_cache")
      .select("source_hash, translated")
      .eq("locale", locale)
      .in("source_hash", hashes);

    const cacheMap = new Map<string, string>();
    for (const row of cached || []) cacheMap.set(row.source_hash, row.translated);

    const translations: Record<string, string> = {};
    const missing: { source: string; hash: string }[] = [];
    unique.forEach((src, i) => {
      const hit = cacheMap.get(hashes[i]);
      if (hit) translations[src] = hit;
      else missing.push({ source: src, hash: hashes[i] });
    });

    // 2. Translate misses via Lovable AI Gateway
    if (missing.length > 0) {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        // Fallback: return English for misses
        for (const m of missing) translations[m.source] = m.source;
      } else {
        const target = LANGUAGE_NAMES[locale];
        const numbered = missing.map((m, i) => `${i + 1}. ${m.source}`).join("\n");
        const systemPrompt =
          `You translate UI strings for Senseible, a climate-fintech app for MSMEs. ` +
          `Translate each numbered line into ${target}. ` +
          `Rules: preserve placeholders like {name} and %s exactly; keep numbers, units, product names (Senseible, Biocog), and acronyms (MRV, CBAM, GRI, TCFD, BRSR, GST, HSN, MSME, EU, CO2, PDF, AI) unchanged; keep punctuation and capitalization style; do not add commentary. ` +
          `Return ONLY a JSON object of shape {"1":"...","2":"..."} with the translated string for each number. No prose, no code fences.`;

        const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            temperature: 0,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: numbered },
            ],
          }),
        });

        if (!aiRes.ok) {
          const text = await aiRes.text();
          console.error("AI gateway error", aiRes.status, text);
          // Degrade: return source for misses so UI never blocks
          for (const m of missing) translations[m.source] = m.source;
        } else {
          const aiJson = await aiRes.json();
          const content: string = aiJson?.choices?.[0]?.message?.content ?? "{}";
          let parsed: Record<string, string> = {};
          try { parsed = JSON.parse(content); } catch { parsed = {}; }

          const rowsToInsert: {
            locale: string;
            source_hash: string;
            source: string;
            translated: string;
          }[] = [];

          missing.forEach((m, i) => {
            const key = String(i + 1);
            const translated =
              typeof parsed[key] === "string" && parsed[key].trim().length > 0
                ? parsed[key]
                : m.source;
            translations[m.source] = translated;
            if (translated !== m.source) {
              rowsToInsert.push({
                locale,
                source_hash: m.hash,
                source: m.source,
                translated,
              });
            }
          });

          if (rowsToInsert.length > 0) {
            await supabase
              .from("translation_cache")
              .upsert(rowsToInsert, { onConflict: "locale,source_hash" });
          }
        }
      }
    }

    // Ensure every requested string has an entry (fall back to source)
    for (const s of strings) if (!(s in translations)) translations[s] = s;

    return new Response(JSON.stringify({ translations }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("translate-batch error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
