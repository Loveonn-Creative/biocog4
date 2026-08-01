# Platform Quality, Intelligence & Reliability Audit — Deployment Plan

Scope: correctness, grounding and trust. No new product surfaces, no schema rewrites, no changes to verified carbon methodology, pricing or payment logic. Existing UI, routes and APIs stay as they are unless a verified defect is listed below.

## Verified findings (confirmed by reading the code)

1. **Language is not a profile-level preference.** `profiles.preferred_language` exists in the schema but nothing writes it. `LanguageProvider` resolves locale from `localStorage` then browser language only, and Settings has no language control. So a user's choice does not follow them across devices or sessions.
2. **Biocog Intelligence context is thin and partly invented.** `Intelligence.tsx` sends only scope totals plus `sector: 'MSME'` (a literal), and a `greenScore` computed as `100 - documentCount * 2`, which is not a real score. The chat function is called with the anon key and never reads the caller's identity, so it cannot see the signed-in user's documents, reports, calculations or permissions. Result: generic answers for signed-in users.
3. **Partner Dashboard shows randomized numbers.** `src/pages/PartnerDashboard.tsx` lines ~184-195 generate `baselineVsActual`, `status` and `baseline` with `Math.random()`. These are presented as MRV portfolio signals.
4. **Framework reporting is a coverage map, not a framework-shaped report.** `reportFrameworks.ts` marks most frameworks `partial`, and the PDF/Excel export renders one common layout with a framework list appended, so choosing BRSR vs ISO 14064 vs GHG Protocol does not change report structure.
5. Calculator engines themselves are formula-driven (the `Math.random()` hits there are only element IDs) — they need a confidence/insufficient-data path, not a rewrite.

## Phase 1 — Language as a platform capability

- Add a **Language** section in Settings (alongside Company profile) listing all supported locales with native names and region grouping.
- Persist the choice to `profiles.preferred_language` for signed-in users; keep `localStorage` as the guest and offline layer.
- Resolution order in `LanguageProvider`: profile value → stored local value → browser language → English. On sign-in, the profile value wins and overwrites the local value; on change from either surface, both are written.
- The existing nav language icon becomes a thin quick-switch that calls the same single setter — no duplicated persistence logic.
- Sweep for language leaks: Voice AI prompt/response language, toasts, PDF/Excel report labels, calculator labels, onboarding, notification emails, and edge-function-generated strings. Numbers, units, identifiers, hashes and framework codes stay untranslated (rules already in the DOM translator).
- Layout safety: verify long-expansion locales (Tamil, Malayalam, German-length strings) and RTL (Urdu/Arabic) on Dashboard, Reports, Calculators and Settings. Keep `lang`/`dir` on `<html>`, keep canonical and hreflang untouched so SEO and AI-search indexing are unaffected.

## Phase 2 — Grounded Biocog Intelligence & SuperIntelligence

- `intelligence-chat` verifies the caller's JWT and derives `user_id` server-side. No client-supplied identity is trusted.
- When authenticated, the function assembles context **server-side** from that user's own rows only: profile, emissions by scope, recent documents (name, date, verification status, hash — never raw content), saved calculator runs, generated reports, subscription tier and role. Every query is scoped by `user_id` and relies on existing RLS.
- Remove the fabricated `greenScore` from the client and use the implemented Climate Credibility Score, or omit the field when it cannot be computed.
- Add a **platform-knowledge layer** so the assistant can answer "how do I create a report / download an invoice / change my language / see my MRV records" from real navigation and capability facts, with the correct route named.
- Guests get the platform-knowledge layer only, plus an explicit "sign in to see your own data" path — no invented figures.
- Explicit instruction: if a figure is not present in the supplied context, say so and point to the action that produces it. Never estimate a user's emissions.
- Voice AI uses the same grounded endpoint and the same language resolution, so spoken answers match the on-screen state.

## Phase 3 — Calculators and climate engines

- Audit each engine (`carbonPricing`, `energyTransition`, `logistics`, `pcf`, `supplierRisk`) against its stated factor source and methodology; document the source and vintage of every constant in-code.
- Add a shared **result confidence contract**: each run returns value, method, factor source and a completeness state. When required inputs are missing or out of supported range, the UI returns transparent guidance ("we need X to compute this") instead of a number.
- Surface the applied methodology and factor vintage next to each result so outputs are traceable.

## Phase 4 — Reporting fidelity

- Give each supported framework a **structure definition** (section order, disclosure codes, required metrics, units) and render the export against it, so BRSR, ISO 14064, GHG Protocol, GRI 305, TCFD and ISSB each produce a report shaped like that framework — all drawn from the same verified dataset, with no change to source evidence.
- Every report gains an evidence and completeness block: which disclosures are fully covered, which are partial and why, what assumptions and factors were applied, and the evidence hashes behind the figures.
- Replace any acceptance language with accurate framing: reports are prepared **aligned to** a framework and are self-declared, not certified or pre-accepted by any regulator, lender or investor. Assurance readiness is described in terms of what an auditor would still need.
- Review the output against the enterprise / investor / lender / regulator / supply-chain reader, and confirm each can see confidence, completeness, assumptions and evidence at a glance.

## Phase 5 — Remove simulated signals

- Replace the randomized Partner Dashboard portfolio figures with real aggregates from partner-visible MRV records. Where a partner has no linked data, render an honest empty state rather than generated numbers.
- Repeat the sweep across dashboards, monetization and climate-finance signals: any indicator that cannot be computed from real records is either computed properly or disabled with an explanation.
- Climate-finance readiness, carbon grading and climate-risk scores get a visible breakdown of their inputs and weights so each score is explainable and traceable.

## Phase 6 — Reference-informed additions (from the attached ESG dashboard screens)

The attached Consolyx screens are used only to identify data points we are missing. We are not adopting their module structure or workflow. Lightweight, architecture-preserving additions:

- **Targets vs actuals**: the existing Net-Zero engine already stores targets; add a compact target table view (actual, end target, years left, required change per year, on/off track) computed from existing records — no new engine.
- **Framework disclosure index**: a per-report content index (framework, code, disclosure, mapped metric, reported value, status) generated from the Phase 4 structure definitions.
- **Coverage indicators**: records captured, validated share, and quantitative coverage percentage, derived from existing document and emission tables.

Non-goals from the reference: multi-node group hierarchies, water/waste/social/governance data capture, and a separate reporting module. Those would change the architecture and are out of scope.

## Technical notes

- Edge functions touched: `intelligence-chat` (JWT verification plus server-side context assembly), and the report generation path for framework structures.
- Client: `LanguageProvider` gains a profile-backed source of truth; Settings gains a language section; `Intelligence.tsx` stops computing pseudo-scores.
- New data: none required beyond the existing `profiles.preferred_language` column. No schema migration is expected; if a report-structure table proves necessary it will be additive with grants and RLS.
- Verification per phase: typecheck, a Playwright pass over language switching on Dashboard/Reports/Calculators/Settings, a signed-in chat query that must cite the user's own records, and one export per framework compared against that framework's required sections.

## Sequencing

Phases 1 and 2 ship first (they are the user-reported defects), then 3, 4 and 5, with Phase 6 last. Each phase ships complete — no partially wired surfaces.
