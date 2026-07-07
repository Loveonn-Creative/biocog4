## Scope

Fix the deploy-blocking build error, add Careers i18n coverage across all 10 non-English locales, upgrade Careers a11y, and rewrite Careers copy to speak to the person reading it (not to Senseible). No changes to platform pages, carbon math, MRV pipeline, edge functions, DB, or auth.

## 1. Fix the build error (no UI change)

`bun run build` fails at `scripts/generate-static-html.js:174` with `SyntaxError: Unexpected token '{'`. Root cause: the `/careers` entry (added last turn) is missing its closing `},` after the `noscriptContent` template literal on line 173, so the next object literal starts inside the previous one.

Fix: append `},` after the closing backtick on line 173. No other edits to that file. Re-run `bun run build` to confirm green.

Footer + nav Careers link are already wired globally (`src/components/Footer.tsx:49`, `src/components/MinimalNav.tsx:24`, route in `src/App.tsx:139`) — no change needed there; verify only.

## 2. Careers i18n for all locales

`src/pages/Careers.tsx` reads 13 `careers.*` keys via `useTranslation`. Only `en.json` has them (25 keys); the other 10 locales have zero, so `t()` falls back to the raw key string on those locales.

Add the full `careers.*` block (same 25 keys as `en.json`) to: `bn, es, hi, id, mr, ta, th, tl, ur, vi`. Real translations for `hi` and `es` (already the two locales with meaningful coverage elsewhere in the app); English fallbacks for the remaining eight — matches how `platform.*` is currently shipped across these files.

Also add human-readable labels for role `function`, `level`, and `location` enums used in the filter `<Select>`s and role cards, so filter UI is not English-only. New keys:

- `careers.function.engineering|ai_research|design|climate_carbon|growth_ops|founders_office`
- `careers.level.intern|fresher|mid|senior|staff_lead`
- `careers.location.gurugram|remote_india|hybrid`
- `careers.filter.all_functions|all_levels|all_locations|apply|apply_email|apply_form`

Wire `Careers.tsx` to render these via `t()` (small presentational change only — no data model change to `careersRoles.ts`).

## 3. Audience-first rewrite of Careers copy

The current page reads company-first ("we build X"). Rewrite so a reader immediately places themselves. Structural sections stay the same; only microcopy + framing change. Reference cues from the attached screenshots (Why now / Where your career goes) are used as tone, not copied verbatim.

Sections after rewrite:

1. **Why now** (3 cards, mirrors screenshot 1): *The scale is real* · *Infrastructure leverage* · *Early stage, high ownership*. Copy stays honest — no promises about titles, salary, or growth curves.
2. **Where your career goes** (mirrors screenshot 2): chips for *Carbon markets · Climate finance · Applied AI · Distributed systems · Product · Research* with a single paragraph explaining why touching all three compounds faster than specialising narrowly.
3. **What you'll actually own** — 4 concrete surfaces (MRV pipeline, climate-finance signals, applied AI + voice, trust/data layer), each one line, each linking to the existing page that proves the surface exists.
4. **How we work** — inversion framing: aggressive execution, resource-constrained by choice, fast filtering both ways.
5. **Open roles** — same 8 rows from `careersRoles.ts`, now filterable in the reader's language (see §2). No fake roles added.
6. **Hiring process** — 4 steps, one line each.
7. **FAQs** — Accordion with FAQPage JSON-LD; questions rewritten in reader voice ("Do I need climate experience?" / "What if I'm a fresher?" / "Do you sponsor relocation?" / "Remote or in-office?").
8. **Apply band** — Platform link + `mailto:build@senseible.earth` with pre-filled subject; freshers/interns route to the Google Form. Existing routing logic in `Careers.tsx` is preserved.

No new components, no stock imagery, no fabricated perks, no salary bands, no headcount claims.

## 4. Accessibility upgrades

Scoped to `src/pages/Careers.tsx`:

- **Filters**: each `Select` gets an associated visible `<Label>` (or `aria-labelledby` to the eyebrow) plus `aria-label` on the `SelectTrigger`. Filter row wrapped in `<div role="group" aria-label="Filter open roles">`.
- **FAQ accordion**: already uses shadcn `Accordion` (Radix — keyboard/ARIA correct out of the box); add `aria-label="Frequently asked questions"` to the wrapper and ensure each `AccordionTrigger` has visible focus ring via existing `focus-visible:ring-2 ring-primary/40` tokens.
- **CTAs**: mailto and Google Form buttons get descriptive `aria-label`s ("Email [build@senseible.earth](mailto:build@senseible.earth) about the Founding Engineer role", "Open the freshers intake form in a new tab"), `rel="noopener noreferrer"` on external form link, and `<span className="sr-only">(opens in new tab)</span>` beside external links.
- **Reduced motion**: wrap the marquee/animated accents in `motion-reduce:animate-none motion-reduce:transition-none` utilities; ensure hero doesn't rely on animation to reveal content.
- **Landmarks**: single `<main>` per page (already true via layout) and one `<h1>` (hero) — audit and collapse any stray `<h1>` if introduced during rewrite.
- **Tap targets**: role card CTAs bumped to `min-h-11` on mobile.

No changes to core carbon math, MRV, edge functions, DB schema, RLS, or any other page.

## Technical file list

**Edit only:**

- `scripts/generate-static-html.js` — 1-line fix (add `},` on line 173).
- `src/pages/Careers.tsx` — copy rewrite, i18n-wired filter labels, a11y attributes, reduced-motion classes.
- `src/lib/i18n/translations/{bn,es,hi,id,mr,ta,th,tl,ur,vi}.json` — add the `careers.*` block (hi/es translated, others English fallback).
- `src/lib/i18n/translations/en.json` — add the ~15 new filter/enum keys introduced in §2.

**Not touched:** `careersRoles.ts` (data unchanged), `Footer.tsx`, `MinimalNav.tsx`, `App.tsx`, any platform/trust/finance/credits page, any Supabase code, `index.css` design tokens.

## Verification

1. `bun run build` exits 0 and the static HTML step completes.
2. `tsgo` clean.
3. Playwright smoke on `/careers`: open, tab through filters, expand a FAQ, click Apply — screenshot each step. Check `prefers-reduced-motion: reduce` renders without marquee animation.
4. Switch locale to `hi` and `bn`; confirm filter labels and role enums render in the chosen language (hi translated, bn falls back to English strings, not raw keys).