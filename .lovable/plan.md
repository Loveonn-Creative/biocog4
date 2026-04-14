

# Plan: Problem-First SEO Discovery Engine + Programmatic Pages + Multilingual Layer

## Overview

Build a problem-first discovery engine that intercepts high-intent search queries ("CBAM compliance cost India," "Scope 3 calculator MSME," "carbon audit small business Philippines") and routes them to tool-embedded landing pages — layered over the existing product without disrupting core infrastructure.

---

## Architecture: Pillar-Cluster SEO Model

```text
PILLAR PAGES (5 existing pages, enhanced):
  /cbam-calculator     → CBAM Compliance Pillar
  /verify              → Carbon Audit & MRV Pillar
  /carbon-credits      → Carbon Monetization Pillar
  /climate-finance     → Green Finance Pillar
  /net-zero            → Decarbonization Pillar

CLUSTER PAGES (programmatic, data-driven):
  /solutions/:use-case → 75 country×sector×regulation combos
  /industries/:id      → Already exists (enhance with tool embeds)
  /climate-intelligence/:slug → Already exists (add 25 new problem-first articles)
```

---

## Part 1: Programmatic SEO Engine — `/solutions/:use-case`

### What

A single new route component `Solutions.tsx` that renders 75+ unique landing pages from a config-driven data file. Each page solves one urgent use-case with embedded tools.

### Page Structure (Every Page)
1. **Hook** — Pain statement specific to country+sector+regulation
2. **Instant Estimator** — Embedded calculator (CBAM cost / Scope 3 estimate / export risk score)
3. **Compliance Steps** — Clear checklist (3-5 steps)
4. **Cost/Time Breakdown** — Real numbers per country (IEA data, CBAM phase-in schedule)
5. **CTA** — "Start Free Audit" / "Download Report" / "Calculate Now"

### Example Pages
- `/solutions/cbam-steel-india-2026` → "CBAM Cost for Steel MSMEs in India (2026)"
- `/solutions/scope-3-textile-bangladesh` → "Scope 3 Calculator for Textile Exporters in Bangladesh"
- `/solutions/carbon-audit-manufacturing-philippines` → "Carbon Audit for Manufacturing SMEs in Philippines"
- `/solutions/export-carbon-reporting-indonesia` → "EU Export Carbon Reporting for Indonesian MSMEs"
- `/solutions/green-loan-eligibility-pakistan` → "Green Loan Eligibility Score for Pakistani SMEs"

### Data Structure — `src/data/solutionsData.ts`

75 entries generated from combinations of:
- **10 countries** (IN, PH, ID, BD, PK, SG, VN, TH, MY, LK) — from existing `countryConfig.ts`
- **6 sectors** (steel, textile, manufacturing, chemicals, food-processing, logistics)
- **4 regulations** (CBAM, Scope 3 reporting, carbon audit, green finance)
- Filtered to ~75 most search-relevant combos (not all 240)

Each entry contains: slug, title, painStatement, steps[], costBreakdown, embeddedTool (references existing calculator components), internalLinks[], schemaMarkup (FAQ + HowTo), keywords[]

### Component — `src/pages/Solutions.tsx`

- Single component, reads `:useCase` param, looks up data
- Embeds existing components inline: mini CBAM calculator (from `cbamEngine.ts`), scope estimator (from verify-carbon logic), monetization preview
- Full SEO: `<SEOHead>` with FAQ + HowTo schema, canonical, hreflang
- Internal linking loop: links to pillar page + related solutions + industry page
- If invalid slug → redirect to `/climate-intelligence`

### Route Addition in `App.tsx`
```
<Route path="/solutions/:useCase" element={<Solutions />} />
```

---

## Part 2: Enhance Existing Industry Pages with Tool Embeds

### What Changes in `Industries.tsx`

Currently shows static scope 1/2/3 breakdowns. Enhance each industry page with:
- **Mini Scope Estimator**: "Enter monthly electricity bill → see estimated CO₂" (reuses existing emission factor math)
- **CBAM Readiness Score**: For CBAM-exposed sectors (steel, chemicals, aluminium), show a quick readiness checklist
- **Export Risk Badge**: "If you export to EU: HIGH exposure" based on sector + CBAM data
- **Internal links** to related `/solutions/` pages

No new page — additive changes to existing `Industries.tsx`.

---

## Part 3: Multilingual Layer (JSON-Based, Cached)

### Architecture

```text
src/lib/i18n/
  translations/
    en.json    (English — base, always complete)
    hi.json    (Hindi)
    bn.json    (Bengali)
    ta.json    (Tamil)
    mr.json    (Marathi)
    id.json    (Bahasa Indonesia)
    ur.json    (Urdu)
    tl.json    (Tagalog)
    vi.json    (Vietnamese)
    th.json    (Thai)
    es.json    (Spanish)
  useTranslation.ts  (hook: returns t() function)
  LanguageProvider.tsx (context: stores selected lang)
```

### How It Works
- `useTranslation()` hook returns `t('key')` that looks up from loaded JSON
- Browser language auto-detected on first visit (existing `detectBrowserLanguage()` in `languages.ts`)
- Manual toggle in Settings (already has language section) + small globe icon in MinimalNav/Navigation
- JSONs loaded lazily via `import()` — zero bundle impact for non-selected languages
- **Reports/certificates stay English** — translation only applies to UI labels, navigation, and landing page content
- Falls back to English for any missing key

### Translation Scope
- Navigation labels, CTA buttons, section headings, tool labels
- Solution page pain statements and step descriptions
- Industry page descriptions
- NOT: CMS article body text, legal pages, API responses, verification certificates

