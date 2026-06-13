## Scope

Six focused changes. Nothing existing gets duplicated; MRV logic, schemas, and edge functions are untouched.

---

### 1. Trust page — Climate / Green Finance section rewrite

Source of truth: `public/md/climate-finance.md` (already grounded, no claims of being a lender).

Rewrite the `finance` section in `src/pages/Trust.tsx` around the four real mechanics:

- Verified Scope 1/2/3 baseline as an underwriting input.
- Confidence bands per scope (no false precision).
- Climate Credibility Score (0–100, A+/A/B/C/D) as a single signal.
- SHA-256 evidence hashes for spot-audit.

Add three concrete bank/finance use cases pulled from `climate-finance.md`:

- Sustainability-Linked Loans (SIDBI / IREDA / commercial banks) — KPI is the verified baseline trend.
- Receivables factoring on green invoices — verified solar/EV/forestation invoices unlock advance.
- Trade finance under CBAM — verified actuals replace EU defaults to reduce destination cost.

Remove or reword any line that implies guaranteed approval, fixed rate, or that Senseible is a lender. Replace with "decision-grade signal" / "underwriting input" phrasing already used in `climate-finance.md`.

### 2. Trust page — Greenwashing section replaced with Phase 2D version

Replace the current `greenwashing` block in `Trust.tsx` with the structural-defense version already drafted in `public/md/trust.md` (six mechanisms: SHA-256 dedup, immutable pre-processing stubs, methodology + factor pinning per output, deterministic failure on missing inputs, additionality lock on credit-eligible records, cross-MSME peer challenge).

Render as six tight cards with one-line mechanism + one-line "what it prevents". No essay paragraphs, no "illustrative only" disclaimers, no "public version v1" tags, no "without exposing…" phrasing. Same narrative flow as the rest of the page.

### 3. Trust page — market-aware Scope 3 copy

Today the Scope 3 block reads India-first. Make it region-aware using the existing country selector in `src/lib/countryConfig.ts` (already loads grid factors + tax IDs for 10 countries).

Implementation: read the active country from `countryConfig` and render the Scope 3 examples dynamically:

- Counterparty ID label: GSTIN (IN), NPWP (ID), MST (VN), TIN (TH/PH/MY), BIN (BD), NTN (PK), CNPJ (BR), VAT (EU), UEN (SG), TIN (LK).
- One example sentence per region using that ID and the local grid factor source.
- Peer-cluster benchmark line stays universal.

No new country data added — only surfacing what `countryConfig` already holds. Jurisdiction-specific frameworks (CBAM, BRSR, CSRD, ISSB) stay precisely tagged to the country that owns them.

### 4. Per-page OG / social preview images

Today every page falls back to one generic OG image. Generate distinct OG cards (1200×630) for the high-traffic public routes using the agent image tool (premium tier, because they contain text):

Routes to cover: `/`, `/trust`, `/climate-finance`, `/net-zero`, `/cbam-calculator`, `/mission`, `/about`, `/partners`, `/industries`, `/pricing`, `/contact`, and the new `/platform` page.

Design system (Apple-product-launch register while align with platform theme and context):

- Pure white background, generous negative space.
- Single-line headline in Senseible's existing display type, page-specific.
- One small monochrome glyph drawn from the page's own iconography.
- Senseible wordmark bottom-left, one-line descriptor bottom-right.
- No gradients, no stock illustrations, no badges, no India-only flags.

Files saved under `src/assets/og/{route}.jpg`. `SEOHead.tsx` extended to accept an `ogImage` prop and each page passes its asset. The current global fallback stays for any route that doesn't ship a custom card.

### 5. Legal + critical pages — markdown formatting fix

Root cause: `src/pages/Legal.tsx` and several markdown-driven pages render `section.content` with `whitespace-pre-wrap`, so literal `**bold**` and `-` bullets show as raw characters (the screenshot you shared — "**1.1 Platform Classification**" — is exactly this).

