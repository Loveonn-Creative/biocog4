

# Audit Report & Execution Plan: Making Senseible Rank #1

---

## Part 1: Reality Audit — Why Senseible Is Invisible

### What Google Sees Today

| Signal | Status | Impact |
|--------|--------|--------|
| **Indexed pages** | **1** (homepage only) | Fatal — 300+ pages in sitemap, 1 indexed |
| `site:senseible.earth` | Returns only homepage | All /solutions/, /climate-intelligence/, /industries/ are ghost pages |
| `site:senseible.earth solutions` | **0 results** | 75 programmatic pages completely invisible |
| `site:senseible.earth climate-intelligence` | **0 results** | 80+ articles invisible |
| Brand search "senseible carbon" | HN post ranks, not senseible.earth | Hacker News owns Senseible's brand narrative |
| High-intent "CBAM compliance cost India" | cleancarbon.ai, raaas.com, cbam.in rank | Senseible not in top 50 |
| "carbon accounting MSME India" | elion.co.in, smeclimatehub.org rank | Senseible absent |

### Root Causes (5 Critical Failures)

**1. SPA Rendering = Invisible to Googlebot**
The static HTML generator runs post-build but the deployed site serves client-rendered React for all routes. The `<noscript>` fallback only has a title and one-line description — no substantive content for crawlers that don't execute JS. Googlebot's JS rendering queue is delayed hours to days; most pages never get rendered.

**2. Static sitemap.xml is stale (March 2026)**
The `/public/sitemap.xml` has hardcoded `2026-03-18` dates and does NOT include any `/solutions/` routes. The Edge Function sitemap exists but is only accessible via API call — it's not what robots.txt points to. Robots.txt points to `https://senseible.earth/sitemap.xml` (the static one).

**3. robots.txt blocks crawling of solution pages**
`/solutions/` is not listed in any `Allow:` directive. While the default `Allow: /` covers it for generic user-agents, AI bots (GPTBot, PerplexityBot, Claude-Web) only see explicitly allowed paths — `/solutions/` is missing.

**4. Zero backlinks, zero domain authority**
Only external reference is Hacker News. No authority signals. Competitors (cleancarbon.ai, cbam.in, carbonsettle.com) have established backlink profiles from industry publications.

**5. No crawlable text content in HTML source**
When Googlebot fetches any page, it gets an empty `<div id="root"></div>` plus a `<noscript>` block with one sentence. The 2000+ words of actual page content only exists after React hydration. Google's crawler budget won't wait.

---

## Part 2: What's Already Built (Assets Inventory)

| Asset | Count | Status |
|-------|-------|--------|
| Solution pages (`/solutions/:slug`) | 75 | Built, rendering, not indexed |
| CMS articles (`/climate-intelligence/:slug`) | 80+ | Built, rendering, not indexed |
| Industry pages (`/industries/:id`) | 6 | Built, not indexed |
| CBAM Calculator | 1 | Built, functional |
| Scope Estimator (mini) | Embedded | Built in Solutions + Industries |
| FAQ Schema (index.html) | 7 FAQs | Present but only on homepage |
| Organization Schema | Yes | Present |
| Multilingual i18n (11 langs) | Yes | Built, JSON lazy-loaded |
| Competitor comparison pages | 20 | Built, not indexed |
| Static HTML generator | Yes | Runs but output insufficient |
| robots.txt | Yes | Missing /solutions/ allow |
| Sitemap (static) | 306 URLs | Missing solutions, stale dates |
| Sitemap (edge function) | Dynamic | Not connected to robots.txt |

---

## Part 3: Execution Plan — Agency-Grade ($15M Thinking)

### Phase 1: Make Existing Pages Indexable (Critical Fix)

**Problem**: 300+ pages exist but Google can't see them.

**Fix 1 — Enhanced Static HTML Generator**
Rewrite `generate-static-html.js` to inject **full semantic HTML content** into each page's `<noscript>` block — not just a title and description, but the actual page content: headings, paragraphs, steps, FAQs, cost breakdowns, internal links. This gives Googlebot substantive content without requiring JS execution.

Each generated HTML file will contain:
- Complete `<head>` with unique title, description, canonical, OG tags
- Unique JSON-LD schema (FAQPage, HowTo, BreadcrumbList) per page
- Full page content in a `<noscript>` block with semantic HTML (`<article>`, `<h1>`, `<h2>`, `<ol>`, `<a>`)
- Internal links to related pages (crawl path for bots)

