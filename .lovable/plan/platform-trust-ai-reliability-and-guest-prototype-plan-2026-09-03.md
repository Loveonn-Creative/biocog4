# Platform trust, AI reliability, and guest prototype plan

## Goal
Ship an additive, production-grade layer on the existing `/platform` page while restoring dependable AI responses and making the existing guest prototype paths reachable without weakening signed-in data security.

## 1. Add the premium Platform decision layer
- Preserve every current Platform section, route, navigation path, and interaction unchanged; add new sections rather than replacing the existing narrative.
- Introduce Senseible’s enterprise product context with the supplied positioning: **“agent automating Scope 3 compliance for enterprises.”** Keep it clearly part of the wider Senseible platform rather than duplicating it on the homepage.
- Add a visual proof block using only the user-confirmed facts: **29 clusters, 11 countries piloted, and 92% benchmarking accuracy**. Label metrics precisely and avoid customer logos, testimonials, named cases, or inferred outcomes.
- Add a buyer-oriented pricing preview sourced from the existing `/pricing` tiers and billing rules: free entry point, annual-versus-monthly decision context, core entitlement differences, and enterprise/custom route. Link all purchase detail to `/pricing`; do not duplicate checkout logic.
- Present product proof through a compact evidence-flow visualization using real platform mechanics: document capture → deterministic classification/factors → evidence hash and confidence → reporting/Scope 3 decisions. No proprietary formulas or internal competitive detail.
- Keep the existing restrained Senseible design system, mobile behavior, and multilingual `platform.*` translation pattern.

## 2. Improve discoverability without changing SEO architecture
- Refine `/platform` metadata and on-page headings for climate reporting, Scope 3 compliance, carbon MRV, CBAM across industries, climate finance, and enterprise decarbonization using natural language rather than keyword repetition.
- Keep the existing `SEOHead`, canonical, static-generation, robots, and sitemap mechanisms intact.
- Ensure the added content is semantic, accessible, internally linked, and available to the existing translation system.
- Do not add unsupported case-study or customer schema.

## 3. Restore homepage voice and Carbon Intelligence
- Replace the unsupported `google/gemini-3.6-flash` model in `intelligence-chat` with the project’s established supported Lovable AI model.
- Preserve the current authenticated grounding and anti-hallucination guardrails; never accept client-supplied user facts as authoritative.
- Add a bounded failure response so a provider outage produces an honest, useful, non-fabricated answer instead of a generic apology or a hard 500.
- Localize browser speech recognition and speech output from the selected platform language instead of hardcoded `en-IN`.
- Deploy the corrected function, call it directly in guest and authenticated modes where available, and verify homepage voice/chat UI behavior in the browser.

## 4. Make guest prototype surfaces reachable and safe
- Add an explicit guest-or-auth session boundary that waits for either an authenticated identity or a valid anonymous session.
- Use it for the existing guest-aware Dashboard, MRV Dashboard, and Reports surfaces so visitors can inspect only the prototype data saved to their current session cache.
- Keep account, billing, team, partner, settings, history, export/download/share, and financial execution actions authenticated where they expose persistent or privileged capabilities.
- Add a concise “sign in to save” state on guest prototype surfaces without turning them into marketing pages.

## 5. Harden guest ownership before widening access
- Add a server-validated guest-session ownership check using the existing fingerprinted `sessions` model.
- Tighten guest policies for documents, emissions, verifications, reports, and monetization pathways so knowing another session UUID is insufficient to read or mutate its records.
- Preserve private-by-default authenticated ownership and the existing secure guest-to-user merge.
- Treat localStorage tier data as display-only; paid entitlements and protected actions remain server-authoritative.
- Re-audit `verify-carbon` request ownership and correct only paths that accept an unverified user/session identifier.

## 6. Validation
- Add focused tests for supported-model AI responses, grounded empty states, provider-failure behavior, and selected-language voice settings.
- Test guest creation → upload/cache → Dashboard/MRV/Reports visibility → sign-in merge, plus rejection of a different guest session identifier.
- Verify authenticated records, reports, duplicate prevention, precise rejection/null outcomes, and existing RLS remain intact.
- Run targeted type checks/tests and responsive browser checks for `/platform`, homepage voice, `/intelligence`, and guest prototype routes.

## Confirmed current-state findings
- The existing Platform page has no proof or pricing section and currently renders 19 configured countries while its copy says “Ten markets.” The new pilot metric will be labeled specifically as **11 countries piloted**, not as total configured coverage.
- The shared `intelligence-chat` function currently calls `google/gemini-3.6-flash`; this explains the common failure path used by homepage voice and Carbon Intelligence.
- The Dashboard, MRV Dashboard, and Reports implementations already contain guest/session-aware data paths, but their route guards make those paths unreachable.
- Current anonymous row policies accept any non-null guest session ID; the fingerprint is validated during session creation/merge but not by those row policies.
