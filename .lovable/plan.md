
# Plan: Yearly Billing + Targeted SEO/GEO Upgrades

Two independent workstreams. Both preserve current architecture, page UI, and minimalist homepage aesthetic.

---

## Part A — Pricing: Yearly vs Monthly billing cycle

### Current reality
- `Pricing.tsx` shows ₹499 (Essential) and ₹4,999 (Pro) labelled as `/month`, `originalPrice` ₹1,999 / ₹9,999.
- `useRazorpay` + `create-razorpay-order` only know one price per tier (paise hardcoded). No billing cycle concept.
- `subscriptions` table stores `amount` and `expires_at` (1 month).

### Pricing logic to enforce (no price changes)
| Tier | Yearly (per-month equivalent) | Monthly |
|---|---|---|
| Essential | ₹499/mo (billed ₹5,988/yr) | ₹1,999/mo |
| Pro | ₹4,999/mo (billed ₹59,988/yr) | ₹9,999/mo |
| Scale | base ₹15,000 + ₹99/employee yearly equivalent (existing) / 2x for monthly | same model |
| Snapshot | Free | Free |

### UI changes (Pricing.tsx only)
1. Add a single **Billed Yearly (save ~75% / 50%) ↔ Billed Monthly** toggle at the top of the MSME tier grid (default = Yearly so the displayed prices remain ₹499 / ₹4,999 — the headline price never changes on first paint).
2. When toggled to Monthly, prices switch to ₹1,999 / ₹9,999 with strikethrough on the yearly equivalent + microcopy: "Save ₹18,000/yr — switch to yearly".
3. Each tier card shows the effective annual cost beneath the price.
4. **Auto-redirect-to-yearly behaviour**: When user clicks "Subscribe" on a card while Monthly is selected, show a one-step inline confirmation chip ("Switch to yearly and save ₹X — Yes / No, continue monthly"). "Yes" flips state to yearly and proceeds. This satisfies "redirect yearly subscription automatically, if opt for monthly removal reduction" without a hard hijack.
5. Toggle state passed into `handleSubscribe(tierId, cycle)`.

### Backend / payment changes
1. `useRazorpay.initiatePayment` accepts `billingCycle: 'monthly' | 'yearly'`.
2. `create-razorpay-order` edge function: extend `PLAN_PRICES` to a 2-D map keyed by `{tier, cycle}`:
   - essential.monthly = 199900 paise / yearly = 598800 paise
   - pro.monthly = 999900 / yearly = 5998800
   - scale unchanged structure, yearly = 12× monthly with 17% discount applied
   - Validates input, falls back to monthly on missing.
3. `verify-razorpay-payment`: compute `expiresAt` as +1 month or +12 months from `cycle` (passed through Razorpay order notes so signature stays trustworthy — read from the fetched Razorpay order's `notes.cycle`).
4. `subscriptions` table: add nullable `billing_cycle text` column (default 'monthly') via migration so history is preserved.
5. Invoice generator (`generate-invoice-pdf`): include billing cycle line item.

### What stays unchanged
- Razorpay keys, secrets, RLS policies, profile schema, partner/enterprise/API tier flows, Scale "Talk to sales" route, Snapshot free flow.

---

## Part B — SEO / GEO upgrades (evaluated, not blindly applied)

### What the audit asked for vs reality (so we only do what helps)

| Recommendation | Already done? | Action |
|---|---|---|
| `defer`/`async` on scripts | `<script type="module">` is **already deferred by spec** | Skip — no-op |
| Inline critical CSS | Vite injects a single CSS file in `<head>` (render-blocking) | **Do**: add `<link rel="preload" as="style">` + small inline above-the-fold CSS for hero |
| Vite manualChunks | Not configured | **Do**: split `react`, `react-dom`, `@radix-ui/*`, `recharts`, `lucide-react` so initial bundle drops |
| Homepage 600+ words crawlable | Static generator emits ~80-word noscript on `/`. JS-rendered hero is intentionally minimal (per memory: minimalist, no marketing on home) | **Do**: expand the **noscript** block in `scripts/generate-static-html.js` to 700+ semantically structured words — invisible to the user, fully visible to crawlers and AI bots. Preserves homepage aesthetic. |
| FAQ schema | Already present in `index.html` | **Augment**: add 4 more high-intent Q&As (CBAM cost, Scope 3 for MSMEs, green loan eligibility, yearly vs monthly billing) |
| Product schema for SaaS | Missing | **Add** `Product` + `Offer` JSON-LD reflecting the new yearly/monthly prices in `index.html` |

### Concrete changes
1. **`vite.config.ts`** — add `build.rollupOptions.output.manualChunks` (vendor / radix / charts / icons). Pure perf, zero behavior change.
2. **`index.html`** —
   - `<link rel="preconnect" href="https://kobsfphgfvyjozjwkuhp.supabase.co">` + `dns-prefetch` for fonts/razorpay.
   - `<link rel="preload" as="image" href="/og-image.png" fetchpriority="high">` only if used above the fold (verify first).
   - Tiny inline `<style>` block with hero layout primitives (body bg, font-family, container width) to prevent FOUC and unblock FCP.
   - Add `Product` JSON-LD with two `Offer` entries (yearly/monthly) per paid tier.
   - Append the 4 new FAQ entries.
3. **`scripts/generate-static-html.js`** — replace the `/` route's `noscriptContent` with a 700+ word block:
   - H1 (matches current tagline)
   - "How Senseible Works" 4-step ordered list
   - "Why MSMEs Choose Senseible" stat list (400M MSMEs, 47s, frameworks)
   - Scope 1/2/3 explainer paragraph
   - CBAM section with internal link
   - Country coverage table (10 countries with grid factor)
   - Pricing summary mentioning yearly/monthly (helps GEO answer "how much does Senseible cost")
   - Footer of internal links to /calculators, /industries/*, /cms, /pricing
4. **No visible UI change to `Index.tsx`** — keeps the minimalist homepage rule.

### Validation
- After build: `curl https://senseible.earth/ | wc -w` should show 700+ words in HTML source.
- Lighthouse run after deploy to confirm FCP/LCP improvement; manualChunks should cut main bundle by ~30–40%.

---

## Out of scope (explicitly)
- No changes to homepage React UI, hero, or visible copy.
- No changes to pricing amounts, partner tiers, or Scale per-employee math.
- No new pages, no marketing additions to `/`.
- No changes to RLS, auth, calculators, CMS, voice AI.

## File touch list
- `src/pages/Pricing.tsx` (toggle + handler)
- `src/hooks/useRazorpay.ts` (cycle param)
- `supabase/functions/create-razorpay-order/index.ts` (price map)
- `supabase/functions/verify-razorpay-payment/index.ts` (expiry math)
- `supabase/functions/generate-invoice-pdf/index.ts` (cycle line)
- New migration: add `billing_cycle` to `subscriptions`
- `vite.config.ts` (manualChunks)
- `index.html` (preconnect, inline critical CSS, Product schema, +4 FAQs)
- `scripts/generate-static-html.js` (expanded `/` noscript)
