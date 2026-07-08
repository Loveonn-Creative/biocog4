## Intent

The current `/careers` reads like a landing page: eyebrow → headline → three cards → filter grid → FAQs. It's polished but sterile. Apple's careers surface works because it starts with *meaning* (why the work matters), then *belonging* (we recognise the whole you), then *invitation* (come do the best work of your life). Roles are almost an afterthought.

This plan rebuilds Careers around that arc — for a diverse global talent pool, not customers — while preserving the existing route, data, i18n keys, and apply routing. No changes to platform pages, carbon math, MRV, edge functions, DB, or auth.

## 1. Narrative arc (replaces current section order)

1. **Life at Senseible** — full-viewport opening. No badge, no filters visible. One sentence, weighted like a manifesto: *"We aren't just building climate technology. We're removing what stood between 400 million small businesses and the green economy — and compressing months of proof into seconds so they get paid for being clean, not punished for it."* Small line beneath: *"This is where that work happens."*

2. **Why it matters** — one photograph-scale statement per row, no cards:
   - *Months → seconds.* MRV that used to take a consultant a quarter now clears in under 47 seconds.
   - *Cost → revenue.* Compliance stops being a burden and becomes a payout — green invoices, factoring, credits.
   - *A few → four hundred million.* Verification cheap enough to reach every MSME across ten emerging markets, in eleven languages.
   Each line is the hero of its own band — large type, generous whitespace, one supporting sentence, no CTA.

3. **We recognise the whole you** — belonging section. Speaks to a diverse global candidate (engineer in Bengaluru, researcher in Jakarta, designer in Lagos, operator in Manila, fresher anywhere). Copy centres the *person*, not the company: *"You bring a life, a language, a way of seeing the problem we haven't seen yet. We hire for that, not around it."* Four short lines — language, background, discipline, distance — each a truth, not a perk.

4. **The work itself** — four surfaces (MRV, climate finance, applied AI + voice, trust layer). Reframed from "what you'll build" to *"what will be yours"*. Each links to the live page that proves it exists. Kept honest — no fabricated headcount, salary, or perks.

5. **How we work** — inversion, not a list of virtues. Two columns: *We do* / *We don't*. E.g. *We ship the week you join / We don't run six-week onboarding.* *We say no fast / We don't ghost.* *We give you the surface / We don't micromanage the brushstroke.* This is the closest we get to Apple's "your work is as meaningful to us as it is to you."

6. **Open roles** — the existing 8 rows from `careersRoles.ts`. Filters stay (i18n already wired), but visual weight drops so the section reads as *"and here is the door"* rather than the centre of the page. Empty state stays helpful.

7. **Straight answers** (FAQs) — kept, rewritten in candidate voice, JSON-LD schema preserved. Six questions max.

8. **Apply** — single decisive band. Freshers/interns → Google Form. Everyone else → *"Spend ten minutes on [the platform](/platform). Then tell us in 3–5 lines or a 2–3 minute video how your experience helps us move faster."* mailto with pre-filled subject preserved from current code.

Removed: the "chips row" of transferable domains, the "career acceleration" bullet, the "read our principles" trailing line inside How We Work (moved to footer of Apply band as a quieter link), the duplicate role-count filter badge.

## 2. Visual language (distinct from the rest of the site)

The rest of Senseible is regulator-calm and instrument-like. Careers should feel *warmer and more human* while still living inside the same design tokens — no hardcoded colors, no new palette files.

- **Type**: hero and section openers use the existing display scale but one step larger (`text-5xl md:text-7xl`) with tighter tracking. Body copy loosens to `leading-[1.7]`. One `<h1>` only.
- **Rhythm**: each narrative section is a full band with `min-h-[70vh]` on desktop, generous vertical breathing (`py-24 md:py-32`). No cards in sections 1–3 and 5. Cards return only for the four work surfaces (section 4) and the roles list (section 6).
- **Color psychology via existing tokens**: use `bg-background`, `bg-muted/30`, `bg-primary/[0.03]` in alternating bands to create tonal shifts without introducing colors. The Apply band uses `bg-primary text-primary-foreground` for a single moment of commitment at the end — the only saturated surface on the page.
- **Diversity signal without stock photos**: a single subtle motif — a horizontal row of language glyphs (English, हिन्दी, বাংলা, தமிழ், Español, Bahasa, Tiếng Việt, ไทย, Filipino, اردو, मराठी) rendered in muted foreground at the top of the belonging section. Uses the same 11 languages already shipped in `src/lib/i18n/translations/`. No people illustrations, no flags, no clip-art.
- **Motion**: single technique — text fades and rises 8px on scroll-in via CSS `@keyframes` already in `index.css` (reused, not new). Wrapped in `motion-reduce:animate-none`. No parallax, no marquee, no counters.
- **Empty visual space is the design.** Nothing decorative earns its pixels unless it carries meaning.

