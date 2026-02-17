# Green Invoice Verification Architecture

## Overview

This plan designs an end-to-end Green Invoice Verification pipeline that extends the existing OCR-to-MRV flow with green category tagging (forestation, EV, solar, etc.), a structured compliance ledger, and one-click government-ready exports. No existing features, pages, or calculations change. Green verification layers on top of the current deterministic pipeline using the same data.

## What This Adds (Without Changing Anything Existing)

1. **Green category tagging** -- invoices classified as solar, EV, forestation, organic, etc. using rule-based keyword/HSN lookup (same pattern as existing fuel/electricity classification)
2. **Compliance ledger table** -- every verified invoice produces a structured, immutable record linking hash, timestamp, category, scope, factor, and green benefit
3. **Green benefit records** -- verified invoices generate exportable records for MRV, monetization, and regulatory reporting
4. **Validation failure flagging** -- when validation fails, the exact math-based reason is stored and displayed (e.g., "Quantity missing - cannot multiply", "No emission factor for category")
5. **One-click export** -- government-ready PDF/XLSX exports from History and Reports pages
6. **Structured data reuse** -- compliance ledger powers operational intelligence without reprocessing invoices

## Architecture Flow

```text
Upload --> OCR Parsing --> Green Category Tagging --> Deterministic Factor Mapping
   --> Verification Scoring --> Compliance Ledger Storage --> Export/Reporting
```

Each step maps to existing code with targeted extensions:

### Step 1: Green Category Tagging (Edge Function)

Extend `KEYWORD_MAP` and `HSN_MASTER` in `extract-document/index.ts` with green categories:

```text
GREEN KEYWORD MAP (additive):
solar, solar panel, pv module           --> SOLAR_ENERGY, Scope 2, green_tag: 'solar'
ev, electric vehicle, ev charging       --> EV_TRANSPORT, Scope 1, green_tag: 'ev'
forestation, sapling, plantation, tree  --> FORESTATION, Scope 3, green_tag: 'forestation'
organic, compost, bio-fertilizer        --> ORGANIC_INPUT, Scope 3, green_tag: 'organic'
wind, wind turbine, windmill            --> WIND_ENERGY, Scope 2, green_tag: 'wind'
biogas, biomethane                      --> BIOGAS, Scope 1, green_tag: 'biogas'
led, energy efficient, bldc             --> ENERGY_EFFICIENCY, Scope 2, green_tag: 'efficiency'
rainwater, water recycling              --> WATER_CONSERVATION, Scope 3, green_tag: 'water'
recycled material, r-pet                --> RECYCLED_MATERIAL, Scope 3, green_tag: 'recycled'

HSN EXTENSIONS:
8541 (Solar cells/PV)       --> SOLAR_ENERGY, Scope 2
8711 (Electric motorcycles) --> EV_TRANSPORT, Scope 1  
0602 (Live plants/saplings) --> FORESTATION, Scope 3
8501 (Electric motors)      --> EV_TRANSPORT, Scope 1
```

**Green emission factors** (deterministic, fixed):

```text
SOLAR_ENERGY:      -0.708 kgCO2e/kWh (avoided grid emissions)
EV_TRANSPORT:      -1.80 kgCO2e/litre-equivalent (diesel avoided)
FORESTATION:        -22.0 kgCO2e/tree/year (IPCC average)
WIND_ENERGY:       -0.708 kgCO2e/kWh (avoided grid)
BIOGAS:            -2.30 kgCO2e/scm (natural gas avoided)
ORGANIC_INPUT:     -0.50 kgCO2e/kg (chemical fertilizer avoided)
ENERGY_EFFICIENCY: -0.30 kgCO2e/kWh (reduction factor)
RECYCLED_MATERIAL: -1.50 kgCO2e/kg (virgin material avoided)
```

Negative values indicate carbon benefit (reductions/avoidance). The existing `calculateEmissions` function returns these as negative CO2, which the UI displays as "Green Benefit" rather than "Emissions".

### Step 2: Compliance Ledger Table (New Database Table)

A new `compliance_ledger` table stores every verified invoice as an immutable, audit-ready record:

```sql
CREATE TABLE public.compliance_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  document_id uuid REFERENCES public.documents(id),
  emission_id uuid REFERENCES public.emissions(id),
  verification_id uuid REFERENCES public.carbon_verifications(id),
  
  -- Invoice identity
  document_hash text NOT NULL,
  invoice_number text,
  vendor text,
  invoice_date date,
  amount numeric,
  currency text DEFAULT 'INR',
  
  -- Green classification
  green_category text,  -- solar, ev, forestation, etc.
  scope integer NOT NULL,
  emission_category text NOT NULL,
  
  -- Deterministic calculation audit trail
  activity_data numeric,
  activity_unit text,
  emission_factor numeric,
  factor_source text,
  co2_kg numeric NOT NULL,
  is_green_benefit boolean DEFAULT false,
  
  -- Verification
  confidence_score numeric,
  verification_score numeric,
  verification_status text DEFAULT 'pending',
  validation_result text DEFAULT 'pending', -- passed / failed
  validation_failure_reason text, -- exact math-based reason if failed
  greenwashing_risk text,
  
  -- Methodology provenance
  methodology_version text NOT NULL,
  classification_method text, -- HSN / KEYWORD / UNVERIFIABLE
  
  -- Compliance metadata
  gstin text,
  hsn_code text,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  verified_at timestamptz,
  
  -- Financial reporting fields
  fiscal_year text,
  fiscal_quarter text
);

-- RLS: Users can only access their own ledger entries
ALTER TABLE public.compliance_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own ledger" ON public.compliance_ledger
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ledger" ON public.compliance_ledger
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ledger" ON public.compliance_ledger
  FOR UPDATE USING (auth.uid() = user_id);
```

