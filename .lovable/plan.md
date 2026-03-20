# Plan: CBAM Cost Estimator + Net-Zero Goal Engine

Two new public pages that integrate with the existing platform without disrupting any core architecture.

---

## Page 1: CBAM Cost Estimator (`/cbam-calculator`)

### What It Does

A public, no-login-required calculator that lets EU importers and Indian producers estimate their CBAM cost exposure from 2026-2034.

### Inputs (Single Form)

- **CN Code** (8-digit EU customs code) with autocomplete for CBAM-covered sectors (steel, aluminium, cement, fertilizers, electricity, hydrogen)
- **Country of Origin** (dropdown, default: India)
- **Supplier Name** (optional text)
- **Production Route** (e.g., BF-BOF, EAF, Haber-Bosch — dynamic based on CN code)
- **Tonnage** (numeric, tonnes imported per year)
- **Actual Emissions Intensity** (tCO2/tonne product — optional, falls back to EU default)
- **Carbon Price Paid in Origin Country** (€/tCO2 — default 0 for India, auto-populated for countries with carbon pricing)

### Calculation Engine (Deterministic, No AI)

All hardcoded EU benchmark values per CBAM regulation:

```text
CBAM Cost = (Actual Emissions - Free Allowances) × EU ETS Price × Phase-in %

Where:
- Actual Emissions = tonnage × emissions_intensity (actual or EU default)
- Free Allowances = EU benchmark × tonnage × free_allocation_% (declining 2026-2034)
- Carbon Price Credit = carbon_price_paid × tonnage × emissions_intensity
- Net CBAM Cost = max(0, CBAM Cost - Carbon Price Credit)

Phase-in schedule:
2026: 2.5% | 2027: 5% | 2028: 10% | 2029: 22.5% | 2030: 48.5% | 2031: 61% | 2032: 73.5% | 2033: 86% | 2034: 100%
```

### Outputs

- **Cost per tonne** (€/t)
- **Total annual CBAM cost** (€)
- **9-year projection chart** (2026-2034) showing cost escalation
- **Default vs Actual emissions comparison** (bar chart)
- **Scenario comparison**: Toggle between 2-3 suppliers or assumptions side-by-side

### Scenario Mode

- Add up to 3 scenarios (different suppliers, production routes, or emission intensities)
- Side-by-side cost comparison table + overlay chart

### Save/Export (Auth-gated)

- Results visible to all. "Save Report" and "Export PDF/CSV" buttons trigger auth modal if not signed in.
- Saved results stored in existing `reports` table with `report_type: 'cbam_estimate'`.

### SEO

- Full `SEOHead` with FAQPage schema, BreadcrumbList
- Target keywords: "CBAM calculator", "CBAM cost estimator", "EU carbon border tax calculator"
- Add to static HTML generator, sitemap, footer, and navigation

### Files to Create/Edit


| File                              | Action                                                                                               |
| --------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `src/pages/CBAMCalculator.tsx`    | **Create** — Full page with form, calculation engine, charts, scenario mode                          |
| `src/lib/cbamEngine.ts`           | **Create** — Deterministic calculation functions, EU benchmarks, phase-in schedule, CN code mappings |
| `src/App.tsx`                     | **Edit** — Add route `/cbam-calculator`                                                              |
| `src/components/Footer.tsx`       | **Edit** — Add "CBAM Calculator" link under Solutions                                                |
| `public/sitemap.xml`              | **Edit** — Add `/cbam-calculator`                                                                    |
| `scripts/generate-static-html.js` | **Edit** — Add route metadata                                                                        |


---

## Page 2: Net-Zero Goal Engine (`/net-zero`)

### What It Does

A guided, step-by-step system that takes an MSME from "no climate clarity" to a measurable net-zero roadmap. Fully integrated with existing emissions data, Intelligence chatbot, and compliance ledger.

### Architecture (Non-Disruptive)

Reads from existing tables (`emissions`, `carbon_verifications`, `compliance_ledger`, `profiles`). Writes to a new `net_zero_goals` table for goal tracking. No modifications to any existing table schema.

