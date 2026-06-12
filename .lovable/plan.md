
# Trust Page Rewrite + Language Switcher Fix

Scope is **content + copy + minor UX** only. No changes to MRV engine, calculators, math, RLS, edge functions, schemas, or routing.

## 1. Trust page (`src/pages/Trust.tsx`, `public/md/trust.md`)

### Remove (per feedback #2)
- The `Public reference · v1` badge.
- The `Illustrative outcomes` block and the "*Illustrative only. No customer identities or confidential figures are disclosed.*" caption.
- The phrase "without exposing what makes the underlying methodology proprietary" and any equivalent internal-facing language across the page.

### Align Trust Layers with platform definition (feedback #1)
Replace the current 4-layer text with the canonical model already used across the platform (memory: trust-score-gauge, compliance-ledger, ocr-mrv-deduplication, climate-credibility-score):

1. **Evidence Layer** — SHA-256 fingerprinting before processing, universal dedup, immutable pre-processing stub.
2. **Verification Layer** — Deterministic HSN→scope mapping, IEA 2023 grid factors, math reconciliation, explicit failure reasons.
3. **Intelligence Layer** — Scope ledger as single source of truth; Biocog superintelligence projects it into every framework view non-destructively.
4. **Disclosure & Decision Layer** — Framework-aligned outputs (CBAM, BRSR, GHG Protocol, CSRD, ISSB, TCFD, GRI, SBTi) carry the audit trail with confidence bands and Climate Credibility Score (A+/A/B/C/D).

Wording matches Principles + Climate Finance + Net-Zero pages so the narrative is identical across the platform.

### ESG Intelligence Engine — full rewrite (feedback #3)
Reposition from "structured outputs" to **outcome multiplier**. New section: *"One verified ledger. Every framework. Every decision."*

- **Do more in less time** — one ingestion event produces CBAM, BRSR, GHG Protocol, ISSB, CSRD, TCFD, GRI, SBTi disclosures with no re-keying. What took an ESG team weeks per framework collapses to a single verified record.
- **Reduce cost** — shared memory of invoices surfaces duplicate spend, high-emission supplier substitutes, and energy-mix arbitrage; every reduction is auto-routed into the Net-Zero engine as a tracked action.
- **Maximize net-zero progress** — Biocog superintelligence reuses historical scope data to recommend sector-specific reduction levers (energy, logistics, supplier swap, green-tariff) ranked by tCO₂e impact per ₹ saved.
- **Audit-ready by default** — methodology version + factor source + evidence hash locked at write time, so disclosures compound credibility rather than depreciate.

Tight callouts (no essay): "*Same ledger. Eight frameworks. Zero re-keying.*" / "*Every reduction action traces to a verified invoice.*"

### Scope 3 — emerging-markets reframing (feedback #4)
Replace India/GSTIN-only example with **multi-market positioning** + **enterprise pain point**.

- Headline: *"Supplier evidence enterprises can't gather alone."*
- Body: emerging-market supply chains lack PCFs; enterprises fall back on sector averages and lose CBAM, ISSB, CSRD defensibility. Senseible's MSME footprint turns that gap into a primary-data network.
- Counterparty linkage uses the **country tax identifier** auto-selected by country config: GSTIN (India), NPWP (Indonesia), TIN (Philippines), MST (Vietnam), TIN (Thailand), CNPJ (Brazil), RFC (Mexico), VAT (EU), UTR (UK) — listed as examples, not India-only.
- **Anomaly detection** — supplier emission intensity flagged when it deviates >2σ from cluster mean for the same HSN/CN code + country grid factor.
- **Cluster benchmarking** — Senseible's cross-MSME coverage establishes sector medians no single enterprise can reproduce in-house; buyers get *peer-normalized* supplier scores instead of generic industry averages.
- Positioning line (not essay): *"Your suppliers' real data, benchmarked against thousands of peers — not a sector average from 2019."*

### Greenwashing prevention — depth rewrite (feedback #5)
Reposition as the platform's **structural defense**, not a bullet list.

- **Universal SHA-256 dedup** across users, sessions, time → same invoice cannot be claimed by two MSMEs or twice by one.
- **Pre-processing stub** written before parsing → failed/abandoned runs still leave a record; no silent retries.
- **Methodology + factor pinning per output** → retroactive factor changes are visible in the audit trail, never overwritten.
- **Deterministic failure** → missing inputs produce a math-based reason; the platform never estimates to fill a gap.
- **Additionality lock for credits** → only records that clear additionality + evidence linkage + methodology lock are eligible for credit generation.
- Closing line: *"Verification you can challenge — and that holds up when challenged."*

