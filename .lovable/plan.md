# Trust & Technical Validation Page — Plan

## Goal

A single public page at `/trust` (titled "Trust & Technical Validation") that explains *how* Senseible validates MSME climate data — for partners, auditors, climate-finance providers, credit buyers, enterprises, and investors. Modeled on the existing `Industries` page pattern (category-tabbed long-form), matching current theme, nav, and SEO architecture. **No changes to logic, math, calculators, schemas, or edge functions.**

## Scope (presentation-only)

### New files

- `src/pages/Trust.tsx` — the page
- `src/data/trustLayerContent.ts` — static content (sections, FAQs, framework matrix, evidence pathways)
- `public/md/trust.md` — markdown mirror for LLM/AI crawlers (follows existing `public/md/*` pattern)

### Edits (minimal, additive only)

- `src/App.tsx` — add `<Route path="/trust" element={<Trust />} />` (lazy import, same pattern as siblings)
- `src/components/Footer.tsx` — add "Trust & Validation" link under Platform/Solutions column
- `public/sitemap.xml` — add `/trust` entry + `/md/trust.md`
- `public/robots.txt` — add `Allow: /trust`
- `public/llms.txt` — add Trust page entry under Platform section

No edits to: Navigation primary menu (footer-only per request), calculators, MRV engines, types, RLS, or any backend.

## Page Structure

Hero → sticky in-page nav (anchor links) → 11 thematic sections → FAQ → CTAs (Contact / Partners / Pricing).

Sections (each a `<section id>` with icon, intro, evidence blocks, no proprietary detail):

1. **Trust Layers Overview** — 4-layer model: Evidence → Verification → Attestation → Disclosure. Uses existing `TrustScoreGauge` visual language (no logic change, presentation re-use).
2. **Data Sources & Verification** — Cards for: utility bills, GST/tax invoices, IoT meters, ops records, satellite/geo signals, supplier evidence, ERP imports. Each lists *what we collect, what we verify, what we never store*.
3. **MRV Architecture** — Public-safe block diagram (ingest → parse → deterministic rules → SHA-256 evidence → attestation). References existing principles from `public/md/principles.md`.
4. **ESG Intelligence Engine** — How structured outputs map to disclosures (high level only; no algorithms).
5. **Reporting Frameworks Matrix** — Table: CBAM, BRSR, GHG Protocol, CSRD, ISSB, TCFD, GRI, SBTi — coverage, evidence type, output format. Sourced from `src/lib/reportFrameworks.ts` (read-only).
6. **Scope 3 Traceability** — Supplier evidence chain, buyer-GSTIN linkage rationale (re-uses public-safe language from existing Scope 3 memory).
7. **Carbon & Confidence Scoring** — Inputs, weighting categories, grade bands (A+/A/B/C/D) — high-level; mirrors `src/lib/credibilityScore.ts` *description only*, no formulas exposed beyond what's already public.
8. **Greenwashing Prevention** — SHA-256 dedupe, immutable stubs, explicit-failure principle, cross-tenant isolation.
9. **Carbon Credit Validation** — Additionality, VCM-readiness flagging, evidence-to-credit linkage, methodology version locking.
10. **Climate Finance Readiness** — How verified evidence becomes lender-ready signals; embedded-finance eligibility checks.
11. **Net-Zero Enablement** — Baseline → roadmap → tracked tasks (references `netZeroEngine` capability, not internals).

Plus:

- **Governance & Security** subsection — RLS-by-default, IP hashing, audit ledger, methodology version pinning.
- **Outcomes** — 3–4 anonymised, generic outcome statements ("a textile exporter cut CBAM exposure by X% after 6 weeks") — no customer names, no confidential numbers; clearly labelled "illustrative".
- **FAQ** — 8–10 Qs targeting partner/auditor/buyer/lender intents (feeds FAQPage schema).

## Design & UX

- Matches existing `Industries.tsx` layout: hero, sticky tab/anchor nav, alternating section bands, semantic tokens only (no hardcoded colors).
- Reuses existing components where presentational: `Card`, `Badge`, `Accordion` (FAQ), `Separator`, lucide icons.
- Static SVG/CSS diagrams for MRV flow and Trust Layers (no new deps, no Three.js).
- Fully responsive, mobile-friendly, lazy-loaded route (code-split).
- Visual trust indicators: badge chips ("Deterministic", "SHA-256 evidence", "RLS isolated", "Methodology-pinned").

## SEO / GEO / AI-search

- `SEOHead` with: title "Trust & Technical Validation | Senseible", description (<160c), canonical `/trust`, breadcrumbs, FAQPage JSON-LD, Article-style schema.
- Single H1, semantic H2s per section.
- `public/md/trust.md` plain-text mirror for LLM crawlers.
- Sitemap + robots + llms.txt updated.
- Keyword set: MRV validation, Scope 3 traceability, carbon confidence score, greenwashing prevention, CBAM evidence, climate finance readiness.

## Guardrails (explicit)

- No edits to: calculators, edge functions, `supabase/`, `integrations/supabase/`, RLS, schemas, scoring math, or any existing page beyond Footer + App routes.
- No exposure of: algorithm weights, prompt templates, model names, customer identities, internal SHA strategies beyond the already-public "SHA-256 dedupe" fact, or any proprietary heuristic.
- All "outcomes" are explicitly labelled illustrative.
- Content sourced only from already-public memory entries and existing public files (`public/md/principles.md`, `llms.txt`, etc.).

## Verification before delivery

- Route loads, no console errors, Lighthouse mobile pass.
- Footer link visible; no duplicate sitemap entries.
- FAQ accordion + anchor nav work on mobile.
- No regression to `/industries`, `/pricing`, `/`.

## Out of scope (not in this task)

- Primary Navigation changes (footer placement only, per request).
- Any logged-in/dashboard surface.
- Translations beyond English (mirrors current public pages).