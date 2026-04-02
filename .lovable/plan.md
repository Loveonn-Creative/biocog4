

# Plan: 10 Trust Layer Innovations + OG Image + Blog Articles

## Overview

Integrate 10 product innovations into the existing MRV-to-monetize pipeline as enhancements to existing components — not new pages. Each innovation removes a specific uncertainty from the MSME user journey. Plus: generate a premium OG image and 10 SEO blog articles.

---

## Part 1: OG Image (Premium Quality)

Generate a high-quality 1200x630 OG image using `google/gemini-3-pro-image-preview` with the uploaded brand visual as reference. Clean typography: "Senseible — Turn bills into verified climate assets in seconds." Dark gradient background, green accent. Save to `public/og-image.png`. No changes needed to `index.html` or `SEOHead.tsx` — they already reference this path.

---

## Part 2: 10 Trust Innovations (Integrated Into Existing Components)

### Where Each Innovation Lives

```text
Upload → ResultState.tsx (innovations 1, 3, 5, 6)
         ↓
Verify → Verify.tsx (innovations 2, 4, 8, 10)
         ↓
Dashboard → Dashboard.tsx / VerificationStatusCard.tsx (innovation 4)
         ↓
Monetize → Monetize.tsx (innovation 6, 7)
         ↓
History → History.tsx (innovation 7, 9)
```

### Innovation 1: Instant Audit Score (0-100 Trust Index)

**Where:** `ResultState.tsx` — shown immediately after invoice processing
**What:** A circular score gauge (0-100) with reason codes replacing the current binary pass/fail confidence display. Uses existing `confidence`, `validationFlags`, and `classificationStatus` data already returned by OCR.
**Logic (deterministic):** Score = weighted sum of: data completeness (30%), emission factor match quality (25%), document integrity (25%), classification confidence (20%). Each factor shows a reason code ("Vendor verified", "HSN matched", "Date gap detected").
**Change:** Replace the simple confidence percentage at line 142-154 of `ResultState.tsx` with a scored card + reason codes.

### Innovation 2: Proof Graph (Traceable MRV Layer)

**Where:** `Verify.tsx` — new section below the verification result card
**What:** Visual chain: `Invoice → Line Item → Emission Factor → Scope → CO₂ → Credit`. A horizontal step diagram using existing data from the verification result. Each node is clickable to show the source value.
**Data source:** Already available in `verificationResult.analysis` — scope breakdown, emission factors from `EMISSION_FACTORS` in verify-carbon, and credit eligibility.
**Change:** Add a `ProofGraph` component rendered inside `Verify.tsx` after verification completes.

### Innovation 3: Auto-Validation Before Submission

**Where:** `ResultState.tsx` — between extracted data summary and action buttons
**What:** Pre-check panel that flags: missing vendor GSTIN, weak baseline (< 3 invoices in session), date older than 12 months, amount outliers. Uses existing `validationFlags` + new client-side checks against session emission history.
**Logic:** Query `emissions` count for session. If < 3: "Weak baseline — add more invoices for stronger verification." If amount > 10x average: "Amount outlier detected." If no GSTIN: "Missing supplier GSTIN — weaker Scope 3 evidence."
**Change:** Add pre-submission checks in `ResultState.tsx` before the "Continue to Verify" button.

### Innovation 4: Dynamic Benchmarking vs Peers

**Where:** `Verify.tsx` verification result card + `Dashboard.tsx`
**What:** After verification, show: "Your electricity intensity is 23% below textile sector average" or "Your Scope 1 ratio is 12% above manufacturing benchmark." Uses existing `INDUSTRY_BENCHMARKS` from `verify-carbon/index.ts` and `intelligenceEngine.ts`.
**Logic:** Compare user's scope breakdown ratios against sector benchmarks already hardcoded in `intelligenceEngine.ts`. Sector inferred from dominant emission category.
**Change:** Add benchmark comparison section in Verify.tsx result card and Dashboard's EmissionsSummary.

### Innovation 5: Confidence Score on Each Output

**Where:** `ResultState.tsx` — enhance existing confidence display
**What:** Replace single percentage with probability band: "87% ± 5% confidence" with a visual band indicator. Show what drives the uncertainty: "±3% from emission factor variance, ±2% from OCR extraction."
**Logic:** Deterministic: OCR confidence ± 5% base, adjusted by classification method (HSN = ±2%, KEYWORD = ±8%, UNVERIFIABLE = ±15%). Already have `classificationMethod` in ExtractedData.
**Change:** Enhance confidence display in `ResultState.tsx` to show band instead of point estimate.

### Innovation 6: Real-time Monetization Preview

**Where:** `ResultState.tsx` — shown immediately after CO₂ calculation, before "Continue to Verify"
**What:** "If verified: ₹X–₹Y in carbon credits + ₹Z green loan savings." Uses existing `CARBON_CREDIT_RATE` (750 INR/tCO₂) already in `Index.tsx` line 169 and `calculate-monetization/index.ts`.
**Logic:** Low estimate = CO₂ × 0.8 × rate (conservative). High estimate = CO₂ × 1.0 × rate. Green loan savings = 0.5% × ₹5L average loan. All constants already exist.
**Change:** Add monetization preview card in `ResultState.tsx`.

### Innovation 7: Audit Trail Export (Investor-Ready)

