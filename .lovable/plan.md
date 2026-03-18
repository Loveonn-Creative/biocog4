# SEO Audit: Why senseible.earth Is Invisible + Fix Plan

## The Core Problem

**Google returns zero results for `site:senseible.earth`.** The domain is completely unindexed despite being months old with 200+ content pages. This is not a content problem -- it is a **technical rendering and crawlability failure**.

---

## Root Cause Analysis

### CRITICAL: SPA Rendering = Invisible to Search Engines

This is a **client-side rendered React SPA**. When Googlebot fetches any page, it gets this:

```text
<div id="root"></div>
<script type="module" src="/src/main.tsx"></script>
```

All content (titles, article text, internal links, structured data from `SEOHead`) is injected by JavaScript **after** page load. While Googlebot can render JS, it does so in a **second wave** with significant delays and frequent failures. For a new domain with no authority, Google deprioritizes JS rendering entirely.

**Evidence**: The fetched HTML of `/climate-intelligence/cbam-compliance-indian-exporters` shows the article content is rendered client-side. The `<head>` only contains the static `index.html` meta tags (the homepage title/description), NOT the article-specific SEO tags from `SEOHead`.

**Result**: Every page appears to Google as the homepage with identical title/description. Massive duplicate content signal. Google drops the domain.

### Issue 2: Sitemap Contains Auth-Required Pages

The sitemap includes `/dashboard`, `/verify`, `/monetize`, `/reports`, `/intelligence`, `/marketplace` -- all behind auth or requiring user data. `robots.txt` blocks `/dashboard`, `/reports` etc. but the sitemap still lists them. **Conflicting signals** confuse crawlers.

### Issue 3: Sitemap `lastmod` Dates Are Stale

All 200+ URLs show `2026-01-21` -- nearly 2 months old. Google interprets stale `lastmod` as "nothing changed, skip recrawl."

### Issue 4: Static Sitemap File vs Dynamic Edge Function

There is both a static `public/sitemap.xml` (served at `/sitemap.xml`) AND an edge function `generate-sitemap`. The static file is what gets served. The edge function is never called. The static file has hardcoded dates and may be missing newer content.

### Issue 5: No Server-Side Rendering / Pre-rendering

Without SSR or pre-rendering, the `SEOHead` component's `<Helmet>` tags only work for users with JS enabled. Search engine crawlers that don't execute JS (Bing, Yandex, AI bots like GPTBot, PerplexityBot) see NOTHING.

### Issue 6: `index.html` Meta Tags Conflict with Helmet

`index.html` has hardcoded `<title>`, `<meta description>`, `<meta og:*>` tags. `SEOHead` via Helmet tries to override them per-page. But for crawlers that don't run JS, every page shows the same homepage metadata. Even for those that do run JS, the initial HTML response has the wrong tags.

### Issue 7: Missing Google Search Console Verification

There is no evidence of Google Search Console (GSC) verification meta tag or file. Without GSC, Google has no prompt to discover and crawl the site. The sitemap was likely never submitted.

### Issue 8: No `BreadcrumbList` Structured Data

Articles have visual breadcrumbs but no JSON-LD `BreadcrumbList` schema. This prevents Google from understanding the site hierarchy and displaying breadcrumbs in search results.

---

## Fix Plan (Ordered by Impact)

### Fix 1: Add Pre-rendering for SEO-Critical Pages (HIGHEST IMPACT)

Since this is a Vite SPA without SSR capability, implement a **build-time pre-rendering** solution using `vite-plugin-prerender` (or similar) to generate static HTML for all public pages at build time.

**Alternative (simpler)**: Create a Vite plugin or post-build script that generates static HTML snapshots for the ~220 public URLs. Each snapshot contains the correct `<title>`, `<meta>`, structured data, and visible text content in the initial HTML.

**Simplest viable fix**: Since we can't add SSR to this stack, create a **meta tag injection** approach: move all per-page meta tags into the static HTML via a build-time script, or use the edge function approach to serve different `<head>` content based on the URL path (detect crawler user-agents and serve pre-rendered HTML).

**Recommended approach for this platform**: Create an edge function `serve-seo` that detects bot user-agents and returns pre-rendered HTML with correct meta tags, or implement `react-snap` for build-time static generation.

**File**: New edge function or Vite plugin configuration

