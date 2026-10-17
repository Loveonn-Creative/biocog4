# Lovable deploy prompt, 16 October 2026

Copy everything inside the box below into Lovable as one message.

```text
Deploy the latest main branch of this project to production. Do only the steps below, in this order. Do not change any app code, migration file, RLS policy, table or edge function source. Do not create, rename or drop tables by hand. If any step fails, stop and report the exact error text; do not work around it.

STEP 1. Apply pending database migrations (drizzle).
Apply every migration in drizzle/migrations that is not applied yet, in number order, each one exactly as written. The ones expected to be pending are:
- 0008_invoice_source_files
- 0009_scope3_trail
- 0010_scope3_global_freight (needs 0009)
- 0011_financial_documents
- 0012_resource_leads
- 0013_finance_applications
Skip any that are already applied. Never re-run one that is applied.

STEP 2. Confirm the database objects exist. Run this read-only query and paste the full result:
select 'table' as kind, t as name, to_regclass('public.' || t) is not null as present
from unnest(array['document_extractions','scope3_documents','scope3_factors','scope3_lines','financial_documents','resource_leads','finance_applications','finance_application_events','finance_application_documents','finance_application_reviews']) as t
union all
select 'view', v, to_regclass('public.' || v) is not null
from unnest(array['scope3_trail','scope3_supplier_ledger','scope3_category_totals']) as v
union all
select 'bucket', b, exists (select 1 from storage.buckets where id = b and public = false)
from unnest(array['financial-documents','gated-resources','finance-documents']) as b
union all
select 'function', 'invoice_source_storage_ready', exists (select 1 from pg_proc where proname = 'invoice_source_storage_ready');
Every row must show present = true. The three buckets must be private (public = false). If any row is false, stop and report it.

STEP 3. Deploy every edge function in supabase/functions from main, using the settings in supabase/config.toml. These changed recently and must be on the latest code:
extract-document, verify-carbon, intelligence-chat, finance-application, translate-batch, esg-report-access, create-razorpay-order, verify-razorpay-payment, razorpay-webhook, reconcile-razorpay-payments, delete-document, document-source-url, merge-session, scope3-trail, scope2-engine, calculate-monetization, generate-invoice-pdf, send-contact-notification, send-team-invitation, accept-team-invitation, send-payment-notification, submit-ambassador-application, solar-signal, reduction-signal, notify-grant-application, elevenlabs-conversation-token.
Do not change any secret. Confirm these secrets exist (names only, never print values): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, LOVABLE_API_KEY, GEMINI_API_KEY, RESEND_API_KEY, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET. Report any that are missing; do not create them.

STEP 4. Publish the frontend from main.

STEP 5. Check, then report each result as PASS or FAIL with what you saw:
a) Call the finance-application function with body {"action":"probe"}. Expected: {"enabled":true}.
b) Open https://senseible.earth/green-loan signed out. Expected: a "Sign in to apply" page, no grey loading box and no "not_open" message.
c) Open https://senseible.earth/reports signed in with an account whose bills are not verified yet. Expected: the figures appear under "Measured from your bills · verification pending" with a "Verify now" button, not "No emissions data to report".
d) On a phone-width screen (390 px), the bottom bar shows Upload, Dashboard, History, Reports, More. "More" opens MRV, Intelligence, Verify and Monetize.
e) View the page source of https://senseible.earth/. Expected: exactly one script from googletagmanager.com/gtag/js?id=G-L8FJQ42YQK, one script from clarity.ms/tag/yykkrvc920, and no G-7DJ1WVE5R3 or G-MNNK9DMWHF.
f) Function logs for extract-document, verify-carbon and finance-application show no errors in the 10 minutes after deploy.

Finish with a short report: migrations applied (and any already applied), the Step 2 query result, functions deployed, missing secrets if any, and PASS/FAIL for each item in Step 5. Do not mark anything as done without that evidence.
```

## For the owner after Lovable reports

- Upload the sample ESG report PDF to the private `gated-resources` bucket as `esg-report-sample-2026.pdf`. Lovable must not do this; the file is not in the repository.
- GA4 Realtime and the Clarity dashboard should show visits within a few minutes of publishing.

## Before the next edge-function redeploy (added 17 October 2026)

Add the edge-function secret `INTERNAL_INBOX` (Supabase project, Edge Functions, Secrets) with the internal review inbox address. The address is no longer written in code. Without it, contact, report-request, story and finance review emails are not sent (the user-facing forms still answer, and leads are still stored where a table exists). Then redeploy: send-contact-notification, esg-report-access, finance-application, story-submit and any function using the transactional email templates.
