
# Plan: 5 Deterministic Calculators + Calculators Hub

Build five standalone calculator pages — each with its own deterministic engine grounded in published government / international standards — plus one Calculators Hub page that lists all calculators on the platform (existing + new). MSME-friendly UI: minimal text, single-task screens, plain language. Saving is optional and gated to authenticated users via a new `calculator_runs` table. Zero changes to MRV pipeline, OCR, or existing engines.

## What gets built

### 1. Engines (`src/lib/calculators/`)
Pure deterministic functions. Each engine is a standalone `.ts` file with typed inputs, typed outputs, named factor sources, and unit tests-ready math (no AI, no randomness).

| File | Standard / source |
|------|-------------------|
| `pcfEngine.ts` | ISO 14067, GHG Protocol Product Standard. Cradle-to-gate: materials × EF + energy × grid factor + transport × distance×weight×modeEF + processing. Allocation: mass / energy / economic. EF hierarchy: primary → secondary (DEFRA 2024, Ecoinvent v3.10 published values) → IPCC AR6 proxy. Returns kgCO₂e per functional unit + breakdown + EF source per line. |
| `supplierRiskEngine.ts` | GHG Protocol Scope 3 Cat. 1 (Purchased Goods). Hybrid: spend-based (EEIO factors USD/kg by sector-country) with activity-based override. Risk score 0–100 = weighted (geography 30 + sector intensity 35 + disclosure gap 35). Confidence band low/med/high based on data source. |
| `energyTransitionEngine.ts` | MNRE benchmarks (India), IEA grid factors, IRR/NPV/payback formulas. Inputs: monthly kWh, current tariff, system kWp, capex/kWp, opex/yr, degradation 0.5%/yr default, PPA tariff option. Outputs: 25-yr cashflow, payback (yrs), IRR (%), NPV (₹), CO₂ avoided (tCO₂/yr & lifetime) using country grid factor from `countryConfig.ts`. |
| `logisticsEngine.ts` | GLEC Framework v3.0 / ISO 14083. Inputs: leg list (mode, weight tonnes, distance km, fuel optional, load factor optional). Mode EFs (kgCO₂e/t-km): road-rigid 0.105, road-articulated 0.062, rail 0.022, sea-container 0.008, sea-bulk 0.004, air-shorthaul 1.13, air-longhaul 0.602. Empty-return uplift toggle. Multimodal sum. |
| `carbonPricingEngine.ts` | EU ETS forward curve (€75 base, +€5/yr scenario), CBAM phase-in reused from `cbamEngine.ts`. Inputs: scope1, scope2, scope3 (tCO₂), sector free-allowance %, country, year range. Outputs: yearly liability €, sensitivity (best −20% / base / worst +30% price), regulated vs non-regulated split. Currency normalization via fixed FX table. |

All factor tables include a `source` and `version` string surfaced in the UI ("DEFRA 2024 v1.2") and in the saved record.

### 2. Pages (`src/pages/calculators/`)
Each page: MinimalNav, hero (one-line purpose), single-column form with stepper for multi-input ones (PCF line items, logistics legs), Calculate button, results panel with chart, "Save to my account" button (visible only for authenticated users), CSV export, FAQ section, JSON-LD `WebApplication` + `HowTo` + `FAQPage` schema, hreflang, internal links to Hub + 2 related calculators.

| Route | Page |
|-------|------|
| `/calculators` | **Hub** — grid of all calculator cards (5 new + CBAM + Net-Zero + Scope 2 mini + CBAM cost + any solutions calc). Search input filters by name/keyword. Categorized: Compliance, Operations, Finance. |
| `/calculators/product-carbon-footprint` | PCF |
| `/calculators/supplier-emissions-risk` | Supplier risk |
| `/calculators/energy-transition-savings` | Renewables ROI |
| `/calculators/logistics-emissions` | Freight |
| `/calculators/carbon-pricing-impact` | Carbon cost exposure |

UI rules (MSME-friendly):
- One question per row, plain English label, no jargon (tooltip icon for terms like "functional unit").
- Numeric inputs with unit suffix shown inline (e.g., "kg", "km", "kWh").
- Defaults pre-filled where safe (e.g., load factor 70%, degradation 0.5%/yr) with "Edit" link to expose advanced fields.
- Result shown as one big number first ("Your CBAM cost in 2026: €X"), breakdown collapsed below.
- No marketing copy, no testimonials, no pricing pitch on calculator pages.

