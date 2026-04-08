

# Plan: Country Intelligence Layer + Trust Layer Settings + Profile-Driven Personalization

## Overview

Three integrated workstreams: (A) Move 8 of 10 trust layer innovations behind opt-in toggles in Settings, keeping only Trust Score and Confidence Band always visible. (B) Build a config-driven Country Intelligence Layer that auto-loads emission factors, tax IDs, export rules, and sector benchmarks per country. (C) Create a Dynamic User Profile Engine that personalizes dashboards, triggers event-based alerts, and adapts pricing/compliance based on profile + country — all via feature flags, no core rebuild.

---

## Part A: Trust Layer Settings (Opt-In/Out)

### What Changes

Keep **Trust Score Gauge** (innovation 1) and **Confidence Band** (innovation 5) always visible — these are critical trust signals that every user needs.

Move these 8 to opt-in toggles in Settings (paid users only):
- Proof Graph, Auto-Validation, Peer Benchmark, Monetization Preview, Audit Trail Export, Dispute Simulation, Data Connectors, Greenwashing Explainer

### Implementation

1. **New hook `src/hooks/useTrustLayerSettings.ts`** — Reads/writes trust layer preferences from `localStorage` (guest) or a new JSONB column `trust_layer_prefs` on `profiles` table. Returns `{ isEnabled(key): boolean, toggleFeature(key), prefs }`.

2. **Add Settings card** in `src/pages/Settings.tsx` — "Trust Layer Controls" card with 8 switches, gated behind `isPremium`. Free users see a locked preview with upgrade CTA.

3. **Wrap components conditionally**:
   - `ResultState.tsx`: Wrap `AutoValidation` and `MonetizationPreview` with `isEnabled('auto_validation')` / `isEnabled('monetization_preview')`
   - `Verify.tsx`: Wrap `ProofGraph`, `PeerBenchmark`, `DisputeSimulation`, `DataConnectors`, `GreenwashingExplainer` with respective checks
   - `Monetize.tsx` / `History.tsx`: Wrap audit trail export button

4. **DB migration**: Add `trust_layer_prefs jsonb DEFAULT '{}'` to `profiles` table.

### Files
| File | Action |
|------|--------|
| `src/hooks/useTrustLayerSettings.ts` | **Create** |
| `src/pages/Settings.tsx` | **Edit** — Add Trust Layer Controls card |
| `src/components/ResultState.tsx` | **Edit** — Conditional rendering |
| `src/pages/Verify.tsx` | **Edit** — Conditional rendering |
| `src/pages/Monetize.tsx` | **Edit** — Conditional rendering |
| DB migration | Add `trust_layer_prefs` column |

---

## Part B: Country Intelligence Layer (Config-Driven)

### Architecture

A single config file `src/lib/countryConfig.ts` that maps country codes to:
- **Emission factors** (grid electricity, fuel types)
- **Tax ID format** (GSTIN for India, TIN for Philippines, NPWP for Indonesia, etc.)
- **Tax ID label** (replaces "GSTIN" in UI with country-appropriate label)
- **Export rules** (CBAM applicability, bilateral agreements)
- **Sector benchmarks** (manufacturing intensity per country)
- **Currency** and **locale**
- **Government frameworks** (DTI for PH, BAPPENAS for ID, etc.)
- **Supported languages** per country

### Countries (Phase 1)
India, Philippines, Indonesia, Bangladesh, Pakistan, Singapore, Vietnam, Thailand, Malaysia, Sri Lanka

### How It Integrates (No Core Rebuild)

1. **Settings.tsx** — Replace the 4-option location dropdown with all supported countries. When country changes, UI auto-adapts: tax ID label changes (GSTIN → TIN → NPWP), relevant frameworks update, currency switches.

2. **verify-carbon edge function** — Accept `country` param. Use country-specific grid emission factor instead of hardcoded `INDIA_GRID_AVG: 0.708`. Falls back to India factors if country not recognized. No change to BIOCOG methodology — just localized factors.

3. **ResultState.tsx** — Format currency per country config (₹ / ₱ / Rp / ৳ / Rs).

4. **Dashboard** — Show country-relevant compliance badges and framework tags.

5. **Reports/Exports** — Government mapping: one-click export formats aligned with local regulatory bodies (GCP for India, DTI for Philippines, etc.).

### Config Structure
```text
COUNTRY_CONFIG = {
  IN: { name: 'India', currency: 'INR', taxIdLabel: 'GSTIN', taxIdPattern: /^\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z\d][A-Z]$/, gridFactor: 0.708, frameworks: ['GCP', 'BRSR', 'CCTS'], govBody: 'MoEFCC', languages: ['en', 'hi', 'bn', 'mr', 'te', 'ta'] },
  PH: { name: 'Philippines', currency: 'PHP', taxIdLabel: 'TIN', taxIdPattern: /^\d{3}-\d{3}-\d{3}-\d{3}$/, gridFactor: 0.505, frameworks: ['DTI-EO', 'SEC-ESG'], govBody: 'DTI', languages: ['en', 'tl'] },
  ID: { name: 'Indonesia', currency: 'IDR', taxIdLabel: 'NPWP', gridFactor: 0.761, frameworks: ['OJK-ESG', 'PROPER'], govBody: 'OJK', languages: ['en', 'id'] },
  BD: { name: 'Bangladesh', currency: 'BDT', taxIdLabel: 'TIN', gridFactor: 0.623, frameworks: ['DoE-ECA'], govBody: 'DoE', languages: ['en', 'bn'] },
  PK: { name: 'Pakistan', currency: 'PKR', taxIdLabel: 'NTN', gridFactor: 0.495, frameworks: ['SECP-ESG'], govBody: 'Pak-EPA', languages: ['en', 'ur'] },
  SG: { name: 'Singapore', currency: 'SGD', taxIdLabel: 'UEN', gridFactor: 0.408, frameworks: ['SGX-ESG', 'Carbon Tax Act'], govBody: 'NEA', languages: ['en'] },
  ...
}
```