Fix: route all long-form content through the existing `src/components/FormattedContent.tsx` (or extend it minimally) so `**…**`, `*…*`, `-` / `1.` lists, and headings render as real HTML. Single shared renderer, no per-page hacks.

Pages to switch over in the same pass:

- `Legal.tsx` (all 4 documents)
- `About.tsx`, `Mission.tsx`, `Principles.tsx`, `ClimateFinance.tsx`, `NetZero.tsx`, `CarbonCredits.tsx`, `Trust.tsx` long-form blocks, `CBAMCalculator.tsx` intro copy

No content rewrites here — purely a rendering fix so the existing markdown reads cleanly.

### 6. New `/platform` landing page (NOT the homepage)

A dedicated explainer for first-time visitors — clients, enterprises, MSMEs, climate-finance partners, policymakers, carbon buyers. Homepage at `/` stays exactly as-is.

Route: `/platform`, added to `App.tsx`, `sitemap.xml`, `llms.txt`, footer, and the `MinimalNav` "Learn more" group.

Sections (conversational, Ogilvy/Godin register, one question per section):

1. **What is Senseible?** — one paragraph, plain language, no jargon.
2. **Who is it for?** — six audience chips (MSME, Enterprise, Lender, Policy, Carbon Buyer, Ecosystem Partner). Each chip expands one sentence.
3. **What problem does it solve?** — the verification gap in emerging-market climate data, framed globally (not India-only).
4. **How it works** — three steps: capture → verify → use (link to `/trust` for depth, don't repeat methodology).
5. **What you can do with verified data** — four outcome cards: report, finance, decarbonize, monetize. Each links to the existing page (`/climate-finance`, `/net-zero`, `/carbon-credits`, the relevant calculator).
6. **Trust in one line** — Climate Credibility Score band + SHA-256 hash + framework coverage strip. Links to `/trust`.
7. **Industries** — strip linking to existing `/industries` sector pages.
8. **Where it works** — 10-country strip (already in `countryConfig`).
9. **Next action** — two CTAs only: "Decarbonize" (homepage) and "Talk to us" (`/contact`). No pricing, no signup wall.

Design rules:

- Reuses existing tokens, type, and `MinimalNav` / `Footer`. No new design system.
- Mobile-first, single-column on phones, two-column on desktop where it helps.
- i18n: every string goes through `useTranslation`, keys added to `en.json` and the 10 locale files (English source, others get the English string until translated — same pattern the rest of the site uses).
- SEO: page-specific `<title>`, meta description, canonical, JSON-LD `WebPage` + `Organization`, the new `/platform` OG image from step 4.
- No confidential methodology, no competitive-advantage detail — all depth links to `/trust`.

---

## Technical notes

- Trust section rewrites are edits to `src/pages/Trust.tsx` arrays; no component restructure.
- Scope 3 region awareness uses the existing `useCountry`/`countryConfig` hook — no new state, no new tables.
- `FormattedContent.tsx` already exists; extending it is cheaper than introducing `react-markdown`.
- OG images: one image per route under `src/assets/og/`, imported as ES modules. `SEOHead` reads an optional `ogImage` prop.
- `/platform` is a new route file `src/pages/Platform.tsx` + lazy import in `App.tsx`. No backend, no schema changes.
- `sitemap.xml`, `robots.txt`, `llms.txt`, `scripts/generate-static-html.js` updated so `/platform` is pre-rendered and indexable.

## Out of scope

- MRV logic, edge functions, RLS, schemas — untouched.
- Homepage `/` — untouched.
- New copy for legal documents — only the renderer changes.
- New translations beyond English — the i18n keys land in every locale file with the English string as fallback.

## One open choice

Route name for the new landing page. Plan assumes `/platform`. If you'd rather use `/overview`, `/start`, or `/what-is-senseible`, say so before I build and I'll swap it everywhere (sitemap, llms.txt, OG asset filename, nav).