### 3. Save / persistence (paid users only)
New table `calculator_runs`:
```
id uuid pk, user_id uuid not null, calculator_slug text not null,
inputs jsonb not null, results jsonb not null,
factor_sources jsonb not null, created_at timestamptz default now()
```
RLS: `user_id = auth.uid()` for all CRUD.
Save button calls `supabase.from('calculator_runs').insert(...)`. Gated by `usePremiumStatus().isPremium`; non-premium auth users see "Upgrade to save" link to `/subscription`. Anonymous users see "Sign in to save".
History list shown on `/calculators` hub for logged-in users (last 10 runs).

### 4. Navigation integration
- Add `Calculators` link to `MinimalNav` (between Climate Intelligence and Contact).
- Add `Calculators` section to `Footer`.
- Add internal links from `/cbam-calculator`, `/net-zero`, `/industries`, `/solutions/:slug` → `/calculators` hub and to relevant peer calculator.
- Voice command map (`src/lib/voiceCommands.ts`): add "open calculators", "product footprint calculator", "supplier risk", "renewable savings", "freight emissions", "carbon price calculator".

### 5. SEO / Voice / AI ranking
For each calculator page:
- Unique `<title>` ≤ 60 chars, meta description ≤ 155 chars with primary keyword.
- JSON-LD: `WebApplication` + `HowTo` (5–7 numbered steps) + `FAQPage` (4 Q&As targeting voice queries like "how do I calculate product carbon footprint for export").
- Canonical, OG, Twitter cards.
- Add all 5 routes + `/calculators` to `public/sitemap.xml` and to `supabase/functions/generate-sitemap/index.ts` with `priority 0.9`, `changefreq monthly`.
- Add all 5 routes to `scripts/generate-static-html.js` with full noscript content (H1, intro, how-it-works, FAQ) so crawlers index without JS.
- Add explicit `Allow: /calculators/` to `public/robots.txt` for all bots including GPTBot, PerplexityBot, Claude-Web.

## Files

**New**
- `src/lib/calculators/pcfEngine.ts`
- `src/lib/calculators/supplierRiskEngine.ts`
- `src/lib/calculators/energyTransitionEngine.ts`
- `src/lib/calculators/logisticsEngine.ts`
- `src/lib/calculators/carbonPricingEngine.ts`
- `src/pages/calculators/CalculatorsHub.tsx`
- `src/pages/calculators/PCFCalculator.tsx`
- `src/pages/calculators/SupplierRiskCalculator.tsx`
- `src/pages/calculators/EnergyTransitionCalculator.tsx`
- `src/pages/calculators/LogisticsCalculator.tsx`
- `src/pages/calculators/CarbonPricingCalculator.tsx`
- `src/components/calculators/CalculatorShell.tsx` (shared layout: hero, save bar, related links, FAQ schema)
- `src/components/calculators/SaveRunButton.tsx`
- DB migration: `calculator_runs` table + RLS

**Edited**
- `src/App.tsx` — 6 new lazy routes
- `src/components/MinimalNav.tsx` — add Calculators link
- `src/components/Footer.tsx` — add Calculators section
- `src/lib/voiceCommands.ts` — add calculator voice intents
- `public/sitemap.xml` — add 6 URLs
- `public/robots.txt` — add `Allow: /calculators/`
- `supabase/functions/generate-sitemap/index.ts` — add routes
- `scripts/generate-static-html.js` — add noscript content for 6 routes

## What Does NOT Change

- MRV pipeline, OCR, `extract-document` edge function, emission classification
- `cbamEngine.ts`, `netZeroEngine.ts`, `countryConfig.ts` (read-only consumers)
- Existing pages, RLS policies on existing tables, auth flow
- Database tables other than the new `calculator_runs`
- Pricing, subscription logic (only consumes `usePremiumStatus`)
- Translation JSON files (calculator labels added later in i18n pass)

## Determinism guarantees

- Every factor is a numeric constant in code with a cited source string.
- No call to LLMs, no `Math.random`, no AI gateway, no external runtime fetch.
- All calculations executed client-side, results identical for identical inputs.
- Factor source string surfaced in UI ("DEFRA 2024", "GLEC v3.0", "IEA 2023") and in saved JSON.