### Settings Integration
- Country selection in Settings auto-suggests matching language
- Selecting Indonesia → suggests Bahasa; selecting Bangladesh → suggests Bengali
- User can override manually

---

## Part 4: 25 Problem-First SEO Articles

Add to `src/data/cmsContent.ts` — each article targets a specific high-intent search query with country-specific data.

**Articles (sample 10 of 25):**
1. "CBAM Compliance Cost for Indian Steel Exporters: 2026-2034 Breakdown" — target: "CBAM compliance cost India"
2. "How Philippine Manufacturing SMEs Can Start Carbon Reporting in 2026" — target: "carbon reporting Philippines SME"
3. "Scope 3 Calculator for Bangladesh Textile Exporters: Step-by-Step" — target: "Scope 3 calculator Bangladesh textile"
4. "EU Carbon Border Tax Impact on Indonesian Chemical Exports" — target: "EU carbon tax Indonesia"
5. "Green Loan Eligibility for Pakistani Small Businesses: What Banks Need" — target: "green loan Pakistan small business"
6. "Carbon Audit Checklist for Singapore Manufacturing Companies" — target: "carbon audit Singapore manufacturing"
7. "How Vietnamese Exporters Can Prepare for EU CBAM in 90 Days" — target: "CBAM Vietnam exporter"
8. "Thailand Food Processing Sector: Carbon Footprint Reduction Guide" — target: "carbon footprint food processing Thailand"
9. "MSME Carbon Credits in Sri Lanka: From Invoice to Revenue" — target: "carbon credits Sri Lanka MSME"
10. "Malaysia Palm Oil Sector: Scope 1, 2, 3 Emission Breakdown" — target: "palm oil emissions Malaysia"

Remaining 15 target: "how to file EU carbon tax report," "export carbon reporting EU MSME," "carbon audit for small business India," "Scope 3 emissions supply chain," "BRSR reporting MSME," etc.

Each article: 300-400 words, embedded CTA to relevant `/solutions/` page, FAQ schema, internal links.

---

## Part 5: Schema Markup + Internal Linking

### Enhanced Schema on Solution Pages
- **FAQPage**: 3-4 FAQs per solution page (e.g., "What is CBAM cost for steel in India?")
- **HowTo**: Step-by-step compliance guide
- **Product**: For calculator/tool pages (applicationCategory: EnvironmentalManagementSoftware)
- **BreadcrumbList**: Home → Solutions → [Country] → [Sector]

### Internal Linking Loops
Every solution page links to:
- Its pillar page (e.g., `/cbam-calculator`)
- Related industry page (e.g., `/industries/steel`)
- 2-3 related solution pages (same country or same sector)
- Relevant CMS article
- CTA to the main tool (`/` for upload, `/verify` for verification)

---

## Part 6: Static HTML Generation

Update `scripts/generate-static-html.js` to include:
- All 75 `/solutions/:slug` routes with unique titles, descriptions, keywords
- 25 new CMS article routes
- Proper schema markup injected into `<noscript>` blocks

---

## Files to Create/Edit

| File | Action | Purpose |
|------|--------|---------|
| `src/data/solutionsData.ts` | **Create** | 75 programmatic page configs (country×sector×regulation) |
| `src/pages/Solutions.tsx` | **Create** | Single component rendering all solution pages from data |
| `src/lib/i18n/translations/en.json` | **Create** | Base English translation keys (~200 keys) |
| `src/lib/i18n/translations/hi.json` | **Create** | Hindi translations |
| `src/lib/i18n/translations/bn.json` | **Create** | Bengali translations |
| `src/lib/i18n/translations/id.json` | **Create** | Bahasa Indonesia translations |
| `src/lib/i18n/translations/ur.json` | **Create** | Urdu translations |
| `src/lib/i18n/translations/ta.json` | **Create** | Tamil translations |
| `src/lib/i18n/translations/mr.json` | **Create** | Marathi translations |
| `src/lib/i18n/translations/tl.json` | **Create** | Tagalog translations |
| `src/lib/i18n/translations/vi.json` | **Create** | Vietnamese translations |
| `src/lib/i18n/translations/th.json` | **Create** | Thai translations |
| `src/lib/i18n/translations/es.json` | **Create** | Spanish translations |
| `src/lib/i18n/useTranslation.ts` | **Create** | Translation hook with lazy loading + fallback |
| `src/lib/i18n/LanguageProvider.tsx` | **Create** | Context provider for selected language |
| `src/App.tsx` | **Edit** | Add `/solutions/:useCase` route + wrap with LanguageProvider |
| `src/pages/Industries.tsx` | **Edit** | Add mini Scope estimator, CBAM readiness, export risk badge |
| `src/data/cmsContent.ts` | **Edit** | Add 25 country-specific problem-first articles |
| `src/components/MinimalNav.tsx` | **Edit** | Add small language toggle globe icon |
| `src/components/Navigation.tsx` | **Edit** | Add language toggle |
| `src/pages/Settings.tsx` | **Edit** | Auto-suggest language from country selection |
| `scripts/generate-static-html.js` | **Edit** | Add 75 solution routes + 25 article routes |
| `supabase/functions/generate-sitemap/index.ts` | **Edit** | Add solution pages to sitemap |

## What Does NOT Change

- MRV pipeline, emission factors, BIOCOG methodology
- Existing page routing (no pages removed or restructured)
- Database schema, RLS policies, authentication
- CBAMCalculator, NetZero, Verify, Monetize core logic
- Any existing component or hook behavior
- Reports/certificates language (always English)

