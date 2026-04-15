import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = "https://senseible.earth";

// Static pages with their priorities and change frequencies
const STATIC_PAGES = [
  { path: "/", priority: "1.0", changefreq: "daily" },
  { path: "/dashboard", priority: "0.9", changefreq: "daily" },
  { path: "/verify", priority: "0.9", changefreq: "weekly" },
  { path: "/monetize", priority: "0.9", changefreq: "weekly" },
  { path: "/reports", priority: "0.8", changefreq: "weekly" },
  { path: "/mrv-dashboard", priority: "0.9", changefreq: "daily" },
  { path: "/intelligence", priority: "0.9", changefreq: "daily" },
  { path: "/marketplace", priority: "0.9", changefreq: "daily" },
  { path: "/pricing", priority: "0.8", changefreq: "weekly" },
  { path: "/partners", priority: "0.8", changefreq: "weekly" },
  { path: "/partners/carbon-buyers", priority: "0.7", changefreq: "monthly" },
  { path: "/partners/banks", priority: "0.7", changefreq: "monthly" },
  { path: "/partners/erp", priority: "0.7", changefreq: "monthly" },
  { path: "/partners/climate-finance", priority: "0.7", changefreq: "monthly" },
  { path: "/mission", priority: "0.6", changefreq: "monthly" },
  { path: "/about", priority: "0.6", changefreq: "monthly" },
  { path: "/principles", priority: "0.5", changefreq: "monthly" },
  { path: "/contact", priority: "0.6", changefreq: "monthly" },
  { path: "/carbon-credits", priority: "0.7", changefreq: "weekly" },
  { path: "/climate-finance", priority: "0.7", changefreq: "weekly" },
  { path: "/climate-intelligence", priority: "0.8", changefreq: "daily" },
  { path: "/industries", priority: "0.7", changefreq: "weekly" },
  { path: "/legal", priority: "0.3", changefreq: "yearly" },
  { path: "/legal/terms", priority: "0.3", changefreq: "yearly" },
  { path: "/legal/privacy", priority: "0.3", changefreq: "yearly" },
  { path: "/legal/dpa", priority: "0.3", changefreq: "yearly" },
  { path: "/legal/sla", priority: "0.3", changefreq: "yearly" },
  { path: "/legal/ai-policy", priority: "0.3", changefreq: "yearly" },
  { path: "/legal/refund", priority: "0.3", changefreq: "yearly" },
];

const INDUSTRIES = [
  "textiles", "manufacturing", "agriculture", "logistics", "food-processing",
  "construction", "automotive", "chemicals", "pharmaceuticals", "steel",
  "cement", "paper", "plastics", "electronics", "renewable-energy"
];

// Programmatic solution pages (country × sector × regulation)
const SOLUTION_SLUGS = [
  "cbam-steel-india","cbam-chemicals-india","cbam-manufacturing-india","scope3-textile-india","scope3-food-processing-india",
  "carbon-audit-manufacturing-india","carbon-audit-logistics-india","green-finance-manufacturing-india",
  "cbam-steel-bangladesh","cbam-chemicals-bangladesh","scope3-textile-bangladesh","scope3-manufacturing-bangladesh",
  "carbon-audit-textile-bangladesh","green-finance-textile-bangladesh","green-finance-manufacturing-bangladesh",
  "cbam-steel-indonesia","cbam-chemicals-indonesia","scope3-manufacturing-indonesia","scope3-food-processing-indonesia",
  "carbon-audit-manufacturing-indonesia","green-finance-manufacturing-indonesia",
  "cbam-steel-vietnam","cbam-chemicals-vietnam","scope3-textile-vietnam","scope3-manufacturing-vietnam",
  "carbon-audit-manufacturing-vietnam","green-finance-manufacturing-vietnam",
  "scope3-manufacturing-philippines","scope3-food-processing-philippines","carbon-audit-manufacturing-philippines",
  "green-finance-manufacturing-philippines","carbon-audit-logistics-philippines",
  "scope3-textile-pakistan","scope3-manufacturing-pakistan","carbon-audit-manufacturing-pakistan",
  "green-finance-textile-pakistan","green-finance-manufacturing-pakistan",
  "carbon-audit-manufacturing-singapore","scope3-manufacturing-singapore","green-finance-manufacturing-singapore",
  "scope3-food-processing-thailand","scope3-manufacturing-thailand","carbon-audit-manufacturing-thailand",
  "green-finance-manufacturing-thailand",
  "scope3-manufacturing-malaysia","carbon-audit-manufacturing-malaysia","green-finance-manufacturing-malaysia",
  "scope3-textile-sri-lanka","carbon-audit-manufacturing-sri-lanka","green-finance-textile-sri-lanka",
  "cbam-steel-pakistan","cbam-steel-philippines","cbam-steel-thailand","cbam-steel-malaysia",
  "scope3-logistics-india","scope3-chemicals-india","carbon-audit-chemicals-india",
  "scope3-textile-vietnam","carbon-audit-textile-vietnam",
  "cbam-steel-sri-lanka","scope3-food-processing-bangladesh",
  "carbon-audit-food-processing-india","green-finance-logistics-india",
  "scope3-chemicals-indonesia","carbon-audit-chemicals-indonesia",
  "scope3-chemicals-vietnam","scope3-logistics-philippines",
  "carbon-audit-food-processing-thailand","green-finance-food-processing-thailand",
  "scope3-chemicals-malaysia","carbon-audit-textile-pakistan",
  "green-finance-manufacturing-sri-lanka","carbon-audit-logistics-singapore",
  "scope3-logistics-thailand","green-finance-chemicals-india",
  "carbon-audit-steel-india","scope3-steel-india",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date().toISOString().split("T")[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

    // Add static pages
    for (const page of STATIC_PAGES) {
      xml += `  <url>
    <loc>${SITE_URL}${page.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
    }

    // Add industry pages
    for (const industry of INDUSTRIES) {
      xml += `  <url>
    <loc>${SITE_URL}/industries/${industry}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
`;
    }

    // Fetch CMS articles from database if table exists
    try {
      const { data: articles } = await supabase
        .from("cms_content")
        .select("slug, updated_at")
        .eq("status", "published")
        .order("updated_at", { ascending: false });

      if (articles && articles.length > 0) {
        for (const article of articles) {
          const lastmod = article.updated_at 
            ? new Date(article.updated_at).toISOString().split("T")[0]
            : today;
          
          xml += `  <url>
    <loc>${SITE_URL}/climate-intelligence/${article.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
`;
        }
      }
    } catch {
      // CMS table might not exist, continue without it
      console.log("CMS content table not found, skipping dynamic articles");
    }

    xml += `</urlset>`;

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error("Error generating sitemap:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate sitemap" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
