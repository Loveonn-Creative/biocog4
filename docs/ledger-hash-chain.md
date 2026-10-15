# Hash-chained ledger: risks and use cases for review

**Status: built and tested, not applied.** The migration is
`supabase/pending-migrations/20261027100000_ledger_hash_chain.sql`, with its
rollback in `rollback/` and tests in `tests/run_ledger_chain.sh`. It deploys
only after the owner reviews this note.

## What it does

The compliance ledger already stores each invoice's SHA-256 (`document_hash`).
What it can't show today is that a ledger row has stayed the same since
Verify wrote it. Rows are promoted in place (unverified to verified) and
removed with their invoice, so the rows themselves can't be chained.

The migration adds an append-only history beside the ledger:

- Every insert, change and delete of a ledger row appends one event to
  `ledger_chain_events`. Each account (a workspace, or a user without one) has
  its own chain.
- Each event stores a SHA-256 digest of the row's evidence fields:
  - ids
  - document hash, invoice number and date, GSTIN
  - amount
  - scope, category, activity, unit
  - factor and its source
  - CO2
  - methodology
  - status and verified time
- Each event's hash also covers the hash of the event before it.
- `verify_ledger_chain(account)` (server only) recomputes everything. It
  reports the first problem:
  - an altered event
  - a missing event
  - a broken link
  - a ledger row changed or removed without an event
- Rows that exist when the migration runs get one `baseline` event each.

Nothing existing changes: no table, policy, function, edge function or page.

## Use cases

1. **Auditor and lender assurance.** A reviewer can confirm that the
   verified figures in a report are the ones recorded at verification. They
   can also see that nothing was edited or deleted quietly afterwards. This
   backs the audit trail with something they can check, not just our word.
2. **Dispute evidence.** If a buyer, bank or regulator questions a figure,
   the chain shows when each row was written, promoted or removed, in order.
3. **Climate finance due diligence.** Green-loan and credit-readiness reviews
   can rely on records whose history is provable from the day the chain
   starts.
4. **Later, with owner approval:**
   - Put the chain head (latest hash) on report exports, so a printed
     report can be matched to the ledger state it came from.
   - Publish a daily head hash outside our database, so even a database
     administrator can't rewrite history unnoticed.

## Risks and how they are handled

| Risk | Handling |
|---|---|
| Slower verification writes | One indexed read and one insert per ledger row, inside the same transaction. Tested with 4 sessions writing 400 rows to one account at once: one unbroken chain. |
| Two writes racing for the same chain tail | A per-account transaction lock; the concurrency test above proves no fork. Different accounts never wait on each other. |
| A failure in the chain blocks verification | The trigger runs inside the ledger write, so an error would roll back that Verify. The code is small and fully tested, and the rollback removes it in one step. |
| Personal or financial data in the history | Events hold only ids and SHA-256 digests. There are no vendor names, GSTINs, amounts or invoice numbers in clear text. |
| Browser access | RLS on, no policies, no grants to signed-in or anonymous users. Only the server can run the check or append events. |
| Account deletion requests (DPDP and similar) | Events are pseudonymous digests, but append-only means they can't be deleted through normal paths. Erasure needs an owner-run admin step (disable the guard, delete that account's chain, re-enable). Decide this policy before deploying. |
| False assurance before the chain starts | Baseline events prove history only from the migration date. Any wording must say "from [date]", never that older records were tamper-proof. |
| A database superuser can switch triggers off | Silent edits or deletes made that way are caught by the check, not prevented. Full protection against an administrator needs the external head hash (use case 4). |
| Reports or pages claiming more than this proves | Nothing user-facing changes in this migration. Any claim ("tamper-evident from [date]") is added only after review. |

## Not included (needs a decision)

- Showing chain status or the head hash in Reports, exports or the Verify page.
- Auditor read access to an account's chain.
- Anchoring head hashes outside the database.
- The erasure procedure for deleted accounts.

## Deploy, when approved

1. Copy the migration into `drizzle/migrations` as the next number, remove the
   top-level `BEGIN;`/`COMMIT;`, and add it to the journal so Lovable applies
   it.
2. No edge function redeploy is needed.
3. Roll back with
   `supabase/pending-migrations/rollback/20261027100000_ledger_hash_chain.rollback.sql`.
   It removes the trigger, the history and the functions, and leaves ledger
   rows untouched.
