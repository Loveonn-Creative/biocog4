# Finish the Platform experience and remaining reliability work

## Goal
Finish the work already in progress without rebuilding existing features: make `/platform` immediately scannable and human, restore dependable intelligence responses, and let guests use the real product journey safely before signing in.

## 1. Refine the new Platform layer
- Keep every original Platform section and route; revise only the recently added positioning, proof, use-case, and pricing layer, plus the incorrect market-count heading.
- Replace implementation-facing phrases such as “no separate narrative,” “stated precisely,” “not invented customer case studies,” and “checkout is not duplicated” with concise customer-facing copy.
- Present **29 clusters**, **11 countries piloted**, and **92% benchmarking accuracy** as the dominant first-read proof. Keep **19 configured countries** distinct from the 11-country pilot footprint; update the existing “Ten markets” heading to match the live configuration without changing the approved pilot metric.
- Turn Textile, Steel, and Logistics into recognizable use cases: show the source evidence, the decision it enables, and the concrete next step, using facts already present on the industry pages.
- Rewrite the pricing preview around buyer decisions: what each plan is for, annual and monthly cost context, the key capability gained, and a clear comparison action. Keep pricing and checkout authoritative on `/pricing`.
- Create a visual journey through grouping, hierarchy, section rhythm, directional connectors, and one restrained line-doodle animation that respects reduced-motion settings. Make links and actions visibly interactive while preserving the existing Senseible design system.
- Add the new English strings to the established translation namespace so runtime translation can carry them across supported languages.

## 2. Restore Carbon Intelligence and homepage AI
- Update the shared intelligence function to the current default Lovable AI model and supported gateway authentication pattern.
- Preserve server-grounded user records and anti-hallucination rules. Guest answers may explain the product but must never invent personal figures.
- Pass gateway errors through honestly: terminal configuration/credit/policy errors stop immediately; only rate limits and provider failures receive bounded delayed retries.
- Replace the permanent generic apology with a useful error state that preserves the user’s question and clearly explains whether to retry or whether owner action is required.
- Keep voice and text on the same grounded response path and use the selected language for speech input/output.

## 3. Complete secure guest data access
- Replace the current user-agent equality check with an explicit guest-session proof carried by the client and validated server-side; a session UUID alone must never grant access.
- Finish row policies and grants for guest-owned documents, emissions, verification results, reports, and eligible preview pathways while retaining authenticated ownership rules.
- Add a guest-or-signed-in boundary to Dashboard, MRV Dashboard, and Reports. Guests see only records belonging to their validated session and a quiet “sign in to keep this” prompt.
- Keep billing, team, settings, partner tools, persistent exports/shares, and financial execution behind sign-in.
- Preserve the existing secure guest-to-account merge and duplicate-document protections.

## 4. Integration and release validation
- Run focused checks for Platform rendering, mobile layout, translated copy, all pricing and industry links, and reduced-motion behavior.
- Test the AI function directly in guest and authenticated modes, then verify homepage voice and Carbon Intelligence in the browser, including an empty account and a gateway failure.
- Test guest creation → upload → verified result → Dashboard/MRV/Reports → sign-in merge, and prove that another guest session cannot read or change those records.
- Re-run database security checks, targeted tests, type checks, and production build checks. Smoke-test existing auth, pricing, reporting, verification, and industry routes to catch unintended changes.
- Finish with a plain release summary grouped as **changed**, **verified**, and **still external or blocked**, so the deployment status is unambiguous.

## Confirmed current state
- The live country configuration contains **19 countries**; the approved proof remains **11 countries piloted**. These are different measures and will be labelled separately.
- The new Platform section currently contains the four internal-facing phrases identified in the feedback and gives proof metrics insufficient visual priority.
- Textile, Steel, and Logistics already have detailed industry-specific source, Scope 3, reporting, and commercial-use mechanics that can power credible use-case cards.
- Dashboard, MRV Dashboard, and Reports are still wrapped in an authentication-only boundary.
- The guest policy migration currently compares a stored fingerprint with the request user-agent, which is not the same proof used when the session is created.
- The shared intelligence function currently calls Lovable AI with a raw bearer header and turns most gateway failures into a generic 500; its user context is assembled server-side from the signed-in user’s own records.
