# Plan: Real Multilingual + MRV E2E Tests

Two independent workstreams. Zero changes to routing, DB schema, business logic, or UI layout.

---

## Part 1 — Real-time multilingual (all pages, all components)

### Problem today
- Only 4 files use `useTranslation()` (`MinimalNav`, `PlatformMarquee`, `Platform`, `Careers`).
- Translation JSONs cover ~160–290 keys; the app has 60+ pages, dozens of forms, toasts, tables → **>95% of visible text is hardcoded English**.
- Switching language only re-labels the nav and a few marketing lines. Everything else stays English → the switcher feels dummy.
- Expanding static JSON to cover every string across 11 locales × ~5000 strings = ~55k manual entries, impossible to keep in sync with future pages.

### Approach: hybrid i18n
Keep the existing static JSON system (fast, deterministic for known keys) and add a **runtime auto-translation fallback** so any untranslated string is translated on the fly, cached, and reused.

```text
Component renders text
        │
        ▼
useT(text) / <T>text</T>
        │
   locale == 'en' ? ── yes ──▶ return text
        │ no
        ▼
   static JSON has it? ── yes ──▶ return translation
        │ no
        ▼
   memory + localStorage cache hit? ── yes ──▶ return
        │ no
        ▼
   supabase translation_cache table hit? ── yes ──▶ hydrate caches, return
        │ no
        ▼
   queue → debounced batch call to edge fn `translate-batch`
        │
        ▼
   Lovable AI (google/gemini-2.5-flash) translates array of strings
        │
        ▼
   write to supabase translation_cache + localStorage + memory
        │
        ▼
   component re-renders with translated text
```

