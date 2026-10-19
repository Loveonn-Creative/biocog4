# Core flow continuity guide

Owner rule (October 2026): no feature change, code change, schema migration or database update may break the core product flow. Treat continuity and data integrity as non-negotiable for every change.

**Core flow:** invoice upload and OCR (extract-document) → emission calculation → verification (verify-carbon) → reporting → monetisation → dashboard.

## Before changing anything
1. Read the affected code, its callers and downstream readers, the tables and policies it touches, and the edge functions on the path. Write down what could regress.
2. Make the smallest change that does the job. Keep existing behaviour, data, permissions and integrations unless the change is explicitly asked for.
3. Database changes ship as backward-compatible migrations: new tables and columns, nothing dropped or renamed in use. Each one comes with a rollback that restores the identical catalog and refuses while paid or user data would be lost. Code must work both before and after the migration is applied, through a fallback path, because Lovable applies migrations and deploys functions at different times.

## Before merging (deployment gate)
- `bun test tests` all green, including `tests/extract-document-journey.test.ts`, which runs the real extract-document handler end to end (save, duplicates, read again, electricity bills, credit notes, the reads ledger and the Gemini key).
- SQL behaviour tests for any migration on a replay of the production schema (`supabase/pending-migrations/tests/run_*.sh`): applies, rolls back to the same catalog, re-applies.
- `tsc --noEmit` clean; `npm run build` clean, with prerender and the SEO gate passing.
- Failure cases covered: AI provider refused or out of credit, migration not yet applied, duplicate and repeat uploads, existing records written before the change.
- Do not merge if a core-flow check fails, data integrity is uncertain, or the rollback is not ready. Report the blocker instead.

## After deploy (production)
- Upload one real invoice signed in: it is read, saved, counted once, and appears in History, Verify, Reports and Dashboard with the same figures.
- Check 10 minutes of extract-document, verify-carbon and intelligence-chat logs for errors.
- Report what changed, what was tested, the actual results, any open risk and the rollback status. Never claim success without evidence.

## Known guards in code
- Same file again: answered from the stored result before any read is reserved (no count, no new rows).
- Same invoice as another file: released after the read; counted once.
- Reads are reserved before the AI read and settled afterwards; a crashed read stops counting after 15 minutes.
- AI provider order: Gemini (`GEMINI_API_KEY`, then `Gemini_API_Key`), then the Lovable gateway; with none, a clear "nothing was counted" message.
- Electricity bills: a second photo is matched on supplier + billing period + units (`billKey` in cached_result), so a misread amount or bill number does not count it twice. Totals, arrears and the energy charge line are not bill charges. The Checks count leaves out notes on how a value was read; missing GSTIN, invoice number and date stay checks.
- Stale browser tabs load the newest build on their next page change (`/version.json`).
