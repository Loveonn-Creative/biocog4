

# IndiaAIBadge Revert + Ecosystem Integration Audit

## Part 1: Revert IndiaAIBadge

The current "Neural Lotus" has petals + synapses + eye center. The user wants the **previous spoke-based design** restored (the Ashoka Chakra radiating spokes version) but with:
- Bold colors (not dim)
- A creative tweak to the center dot (replace plain circles with a small Ashoka Chakra wheel -- 24 mini-spokes inside a ring, animated with slow rotation)
- Keep the breathing/motion animations

**File**: `src/components/IndiaAIBadge.tsx` -- REWRITE back to spoke-based design with:
- 24 radiating spokes in saffron/green/navy/brand colors at 0.7-0.9 opacity (bold)
- Center: mini Ashoka Chakra wheel (ring + 12 inner spokes) instead of a dot, with slow 30s CSS rotation
- Outer spokes keep the slow 60s rotation + 3s pulse on center
- Pure CSS/SVG, ~2KB

## Part 2: Integration Gaps Found

After auditing the codebase, here's what's **already integrated** and what's **missing**:

### Already Working
- **Climate Credibility Score** (`credibilityScore.ts`) -- computed and displayed on Monetize page
- **Gov-Compliance Adapter** (`govComplianceAdapter.ts`) -- GCP/BRSR/CCTS export buttons on Reports page
- **Green Invoice Factoring** -- 4th pathway on Monetize page with dynamic eligibility checks
- **Scope 3 Supply Chain Signal** -- shows in ResultState when buyerGstin is present
- **Greenwashing Risk Detection** -- computed during verification, displayed on MRV Dashboard and Reports
- **Additionality Score** -- computed and displayed on Partner Dashboard

### Gap 1: Dashboard Missing Credibility Score
`Dashboard.tsx` renders `VerificationStatusCard` but does NOT pass `credibilityScore` or `credibilityGrade` props. The component supports these props but they're never provided.

**Fix**: Import `computeCredibilityScore` in Dashboard, compute from fetched verifications + compliance ledger, pass to `VerificationStatusCard`.

**Files**: `src/pages/Dashboard.tsx` -- EDIT: add credibility score computation and pass props

### Gap 2: No Authenticity Score Surface
The reference describes an "Authenticity Score (0-100)" per invoice. The platform already computes `confidence` and `verification_score` but never surfaces them as an explicit "Authenticity Score." The `compliance_ledger` has `confidence_score` and `verification_score` fields.

**Fix**: Surface authenticity score in the MRV Dashboard verification details by combining confidence_score and verification_score into an "Authenticity" label. No new computation needed -- just relabel existing data.

**Files**: `src/pages/MRVDashboard.tsx` -- EDIT: add Authenticity Score display using existing `confidence_score` field

### Gap 3: Verification Readiness Indicator Missing
The reference describes a "Verification Readiness" status (VCM compatible). The platform has all the data (methodology_version, verification_status, greenwashing_risk, additionality via verification_score) but doesn't surface a unified "VCM Readiness" signal.

**Fix**: Add a "VCM Readiness" badge to the Reports page verification section. Logic: verified + low greenwashing_risk + score >= 0.7 = "Ready", else "Pending".

**Files**: `src/pages/Reports.tsx` -- EDIT: add VCM Readiness badge in verification summary

## Files Summary (4 files)

| File | Action |
|------|--------|
| `src/components/IndiaAIBadge.tsx` | REWRITE: Spoke design with Chakra center |
| `src/pages/Dashboard.tsx` | EDIT: Pass credibility score to VerificationStatusCard |
| `src/pages/MRVDashboard.tsx` | EDIT: Surface Authenticity Score |
| `src/pages/Reports.tsx` | EDIT: Add VCM Readiness badge |

## What Does NOT Change
- OCR pipeline, MRV math, emission factors
- Database schema (no migrations)
- Existing page layouts, navigation
- Homepage/About tagline text and positioning
- Any existing feature or button label

