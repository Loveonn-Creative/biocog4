# Auth hardening, analytics, and global emissions coverage

## What I verified first

- Sign-up and password-reset emails already point at `https://senseible.earth` (hardcoded in the auth page) — no preview URLs there.
- The auth client already stores sessions in browser local storage with persistence and automatic token refresh enabled.
- **Real defect:** there is no `/reset-password` page or route anywhere in the app. The reset email sends people to `/auth`, where the recovery link silently signs them in without ever letting them set a new password.
- **Real defect:** no analytics is installed — no measurement ID, no tag, no page-view tracking.
- Country intelligence covers 10 Asian markets (India, Philippines, Indonesia, Bangladesh, Pakistan, Singapore, Vietnam, Thailand, Malaysia, Sri Lanka). US, UK and EU are absent, so tax-ID capture and grid factors fall back to India.
- No cloud/data-centre emissions capture exists in the measurement engines.

## Where the backend data lives

The backend is a managed Lovable Cloud database attached to this project — there is no external account to connect, which is why none appears linked. All profiles, sessions, documents, emissions records, reports, subscriptions and invoices are stored in that managed database, with row-level security restricting every row to its owner. I will state this explicitly in the deployment output.

## Primary work

### 1. Password reset, end-to-end
- New `/reset-password` page (public route): detects the recovery link, requires the new password twice with the existing strength meter, updates the password, then routes to the correct dashboard.
- Point the reset email at `https://senseible.earth/reset-password` instead of `/auth`.
- Handle the expired/invalid-link case with a clear "request a new link" path instead of a silent login.

### 2. Session and route reliability
- Central `RequireAuth` wrapper for the authenticated routes (dashboard, MRV, reports, history, verify, monetize, settings, profile, billing, team, subscription, partner surfaces), preserving the existing partner/MSME separation and redirecting to sign-in with the intended path remembered.
- Confirm the auth listener rehydrates the user on refresh before any redirect fires, so a hard refresh never bounces a signed-in user to sign-in or drops in-progress data.
- Keep guest-session merge behaviour exactly as-is so unauthenticated uploads still attach on login.

### 3. Production redirect audit
- Sweep every remaining auth-adjacent redirect (invites, partner signup, payment return) so none can emit a preview host.

### 4. Google Analytics
- Link the existing "Senseible Analytics" connector to this project.
- Install the tag with measurement ID `G-7DJ1WVE5R3`, initialised once at app start.
- Add router-aware page-view tracking so every client-side route change is recorded — otherwise only the first page load would ever appear in Google.

## Secondary work

### 5. Global coverage beyond GSTIN
Extend the existing country configuration (no new architecture) with US, UK, EU (DE, FR, NL), UAE, Australia, Japan and Korea: national tax identifier label/format, currency and locale, published grid emission factor, applicable frameworks and regulator. Tax-ID validation becomes country-driven rather than GSTIN-only, so a US or UK business can onboard as simply as an Indian one.

### 6. Data-centre / cloud emissions (functional, not illustrative)
Add cloud and data-centre workload as a first-class measurable source using published, citable factors: energy per unit of compute/storage, regional grid factor from the country layer, and provider PUE. Results are stored in the same emissions records so they flow into dashboards, reports and financial mapping without any separate pipeline. If a required input is missing, the engine returns explicit guidance rather than an estimate — consistent with the rest of the platform.

### 7. Industries pages
After the above deploys, complete the visual-outcome pass on the industry pages: sector metrics and outcome cards replacing text-heavy narrative, with navigation consistency across the platform.

## Technical notes

- Files touched: new `src/pages/ResetPassword.tsx`, new `src/components/RequireAuth.tsx`, new `src/lib/analytics.ts`, new cloud-emissions engine under `src/lib/`, plus edits to `src/App.tsx`, `src/pages/Auth.tsx`, `src/lib/countryConfig.ts`, `src/lib/gstinValidation.ts`, and the industry page/components.
- Auth configuration: production site URL and redirect allow-list set to `https://senseible.earth`.
- No schema change is required for reset or analytics. The cloud-emissions source reuses the existing emissions tables.
- Live-domain verification of the full sign-up, confirmation, sign-in, refresh-persistence and reset flows happens after publish, since those redirects resolve only on the production domain.
