## Goal

Infrastructure-only AI/SEO discoverability upgrades + targeted, non-duplicate long-form content. Zero changes to existing pages, routes, schemas, DB, RLS, edge functions, or UI.

## Current state (verified)

- `public/robots.txt` — present, healthy, allows core public paths
- `public/sitemap.xml` — 373 lines, hand-maintained, includes core + solutions + industries
- `supabase/functions/generate-sitemap` — dynamic alternate also exists (covers CMS slugs)
- `src/data/cmsContent.ts` — **103 published articles already exist**, including many overlapping the user's list (e.g. "what-is-carbon-mrv-and-why-msmes-need-it-2026", "scope-1-2-3-emissions-simple-guide-small-business", "scope-3-calculator-bangladesh-textile-exporters", BRSR, ESG, green-loans, CBAM)
- No `public/llms.txt` yet
- No markdown mirrors of pages yet
- `SEOHead.tsx` already injects JSON-LD, breadcrumbs, FAQ, HowTo — do NOT touch

## Priority 1 — Infrastructure (this phase)

### 1. `public/llms.txt` (new, static)
Single flat markdown file at root following llmstxt.org spec. Sections:
- H1 Senseible + one-line summary
- What Senseible is, who it serves (MSMEs in India + emerging Asia), what it does (carbon MRV → revenue in <47s), regulatory coverage (CBAM, BRSR, GHG Protocol)
- `## Core product` — links to /, /verify, /monetize, /calculators, /cbam-calculator, /net-zero
- `## Knowledge` — links to top 20 highest-value CMS articles (CBAM, scope 3, MRV, BRSR, green finance) — selected from existing 103, not new
- `## Solutions` — 5–8 representative `/solutions/*` country+sector pages
- `## Industries` — link to /industries hub
- `## Optional` — /about, /mission, /principles, /pricing, /partners
- Exclude all auth, dashboard, admin, partner-dashboard, settings, billing, profile, /api/*

### 2. Markdown mirrors (new, static, additive only)
Create `public/md/` directory with clean markdown mirrors of **only existing high-value pages** so LLM crawlers can ingest structured content without parsing JS shell. ~10 mirrors:
- `public/md/index.md` (homepage explainer)
- `public/md/cbam-calculator.md`
- `public/md/net-zero.md`
- `public/md/calculators.md`
- `public/md/pricing.md`
- `public/md/about.md`
- `public/md/mission.md`
- `public/md/principles.md`
- `public/md/carbon-credits.md`
- `public/md/climate-finance.md`

Each mirror = plain markdown derived from the live page's existing copy (no new claims). Linked from llms.txt. Zero impact on live React routes.

### 3. `public/sitemap.xml` optimization (in-place edit, no replacement)
- Refresh `<lastmod>` to today
- Re-tier `<priority>` so true money pages (/, /cbam-calculator, /net-zero, /calculators, /pricing, /climate-intelligence) sit at 0.9–1.0 and low-value legal pages drop to 0.2
- Tighten `<changefreq>` (calculators monthly → quarterly already fine; legal yearly)
- Add `<loc>` for `/llms.txt` and `/md/*.md` mirrors so crawlers discover them
- Do NOT change which URLs are indexed; do NOT remove entries

### 4. `public/robots.txt` (tiny additive edit)
- Add `Sitemap: https://senseible.earth/sitemap.xml` line if missing
- Add `Allow: /llms.txt` and `Allow: /md/`

## Priority 2 — Content (gap-filtered, quality-first)

Cross-checked the user's ~280 proposed titles against the 103 existing slugs. Many are already covered (carbon MRV basics, scope 1/2/3 simple guide, BRSR, CBAM checklists, green finance for textiles, Bangladesh/Vietnam/Thailand sector pages, scope 3 supply chain, etc.). Skipping duplicates entirely.

**Phase 2A — ship now (8–10 articles), only genuine gaps, full-length 1,500–2,500 words each, with FAQ schema-ready Q&A blocks, tables, callouts:**

1. `carbon-accounting-frequency-msme-when-to-measure` — How often to measure (monthly vs quarterly vs annual, by company size)
2. `diy-vs-consultant-carbon-accounting-msme-decision-framework` — DIY vs hire decision matrix
3. `carbon-credit-pricing-explained-vcm-compliance-2026` — How carbon credits are actually priced (VCM vs compliance, $/tCO2e ranges)
4. `carbon-offsets-vs-carbon-credits-difference-explained` — Offsets vs credits terminology (genuinely missing)
5. `mrv-vs-traditional-audit-carbon-verification-compared` — MRV vs traditional audit
6. `climate-risk-vs-esg-difference-financial-institutions` — Climate risk vs ESG for lenders
7. `transition-finance-vs-green-finance-borrower-guide` — Transition vs green finance for borrowers
8. `spend-based-vs-activity-based-scope-3-method-choice` — Calculation method selection for scope 3
9. `supplier-emissions-data-collection-playbook-msme` — Getting supplier data when they won't share
10. `audit-grade-carbon-data-what-it-actually-means` — "Audit-grade accuracy" demystified

All append-only to `src/data/cmsContent.ts`. No slug collisions (verified). No edits to existing 103 articles. Each uses the same `CMSArticle` shape already in the file → `/climate-intelligence/:slug` route auto-serves them with existing SEO/JSON-LD.

**Phase 2B — backlog (record, do not write half-baked):**
A `.lovable/content-backlog.md` file listing the remaining ~150 candidate titles that survived dedupe, grouped by cluster (RWA tokenization, credit-decision fairness, green finance careers, climate risk modeling deep-dives, ESG compliance ops). Documented so future runs don't re-propose or collide. Not published.

## Out of scope (explicit)

- No edits to: existing pages, routes, components, `SEOHead.tsx`, `App.tsx`, edge functions, DB schema, RLS, billing, Razorpay logic, vite config, index.html `<head>`, existing 103 CMS articles
- No new dependencies
- No bundle-size changes (static files only + plain text append to existing data file)
- No design/UX changes

## Files touched

Created:
- `public/llms.txt`
- `public/md/index.md`, `pricing.md`, `cbam-calculator.md`, `net-zero.md`, `calculators.md`, `about.md`, `mission.md`, `principles.md`, `carbon-credits.md`, `climate-finance.md`
- `.lovable/content-backlog.md`

Edited (additive only):
- `public/sitemap.xml` (lastmod refresh, priority tiering, add llms.txt + md mirrors)
- `public/robots.txt` (add Sitemap directive + Allow lines)
- `src/data/cmsContent.ts` (append 10 articles to end of array)

## Verification

- Confirm `/llms.txt`, `/md/*.md`, `/sitemap.xml`, `/robots.txt` all return 200
- Spot-check 2 new CMS slugs render at `/climate-intelligence/:slug`
- No build/preview regressions (static files don't enter bundle; data file append is tree-shaken text)
