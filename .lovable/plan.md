# Careers Page — Plan

No existing careers page. Building `/careers` from scratch, matching the Senseible aesthetic (minimal, calm, regulator-safe, primary-accented, no fake perks).

## Scope

**In scope**

- New route `src/pages/Careers.tsx` wired into `src/App.tsx` (lazy-loaded)
- Nav + footer integration
- SEO, sitemap, static-HTML pre-render, `llms.txt`
- Functional apply CTAs (no dead buttons)
- Contextual cross-links to Mission, About, Principles, Intelligence, Platform, Contact

**Out of scope** (explicit)

- No backend tables, edge functions, or applicant tracking DB — apply flow is external (Platform link, mailto, Google Form) per user spec
- No changes to MRV math, RLS, auth, or existing pages beyond nav/footer/SEO plumbing
- No individual role sub-pages — roles render inline with filters (function / level / location), each with its own Apply CTA routed by role type
- No stock imagery, no invented perks/salaries/benefits

## Page structure (single route, one H1)

1. **Hero** — one idea: *"Build the infrastructure that decarbonises millions of MSMEs."* Sub: one line on AI + carbon markets + climate finance. Two CTAs: `Apply via Platform` →  `Google form link`, `Email build@senseible.earth`.
2. **Why Senseible now** — 3 short cards: scale of the problem (MSME + emerging-market framing already in memory), infrastructure leverage, why early matters. No motivational fluff.
3. **What you'll build** — 4 concrete surfaces: MRV & deterministic carbon math, climate-finance signals, AI/voice intelligence, distributed data + trust layer. Each links to the relevant existing page (`/platform`, `/climate-finance`, `/intelligence`, `/trust`).
4. **How we work** — inversion framing: aggressive execution, direct founder access, resource-constrained, fast filtering, high ownership. Explicitly names trade-offs (small team, limited resources) instead of perks.
5. **Principles** — 4–5 lines pulled in tone from `/principles`, with a link to the full page.
6. **Career growth** — one paragraph + 3 chips: Carbon Markets, Climate Finance, Applied AI. Explains exposure surface, not promises.
7. **Open roles** — filterable list (function, level, location). Data lives in `src/data/careersRoles.ts` as a typed array so it's easy to edit. Each row: title, function, level, location, one-line scope, Apply button.
  - **Apply routing per role**: `level: "fresher" | "intern"` → Google Form (`https://forms.gle/N9AfdfTdFGhmkAUJ9`); all other levels → Platform primary + mailto secondary. Empty-state copy when filters return nothing.
  - Seed with a small, honest set (e.g. Founding Engineer, Applied AI Engineer, Climate Research, Product Designer, Growth hacker (HR, Operation, Researchers, Founder Office, Social media) , Fresher/Intern — General). No fabricated roles beyond what the founder can back. Hiring perks include ESOPs, incentives, helathy salary package.
8. **Hiring process** — 4 steps, one line each. Sets speed expectation ("we filter fast, both ways").
9. **FAQs** — 5–6 items rendered as `<Accordion>` with FAQPage JSON-LD via `SEOHead.faqSchema`.
  &nbsp;
10. **Apply CTA band** — Primary: Platform (with the 3–5 line / 2–3 min video instruction). Secondary: `mailto:build@senseible.earth?subject=…`. Tertiary (freshers): Google Form.
11. **Contextual footer links** — Mission, About, Principles, Intelligence, Platform, Contact.

## Design & UX

- Reuse tokens from `index.css` — no hardcoded colors. Primary accents (`bg-primary/5`, `border-primary/15`) consistent with Trust/Platform.
- Typography hierarchy: single `<h1>`, `<h2>` per section, `<h3>` inside cards. Generous whitespace, mobile-first.
- Motion: subtle fade/slide via existing Tailwind utilities + `prefers-reduced-motion` respected. No decorative icons unless functional.
- Uses existing `MinimalNav`, `Footer`, `SEOHead`, `Accordion`, `Button`, `Card`.