### Step 3: Ledger Population (Automatic)

After verification completes in `verify-carbon/index.ts`, automatically insert a compliance ledger entry for each verified emission. This happens server-side -- no new user action required.

The verify-carbon function already processes emissions and creates `carbon_verifications` records. We extend it to also insert into `compliance_ledger` with all provenance fields populated from the existing data.

### Step 4: Validation Failure Flagging

When an invoice fails validation (missing quantity, no emission factor, unverifiable category), store the exact reason:

```text
FAILURE REASONS (math-based, not AI):
- "Quantity not detected - cannot compute: Quantity x Factor = CO2"
- "Unit missing - emission factor requires specific unit (litre/kWh/kg)"
- "No emission factor available for category: [CATEGORY]"
- "HSN code [XX] not in verified factor table"
- "Amount-only invoice - quantity inference disabled for determinism"
- "Document classification: UNVERIFIABLE - no matching category"
```

These are stored in `compliance_ledger.validation_failure_reason` and displayed in History and Reports.

### Step 5: Green Benefit Display (UI)

Extend `ResultState.tsx` and History to show green benefits:

- When `co2_kg < 0` (green benefit), display as "Green Benefit: X kg CO2 avoided" with a green leaf icon
- Add green category badge (Solar, EV, Forestation, etc.) next to vendor name
- Show "Verified Green Invoice" badge for passing invoices

### Step 6: One-Click Government Export

Add export buttons to History and Reports pages:

- **Compliance XLSX**: Full ledger export with all fields (hash, timestamp, GSTIN, HSN, scope, factor, CO2, verification status, failure reasons)
- **Government PDF**: Formatted report with legal disclaimer, methodology reference, and scope breakdown suitable for CPCB/BRSR submissions
- Reuses existing `jspdf` and `xlsx` libraries already installed

### Step 7: Green Categories on Index Page

Extend the `SCOPE_MAP` and `CATEGORY_MAP` in `Index.tsx` to handle green categories:

```text
SOLAR_ENERGY -> 'solar' -> Scope 2
EV_TRANSPORT -> 'ev' -> Scope 1
FORESTATION -> 'forestation' -> Scope 3
WIND_ENERGY -> 'wind' -> Scope 2
BIOGAS -> 'biogas' -> Scope 1
ORGANIC_INPUT -> 'organic' -> Scope 3
ENERGY_EFFICIENCY -> 'efficiency' -> Scope 2
RECYCLED_MATERIAL -> 'recycled' -> Scope 3
```

## Files to Create/Modify


| File                                           | Action     | Purpose                                                           |
| ---------------------------------------------- | ---------- | ----------------------------------------------------------------- |
| Database Migration                             | **CREATE** | Add `compliance_ledger` table with RLS                            |
| `supabase/functions/extract-document/index.ts` | **EDIT**   | Add green keywords, HSN codes, and emission factors               |
| `supabase/functions/verify-carbon/index.ts`    | **EDIT**   | Auto-populate compliance ledger after verification                |
| `src/pages/Index.tsx`                          | **EDIT**   | Extend SCOPE_MAP and CATEGORY_MAP for green categories            |
| `src/hooks/useComplianceLedger.ts`             | **CREATE** | Hook to fetch/export compliance ledger data                       |
| `src/pages/History.tsx`                        | **EDIT**   | Add green badges, validation status, and compliance export button |
| `src/pages/Reports.tsx`                        | **EDIT**   | Add government-ready compliance export                            |
| `src/components/ResultState.tsx`               | **EDIT**   | Show green benefit display for negative CO2 values                |
| `src/components/GreenCategoryBadge.tsx`        | **CREATE** | Reusable badge component for green categories                     |


## Performance Guarantees

- Green keyword map adds ~25 entries to existing map -- negligible impact on edge function
- Compliance ledger insert is a single DB write piggybacking on existing verify-carbon call
- No new API calls from frontend unless user clicks export
- Green badges are simple conditional renders with zero layout shift
- Export functions run client-side using existing `xlsx` and `jspdf` libraries
- Don't create pages or features if already exists

## What Does NOT Change

- OCR pipeline and AI extraction prompt
- Existing emission factors for fuel, electricity, transport, waste
- Deterministic math formula: Quantity x Factor = CO2
- Confidence scoring algorithm
- Deduplication and caching logic
- Page layouts, navigation, and routing
- Guest user experience
- Enterprise mode behavior
- RLS policies on existing tables

## Determinism Guarantee

- Green factors are fixed lookup values, not AI-generated
- Same solar panel invoice always produces same -0.708 kgCO2e/kWh result
- Validation failure reasons are template strings with no AI inference
- Compliance ledger is append-only -- no mutation of historical records