### User Flow (5 Steps — Tab-Based UI)

**Step 1: Baseline** (auto-populated from existing data)

- Pull Scope 1/2/3 totals from `emissions` table
- Show breakdown chart (reuse `TrendChart` pattern)
- If no data: prompt to upload first invoice on homepage
- &nbsp;

**Step 2: Goal Setting**

- Sector benchmarks (pre-loaded for textiles, steel, chemicals, agriculture, logistics)
- Choose target: 20%, 30%, 50%, or custom % reduction
- Timeline: 12 months, 3 years, or 2030
- Feasibility check: "Based on your baseline of X tCO2, a 30% reduction = Y tCO2 savings needed"

**Step 3: AI Roadmap** (paid users only, free users see locked preview)

- Calls existing `intelligence-chat` edge function with user's baseline + goal context
- Returns prioritized reduction actions with estimated impact, cost, and payback period
- Actions tagged by scope and effort level

**Step 4: Execution Tracker**

- Task checklist generated from roadmap
- Each task shows: action, estimated CO2 reduction, cost, status (pending/in-progress/done)
- Progress bar: % toward goal based on completed actions vs target reduction
- Real-time: as new invoices are processed, baseline auto-updates and progress recalculates

**Step 5: Report & Badge**

- Generate net-zero progress report (reuses `reportFrameworks.ts` with SBTi/UN SDGs alignment)
- Credibility badge showing % toward net-zero (reuses `credibilityScore.ts`)
- Export PDF (auth-gated)

### ESG Intelligence Integration (Paid Users)

- Contextual "Ask AI" button on each step that opens Intelligence chatbot pre-loaded with user's goal context
- Example prompts: "Fastest way to cut Scope 2 by 20%?", "Cheapest reduction action for textiles?"

### Database

New table `net_zero_goals`:

```sql
CREATE TABLE public.net_zero_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  baseline_co2_kg numeric NOT NULL,
  target_reduction_pct numeric NOT NULL,
  target_date date NOT NULL,
  sector text,
  roadmap jsonb DEFAULT '[]',
  tasks jsonb DEFAULT '[]',
  progress_pct numeric DEFAULT 0,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.net_zero_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own goals"
ON public.net_zero_goals FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

### SEO

- Full `SEOHead` with structured data
- Target: "net zero MSME", "net zero roadmap India", "MSME decarbonization tool"

### Files to Create/Edit


| File                              | Action                                                                                  |
| --------------------------------- | --------------------------------------------------------------------------------------- |
| `src/pages/NetZero.tsx`           | **Create** — Full page with 5-step tab UI, charts, progress tracking                    |
| `src/lib/netZeroEngine.ts`        | **Create** — Sector benchmarks, reduction strategies database, feasibility calculations |
| `src/App.tsx`                     | **Edit** — Add route `/net-zero`                                                        |
| `src/components/Footer.tsx`       | **Edit** — Add "Net-Zero Engine" link under Solutions                                   |
| `public/sitemap.xml`              | **Edit** — Add `/net-zero`                                                              |
| `scripts/generate-static-html.js` | **Edit** — Add route metadata                                                           |
| **Database migration**            | **Create** — `net_zero_goals` table with RLS                                            |


---

## Shared Edits (Both Pages)


| File                              | Change                                                    |
| --------------------------------- | --------------------------------------------------------- |
| `src/App.tsx`                     | Add 2 lazy-loaded routes: `/cbam-calculator`, `/net-zero` |
| `src/components/Footer.tsx`       | Add both links under Solutions                            |
| `public/sitemap.xml`              | Add both URLs                                             |
| `scripts/generate-static-html.js` | Add route metadata for both                               |


- System must be inter-connected for paid users to avoid sharing same invoices again, rather fetch from existing data without hallucination

## What Does NOT Change

- MRV pipeline, emission factors, BIOCOG methodology
- Existing pages, navigation, or dashboard logic
- Authentication, RLS policies on existing tables
- Intelligence chatbot core logic
- Any existing component or hook