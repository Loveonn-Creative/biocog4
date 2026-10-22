# Senseible context: source of truth

Owner rule (21 October 2026): read this file and `not-allowed.md` before any design, copy, product, data or deployment work. They hold everything the owner has already decided, so it never has to be explained twice. When the owner sets a new requirement, add it here in the same PR as the work. When two instructions conflict, record which one wins under "Conflicts resolved"; never drop an earlier requirement silently. If something is unclear or not covered here, ask the owner. Do not guess.

Related rules that stay in their own files: `AGENTS.md` (data, privacy, footer, finance documents, guests), `docs/copy/content-test.md` (every line of copy), `docs/runbooks/core-flow-continuity.md` (deploy gate), `docs/runbooks/design-revert.md` (REVERT kill word).

## 1. What Senseible is

- Carbon MRV and climate-finance infrastructure. Invoices, bills and fuel slips become a verified emission record that a lender can underwrite, a regulator can audit and a buyer can rely on.
- Promise: **as simple as UPI.** An MSME owner with no ESG knowledge should get value without help.
- Order of value: **carbon visibility first, monetising that visibility second.** Emission reporting and climate finance are related but not the same thing; never blur them.
- Run by Senseible Earth Pvt. Ltd. Methodology reviewed by a senior CBAM policy adviser. Piloted across 29 clusters and 11 countries with 92% benchmarking accuracy (the owner's approved figures).

## 2. Who it is for

- **Primary:** an MSME owner or operator in India, Asia and emerging markets, often a manufacturer or supplier. Has little time and little ESG expertise. Cares about costs, survival, buyers and getting finance. Three questions every screen should answer fast: *Where do I stand? What can I improve? What should I do next?*
- **Secondary:** enterprise sustainability, procurement and CFO teams with 100 to 1,000+ suppliers, stuck on Scope 3 supplier data (CSRD, CBAM, CDP, BRSR).
- Two use cases, shown only where each is relevant, never mixed on one surface:
  1. MSME: MRV to monetise (climate finance, green loans, credits).
  2. Enterprise: supplier (Scope 3) emissions automation.
- Visitors may want carbon accounting, supplier emissions, monetisation, net zero or reporting. Never force everyone toward a loan message.

## 3. Design language

- Philosophy: design is how it works. The next step should feel obvious and effortless, and the experience worth remembering. Users scan, decide fast and expect things to work. As little design as possible: less, but better. Subtract the obvious, add the meaningful.
- Decide spacing, typography, colour, contrast, hierarchy and layout on purpose. Effects are never decoration.
- **WOW, not average** on public and marketing pages: one interaction or motion per section that carries its meaning (scroll story, before/after reveal, draw-in doodle, count-up, physics flow). Each page uses a different pattern. The reference standard is `/decarbonize-india`.
- **App pages are different.** Dashboard, MRV, History, Verify, Reports and Monetize exist for critical data at UPI-level simplicity, not for showing off design. Use restrained colour, no black-and-white clutter and no flashy colour.
- **Dashboard:** decision-first. Swiss grid, with Stripe-like clarity and Bloomberg-style density only where it helps. It answers: where you stand, what changed, what you can unlock, next step. Finance insights are an addition, not a replacement.
- **MRV:** the place for detailed carbon data, scope detail, audit trails, traceability, ESG audit and accounting. Long lists open with 6 rows; every row stays one tap away.
- Motion: lightweight. Loads after first paint, respects `prefers-reduced-motion` (with a still final state) and Save-Data, never blocks LCP, and has a static fallback. Every animation explains a real product function.
- Mobile-first and fluid, with no horizontal scroll at 390px and alignment checked on phone, tablet and desktop.
- Scope colours for data visualisation: light #1a7f55 / #2a78d6 / #c97a00; dark #22a06b / #3987e5 / #c98500.
- Footer: owner approval needed for any change (see `AGENTS.md`). The approved walking truck motion stays. Help Center appears in the homepage footer only for signed-in users.

## 4. Copy

- Apply the Content Test (`docs/copy/content-test.md`) to every line.
- Voice: a sharp founder who knows the customer. Use specific problems, clear value, natural words and honest claims.
- Labels and CTAs are 2 to 4 words, clear and outcome-first. Short lines beat sentences. Lead with cost, survival and buyers for MSMEs; risk, data quality and scale for enterprise.
- Errors are a chance to help. Say what happened and the one thing that fixes it ("We couldn't find how many units you used… a sharper photo fixes it"). Never leave a user on a silent or unrelated page.
- Show 0, never a blank or dash, when there is no verified figure yet.
- Fact sources live in code comments or data files, not on the page, unless the owner asks for them.
- Financing wording: Pro gives "financing readiness signals"; Scale adds "financing ecosystem access" and "monetization setup". Lenders, schemes and buyers decide, and financing is never guaranteed. Use "Estimate", never "Simulation".
- Badges: "Independently Reviewed" (not "Certificate"). "CCTS Readiness Review" and "CBAM Readiness Review" appear only where a documented assessment exists.

## 5. Product and data rules

- No fabricated numbers, factors, customers, integrations, certifications or outcomes. If data is missing, flag the gap. Missing data is null, never 0, unless 0 is the real value. Never label an estimate as verified.
- Every figure traces back to its document, factor (with source, year and unit), method version and verification state. Recalculation creates a new version; it never overwrites.
- India grid factor: 0.710 kg CO2/kWh (CEA v21.0). CNG: 2.69. Freight follows ISO 14083 and GLEC (well-to-wake for sea). kVAh is not kWh.
- A capability missing from the code may still exist as a manual, paid or on-ground service. Never remove or deny it. Features named in pricing or legal pages but absent from code are custom, built on demand.
- Plans: Snapshot (free forever), Essential, Pro, Scale (custom; enterprise is entirely custom). Plan state comes from the canonical subscription row. Prices on the page exclude GST, which is added at checkout.
- Finance insights: opt-in, by plan, read only through `my_finance_insights()` and `my_private_records()`. Essential gets monthly cash flow. Pro gets all three deployed modules, view only. Scale adds date filters and CSV export. Three custom modules open on Scale. Never show words like "sample data", "pro user" or "in pipeline" on a live dashboard.
- Grants page (startups and business offers) and government grants in Monetize (MSME green transition) are different things; never mix them.
- Biocog Intelligence (Pro) and Biocog Superintelligence (Scale). Help Center has its own help-only AI.
- Machinery beta: always unverified until a document, IoT feed or sensor matches it. It needs a geo-tagged photo and live location.

## 6. Deployment

- Work on the designated branch. Each change is its own PR. A page redesign records its start commit (REVERT rule). Merge with a merge commit.
- Database and edge functions go through Lovable as pending migrations, each with a tested rollback. Code must work before and after a migration is applied. Never write to production data by hand.
- Inspect before changing anything: code, callers, data, permissions, navigation. Make the smallest change, and do not redesign what works.
- Show a mockup first for any new design, footer change or redesign, and wait for approval. When the owner says "show me", show before deploying.
- Never print or commit secrets, test credentials, internal inboxes or payment IDs. The repo is public.

### Pre-deploy evaluation (every PR)
1. **Need:** does this solve a real user problem the owner asked for, without redesigning something that works?
2. **Design:** is there one clear focus per screen and an obvious next step? Is the pattern distinctive (see `not-allowed.md`)? Mobile 390px and desktop both checked?
3. **Copy:** does every line pass the Content Test, with no internal words?
4. **Data:** are figures real, traceable and the same across Dashboard, MRV, History, Reports and Monetize? Zero vs null correct?
5. **Function:** has the full journey been run in a real browser or test, including loading, empty, error, guest, signed-in and plan states?
6. **Regression:** do `bun test tests` (with the extract-document journey), tsc and the build all pass? Is the core flow intact?
7. **After deploy:** verify live and report what changed, what was tested, results, risks and rollback. Never claim success without evidence.

## 7. Conflicts resolved

| Earlier | Later / wins | Rule now |
|---|---|---|
| "Add all new page links to the footer" | Footer owner rule (Oct 2026) | Ask Yes/No for each page; never add by default. |
| "Every string through the translation system" | Sensitive pages rule | Sensitive pages use reviewed static bundles only, with English fallback. |
| "WOW experience on every page" | App pages are UPI-simple | WOW on public pages; data-first on Dashboard, MRV, History, Verify, Reports, Monetize. |
| "Remove dependency on Lovable" | Database access | Frontend ships via git/Vercel; migrations and edge functions still go through Lovable. |
| Dashboard redesign replaced old features (#246) | Owner: keep every feature | Additions never remove existing Dashboard features; REVERT #251 restored them. |
| Audit log on Dashboard and trail on MRV | Owner: audit log belongs to MRV | One audit trail, on MRV (#258). |
| Grid factor check on the dummy account | Owner: do not break the live platform for a dummy account | Review it only in the live OCR-to-report review. |

## 8. Decided (21 October 2026)

- Dashboard vs MRV: compliance labels and the audit trail live on MRV. MRV's scope split reads the same verified totals as the Dashboard. "Credit value withheld" appears on the Dashboard only. Scope tonnes that repeat move off the Dashboard's Finance evidence (MRV has them). Unverified-record summary (Dashboard) and Evidence queue (MRV) both stay. Generate report stays on both.
- Carbon score, green score and confidence score stay as they are.
- Rupees next to tonnes: not added.
- Intelligent actions (`src/lib/intelligentActions.ts`): power factor on kVAh bills, diesel generator vs grid, rooftop solar from 6+ months of bills (capped by sanctioned load), supplier above half of Scope 3, missing months, records to verify. Estimates are labelled. With thin data a friendly next step shows instead. MRV lists them; the Dashboard's next step shows only the top lever. Contract demand is not a rule: recorded demand is not read from bills.
- Dashboard design audit: approved as one PR (REVERT applies).
- Proof moments (`src/lib/proofMoments.ts`): first verified record (with the bill fingerprint), six complete months, a power-factor fix confirmed by a later bill. One per visit, newest first, shown once per account (`trust_layer_prefs.moments_seen`). Kill switch `VITE_PROOF_MOMENTS=off`.
- Security and data card (Profile): sign out of all devices; change email (current password first, Supabase confirms from both inboxes); Download my data on Scale only, locked on other plans, built from an allow-list (`src/lib/accountExport.ts`) with no ids, file paths, fingerprints, raw reads or private financial records, and formula-safe cells.
- Quick wins: the upload result counts up with "Read in X s"; Verify shows verified records before → after; a repeat upload says "Already have this one. Counted once, as promised."; first-record steps tick over once.

- Tech batch (owner, 21 October 2026): Checks run on every pull request; each Answers page loads only its own data; the 12 core-flow and payment edge functions report their source fingerprint on `GET ?__version` (`node scripts/function-versions.mjs --live` after each Lovable redeploy); Biocog Intelligence looks public answers up in the database (`public_library_entries`, synced from `/answer-data/_library.json`) with the bundled library as the fallback until the migration is applied and confirmed live. Stop any of these if it touches the OCR-to-reporting flow.

- Security (owner, 22 October 2026): fix the audit findings without breaking OCR → reporting or payments; stop and report a one-line risk otherwise. Guests stay browser-only (no server rows); old guest rows may be purged only with a check that no account-owned row changes. GST always applies to plan orders. Moving internal mail to a new inbox must not break any notification. Published customer stories are edited by admins only.

- Ad landing pages (owner, 22 October 2026): four noindex pages for A/B tests from ads, /go/green-loan-a and -b (MSME, finance readiness) and /go/suppliers-a and -b (enterprise, supplier emissions). One action: a 10-minute call through the existing contact form (name, WhatsApp, email, industry), notified to the internal inbox held in the INTERNAL_INBOX secret. Each page gives a free kit to keep (PDF built from the visitor's own numbers). Organisation names shown as styled names under "Trusted by teams at". Yearly plans only; MSMEs see Free check, Essential, Pro; enterprises see Pro and Scale. Launch prices end 31 December 2026 (owner, 22 October 2026): REGULAR_PRICING_STARTS_AT is 1 January 2027 00:00 IST, so from then checkout charges new buyers the regular price (2.5x launch) while launch customers keep the launch price at on-time renewals. The ad pages strike that regular price and count down to the same date (no evergreen or per-visitor timers; the owner kept the urgency on the ad pages, tied to this real date); /pricing shows a one-line notice and lists regular prices from that date, so no page quotes less than checkout charges.

- Deferred by the owner (21 October 2026), do not start without a go-ahead: OCR accuracy test on 50 to 100 real documents, fix-in-place units for needs-data bills, a coverage line under every total, closing a reporting period, a lender share link, a CBAM supplier export.

## 9. Open decisions (ask before acting)

- Evidence trail line (fingerprinted · factor sourced · method pinned): move from Dashboard to MRV? Not answered yet.
- Grid factor (1.42 to 1.52 on dummy rows vs 0.710): confirm in the live OCR review before any change.
