# Lovable deploy prompt, 17 October 2026

Covers everything merged up to the profile purchases change: Intelligence redesign, Loan Estimate, freight factors, answers batches C–E, document types and insights, the invoice pipeline, and the reads ledger with profile purchases (one new migration, one new function).

## Owner first (not Lovable)

Set these two secrets yourself in Supabase → Edge Functions → Secrets. Never paste their values into Lovable or any chat.

1. `INTERNAL_INBOX`: the internal review inbox address. Without it, contact, report-request, story and finance review emails are not sent.
2. `GEMINI_API_KEY`: replace the value with the new Gemini key. A secret saved as `Gemini_API_Key` is read too. The key is read only on the server (`supabase/functions/_shared/aiFetch.ts`). It never reaches the browser, logs or responses.

Then revoke the old Gemini key in Google AI Studio once Step 5 below passes.

## Prompt for Lovable

Copy everything inside the box below into Lovable as one message.

```text
Deploy the latest main branch of this project to production. Do only the steps below, in this order. Do not change any app code, migration file, RLS policy, table, secret value or edge function source. If any step fails, stop and report the exact error text; do not work around it.

STEP 1. Migrations. Apply any migration in drizzle/migrations that is not applied yet, in number order, exactly as written. Expected pending: 0027_invoice_reads_and_purchases. Never re-run one that is applied. Then confirm these exist and report present true/false: tables invoice_reads, invoice_credit_packs, service_orders, invoice_read_counting, invoice_read_settings; functions reserve_invoice_read, commit_invoice_read, release_invoice_read.

STEP 2. Secrets. Confirm these edge-function secrets exist, by name only. Never print, log or echo a value: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, LOVABLE_API_KEY, GEMINI_API_KEY, INTERNAL_INBOX, RESEND_API_KEY, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET. Report any that are missing; do not create or change them.

STEP 3. Deploy every edge function in supabase/functions from main, using supabase/config.toml. These must be on the latest code, including the new function purchases:
purchases, extract-document, intelligence-chat, finance-application, verify-carbon, esg-report-access, send-contact-notification, story-submit, story-review, auth-email-hook, translate-batch, delete-document, document-source-url, scope2-engine, scope3-trail, calculate-monetization, create-razorpay-order, verify-razorpay-payment, razorpay-webhook, reconcile-razorpay-payments, generate-invoice-pdf, generate-sitemap, merge-session, send-team-invitation, accept-team-invitation, send-payment-notification, send-partner-notification, send-purchase-enquiry, submit-ambassador-application, notify-grant-application, solar-signal, reduction-signal, elevenlabs-conversation-token, preview-transactional-email.

STEP 4. Publish the frontend from main.

STEP 5. Check each item and report PASS or FAIL with what you saw:
a) Signed in, upload one clear fuel or electricity invoice on /. Expected: it is read, saved, and appears in /history with a type label (for example "Tax invoice" or "Electricity bill") and "Invoice date ...".
b) In /history, open "Calculation" under that invoice. Expected: a line like "100 litre × 2.68 kg/litre = 268 kg CO₂e", then Factor, Source page and Factor set.
c) Upload a document headed "Credit Note". Expected: History shows "Evidence, not counted", and no emission record is added.
d) On /dashboard and /history, press "Show insights". Expected: a panel opens. Each insight has "How this was worked out" with formula, units, fields, assumptions and record links. With fewer than two months of records it says so.
e) Bulk upload (up to 10 files). Expected: before you start, a line shows "About N reads (M pages). R of L reads left this month". A PDF longer than 10 pages shows "Reading pages 11–20 of ..." while it is read.
f) /intelligence signed in on Pro or Scale: ask "How did my emissions change last month?". Expected: the answer quotes the month-on-month figures and cites record IDs.
g) Signed in, open /profile. Expected: a "Top up and services" card with invoice credits (₹79 per 100), Fast-track Verification (₹2,999 per report, 24–72 hours) and Expert Climate Audit (₹7,999), paid with UPI. Do not complete a real payment.
h) Function logs for extract-document, purchases, intelligence-chat and finance-application show no errors in the 10 minutes after deploy, and no log line contains an API key or an email address.

Finish with a short report: migrations applied, missing secrets if any, functions deployed, and PASS/FAIL for each item in Step 5. Do not mark anything as done without that evidence.
```