### Deliverables
1. **`src/lib/i18n/useT.ts`** — `const t = useT(); t("Save changes")`. Returns English immediately while auto-translation resolves; triggers one re-render when ready. Includes `<T>` wrapper component for JSX-only usage.
2. **`src/lib/i18n/autoTranslateQueue.ts`** — 150 ms debounce, batches up to 50 strings per request, dedupes in-flight requests, per-locale memory + localStorage cache (LRU, ~2 MB cap).
3. **Edge function `supabase/functions/translate-batch/index.ts`** — accepts `{ locale, strings[] }`, checks `translation_cache` table, translates misses via Lovable AI Gateway (`google/gemini-2.5-flash`, temperature 0, system prompt: "Translate UI strings for a climate-fintech MSME app. Preserve placeholders like {name}, keep numbers/units, no explanations."), upserts results, returns full map.
4. **Migration** — `translation_cache(locale text, source_hash text, source text, translated text, created_at timestamptz)` with PK `(locale, source_hash)`, RLS enabled, `GRANT SELECT` to anon/authenticated, INSERT via service_role only. sha256 of source string as hash.
5. **Toast / sonner wrapper** — `src/lib/i18n/toast.ts` wrapping `sonner` so `toast.success(msg)` auto-translates using the queue before display.
6. **Form validation** — small helper `tError(msg)` used at zod/react-hook-form boundaries; existing error strings routed through it.
7. **Codemod-lite migration** — sweep the top-traffic surfaces and wrap hardcoded strings:
   - Nav, Footer, SecondaryFooter, HomeNavIcons, NewsletterSignup
   - Public pages: Index, Platform, Mission, About, Trust, Calculators hub, Climate Intelligence, Careers, Contact, Legal, Pricing, Solutions, Industries
   - Authenticated shells: Dashboard, History, Reports, Monetize, Verify, Profile, Settings, Billing, Subscription, Team, Admin, CMSAdmin
   - Shared components: ResultState, ProcessingState, DocumentInput, BulkUpload, ChatInput, ChatMessage, UserMenu, OnboardingTour, Subscription banners, all dashboard/* cards, all trust/* widgets, all enterprise/* widgets, all calculators/*
   - Forms & modals: Auth, AcceptInvite, Contact, Grants, PartnerProfile, purchase enquiry
   - Do the wrapping mechanically: wrap visible `>text<`, `placeholder=`, `aria-label=`, `title=`, toast/alert/confirm strings with `t(...)`. **No layout, class, or logic changes.**
8. **Dynamic content** — role listings, FAQ entries, marketplace listings, report labels: pass through `useT` at render time so DB-sourced English strings translate.
9. **RTL** — set `document.documentElement.dir = 'rtl'` for `ur` inside `LanguageProvider` (already sets `lang`). No CSS overhaul; Tailwind handles logical properties adequately on existing layouts.
10. **SEO preserved** — static build script keeps generating English HTML for crawlers; client hydration then translates. `hreflang` untouched.
11. **Performance** — first paint always English (no blocking). Auto-translations are cached forever per string; steady state = one edge call per new string per locale, then free. Batches keep egress low.

### Explicitly NOT changed
Routing, RLS, MRV logic, verification pipeline, Razorpay/billing, DB tables other than the new `translation_cache`, `src/integrations/supabase/*`, `.env`, tailwind config, index.css tokens, page layouts, component structure.

---

## Part 2 — MRV pipeline E2E tests

Playwright suite under `tests/e2e/mrv/` driven by shell (matches existing browser-use workflow). Runs against `http://localhost:8080` + deployed edge functions.

### Coverage
1. **`01_scan_to_extract.spec.ts`** — upload sample invoice fixture (PDF + image) → assert `extract-document` returns structured line items, HSN codes, totals; UI shows extracted table within SLA (<10s).
2. **`02_verify_success.spec.ts`** — verified green invoice (solar) → `verify-carbon` returns `status: verified`, credit eligibility populated, ledger row written.
3. **`02b_verify_rejected.spec.ts`** — tampered/mismatched invoice → returns `status: rejected` with reason; UI renders rejected outcome card (regression guard for the earlier silent-failure bug).
4. **`02c_guest_adoption.spec.ts`** — upload as guest, sign in, verify → confirm `emissions.user_id` adopted, document row adopted, verification persisted.
5. **`03_history_updates.spec.ts`** — after verify, `/history` shows the new row with SHA badge and correct scope.
6. **`04_reports.spec.ts`** — generate GRI/BRSR/TCFD report → PDF endpoint returns 200, contains expected totals.
7. **`05_dashboard_realtime.spec.ts`** — open `/dashboard` in one context, verify an emission in another, assert dashboard summary + trend chart update within 5s (supabase realtime subscription).
8. **`06_monetize.spec.ts`** — verified green invoice appears in Monetize with correct tier-based payout preview.
9. **`07_bulk.spec.ts`** — bulk upload of 5 invoices runs in parallel, dedupes on SHA256, no duplicate ledger rows.

### Infrastructure
- `tests/e2e/fixtures/` — 4 sample invoices (solar, diesel, EV, duplicate).
- `tests/e2e/helpers/auth.ts` — restores Supabase session from env (matches existing browser-use pattern).
- `tests/e2e/helpers/db.ts` — read-only assertions via anon key (RLS-respecting) plus cleanup of test rows tagged with a run UUID.
- `package.json` script: `"test:e2e": "playwright test"`. No CI wiring changes.
- Each spec ends by deleting rows tagged with its run UUID so repeated runs stay clean.

### Not covered (out of scope, called out)
- Payment capture (Razorpay live) — mocked at edge function boundary.
- Voice agent (ElevenLabs) — separate concern.

---

## Rollout order
1. Ship translation edge fn + `useT` + cache table (backend + primitives).
2. Wrap top 10 highest-traffic surfaces; verify switching locale translates them live.
3. Sweep remaining pages/components in batches.
4. Land MRV E2E suite + fixtures.
5. Run full Playwright + `tsgo` before handoff.

## Risk / cost notes
- Lovable AI usage: one-time translation per unique string per locale; expect a few thousand calls during initial warm-up per language, then near-zero. Batched 50/req keeps this cheap.
- First view in a non-English locale on a cold cache shows English for ~300–800 ms then swaps — acceptable and preserves SEO/first paint.
- No user-facing regressions expected because English path is unchanged (`locale === 'en'` short-circuits).
