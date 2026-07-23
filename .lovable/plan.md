# Platform-wide Multilingual Upgrade

Goal: one centralized i18n layer that instantly re-renders every user-facing string on every screen, without touching business logic, math, schemas, URLs, or SEO.

The foundation shipped in the previous turn (`LanguageProvider`, `useT`, `translate-batch`, `domTranslator`, `translation_cache`) already covers most of this. This plan closes the remaining gaps so nothing slips through.

## What already works (keep, don't rebuild)
- `LanguageProvider` with lazy-init locale + `html[lang]`/`dir` sync.
- `translate-batch` edge function + `translation_cache` (durable) + memory + localStorage LRU.
- `domTranslator` MutationObserver walks every text node + `placeholder/title/aria-label/alt`, skips `<script/style/code/pre/input/textarea>` and `[data-no-translate]`.
- `useT` / `useTranslation` re-render on cache updates.
- 11 locales wired: en, hi, bn, ta, mr, id, ur, tl, vi, th, es.

## Gaps to close in this pass

### 1. Global controller behavior
- Ensure the `LanguageSelector` in `MinimalNav` is mounted on every layout (public + authed + partner + admin). Audit: `MinimalNav`, `Navigation`, `PartnerDashboard` header, `Admin` header.
- Persist selection across route changes and reloads (already via `localStorage`), and preserve URL/query/state — do NOT touch the router; language lives outside routing.
- Broadcast changes across tabs via `storage` event so a switch in one tab updates others.

### 2. DOM translator hardening
- Add skip rules for: elements with class `font-mono`, `[data-testid]` values, `<time datetime>`, `<kbd>`, numeric badges, and anything inside `.no-i18n`.
- Preserve interpolated tokens (numbers, currency, dates, GSTINs, HSN codes, SHA hashes, emails, URLs) by masking `\b[A-Z0-9]{6,}\b`, ISO dates, and `%s/{x}` placeholders before sending to the model and restoring after.
- Debounce mutation walks to a single rAF; batch attribute + text walks; ignore self-triggered mutations by comparing against `__i18nOriginal`.

### 3. Protected glossary (never translate)
Add a server-side allowlist in `translate-batch` system prompt + client-side pre-check:
- Product & brand: Senseible, Biocog, MRV, ESG, GRI, TCFD, BRSR, CBAM, CDP, SBTi, GHG Protocol, ISO 14064, PAS 2060.
- Units & identifiers: tCO2e, kWh, MWh, GJ, HSN, GSTIN, PAN, CIN, LEI, ISIN, SHA-256.
- Never alter numbers, dates, currency symbols, or code-like tokens.

### 4. Dynamic surfaces the DOM translator can miss
- Toasts: route every `toast(...)` through `src/lib/i18n/toast.ts` (already exists — audit call sites, replace direct `sonner` imports).
- `document.title` and dynamic `SEOHead` description — translate the visible title for the tab but keep `<meta>` canonical/OG in English (SEO invariant, see §6).
- Zod / form validation messages — wrap the resolver so messages pass through `translateSync`.
- Chart tooltips (Recharts) and legend labels — the observer catches these once rendered; verify on `TrendChart`, `EmissionsSummary`.
- PDF/report generation stays English (audit-grade artifact) — explicitly documented.

### 5. Fallback and offline behavior
- If `translate-batch` returns 402/429, `translateSync` already resolves to source; add a one-time non-blocking toast: "Some translations unavailable — showing English."
- Persist the last successful locale bundle to localStorage so subsequent loads render translated instantly before network completes.

### 6. SEO / metadata invariants
- URLs, canonical tags, JSON-LD, sitemap, robots, hreflang: unchanged. Meta title/description remain English (source of truth for crawlers).
- Only `<html lang>` and `dir` change. Confirmed no route or router change.

### 7. Text-expansion + RTL polish
- Global CSS: `:lang(ur) { font-family: 'Noto Naskh Arabic', ...; }`, `[dir="rtl"]` mirrors for icon-left buttons in `MinimalNav`, `ChatInput`, `LanguageSelector`, `Footer`, breadcrumbs.
- Add `min-width: 0; overflow-wrap: anywhere;` guard on nav pills and card headings that currently `truncate`, so German-length Hindi doesn't clip.

### 8. Add 2 more emerging-market locales the roadmap already implies
Add Telugu (`te`), Gujarati (`gu`), Punjabi (`pa`), Malayalam (`ml`), Kannada (`kn`) to the supported set (loader + `SUPPORTED_LOCALES` in `autoTranslate.ts` + `languages.ts` + selector). No new JSON files required — auto-translate covers them; static JSON stays English fallback.

### 9. QA matrix
- Manual Playwright pass: home → auth → dashboard → verify → history → reports → billing on `hi`, `ur` (RTL), `ta`, `id`, `es`. Screenshot each; confirm no clipped nav, no untranslated toast, no layout shift.
- Automated: extend `tests/e2e/i18n_switcher.py` to iterate over the 5 key routes × 3 locales, asserting `html[lang]` and a known translated string per route.

## Non-goals (explicit)
- No changes to routes, database, RLS, edge-function business logic, carbon math, emission factors, extraction prompts, or PDF generation.
- No per-page translation dictionaries — everything flows through the central layer.
- No language-prefixed URLs (`/hi/...`) — SEO invariant.

## Technical details

Files to modify:
- `src/lib/i18n/domTranslator.ts` — glossary mask, additional skip rules, cross-tab `storage` listener.
- `src/lib/i18n/autoTranslate.ts` — expand `SUPPORTED_LOCALES`, protected-token masking helper.
- `src/lib/i18n/LanguageProvider.tsx` — `storage` event listener; one-time toast on gateway failure.
- `src/lib/i18n/toast.ts` — audit + re-export patterns; grep replace direct `sonner` usage.
- `src/lib/languages.ts` — add te/gu/pa/ml/kn entries.
- `src/components/MinimalNav.tsx`, `src/components/Navigation.tsx`, partner/admin headers — verify selector present; add RTL icon mirroring.
- `src/index.css` — `:lang(ur)` + `[dir="rtl"]` rules + wrap guards.
- `supabase/functions/translate-batch/index.ts` — protected-terms system prompt, glossary pre-pass.
- `tests/e2e/i18n_switcher.py` — expand matrix.

Rollout: ship in one PR; watch `translation_cache` growth + edge function 402/429 rate for 24h.
