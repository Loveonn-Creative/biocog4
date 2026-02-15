
# Enterprise Mode: Feature-Flag Architecture Plan

## Overview

Add a single "Enterprise Mode" toggle to the user Profile page (OFF by default). When ON, the system conditionally reveals advanced capabilities on top of existing pages -- no new workflows, no new forms, no changes to the default MSME experience.

## What Changes for Users

- **Toggle OFF (default):** Platform behaves exactly as today. Zero visual or functional difference.
- **Toggle ON:** Same pages progressively reveal additional panels: audit trail, entity hierarchy, enhanced fraud checks, compliance labels (GHG Protocol / ISO 14064), and finance-grade export formats. All data comes from the same pipeline -- no parallel calculations.

## Architecture

### 1. Database: Add `enterprise_mode` Column to `profiles`

A single migration adds a boolean column:

```sql
ALTER TABLE public.profiles ADD COLUMN enterprise_mode boolean DEFAULT false;
```

No new tables, no new RLS policies needed (profiles RLS already covers owner read/write).

### 2. Hook: `useEnterpriseMode`

A lightweight React hook that reads `enterprise_mode` from the user's profile and exposes:
- `isEnterprise: boolean` -- the flag
- `toggleEnterprise()` -- saves to DB
- `isLoading: boolean`

This hook is the single source of truth. All pages import it and conditionally render enterprise sections only when `isEnterprise === true`.

### 3. Profile Page: Enterprise Mode Toggle Card

A new card in Profile (between "Data & Privacy" and "Security") with:
- A Switch component labeled "Enterprise Mode"
- Subtitle: "Activate audit-grade verification, entity consolidation, and finance-ready exports"
- When toggled, calls `toggleEnterprise()` which updates the `profiles.enterprise_mode` column
- Visual: subtle border highlight when active, no clutter

### 4. Conditional Enterprise Panels on Existing Pages

Each page gets a lazy-loaded enterprise section that renders only when `isEnterprise === true`. No existing components are modified -- enterprise content is appended below existing content.

**Dashboard (`Dashboard.tsx`):**
- "Audit Log" card showing recent verification events (read from `carbon_verifications`)
- "Entity Consolidation" summary (parent/subsidiary roll-up placeholder -- uses existing org data)
- "Compliance Labels" row: GHG Protocol / ISO 14064 / BRSR badges derived from existing scope data

**MRV Dashboard (`MRVDashboard.tsx`):**
- "Enhanced Fraud Analysis" panel: deeper greenwashing risk breakdown from existing `ai_analysis` JSON
- "Audit-Grade Ledger" table: chronological, hash-linked emission entries with document provenance
- "Data Retention" indicator showing extended retention period

**Verify (`Verify.tsx`):**
- "Enhanced Verification Depth" badge when enterprise mode is on
- Additional verification metadata display (methodology version, factor source, hash chain)

**Reports (`Reports.tsx`):**
- "Finance-Grade Export" button (XLSX with full audit trail columns)
- "Partner-Ready Format" export option (anonymized, compliance-mapped)
- Additional framework badges: ISO 14064, GHG Protocol scope mapping labels

**History (`History.tsx`):**
- "Document Provenance" column showing SHA256 hash and methodology version per entry

### 5. Extended OCR Category Maps (Edge Function)

Extend the `KEYWORD_MAP` in `extract-document/index.ts` with IT/service activity keywords. These are additive -- existing keywords are untouched:

```
cloud, aws, azure, gcp        -> CLOUD_SERVICES, Scope 3
software, saas, subscription   -> SOFTWARE, Scope 3  
laptop, server, networking     -> IT_HARDWARE, Scope 3 (maps to HSN 84/85)
consulting, legal, audit       -> PROFESSIONAL_SERVICES, Scope 3
airfare, flight, hotel, cab    -> BUSINESS_TRAVEL, Scope 3
```

Corresponding emission factors (monetary-based, fixed):
```
AWS India:     0.52 kgCO2e/USD
Azure India:   0.55 kgCO2e/USD
GCP India:     0.50 kgCO2e/USD
Laptops:       0.35 kgCO2e/INR1000
Servers:       0.62 kgCO2e/INR1000
```

These factors are added to the existing `EMISSION_FACTORS` map. They apply to ALL users (MSME and Enterprise) since they are part of the deterministic pipeline -- Enterprise mode does not change calculations, only surfaces additional metadata.

Update `CATEGORY_MAP` and `SCOPE_MAP` in `Index.tsx` to handle the new categories:
```
CLOUD_SERVICES -> 'cloud' -> Scope 3
SOFTWARE -> 'software' -> Scope 3
IT_HARDWARE -> 'it_hardware' -> Scope 3
PROFESSIONAL_SERVICES -> 'services' -> Scope 3
BUSINESS_TRAVEL -> 'travel' -> Scope 3
```

### 6. Compliance Labeling Layer

A pure UI mapping (no calculation changes):
- When Enterprise Mode is ON, existing scope1/2/3 data gets dual labels:
  - India: CPCB / BRSR / GSTIN-HSN verified
  - Global: GHG Protocol Category 1-15 / ISO 14064-1
- Implemented as a utility function `getComplianceLabels(scope, category)` that returns label arrays

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/hooks/useEnterpriseMode.ts` | **CREATE** | Single hook for enterprise flag |
| `src/pages/Profile.tsx` | **EDIT** | Add Enterprise Mode toggle card |
| `src/pages/Dashboard.tsx` | **EDIT** | Add conditional audit/compliance panels |
| `src/pages/MRVDashboard.tsx` | **EDIT** | Add audit ledger and fraud analysis panels |
| `src/pages/Verify.tsx` | **EDIT** | Add enhanced verification metadata |
| `src/pages/Reports.tsx` | **EDIT** | Add finance-grade export options |
| `src/pages/History.tsx` | **EDIT** | Add document provenance column |
| `src/pages/Index.tsx` | **EDIT** | Extend SCOPE_MAP and CATEGORY_MAP for new categories |
| `src/lib/complianceLabels.ts` | **CREATE** | GHG Protocol / ISO 14064 label mapping utility |
| `supabase/functions/extract-document/index.ts` | **EDIT** | Add IT/service keywords and emission factors |
| Database Migration | **CREATE** | Add `enterprise_mode` boolean to `profiles` |

## Performance Guarantees

- Enterprise panels are conditionally rendered (`{isEnterprise && ...}`) -- zero DOM cost when OFF
- No additional API calls when Enterprise Mode is OFF
- The `useEnterpriseMode` hook piggybacks on the existing profile fetch (no extra query)
- No new lazy-loaded routes or bundles -- enterprise sections are inline conditional renders
- Extended keyword maps add ~30 entries to the edge function -- negligible impact

## Reversibility

- Toggling OFF immediately hides all enterprise UI -- no stale state
- No data is deleted when toggling OFF (emissions, documents, verifications remain intact)
- The `enterprise_mode` column is a simple boolean flip with no cascading effects

## What Does NOT Change

- OCR pipeline logic and deterministic math
- Emission factors for existing categories
- Existing page layouts, navigation, and component hierarchy
- RLS policies (profiles already has owner-based access)
- Guest user experience (enterprise mode requires authentication)
- Subscription tier system (enterprise mode is independent of tier)
