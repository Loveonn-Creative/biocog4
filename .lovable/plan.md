
# Sophisticated B2B Partner Access: Implementation Plan

## Current State Analysis

**What Works:**
- Partner signup creates `user_contexts` with `context_type: 'partner'` (Auth.tsx lines 174-182)
- Partner dashboard shows anonymized cluster data, baseline charts, and purchase flow (PartnerDashboard.tsx)
- Partner profile exists with organization info (PartnerProfile.tsx)
- Navigation switches between MSME and Partner nav items (Navigation.tsx line 70)
- Partner Marketplace exists with filtering and SDG alignment (PartnerMarketplace.tsx)

**Critical Gaps:**
- MSME pages (/verify, /monetize, /mrv-dashboard, /reports, /dashboard) have NO route protection for partners
- Partners can still access all MSME features via URL navigation
- No dedicated Partner Reports page
- No partner-type-specific routing (Banks vs Carbon Buyers vs ERPs)
- Missing real-time risk alerts and compliance signals

---

## Implementation Scope

### 1. Route Protection for MSME-Only Pages
Add partner exclusion logic to 5 MSME-only pages with redirect:

**Files: Verify.tsx, Monetize.tsx, MRVDashboard.tsx, Reports.tsx, Dashboard.tsx**

```typescript
// Add at top of each component
const { activeContext } = useOrganization();
const navigate = useNavigate();

useEffect(() => {
  if (activeContext?.context_type === 'partner') {
    toast.info('This feature is for MSMEs. Redirecting to Partner Dashboard.');
    navigate('/partner-dashboard');
  }
}, [activeContext]);
```

### 2. Dedicated Partner Reports Page
**New File: src/pages/PartnerReports.tsx**

Sections:
- **Portfolio Overview**: Total credits held, acquisition history, retirement status
- **Purchase History**: Table with date, listing, quantity, price, status
- **Audit Pack Downloads**: Per-purchase verification bundles (PDF)
- **Compliance Dashboard**: CBAM/EU Taxonomy/PCAF alignment indicators

No raw MSME data exposure - only aggregated, verified signals.

### 3. Enhanced Partner Dashboard Signals
**File: PartnerDashboard.tsx modifications**

Replace current generic metrics with decision-grade signals:

| Current | Replace With |
|---------|-------------|
| totalMSMEs | Active Verified Suppliers |
| totalReductions | Tradeable Credits (TCO2e) |
| additionalityScore | Data Quality Grade (A-D) |
| confidenceBand | CBAM Readiness Score |

Add new sections:
- **Real-Time Alerts Panel**: Flagged verifications, expiring credits, compliance deadlines
- **Eligibility Summary**: CCTS/CBAM/EU Taxonomy eligibility badges per cluster
- **Regional Breakdown Chart**: Interactive pie chart by region

### 4. Partner Type Routing Logic
**File: Auth.tsx enhancement**

After partner signup, route based on `organization_type`:

```typescript
const getPartnerRedirect = (orgType: string): string => {
  switch(orgType) {
    case 'banks': return '/partner-dashboard'; // Future: /partner/lending
    case 'carbon-buyers': return '/marketplace';
    case 'erp': return '/partner-dashboard'; // Future: /partner/api
    default: return '/partner-dashboard';
  }
};
```

Store `organization_type` in user_contexts metadata for routing on sign-in.

### 5. Compliance Signals Component
**New Component: src/components/partner/ComplianceSignals.tsx**

```text
+-------------------------------------------+
| CBAM        | EU Taxonomy | PCAF          |
| [Compliant] | [Eligible]  | [Pending]     |
+-------------------------------------------+
| Last Verified: Jan 28, 2026               |
| Audit Trail: SHA256-xxx...                |
+-------------------------------------------+
```

Displays per-verification compliance status without raw data.

### 6. Interactive Analytics Charts
**Enhancement to PartnerDashboard.tsx**

Add three new Recharts visualizations:
- **Score Trends Over Time**: Line chart of verification_score by month
- **Eligibility Distribution**: Pie chart (CCTS Eligible vs Not)
- **Regional Credits Breakdown**: Bar chart by region

All charts use existing `recharts` dependency with existing theme colors.

---

## Route Structure

```text
/partner-dashboard     -> Main partner hub
/partner-profile       -> Organization settings (exists)
/partner-reports       -> NEW: Credit portfolio + audit packs
/marketplace          -> Credit browsing + purchase
/intelligence         -> Shared: ESG Q&A assistant
```

**Protected MSME Routes (redirect partners to /partner-dashboard):**
- /dashboard, /verify, /monetize, /mrv-dashboard, /reports

---

## Data Isolation Guarantee

Partners access ONLY:
- `marketplace_listings` (anonymized)
- `carbon_verifications` (aggregate cluster data via partner_access)
- `partner_applications` (own record)
- `partner_organizations` (if approved)

Partners NEVER access:
- `documents` (raw invoices)
- `emissions` (individual records)
- `profiles` (MSME business data)

All enforced via existing RLS policies.

---

## File Changes Summary

| File | Action | Purpose |
|------|--------|---------|
| Dashboard.tsx | Add partner redirect | Block partner access |
| Verify.tsx | Add partner redirect | Block partner access |
| Monetize.tsx | Add partner redirect | Block partner access |
| MRVDashboard.tsx | Add partner redirect | Block partner access |
| Reports.tsx | Add partner redirect | Block partner access |
| PartnerReports.tsx | CREATE | Portfolio + audit packs |
| PartnerDashboard.tsx | ENHANCE | Signals + alerts + charts |
| ComplianceSignals.tsx | CREATE | CBAM/Taxonomy badges |
| App.tsx | Add route | /partner-reports |
| Navigation.tsx | Add nav item | Reports link for partners |
| Auth.tsx | Enhance | Org-type routing |

---

## Performance Guarantees

- No new dependencies (uses existing recharts, lucide-react)
- Lazy loading for PartnerReports.tsx
- Route protection uses existing useOrganization hook
- All chart data derived from existing Supabase queries
- No additional database tables required

---

## Expected Outcomes

1. Partners CANNOT access /verify, /monetize, /mrv-dashboard, /dashboard, /reports
2. Partners see decision-grade signals: scores, eligibility, compliance status
3. Partner Reports page provides purchase history and audit pack downloads
4. Real-time alerts surface exceptions without exposing raw data
5. Future-ready for partner-type-specific portals (Banks, ERPs, Buyers)