## SEO & discoverability

- `SEOHead` with title `Careers — Build climate infrastructure | Senseible`, description under 160 chars, canonical `/careers`, OG image (new `src/assets/og/careers.jpg` generated via imagegen, minimalist to match set), keywords: Climate Tech Careers, Carbon Market Jobs, AI Climate Jobs, Sustainability Careers, Climate Finance Careers, ESG AI, Green Fintech, MSME Climate Platform.
- Breadcrumbs schema (Home → Careers) via `SEOHead.breadcrumbs`.
- FAQPage JSON-LD via `SEOHead.faqSchema`.
- Add `<url>` entry to `public/sitemap.xml`.
- Add `/careers` to `public/llms.txt` and to `scripts/generate-static-html.js` with a `noscriptContent` snapshot (hero + roles + apply links) so crawlers see it without JS.
- Semantic HTML: `<main>`, `<section>` with `aria-labelledby`, `<ol>` for hiring steps, `<ul>` for roles.

## Navigation integration

- `src/components/Footer.tsx` — add `{ name: 'Careers', path: '/careers' }` under the **Company** column (right next to Mission/About/Principles/Contact).
- `src/components/MinimalNav.tsx` — add Careers only if it already exposes a Company/About grouping; otherwise leave nav uncluttered and rely on footer + contextual links (will confirm on read during build).
- Cross-links: Mission, About, Principles pages get one small "We're hiring →" inline link near their closing CTA. Nothing intrusive.

## i18n

- Add `careers.*` keys to `src/lib/i18n/translations/en.json` with real English copy. Other 10 locale files get the same keys with English fallback values (matches the pattern used for `platform.*`). No fabricated translations.

## Apply flow validation

- Platform CTA: `<Link to="/platform">` (SPA nav, works today).
- Email CTA: `<a href="mailto:build@senseible.earth?subject=Application%20—%20[Role]&body=…">` with role name interpolated per row.
- Fresher/Intern CTA: `<a href="https://forms.gle/N9AfdfTdFGhmkAUJ9" target="_blank" rel="noopener noreferrer">`.
- No form component on-page (avoids a fake/placeholder form). All three CTAs are real destinations.
- Test form google form redirect is functional.

## Files touched

**Created**

- `src/pages/Careers.tsx`
- `src/data/careersRoles.ts`
- `src/assets/og/careers.jpg`

**Edited**

- `src/App.tsx` (lazy route)
- `src/components/Footer.tsx` (Company column + solutions unchanged)
- `src/components/MinimalNav.tsx` (only if a natural slot exists)
- `src/pages/Mission.tsx`, `src/pages/About.tsx`, `src/pages/Principles.tsx` (one inline "We're hiring" link each, near existing closing section — no layout changes)
- `public/sitemap.xml`
- `public/llms.txt`
- `scripts/generate-static-html.js`
- `src/lib/i18n/translations/*.json` (11 files, `careers.*` block)

## Verification

- Typecheck via harness build.
- Playwright: load `/careers`, screenshot desktop + mobile viewport, click each of the three Apply CTAs to confirm destinations (Platform route change, mailto handler, external form URL), check role filters change the visible list, confirm footer link navigates.
- Pages in multi-lingual not hardcored

Note: 'No core arch, methodlogy, maths is chnaged or any other pages functional disruption.'

## Open question (non-blocking)

The user wrote "temporary google form to receive applications directly instead of different apply use this as primary for all freshers role other email 'll do." I'm reading that as: **freshers/interns → Google Form as primary**, **all other roles → Platform primary + email secondary**. If they meant Google Form as primary for every role, I'll flip the routing in one place (`careersRoles.ts` mapping) — say the word. Google form as primary roles now, Platform page is to give more info about Senseible, as Platform include more details about Senseible than landing page.   