(Lower-priority sub-features mentioned in image-32 — Audit Trail Export, Dispute Simulation, Data Connectors panel — are explicitly **deferred to a later phase** rather than half-built here.)

### Climate / Green Finance / Govt Incentives — full rewrite (feedback #6)
Mirror the existing `/climate-finance` page narrative so the platform speaks with one voice.

- **Why a lender can trust this data**:
  1. Every figure traces to a hash-pinned source document the lender can spot-audit.
  2. Confidence bands sit on every scope total — no false precision.
  3. Methodology version is locked at disclosure time; the lender always knows which factor produced which number.
  4. Climate Credibility Score (0–100, A+→D) gives a single underwriting-ready signal.
  5. Cross-MSME benchmarking lets lenders compare a borrower against verified peers — not self-reported claims.
- **What lenders actually receive**: instrument fit (green loan / factoring / SLL), eligibility band, evidence depth, confidence band — *not* the borrower's raw documents.
- **Government incentive layer**: same verified ledger maps to SIDBI, IREDA, MNRE, and equivalent emerging-market schemes (link out to `/climate-finance` for full list).
- Replaces vague "evidence lenders can act on" with concrete proof of *why* it's actionable.

### Narrative & design alignment (cross-cutting)
- Single H1, calm/regulator-safe tone (per Core memory), no marketing puffery.
- Same section rhythm as `/principles`, `/net-zero`, `/climate-finance`: small eyebrow label → bold statement → 2–3 sentence body → optional tight bullets / pill chips.
- All copy uses existing semantic tokens; no new colors or components.
- `public/md/trust.md` rewritten to mirror the new on-page narrative for LLM/AI crawlers.

## 2. CBAM page (`src/pages/CBAMCalculator.tsx`) — feedback #7
- Remove the `Free Tool` badge (line 181). Replace with the platform-consistent eyebrow used on `/principles` and `/net-zero` (small uppercase muted label, e.g. `CBAM EXPOSURE · EU REGULATION 2023/956`).
- No logic changes.

## 3. Language switcher — feedback #7
**Root cause**: the Globe button + `setLocale` flow works (state updates, localStorage writes, `useEffect` re-fetches the JSON), but most page copy is hard-coded English and does not consume `t()`, so the user perceives "nothing changes." A few additional defects:
- `MinimalNav` doesn't close the language popover on outside click — feels unresponsive.
- The `useEffect` that calls `detectInitialLocale` runs after the initial render with `en`, then resets to detected locale — causes a flash and, on some pages, the second render doesn't propagate because consumers read `translations` only once.

**Fixes (scoped, no arch change)**:
- Initialise `useState` with `detectInitialLocale()` lazily so locale is correct on first render (removes the flash + double-render race).
- Add outside-click + Escape dismissal to the language popover in `MinimalNav`.
- After `setLocale`, show a small toast ("Switching to हिन्दी…") so the user gets immediate feedback while the JSON loads.
- Audit `useTranslation` usage on Trust, CBAM, Climate Finance, Net-Zero, Principles, Index — wire the section headings + CTA labels (not body essays) through `t()` keys that already exist in `en.json`/`hi.json`/etc. Where a key is missing, fall back to the English string (already the default behaviour) — no new translation files generated in this pass.
- Keep the switcher visible only on pages that have meaningful translated strings (Trust will be added to that list after this pass).

## 4. Out of scope (deferred)
- Full translation of every page body into 11 languages (separate content pass).
- Audit Trail Export UI, Dispute Simulation UI, Data Connectors panel (Trust-page sub-features) — kept on backlog.
- Any change to `verify-carbon`, `extract-document`, calculators, RLS, schemas, sitemap structure.

## 5. Verification
- Trust page renders without `Public reference · v1`, `Illustrative…`, or "proprietary" disclaimer phrasing.
- ESG, Scope 3, Greenwashing, Climate Finance sections read as platform-consistent positioning (cross-checked against `/principles` and `/climate-finance` wording).
- CBAM page no longer shows `Free Tool` badge.
- Switching language from the Globe icon updates visible nav + Trust/CBAM section labels immediately, popover closes on outside click, toast confirms switch.
- No console errors, no route regressions, no changes to calculator math or MRV outputs.
