
# Focused Implementation Plan: Global Narrative, SEO, Partner Separation, and Marketplace Flow

## Priority 1: Global & Emerging Market Narrative Balance

### Current State
- About page has "$8.8B Indian exports" and "CCTS India's Carbon Credit Trading Scheme" - India-only framing
- Carbon Credits page mentions only CCTS
- Climate Finance page mentions only Indian FTAs and RBI

### Changes Required

**About.tsx** - Update "The Problem" section:
- Change "$8.8B Indian exports affected by EU CBAM by 2026" to:
  "$120B+ emerging market exports at risk from carbon border adjustments globally"
- Add subtext: "Including $8.8B from India alone"
- Change CCTS box to: "CCTS/ETS" with description "Carbon pricing schemes now cover 23% of global emissions — from India's CCTS to EU ETS to emerging schemes in Brazil, Indonesia, and Southeast Asia"

**CarbonCredits.tsx** - Update key metrics:
- Change CCTS metric to: "Global Standards" with description "Aligned with India's CCTS, EU ETS, and voluntary markets (Verra, Gold Standard)"
- Update INR metric to show USD equivalent (approximately $15+)

**ClimateFinance.tsx** - Expand "What MSMEs Are Missing":
- Add global context: "From India's FTAs to EU's Green Deal, Brazil's CBIO market, and Southeast Asia's carbon pricing pilots, verified sustainability data is becoming table stakes for trade access"
- Add international examples alongside Indian examples

---

## Priority 2: SEO & Blog Architecture

### Favicon
**Status**: Already configured in index.html pointing to Senseible logo
**Fix**: Update to proper favicon format in public/ folder for reliability

### Internal Linking Strategy
- Add contextual links within CMS articles to related pages (/carbon-credits, /climate-finance, /verify)
- Add "Related Solutions" section in About, Mission, CarbonCredits, ClimateFinance pages

### Blog Architecture (Already Exists)
- CMSArticle.tsx already provides excellent blog structure with:
  - Related articles
  - Category navigation
  - Tags
  - Social sharing
  - Newsletter signup

### 10+ New High-Impact Blog Articles (to add to cmsContent.ts)
Focus on voice/AI search optimization, internal links, 300-400 words each:

1. "What is carbon MRV and why MSMEs need it in 2026"
2. "How to get green loans in India using carbon data"
3. "EU CBAM explained: What exporters in emerging markets need to know"
4. "Scope 1 vs Scope 2 vs Scope 3: A simple guide for small businesses"
5. "What is Senseible and how is it different from Sensibull"
6. "How to calculate carbon footprint from electricity bills"
7. "Brazil CBIO vs India CCTS: Comparing carbon markets"
8. "Green finance for textile exporters: Step by step guide"
9. "What documents do I need for carbon verification"
10. "How to prepare for BRSR reporting as a small manufacturer"
11. "Carbon credits for solar installations: How to monetize"
12. "Steel and aluminum exporters: CBAM compliance checklist"
13. "The $136 Billion Breakthrough: How the India-EU FTA Just Rewrote the Rulebook for Indian MSMEs"
14. "Survival of the Greenest: Why the EU’s Carbon Tax (CBAM) is the Ultimate Litmus Test for Indian Industry"
15. "Trading Air for Assets: Can India’s New Carbon Markets Shield Exporters from Europe’s €90 Carbon Price?"
16. "The "Mother of All Deals" & MSMEs in India" 
17. "The Great Diversification: Why the India-EU Pact is New Delhi’s Strategic Shield Against Global Tariff Wars"

Each article includes internal links to /verify, /carbon-credits, /climate-finance, /pricing

---

## Priority 3: Partner vs MSME Separation (CRITICAL)

### Current State Analysis
- Auth.tsx already creates partner context on signup
- PartnerDashboard.tsx has access control checking user_contexts
- Profile.tsx is MSME-focused (GSTIN, sector, size)

### Issues to Fix

**A. Partner Profile Model (New: PartnerProfile.tsx)**
Create distinct partner profile page with:
- Organization name and type (Bank, Carbon Buyer, ERP)
- API access status
- Portfolio overview
- Different pricing display (enterprise tier)
- No GSTIN/MSME fields

**B. Route Protection Enhancement**
Update protected routes to check context type:
- /dashboard, /reports, /mrv-dashboard, /verify, /monetize → MSME only
- /partner-dashboard, /partner-marketplace → Partner only
- /intelligence, /marketplace → Shared access

**C. Navigation Context Awareness (Navigation.tsx)**
Show different nav items based on active context:
- MSME: Upload, Dashboard, History, MRV, Intelligence, Verify, Monetize, Reports
- Partner: Dashboard, Marketplace, Intelligence, Credits, Reports

**D. Redirect Logic (Auth.tsx)**
Already implemented - creates user_context with type='partner' and redirects to /partner-dashboard

---

## Priority 4: Marketplace Listing Details & Partner Type Routing

### Listing Details Enhancement
Current CarbonMarketplace.tsx has rich listing cards with:
- Project name, location, type, vintage
- Price and available tonnes
- SDG goals, co-benefits
- Verifier and methodology
- Full detail dialog with Express Interest

This is already well-implemented. No changes needed to listing display.

### Express Interest Flow
Already implemented with send-purchase-enquiry edge function that:
- Captures buyer details (name, email, company, phone, quantity)
- Sends structured email with full listing metadata
- Confirms submission to user

### Partner Type Routing (Future Enhancement)
Based on partner_applications.organization_type:
- "carbon-buyers" → Marketplace + Credit analytics
- "banks" → Green loan pipeline + Risk scoring
- "erp" → API docs + Integration status

For now, all partners route to /partner-dashboard which provides credit buyer view.

---

## Technical Implementation Summary

| File | Changes |
|------|---------|
| About.tsx | Global narrative updates (3 text changes) |
| CarbonCredits.tsx | CCTS → Global Standards metric |
| ClimateFinance.tsx | Add global market context |
| cmsContent.ts | Add 12 new SEO-optimized articles |
| public/favicon.ico | Copy existing logo to favicon format |
| PartnerProfile.tsx | NEW: Distinct partner profile page |
| Navigation.tsx | Context-aware nav items |
| App.tsx | Add partner-profile route |
| Profile.tsx | Add redirect for partners to PartnerProfile |

---

## Performance & UX Guarantees

- No new dependencies added
- All changes are content/text updates or route additions
- Existing page structures preserved
- No core logic modifications
- Lazy loading maintained for new routes
