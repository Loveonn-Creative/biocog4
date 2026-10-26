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

- Ad landing pages (owner, 22 October 2026): four noindex pages for A/B tests from ads, /go/green-loan-a and -b (MSME, finance readiness) and /go/suppliers-a and -b (enterprise, supplier emissions). One action: a 10-minute call through the existing contact form (name, WhatsApp, email, industry), notified to the internal inbox held in the INTERNAL_INBOX secret. Each page gives a free kit to keep (PDF built from the visitor's own numbers). Organisation names shown as styled names under "Trusted by teams at". Yearly plans only; MSMEs see Free check, Essential, Pro; enterprises see Pro and Scale. Launch-price review date (owner, 22 October 2026): /pricing shows one line, "Launch prices change on 31 December. Start before then and yours won't.", until 1 January; checkout is not switched (owner: do not redeploy create-razorpay-order for it), so REGULAR_PRICING_STARTS_AT stays null and the date lives in src/lib/pricing/launchWindow.ts for display only. Ad pages carry no launch-price or 31 December message. Their urgency is the onboarding batch (owner approved): batches start every 10 days from 2 November 2026 (IST midnight), the clock counts down to the next start for every visitor and rolls to the following batch, so it stays true while ads run continuously. Ad pages strike the same plan billed monthly (a price chargeable today), show the GST total from checkoutTotal, and open checkout on the page itself (Get Essential / Get Pro; signed-out buyers sign in and return with ?buy=). Scale's quote goes straight to WhatsApp; enterprise pages offer a pilot on 10 to 15 suppliers (owner approved) through the call form. Declined: per-visitor or resetting countdowns with nothing real behind them (false urgency under India's 2023 dark-pattern guidelines) and direct UPI to a personal VPA outside Razorpay (no payment verification, no GST invoice, manual plan activation).

- Homepage hero (owner, 24 October 2026): the upload box is the hero and nothing may distract from it. The typed headline keeps brand green as its only moving colour. "from India." is dark text with a thin saffron, white and green ribbon under it (`.india-ribbon` in src/index.css), never coloured text or a gradient; the India badge spokes are fully opaque and stop under reduced motion. Rejected: rotating flag colours in the typed line and tricolour gradient text (too busy, weaker brand, saffron unreadable at small size).

- German CBAM pages (owner, 24 October 2026): the owner accepted Claude's review of /de/cbam-kosten, /de/cbam-rechner and /de/cbam-indische-lieferanten and asked to publish (DE_PAGES_REVIEWED = true in src/lib/seo/dePages.ts: indexed, lang="de", hreflang en/de pairs, sitemap and llms.txt). A review by German-speaking experts follows; revert the flag if it finds problems.
- CBAM numbers (owner, 24 October 2026): every public CBAM default value, benchmark, mark-up, CBAM factor and certificate price comes from src/lib/cbam/official.ts, generated from the Commission's own files (scripts/cbam/build-official.mjs) and checked cell by cell by tests/cbam-official.test.ts. Never type a CBAM figure by hand; update the source file and re-run the generator. Wording stays as the owner approved it; only numbers change.
- Hindi answer pages (owner, 24 October 2026): Claude's review is accepted for the Hindi edition of 50 MSME answers (/hi/answers/<slug>, `HI_PAGES_REVIEWED` in src/lib/seo/hiPages.ts), so they are published and indexed; an expert Hindi review follows and its corrections go into src/data/answerLibraryHi. Hindi is static, never runtime-translated; facts, numbers and sources come from the English page and tests/hindi-pages.test.ts checks every English number appears in the Hindi text.

- CBAM suite navigation (owner, 24 October 2026): footer Solutions column keeps "CBAM Calculator" and adds "CBAM Report" (/cbam-suite); the homepage "Also" strip shows "CBAM Report" (/cbam, the landing page; changed from /cbam-suite on owner request 24 October 2026) instead of "CBAM Calculator"; the words "CBAM Suite" do not appear on the homepage. In-house sign-off reads "Verified by Senseible"; clients may record an external verifier instead. Fuel factors use the platform's standard factors (owner to match sources).

- Platform changes (owner, 23 October 2026): no change to the platform (calculations, factors, components, pages' behaviour, edge functions, database, footer) without the owner's explicit approval. Answers batches (content pages, batch register, generated indexes) continue as approved. When a source shows a factor we use is out of date, report the old and new figures with the source location and wait for approval.

- Deferred by the owner (21 October 2026), do not start without a go-ahead: OCR accuracy test on 50 to 100 real documents, fix-in-place units for needs-data bills, a coverage line under every total, closing a reporting period. (A lender share link and a CBAM supplier export were approved by the owner on 25 October 2026.)

- CBAM suite footer (owner, 25 October 2026): /cbam-suite and /cbam-suite/supplier-pack show the standard site footer, unchanged.
- Dr. Elena Varga (owner, 25 October 2026): her role is an expert audit of reports and their accuracy, not a per-page reviewer credit. Do not show her name on any page or in PAGE_REVIEWS unless it is critical or the owner permits it.
- Verified emissions record (owner, 25 October 2026): the certificate is titled "VERIFIED EMISSIONS RECORD"; who verified is stated once, in the footer, as "Verified by Senseible, expert-supervised" (never "independently reviewed", "analyst or subject expert" or "Senseible carbon platform"). It shows a coverage line (verified documents of all recorded, and share of recorded emissions) and the quality grade with its pass-rate note.
- Footer band (owner, 25 October 2026): no change. The mockup showed no visible difference, so the current footer band stays as it is.
- Enterprise pilot (owner, 25 October 2026): enterprises pay on custom terms (volume and custom build), billed through a direct payment link sent to the enterprise, separate from the MSME tier plans. The enterprise pays for supplier bill reads and for data shared by suppliers already verified with Senseible. Suppliers sign up and read bills exactly as MSMEs do. The pilot must scale to 50 to 100 suppliers per enterprise without affecting the existing platform. Approved: lender share link, CBAM supplier export. Enterprise dashboard and the enterprise switch need the owner's visual approval before build.
- Enterprise pricing (owner, 25 October 2026): /enterprise/pricing, separate from the MSME /pricing page and never in the footer (linked from /enterprise). One custom quote per enterprise, set by suppliers, team seats, report downloads and supplier invites; past the quote's limits, pay as you go. No prices on the page. Suppliers share with the enterprise at no cost; their own extras (Monetize and the rest) stay on their own Senseible plan and show masked when not covered. The enterprise decides who joins and gives each person a role; enterprise roles never cover suppliers. Supplier requests, reminders, consent and roll-up are standard, not pilot: no Pilot labels; only custom builds are labelled. Copy avoids "paid by link" and pilot-size lines. Enterprises must be able to see their supplier history and use Biocog Superintelligence on supplier data (to be built).
- Enterprise billing (owner, 25 October 2026): prices stay internal (data only, never published). Included per enterprise: 10 seats, 150 bill reads per supplier a year, 120 report downloads, 1 request and 2 reminders per supplier (more only if custom built), 2,000 Superintelligence questions a month. Past any of these nothing is blocked; the extra is billed automatically at the stored rates: supplier Rs 1,199 a year, seat Rs 5,999, 100 reads Rs 79, report Rs 99, reminder Rs 9, 1,000 questions Rs 2,999. Invited suppliers use their own free reads and top-ups they buy first; after that the enterprise covers reads and is billed, and the supplier is reminded it can top up. Masked features stay on the supplier's own plan.
- Enterprise seats and question billing (owner, 26 October 2026): enterprise teams are never blocked on seats (ceiling 1,000); seats past the quote are billed yearly. Extra Superintelligence questions bill per 1,000 at the stored rate. Pending migration 20261109100000_enterprise_seats_and_question_billing, with rollback and tests.
- Enterprise Superintelligence (owner, 25 October 2026): enterprise teams ask questions on their own supplier records (where to focus, whom to chase, what cuts the most) on /enterprise/dashboard through the enterprise-intelligence function. Answers use only the supplier lines the dashboard shows, never invented savings or costs. Each answered question is counted in enterprise_usage; past the monthly quote it is billed per 1,000. Enterprise pricing hero names security first: no ERP access needed, encrypted storage and transfer, isolated from other companies, supplier bills stay private.
- Chai Break Arcade (owner, 25 October 2026): three small games at /play/ (Dhuaan Dhoom, Bill Bachao, Chimney Chill) in Hinglish, English and Hindi, humorous but honest. Tap and play: no sign-in, no upload, no AI, nothing sent anywhere. One self-contained file; the service worker (public/sw.js) keeps only that page and shows it when any visit fails for lack of internet, and never caches the app itself. Footer placement still needs the owner's Yes/No.
- Report units (owner, 25 October 2026): keep tCO2e, the unit every framework expects. The methodology states the factors are CO2 only and that methane and nitrous oxide from fuels add under 1%. Adding those gases is a calculation change that needs separate approval.
- Output quality gate (owner, 25 October 2026): the owner must not be the one who catches weak copy. Generated documents pass `tests/report-copy.test.ts`; new or changed pages, reports and certificates are rendered and reviewed by an independent agent, and every finding is fixed, before the owner sees visuals. Reports name Senseible or the documents, never "the platform".

## 9. Open decisions (ask before acting)

- Evidence trail line (fingerprinted · factor sourced · method pinned): move from Dashboard to MRV? Not answered yet.
- Grid factor (1.42 to 1.52 on dummy rows vs 0.710): confirm in the live OCR review before any change.
- CEA v22.0 (August 2026): national combined margin 0.675 t CO2/MWh for FY 2025-26 (User Guide v22.0, Table S p.1; Results sheet 0.67510); FY 2024-25 stays 0.710. Answers pages state 0.675 as CEA's latest figure; the calculator still uses 0.710. Switching the calculator factor needs the owner's approval.
- Fuel factors vs PPAC Ready Reckoner FY 2025-26 (densities corrected to 15 C, IPCC per-kg factors): petrol about 2.21 kg CO2/L vs our 2.31; furnace oil about 3.03 vs 2.97; kerosene about 2.49 vs 2.52; PNG 2.05 to 2.12 per scm depending on which PPAC reference is used; diesel matches (2.665 vs 2.68). Reported only; no factor changed until the owner approves.
- Contact form checks (owner, 22 October 2026): send-contact-notification rejects empty, placeholder, disposable and mistyped emails, domains with no mail server, dummy phone numbers (repeated digits, counting runs) and empty messages (`supabase/functions/_shared/contactCheck.ts`), and caps plain messages at 10 per IP and 5 per email a day. It never punishes genuine people: Indian mobiles and landlines in any common format and foreign numbers with a country code pass, a failed DNS lookup or counter error lets the message through, and invalid submissions are not counted.
- Page background (owner, 23 October 2026): stone canvas #F5F3EF site-wide in light mode, white cards, white fields; supporting tokens: muted and secondary 40 14% 91%, muted text #666, warmer border and input. Light-mode status text uses deep shades (success hsl(152 60% 28%), warning hsl(30 90% 30%), accent hsl(200 80% 30%)) while fills and icons keep the bright tokens; inverted strips (bg-foreground) keep the bright tokens in light mode and take the deep shades in dark mode. Dark mode: primary buttons near-black text on the green; red text hsl(0 85% 68%). Pages with their own palettes (ad pages, Decarbonize India) keep them. Rejected: #FFFDF0 (white cards vanish, yellow cast) and green or sage tints (compete with the brand green). Every colour change must pass the automated contrast audit (every visible text node, 30 public and 8 app pages, light and dark, 390 and 1280 px) before deploy.