### Fix 2: Fix `index.html` Duplicate Meta Tags

Remove the hardcoded `<title>`, `og:title`, `og:description`, `twitter:title`, `twitter:description` from `index.html` lines 162-165. These duplicate and conflict with the `<head>` tags above. Keep only ONE set of defaults.

Also, the `og:title` and `twitter:title` on lines 162-163 have `&amp;` HTML entities that render as literal `&amp;` in some parsers.

**File**: `index.html`

### Fix 3: Clean Up Sitemap

- Remove auth-required pages (`/dashboard`, `/verify`, `/monetize`, `/reports`, `/intelligence`, `/marketplace`, `/mrv-dashboard`, `/partner-dashboard`, etc.)
- Keep ONLY public-facing pages: `/`, `/about`, `/mission`, `/pricing`, `/contact`, `/principles`, `/climate-intelligence/*`, `/industries/*`, `/vs/*`, `/legal/*`, `/carbon-credits`, `/climate-finance`, `/partners`, `/grants`
- Update all `lastmod` dates to today's date
- Add the missing `/vs/*` competitor pages to sitemap
- Add the `/grants` page

**File**: `public/sitemap.xml`

### Fix 4: Add Google Search Console Verification

Add a GSC verification meta tag to `index.html`. The user needs to create a GSC property for `senseible.earth` and provide the verification code.

**File**: `index.html` (add meta tag)

HTML tag from google search console: <meta name="google-site-verification" content="8sZkYxQtPsntdVCsA6GZIl_P_ITofBHL8tQInVaWQ-8" />  
Update HTML tag for better ranking on platform/ site without error or hallucination on expertise level

### Fix 5: Add `BreadcrumbList` JSON-LD to Article Pages

Add structured data for breadcrumbs on CMS articles: `Home > Climate Intelligence > [Category] > [Article Title]`

**File**: `src/pages/CMSArticle.tsx`

### Fix 6: Add `BreadcrumbList` to Industry Pages

`Home > Industries > [Industry Name]`

**File**: `src/pages/Industries.tsx`

### Fix 7: Align `robots.txt` with Sitemap

Ensure every URL in sitemap is crawlable per robots.txt. Currently `/dashboard`, `/verify` etc. are in sitemap but blocked by robots.txt. After Fix 3 removes them from sitemap, this resolves automatically.

### Fix 8: Add `hreflang` for India/English

Since the platform targets India + EU, add `hreflang="en-in"` as default and `x-default`.

**File**: `index.html`, `src/components/SEOHead.tsx`

---

## Files Summary


| File                         | Change                                                                     | Priority |
| ---------------------------- | -------------------------------------------------------------------------- | -------- |
| `index.html`                 | Remove duplicate meta tags, add GSC verification placeholder, add hreflang | Critical |
| `public/sitemap.xml`         | Remove auth pages, update lastmod, add missing pages                       | Critical |
| `src/components/SEOHead.tsx` | Add BreadcrumbList JSON-LD support, hreflang                               | High     |
| `src/pages/CMSArticle.tsx`   | Add BreadcrumbList structured data                                         | High     |
| `src/pages/Industries.tsx`   | Add BreadcrumbList structured data                                         | High     |
| `public/robots.txt`          | Minor cleanup (already mostly correct)                                     | Medium   |


## What Does NOT Change

- Page content, CMS articles, or article text
- Navigation structure or routing
- Existing structured data (FAQPage, Organization, WebSite schemas)
- Any backend logic, MRV pipeline, or database

## Important Note for the User

**The single biggest issue is that this is a client-side SPA.** Google may eventually render and index JS-rendered pages, but for a new domain it can take 6+ months. The fixes above maximize what can be done without SSR. To truly rank #1, the platform will eventually need either:

1. **Pre-rendering at build time** (e.g., `react-snap`, `vite-plugin-prerender`)
2. **A CDN-level bot detection layer** that serves cached/pre-rendered HTML to crawlers

The meta tag and sitemap fixes are immediate wins that unblock indexing. The structured data fixes improve how pages appear once indexed.

After implementing these fixes, the user should:

1. Create a Google Search Console property for `senseible.earth`
2. Submit the cleaned sitemap
3. Request indexing for the homepage and top 10 pages
4. Set up Bing Webmaster Tools similarly