Grid emission factors sourced from IEA 2023 published data — no hallucination.

### Files
| File | Action |
|------|--------|
| `src/lib/countryConfig.ts` | **Create** — Full country config with emission factors, tax IDs, frameworks |
| `src/pages/Settings.tsx` | **Edit** — Country dropdown with all supported countries, dynamic tax ID label |
| `supabase/functions/verify-carbon/index.ts` | **Edit** — Accept country param, use country-specific grid factor |
| `src/components/ResultState.tsx` | **Edit** — Currency formatting per country |
| `src/lib/intelligenceEngine.ts` | **Edit** — Country-aware benchmarks |

---

## Part C: Dynamic User Profile Engine

### Profile-Driven Dashboard Personalization

Based on Settings inputs (country + sector + export markets + company size), the Dashboard auto-adapts:

- **EU exporter** (exportsToEU = true) → Shows CBAM risk card, compliance gap %, regulation countdown
- **Local SME** (no exports) → Shows cost savings, green finance eligibility, local compliance status
- **Buyer-linked** (supplies to global companies) → Shows contract readiness score, compliance alignment

### Implementation

1. **New hook `src/hooks/useProfileIntelligence.ts`** — Reads profile + country config → returns personalized dashboard widgets, alerts, and framework priorities. Pure client-side, deterministic logic.

2. **Event-Based Triggers** — Stored as a config map in the hook:
   - Country = India + exportsToEU = true → auto-generate "You're X% non-compliant for EU shipment" alert
   - seekingFinance = true → surface "Better loan rates for compliant companies" card
   - Sector = textile + country = BD → surface RMG-specific compliance gaps
   - These are computed from existing emission/verification data, not AI-generated

3. **Dashboard.tsx** — Render personalized alert cards from `useProfileIntelligence` above the existing layout. No restructuring.

4. **Adaptive Pricing Signal** — On Pricing.tsx, show localized pricing context: "Pricing optimized for [country] market" with currency-appropriate display. Actual price adjustment is business logic (not automated in code — just UI formatting per currency).

### Financial Rails Preview (Coming Soon)

Add a "Green Finance Eligibility" card on Dashboard for users with `seekingFinance = true`. Shows:
- "Your compliance score qualifies for X% better loan rates"
- Partner bank logos (placeholder)
- "Connect with lender" CTA (links to `/partner-marketplace`)

This uses existing `monetization_pathways` data — no new API integration needed now.

### Multi-Language UX Enhancement

The existing `src/lib/languages.ts` already supports Bahasa, Bengali, Urdu. Enhance by:
- Adding localized financial terms map in `countryConfig.ts` (e.g., "Carbon Credit" → "Kredit Karbon" in Bahasa)
- Language selector in Settings auto-defaults based on country selection
- Falls back to English for any untranslated term

### Files
| File | Action |
|------|--------|
| `src/hooks/useProfileIntelligence.ts` | **Create** — Profile-driven dashboard personalization + event triggers |
| `src/pages/Dashboard.tsx` | **Edit** — Render personalized alert cards |
| `src/pages/Pricing.tsx` | **Edit** — Currency-localized display |
| `src/pages/Settings.tsx` | **Edit** — Language auto-default from country |

---

## Part D: SEO Blog Articles (10 Articles on Product Development)

Add 10 articles to `src/data/cmsContent.ts` focused on how each innovation removes uncertainty, with real-world impact numbers:

1. "How a 0-100 Trust Score Replaces Pass/Fail Confusion for 63M MSMEs"
2. "Proof Graphs: Why Black-Box AI Loses ₹14,000 Cr in Carbon Trust"
3. "Pre-Submission Validation Cuts MSME Rejection Rates by 40%"
4. "Sector Benchmarking: Context That Turns Raw Data Into Decisions"
5. "Confidence Bands vs False Precision: The Honest MRV Approach"
6. "Real-Time Revenue Preview: From Abstract MRV to ₹X in 12 Hours"
7. "One-Click Audit Trails Save 200+ Hours for Climate-Ready MSMEs"
8. "Dispute Simulation: Prepare for Auditor Challenges Before They Happen"
9. "Why Manual Data Entry Is the #1 Source of Carbon Fraud Risk"
10. "Explainable Greenwashing Flags: Transparency Over Black-Box Scores"

Each article: 300-400 words, internal links, structured for FAQPage schema.

### Files
| File | Action |
|------|--------|
| `src/data/cmsContent.ts` | **Edit** — Add 10 articles |
| `scripts/generate-static-html.js` | **Edit** — Add 10 article routes |

---

## Database Migration

Single migration adding one column:
```sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trust_layer_prefs jsonb DEFAULT '{}';
```

No other schema changes. Country, export markets, and event triggers use existing `location`, `sector`, and localStorage triggers already in place.

---

## What Does NOT Change

- MRV pipeline math, BIOCOG methodology, emission factors for India
- Existing page routing, navigation, authentication
- Database RLS policies on existing tables
- Intelligence chatbot, compliance ledger, monetization pipeline
- Any existing component logic (only additive conditional wrapping)

