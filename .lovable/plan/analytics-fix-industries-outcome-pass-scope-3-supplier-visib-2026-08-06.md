# Analytics fix, Industries outcome pass, Scope 3 supplier visibility

## 1. GA4 is loading but sending nothing — confirmed root cause

I tested the live production site with a real browser. Findings:

- `https://senseible.earth/` serves the same build as the published app (`index-DUDEBnQN.js`), and that bundle does contain `G-7DJ1WVE5R3`.
- The Google tag script loads: a request to `googletagmanager.com/gtag/js?id=G-7DJ1WVE5R3` fires.
- **Zero** measurement requests (`/g/collect`) are sent. That is exactly why GA shows "Data collection isn't active" / "No data received".
- `window.dataLayer` contains our entries as plain arrays: `["js", ...]`, `["config","G-7DJ1WVE5R3",{send_page_view:false}]`, `["event","page_view",{...}]`.

Cause: `src/lib/analytics.ts` pushes a real `Array` into `dataLayer`. The Google tag only processes the `arguments` object form (`function gtag(){dataLayer.push(arguments)}`); array-shaped entries are ignored, so `config` never initialises the property and no hit is ever sent. The Measurement ID is correct and will not change.

Fix:
- Rewrite the `gtag` helper to push `arguments` (canonical snippet), keeping the same exported API (`initAnalytics`, `trackPageView`, `trackEvent`).
- Load the tag from `index.html` with the standard inline snippet so the tag exists before React hydrates and on static pre-rendered routes too, with `send_page_view: false`; `AnalyticsTracker` keeps sending one `page_view` per SPA route (including the first).
- Re-verify on the live domain after deploy: assert at least one `google-analytics.com/g/collect` request with `en=page_view` on initial load and on a client-side navigation.

## 2. GA4 event tracking for key actions

Add a small typed event layer in `src/lib/analytics.ts` (`trackEvent` wrappers) and call it from existing handlers only — no logic changes:

| Event | Where | Params |
| --- | --- | --- |
| `sign_up` | `Auth.tsx` signup success | `method`, `context_type` |
| `login` | `Auth.tsx` signin success | `method` |
| `password_reset_complete` | `ResetPassword.tsx` after update | — |
| `calculator_run_start` | each calculator's compute action | `calculator`, `country` |
| `calculator_export` | export/download handlers | `calculator`, `format` |
| `report_export` | `Reports.tsx` PDF/Excel export | `framework`, `format` |
| `document_upload` / `mrv_verify_complete` | document input, verify flow | `outcome` |

No PII (no email, GSTIN, document hashes, business names) is ever sent as a parameter.

## 3. Industries: visual-outcome pass

Finish the pass on `src/pages/Industries.tsx` + `src/data/industryPipeline.ts`, keeping existing information:

- Convert each industry's four pipeline layers into a scannable outcome strip: what becomes visible, what gets verified, what Scope 3 evidence is produced, what monetization path opens — each with a labelled metric and a stated basis, not a claim.
- Every number keeps its source label (IEA 2023 grid factors, CBAM CN benchmarks, published sector intensities). No customer results, no invented case studies, no "up to X%" marketing.
- Remove template duplication: one shared outcome/metric component; per-industry text kept genuinely sector-specific (emission hotspots, document types, buyer requirements, applicable frameworks).
- Add a consistent tail on each page: decarbonization levers → certification-ready evidence → monetization (marketplace / climate finance), linking to the relevant existing pages rather than repeating their content.
- Navigation: industries surfaced consistently from nav/footer and cross-linked from Solutions, Platform and Trust so the journey reads the same across the platform.

## 4. Scope 3 supplier emissions visibility (end-to-end)

Built entirely on data already in the platform (`documents.vendor`, `emissions`, `compliance_ledger`) — no fabricated supplier data.

- New `src/lib/supplierLedger.ts`: groups a user's verified documents by vendor into a supplier ledger with spend/quantity, mapped Scope 3 category, emission-factor basis, evidence count, and a data-quality tier (primary invoice vs factor-derived).
- New `src/hooks/useSupplierCoverage.ts`: computes coverage (share of Scope 3 spend with verified evidence), and an explicit **gap list** — suppliers with no documents, missing HSN/CN codes, or unsupported categories.
- New Scope 3 supplier surface under the MRV workspace: supplier table with coverage state, gap reasons, and per-supplier evidence drill-down. Anything not computable is shown as a stated gap, never estimated silently.
- Certification-ready export: supplier coverage annex added to the existing framework report engine (GHG Protocol Scope 3, ISO 14064-1, CBAM, BRSR Core) using the same verified dataset, with completeness and data-quality declared.
- Connecting suppliers: reuse the existing marketplace/enquiry flow so an enterprise can request evidence from a gap supplier; no new messaging system, no claims about supplier certification we cannot verify.

## 5. SEO across public pages

- Ensure every public route uses `SEOHead` with a unique title/description, canonical, breadcrumbs, and route-appropriate JSON-LD; add per-industry and per-supplier-solution entries to `public/sitemap.xml` and the static HTML generator.
- Authenticated/confidential surfaces (dashboard, MRV, reports, settings, billing, team, partner, admin) get `noIndex` and stay out of the sitemap.

## Technical notes

- `analytics.ts` keeps its current exports so no call sites break; only the dataLayer push shape and the bootstrap location change.
- No database schema change is required for supplier visibility; it is derived from existing tables under current RLS.
- Verification after deploy: live-domain browser check for `g/collect` page_view plus one event, and a typecheck run.