**Where:** `History.tsx` and `Monetize.tsx` — add "Export Audit Trail" button
**What:** One-click CSV/PDF export that includes: document hash, timestamp, emission calculation chain, verification score, compliance status. Uses existing `useComplianceLedger` hook and `exportComplianceXLSX` function (already exists in History.tsx line 26).
**Logic:** Enhance existing `exportComplianceXLSX` to include verification scores and proof chain. Add "Investor-Ready Audit Trail" button in Monetize.tsx.
**Change:** Enhance export function in `useComplianceLedger.ts`, add button in `Monetize.tsx`.

### Innovation 8: Dispute Simulation Mode

**Where:** `Verify.tsx` — toggle below verification result
**What:** "If an auditor challenges this, here's what holds and what breaks." Shows: strongest evidence (matched HSN, verified GSTIN), weakest links (keyword-only classification, missing unit data), suggested fixes.
**Logic:** Parse existing `validationResults` flags and `classificationStatus`. Categorize each data point as "defensible" or "vulnerable." No new API calls — pure client-side analysis of existing verification data.
**Change:** Add collapsible "Dispute Simulation" section in `Verify.tsx` after verification result.

### Innovation 9: Plug-in Data Connectors (IoT / ERP)

**Where:** `Verify.tsx` — the IoT toggle already exists (line 190-203). Enhance it.
**What:** Expand the existing IoT toggle into a "Data Connectors" section showing: Manual Upload (active), IoT Sensors (toggle — already exists), ERP Integration (coming soon), Tally Import (coming soon). Shows which data source reduces uncertainty most.
**Change:** Enhance the existing IoT toggle section in `Verify.tsx` to show a connector panel with status indicators.

### Innovation 10: Greenwashing Risk Flags (Explainable)

**Where:** `Verify.tsx` — enhance existing greenwashing risk badge
**What:** The current badge shows "LOW/MEDIUM/HIGH" (line 293-295). Enhance to show which specific variable triggered the risk level. Already computed in `calculateGreenwashingRisk()` in verify-carbon — need to return the individual risk factors, not just the aggregate.
**Backend change:** Modify `verify-carbon/index.ts` to return `greenwashingFactors[]` alongside `greenwashingRisk`.
**Frontend change:** Show expandable list of factors under the risk badge in `Verify.tsx`.

---

## Part 3: Speed Optimization (25x MRV-to-Monetize)

**Current bottleneck:** After verification completes, user must manually navigate to `/monetize`, wait for data fetch, then click "Apply." Three separate page loads + API calls.

**Fix — Unified Post-Verification Flow:**
- In `Verify.tsx`, after successful verification, auto-trigger `calculate-monetization` in the background (parallel fetch).
- Show monetization results inline on the Verify page — no navigation required.
- Add "Claim Now" button that navigates to pre-populated Monetize page.
- Result: Upload → Verify → See monetization = single flow, no extra page loads.

**Change:** Add `useEffect` in `Verify.tsx` that calls `calculate-monetization` when `verificationResult` is set. Display inline monetization preview.

---

## Part 4: 10 SEO Blog Articles

Add 10 new articles to `src/data/cmsContent.ts`, each 300-400 words, focused on how each innovation removes uncertainty from MSME climate journeys. Each article includes internal links to relevant platform pages.

**Articles:**
1. "Why Every Invoice Needs a Trust Score — Not Just Pass/Fail" → links to `/verify`
2. "The Proof Graph: See Exactly How Your Carbon Value Is Calculated" → links to `/verify`
3. "Stop Fearing Rejection: Auto-Validation Catches Gaps Before You Submit" → links to `/`
4. "How Do You Compare? Dynamic Benchmarking Against 400M MSMEs" → links to `/dashboard`
5. "Honest Uncertainty: Why Confidence Bands Beat False Precision" → links to `/verify`
6. "See Your Carbon Revenue Before You Verify" → links to `/monetize`
7. "One-Click Audit Trails: What Investors Actually Need" → links to `/history`
8. "Dispute-Ready: Simulate an Auditor Challenge Before It Happens" → links to `/verify`
9. "Manual Entry Is the #1 Source of Carbon Data Error" → links to `/verify`
10. "Greenwashing Flags You Can Understand — Not Just 'High Risk'" → links to `/verify`

All articles tagged `featured: true` for SEO indexing. Added to static HTML generator routes.

---

## Files to Create/Edit

| File | Action | Innovations |
|------|--------|-------------|
| `src/components/ResultState.tsx` | **Edit** — Add audit score, auto-validation, confidence band, monetization preview | 1, 3, 5, 6 |
| `src/pages/Verify.tsx` | **Edit** — Add proof graph, benchmarking, dispute simulation, connectors, explainable greenwashing, inline monetization | 2, 4, 8, 9, 10, speed |
| `supabase/functions/verify-carbon/index.ts` | **Edit** — Return greenwashing risk factors array | 10 |
| `src/components/dashboard/VerificationStatusCard.tsx` | **Edit** — Add benchmark comparison | 4 |
| `src/hooks/useComplianceLedger.ts` | **Edit** — Enhance export with proof chain | 7 |
| `src/pages/Monetize.tsx` | **Edit** — Add audit trail export button | 7 |
| `src/data/cmsContent.ts` | **Edit** — Add 10 new blog articles | Blog |
| `scripts/generate-static-html.js` | **Edit** — Add 10 new article routes | Blog SEO |
| `public/og-image.png` | **Create** — Premium brand OG image | OG |

## What Does NOT Change

- MRV pipeline math, emission factors, BIOCOG methodology
- Database schema (no migrations needed)
- Existing page routing or navigation structure
- Authentication, RLS policies
- Any existing hook or utility logic (only additive changes)

