# Phased Deployment: Industries, MRV vs Dashboard, Reporting Engine

Three independent workstreams, deployed in phases so nothing ships half-finished. No schema changes, no methodology changes, no removal of existing features.

## Verified current state

- `src/pages/Industries.tsx` holds 7 industries with scope source lists, reduction strategies and a `caseStudy` object (textile has `company: "Mid-size Tirupur Exporter", reduction: "35%", savings: "₹18L/year"`) — these figures are not traceable to any platform record, so they read as invented case studies.
- `src/pages/Dashboard.tsx` and `src/pages/MRVDashboard.tsx` overlap: both load `useEmissions` + `useDocuments`, both show verification state and totals. Neither has time-range or scope filtering.
- `src/lib/frameworkReports.ts` has framework-specific PDF/Excel sections for only 4 IDs: `GHG_PROTOCOL`, `ISO_14064`, `INDIA_BRSR`, `CBAM`. Every other framework in `FRAMEWORKS` (GRI 305, SASB, TCFD, ISSB S1/S2, CSRD/ESRS, CDP, SBTi, UN SDGs, TNFD, CPCB) falls through to a generic body.
- `FRAMEWORKS` has no ISO 14067 (product carbon footprint), no BRSR Core, no bank/lender disclosure view.
- `src/pages/Reports.tsx` still contains legacy `generateESGReport` / `generateExcelReport` alongside the new `downloadFramework` — two generators over the same data.
- "VCM Ready" wording appears in `src/pages/Reports.tsx`.
- Dates/numbers in report exports are not passed through a locale/region formatter tied to the stored profile language.

---

## Phase 1 — Industry pages: replace invented case studies with traceable, industry-specific mechanics

Keep every existing section (scope sources, reduction strategies, keywords, calculator link). Add, per industry, a structured "how this works on the ground" layer written as mechanics, not marketing:

1. **Visibility layer** — which document types in that industry actually carry the emission signal (e.g. power bills with sanctioned load, coal/coke purchase invoices, freight LR/e-way bills), what gets extracted, and which scope each maps to under the existing deterministic HSN/category logic.
2. **Verification layer** — the failure modes specific to that industry (missing units on a dyeing-house utility bill, tonne-km absent on a freight invoice) and what the platform returns instead of a number when evidence is short.
3. **Scope 3 / supply-chain layer** — how a supplier in that industry becomes visible to its buyer: which identifier links them (region-aware via `getCountryConfig`), what the buyer sees (verified scope split, confidence, evidence hash) and what stays private.
4. **Monetization layer** — which pathway is realistically reachable from that industry's evidence: green-invoice advance, CBAM exposure reduction through actual-vs-default emissions, or marketplace listing eligibility. Stated as conditions and mechanics, never as a promised amount.

Rules for the copy:
- No invented company names, percentages, rupee savings or timeframes. The existing `caseStudy` blocks with unverifiable figures are removed and replaced by the mechanics above (this is the only removal in the phase, and it removes fabricated content).
- Each industry gets a genuinely different emphasis so the layers do not repeat across pages: textile → CBAM + buyer scope 3; steel → hard-to-abate + actual-vs-default; logistics → tonne-km and freight evidence; construction → embodied materials; chemicals → process emissions; auto → tier-N supplier visibility; food/agri → cold chain and grid factor.
- Where a claim needs a number, it cites a published source already used by the platform (IEA 2023 grid factors, EU CBAM default values, CN/HSN codes) — not platform performance.

## Phase 2 — Separate MRV workspace from Dashboard intelligence

**Dashboard = decision intelligence.** Add a filter bar (time range: 30d / 90d / FY / custom; scope; category; verification status) that drives every panel on the page. Panels become: trend over the selected window with period-over-period delta, scope mix, verified vs unverified share, top emission categories, and an evidence-completeness indicator. All values are aggregated client-side from the same `useEmissions` / ledger records already loaded — no new calculations, no new factors.

**MRV = operational workspace.** Keeps and sharpens: queue of unverified emissions, per-document verification actions, evidence hashes, validation failures with the exact reason, methodology version, and re-verify. Remove the summary tiles that duplicate the Dashboard so the two surfaces stop mirroring each other; MRV links to Dashboard for analysis.

Filtering is presentation-only: no stored aggregate, no change to any stored value.

## Phase 3 — One evidence layer, many framework views

Consolidate to a single dataset builder (extend the existing `ReportDataset` from `useReportEvidence`) that every export reads. Legacy `generateESGReport` / `generateExcelReport` become a "Senseible summary" *view* over that same dataset rather than a second generator, so no download disappears.

Extend the dataset metadata block, applied uniformly to every framework export:
organizational boundary, reporting period, base year, scope 1/2/3 categorisation, methodology + version, emission factors and their sources, assumptions, evidence hashes, data quality, completeness %, assurance status (self-reported unless assured), and an explicit **Not Applicable** vs **Data Gap** classification per disclosure — never a filled-in estimate.

Add framework view definitions (structure + disclosure index only; no new numbers):
- ISSB IFRS S1 and S2 as the primary climate disclosure, with TCFD retained and marked as superseded/mapped to S2 rather than deleted.
- GRI 305, SASB, CSRD/ESRS E1, CDP, CPCB, SBTi, UN SDGs — full section templates instead of the current generic fallback.
- ISO 14067 (product carbon footprint) — available only when product-level evidence (HSN-coded ledger rows) exists; otherwise shown as not applicable with the reason.
- SEBI BRSR **Core** alongside existing BRSR.
- Lender/bank, investor and government views: the same dataset rendered to what each reader needs (baseline, confidence, evidence traceability, gaps).

Also in this phase:
- Replace "VCM Ready" with an evidence-based market-compatibility statement that separates *disclosure readiness* from *carbon-credit project eligibility*, with the criteria that produced it listed.
- Every framework in `FRAMEWORKS` becomes selectable in the UI with its computed coverage; a framework that cannot be evidenced shows the gap and disables the export rather than producing a hollow file.
- Audit and rewrite any instruction text in Reports that overstates acceptance or certification.

## Phase 4 — Localised report output

Dates, numbers and units in PDF and Excel exports format from the stored profile language + region (`preferred_language`, location → `getCountryConfig`), not the browser. Currency and identifier labels (GSTIN / NPWP / TIN) follow the same config. Identifiers, hashes and framework reference codes stay untranslated, consistent with the existing translation-masking rule.

## Technical notes

- Files touched: `src/pages/Industries.tsx`, `src/pages/Dashboard.tsx`, `src/pages/MRVDashboard.tsx`, `src/components/dashboard/*`, `src/lib/reportFrameworks.ts`, `src/lib/frameworkReports.ts`, `src/pages/Reports.tsx`, `src/hooks/useReportEvidence.ts`, plus a new locale-formatting helper and i18n keys.
- No database migrations. No edge function changes. No change to emission factors, scope mapping, calculators or verification logic.
- Framework additions are declarative entries in `FRAMEWORKS` plus section templates; the assessment engine (`assessFramework`, `availabilityFromRecords`) is reused unchanged so coverage stays evidence-driven.
- Each phase ships complete and independently; new user-facing strings are added to all locale files in the phase that introduces them.