## 3. Copywriting rules

- Speak *to* the reader, never *about* the company in third person.
- Every sentence must pass one of: makes them feel something, tells them something true, invites them to act. If none, cut it.
- No "we're building the future of X." No "join us on our journey." No "passionate team." No "rockets/moonshots." No emoji. No exclamation marks.
- Numbers only where they're already true and defensible on the site (47 seconds, 400M MSMEs, 11 languages, 10 markets, Scope 1·2·3). No new claims.
- Reading level: writer-quality English, not corporate. Short sentences beat long ones.

## 4. Accessibility & i18n

- Preserve everything already earned: single `<main>`, single `<h1>`, `role="group"` on filters, `aria-label`s on Selects, focus rings on accordion, `min-h-11` tap targets, `role="status"` on filter count, `motion-reduce` on animations, `rel="noopener noreferrer"` and `(opens in new tab)` sr-only text on external links.
- Add: `aria-labelledby` on every new section, `<section>` landmarks named, and a skip-link target on the roles list (`#roles`) linked from the hero for keyboard users who want the list directly.
- **i18n**: add ~12 new keys for the rewritten copy (hero manifesto line, three "Why it matters" pairs, four belonging lines, four work surfaces, We do / We don't pairs, apply band) to `en.json`, with `hi` + `es` fully translated and the other 8 locales falling back to English strings (matches the pattern already used for `platform.*` and current `careers.*`). Reuse existing keys where the copy is unchanged (filter labels, role enums, FAQs remain wired).

## 5. Verification before ship

1. `bun run build` exits 0 (fixes to `scripts/generate-static-html.js` from last turn stay in place — no new build entry needed).
2. `tsgo` clean.
3. Playwright smoke at 1280×1800 and 375×812: capture hero, belonging band, work surfaces, roles list, apply band. Confirm no horizontal scroll, no overflow, filters keyboard-navigable, FAQ expands, mailto opens with pre-filled subject, form link opens in new tab.
4. Toggle `prefers-reduced-motion: reduce` — page renders without transitions.
5. Switch locale to `hi` → hero and belonging copy render in Hindi; switch to `bn` → English fallback (not raw keys). Filter enums render in the chosen language.
6. Re-check `/careers` link exists in `MinimalNav.tsx`, `Footer.tsx`, `App.tsx` route, `public/sitemap.xml`, `public/llms.txt` — no change expected, just verify not regressed.

## 6. Files touched

**Edit only:**
- `src/pages/Careers.tsx` — full section rewrite; imports and apply routing preserved.
- `src/lib/i18n/translations/en.json` — add ~12 new `careers.*` keys.
- `src/lib/i18n/translations/hi.json`, `es.json` — translated copy for new keys.
- `src/lib/i18n/translations/{bn,id,mr,ta,th,tl,ur,vi}.json` — English fallbacks for new keys.

**Not touched:** `careersRoles.ts` (data unchanged, 8 roles stay), `scripts/generate-static-html.js`, `MinimalNav.tsx`, `Footer.tsx`, `App.tsx`, `index.css` (no new tokens), any platform/trust/finance/credits/intelligence page, any Supabase code, `SEOHead.tsx`, `careers.jpg` OG asset (kept).

## 7. Explicit non-goals

- No new dependencies, no framer-motion, no lottie, no video hero, no stock photography, no team photos, no salary bands, no headcount claims, no fabricated perks, no changes to the fresher form URL or apply email, no changes to how role routing decides fresher vs experienced, no design token changes, no dark-mode-specific styling, no changes to any other page.