**Fix 2 — Connect Dynamic Sitemap**
Update `robots.txt` to point to the Edge Function sitemap URL instead of the static file, OR replace the static sitemap with a build-time generated one that includes all 300+ routes with current dates.

**Fix 3 — robots.txt Updates**
Add explicit `Allow:` directives for `/solutions/`, `/cbam-calculator`, `/net-zero`, `/vs/` for all bot user-agents including AI crawlers.

### Phase 2: Content Depth for Authority

**Problem**: Pages have thin content. Google ranks depth.

**Fix 4 — Expand Solution Page Content**
Each of the 75 solution pages currently has ~500 words of templated content. Enhance `solutionsData.ts` with:
- Country-specific regulatory deadlines and penalty data
- Real cost numbers from IEA/EU ETS (already in `cbamEngine.ts`)
- "Cost of non-compliance" section (inversion principle — show what happens if you don't act)
- "Competitor readiness" section (FOMO — "X% of exporters in your sector already reporting")
- Urgency timestamps: "CBAM Phase 2 starts January 2026 — X days remaining"

**Fix 5 — Expand CMS Articles**
The 25 new country-specific articles need full body content (currently they have titles and summaries but the actual rendered content is thin). Each article should be 800-1200 words with:
- Specific country data (grid factors, export volumes, regulatory bodies)
- Embedded calculator CTAs
- Internal links to 3-5 related solution pages
- FAQ schema with 3-4 questions

### Phase 3: Technical SEO Perfection

**Fix 6 — Per-Page Schema Markup**
Currently, JSON-LD schema only exists on `index.html`. The `SEOHead` component adds Organization and SoftwareApplication schema to every page (duplicate). Instead:
- Solution pages: FAQPage + HowTo + BreadcrumbList
- Industry pages: Product + FAQPage
- CMS articles: Article + FAQPage
- Calculator pages: SoftwareApplication + HowTo

**Fix 7 — Internal Linking Mesh**
Every solution page must link to:
- Its pillar page (e.g., `/cbam-calculator`)
- 2-3 related solution pages (same country OR same sector)
- Relevant CMS article
- Industry page
This creates crawl loops that distribute page authority.

**Fix 8 — Canonical + hreflang Consistency**
Ensure every page has unique canonical URL and proper hreflang tags. Currently some pages may have duplicate canonicals from the template.

### Phase 4: Psychology-Driven Conversion Layer

**Fix 9 — Urgency & Scarcity Elements**
Add to solution pages:
- Live countdown: "CBAM definitive phase: X days since enforcement"
- "Non-compliance cost": Show financial penalty for inaction (inversion)
- "Industry readiness": "Only 12% of Indian steel MSMEs are CBAM-ready" (FOMO)

**Fix 10 — Moment Marketing Hooks**
Add time-sensitive content blocks that reference current regulatory events:
- "EU CBAM Phase 2 is now active — are you reporting?"
- "India-EU FTA negotiations include carbon provisions"
These create freshness signals Google rewards.

---

## Files to Edit

| File | Changes |
|------|---------|
| `scripts/generate-static-html.js` | Inject full semantic content per page type (solutions, articles, industries) into HTML |
| `public/robots.txt` | Add Allow directives for /solutions/, /cbam-calculator, /net-zero, /vs/ for all bots |
| `public/sitemap.xml` | Replace with build-time generated version including all 300+ routes with current dates, OR point robots.txt to edge function |
| `src/data/solutionsData.ts` | Add urgency data, cost-of-inaction, competitor readiness percentages, expanded content per page |
| `src/pages/Solutions.tsx` | Add countdown timer, non-compliance cost section, competitor readiness badge, richer internal linking |
| `src/components/SEOHead.tsx` | Deduplicate schema — only emit page-appropriate schema types, not Organization on every page |
| `src/data/cmsContent.ts` | Expand article bodies with country-specific depth, add FAQ arrays per article |

## What Does NOT Change

- MRV pipeline, emission factors, verification logic
- Authentication, RLS policies, database schema
- Core page routing (no new pages created)
- Homepage design, navigation structure
- Edge functions, payment flows
- Existing component behavior

---

## Expected Outcome

After implementation:
- 300+ pages with full crawlable HTML content (no JS dependency for indexing)
- Unique schema markup per page type
- Internal linking mesh creating topical authority clusters
- Urgency/scarcity elements driving conversion psychology
- Proper sitemap with all routes and fresh dates
- AI bot access to full content library

Timeline to ranking impact: 2-4 weeks for indexing, 6-8 weeks for ranking movement on long-tail queries, 3-4 months for competitive keyword positions.

