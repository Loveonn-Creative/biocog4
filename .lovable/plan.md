# Plan — Trust handoff, ClimateFinance / CarbonCredits depth, Platform page polish

Scope is strictly UI + content + i18n. No changes to MRV logic, edge functions, schemas, RLS, or other functional pages.

## 1. Trust page — remove deep sections, keep the handoff

`src/pages/Trust.tsx`

- **Remove** the deep `#finance` section (all six "why a lender can underwrite" cards + `financeUseCases` cards) and the `financeUseCases` constant.
- **Remove** the deep `#credits` section (three-gate cards).
- **Replace both** with a single tight "Where this verified ledger goes next" handoff block (2 cards, ~3 lines each):
  - **Climate & green finance →** one paragraph: lenders consume hash-pinned figures, confidence bands, methodology lock, Climate Credibility Score. CTA: *See the climate-finance flow → /climate-finance*.
  - **Carbon credit validation →** one paragraph: records that clear additionality + evidence linkage + methodology lock become credit-ready signals. CTA: *See carbon credit flow → /carbon-credits*.
- Update the in-page sticky nav (`sections` array, lines 32–33): collapse `credits` + `finance` into one entry `{ id: "handoff", label: "Where it goes next" }`.
- Keep greenwashing, scope3, scoring, governance, FAQ untouched.

## 2. ClimateFinance page — absorb the lender depth

`src/pages/ClimateFinance.tsx` — full rewrite, same shell (MinimalNav/Footer, `max-w-4xl`, `animate-fade-in`).

Sections, top to bottom:
1. Back link + H1 *Climate Finance* + lede: "Verified Senseible data is the primitive lenders, factors, and incentive desks consume — Senseible is not a lender."
2. **Why lenders can underwrite against this data** — 6-card grid migrated verbatim from Trust's current finance section (hash-pinned, confidence bands, methodology lock, Climate Credibility Score, peer comparison, decision-grade not raw).
3. **Where it gets consumed** — 3 use-case cards from `climate-finance.md`: SLLs via SIDBI/IREDA/commercial banks, green-invoice factoring (solar/EV/forestation), CBAM trade finance.
4. Keep existing **Opportunity cards** grid (Green Loans / Govt Incentives / Export Compliance / SLL) — reframed under heading "Opportunities this unlocks for MSMEs" and reworded to drop guaranteed-rate claims (e.g. "potential preferential rates", not "Save 0.5-2%"). Region-neutral copy with EM examples (drop the ₹-only line; add a USD/INR pairing).
5. Keep **What MSMEs Are Missing** block.
6. CTA card + footer cross-links → `/trust` (back to architecture) and `/carbon-credits`.
7. Add `SEOHead` with existing `climate-finance.jpg` OG.

## 3. CarbonCredits page — absorb credit-validation depth

`src/pages/CarbonCredits.tsx` — add (don't remove existing flow):
- New section after the lede, before "How It Works": **"From verified record to credit-ready signal"** with 3 gate cards migrated from Trust (Additionality flag / Evidence linkage / Methodology lock) + one sentence: "Buyers consume a decision-grade signal — not raw MSME data."
- Update footer cross-link target to `/trust`.
- Add `SEOHead` (no carbon-credits OG asset exists — reuse `trust.jpg` or `climate-finance.jpg`; pick climate-finance for thematic fit).
- Keep ₹/$ metric cards but make currency labels region-neutral.

> **Assumption (one open call):** the user's second bullet says "update in climate finance page" for carbon credits — interpreting this as "Carbon Credits page" (the natural home) since `/carbon-credits` already exists and ClimateFinance is now the lender story. If you actually want the credit-validation depth inside `/climate-finance` instead, say so and I'll move it.

## 4. Platform page — fix the four real complaints

`src/pages/Platform.tsx`

### 4a. Full i18n (no more hardcoded English)
- All `audiences[]`, `outcomes[]`, `steps[]` arrays already pass labels through `t()` with fallbacks — but the translation files don't contain the keys for non-English locales. Add the full `platform.*` key set (audiences.*.label/line, out.*.title/body/cta, how.01–03.title/body, who.*, problem.*, trust.*, where.*, cta.*) to all 10 non-English files: `bn, es, hi, id, mr, ta, th, tl, ur, vi`. Use the existing English copy as source; for non-English I'll provide accurate translations (not transliteration) consistent with `mem://technical/multilingual-support`.

### 4b. Remove decorative icons that serve no purpose
- Drop the standalone `Sparkles` icon above the final CTA (purely decorative, the user explicitly called it out).
- Keep functional/labelling icons (`Shield` on trust strip, `Building2` on industries, `Globe2` on markets, `FileCheck/Banknote/Target/Coins` on outcome cards) — each labels a category.
- The hero has no platform icon; the screenshot the user shared shows only the `The Platform` badge above the H1, which stays.

### 4c. Replace "all black/white" with platform theme accents
- Trust-strip badges: switch from `outline` to a subtle `bg-primary/5 text-primary border-primary/15` chip style for the 9 framework names.
- Outcome cards: icon background goes from `bg-secondary` to `bg-primary/8 border-primary/15`; icon color stays `text-primary`.
- Step cards (How it works): add a thin `border-l-2 border-primary/30` accent on the left.
- Industries pills: hover state gets `hover:border-primary/40 hover:text-primary` instead of plain `hover:bg-secondary`.
- Country tiles: small primary dot before the country name.
- Keep background palette (white / `secondary/30`) — accents only, no full repaint.

### 4d. Add the marquee strip (inspired by the PDF — NOT copied)
- New component `src/components/PlatformMarquee.tsx`: single horizontal auto-scrolling row, dark `bg-foreground text-background` band, 6 word-pairs in mono font: `MRV workflows → standardised`, `Decarbonisation roadmaps → actionable`, `Climate finance flows → transparent`, `Emerging markets → included`, `Scope 1 · 2 · 3 → verified`, `Carbon credits → traceable`. Right-hand word uses `text-primary`.
- Pure CSS animation (`@keyframes scroll-x` already present pattern; add to `index.css` if missing). Respects `prefers-reduced-motion` (animation paused).
- Place it once on Platform page, between Hero and "What is Senseible?" section.
- All six labels translated via `t('platform.marquee.*')`.

### 4e. Speed/clarity micro-fixes
- Hero `pt-32` → `pt-24 md:pt-28` (less dead space on mobile).
- Lazy-load OG image via `loading="lazy"` (already meta only, no body img — skip).
- All `<Link>` already use react-router — no route changes.

## 5. SEO surface unchanged
No new routes. No sitemap/llms.txt/static-html changes (Platform already wired in previous turn). Only `en.json` already has `platform.*`; this plan adds the same keys to the other 10 locales.

## Files touched
- Edit: `src/pages/Trust.tsx`, `src/pages/ClimateFinance.tsx`, `src/pages/CarbonCredits.tsx`, `src/pages/Platform.tsx`, `src/index.css` (one keyframe if missing)
- Create: `src/components/PlatformMarquee.tsx`
- Edit (i18n): `src/lib/i18n/translations/{bn,es,hi,id,mr,ta,th,tl,ur,vi}.json` — append `platform.*` block

## Explicitly NOT in scope
- Solution page for Platform (user said "Then we create a solution page… before that ensure all above pages and actions are functional" — that's a follow-up after this lands and is verified).
- Any change to MRV math, edge functions, RLS, schemas, or the homepage.
- Any change to the Trust page beyond the two sections above and the sticky-nav entry collapse.
