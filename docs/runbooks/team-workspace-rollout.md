# Team workspace rollout: applying the database changes

The website code is already safe to run before these steps: until the database
changes are applied, everything behaves exactly as it does today. Each step
below can be undone with the matching file in `supabase/pending-migrations/rollback/`.

## Before you start

- Do this when few people are using the app.
- Apply the four files in the order below, one at a time.
- After each one, run its check. If a check fails, stop and roll back that step.

## How to apply one file in Lovable

1. Open the file on GitHub, in `supabase/pending-migrations/`, and copy the whole file.
2. In your Lovable project chat, write:
   > Apply this SQL migration to the database exactly as written. Do not change, shorten or split it.
   Then paste the SQL.
3. Lovable shows the SQL and asks you to approve it. Check that it matches the file, then approve.
4. Run the check for that step by asking Lovable in the chat:
   > Run this read-only query and show me the result.
   followed by the check query.

## Steps

| # | File | What it does | Check query (expect `true`) |
|---|------|--------------|-----------------------------|
| 1 | `20261011120000_protect_privileged_columns.sql` | Stops the browser changing plan, seats or verification results. | `SELECT to_regprocedure('public.is_trusted_db_writer()') IS NOT NULL;` |
| 2 | `20261011160000_scale_price_quotes.sql` | Scale quotes table; Scale seats come from the quote. | `SELECT to_regclass('public.scale_price_quotes') IS NOT NULL;` |
| 3 | `20261011180000_team_access_and_ledger_integrity.sql` | Fixes "permission denied for function is_org_member" on the Team page; seat counts per plan; team role changes. | `SELECT to_regprocedure('public.create_organization(text)') IS NOT NULL AND to_regprocedure('private.is_org_member(uuid,uuid)') IS NOT NULL;` |
| 4 | `20261013100000_org_workspace_roles.sql` | Six team roles and the shared organisation workspace. | `SELECT to_regprocedure('public.my_org_permissions(uuid)') IS NOT NULL;` |
| 5 | `20261015100000_atomic_verify_and_delete.sql` | Verification and invoice deletion each save completely or not at all. Needs step 3. Works before or after step 4. | `SELECT to_regprocedure('public.commit_verification(jsonb)') IS NOT NULL AND to_regprocedure('public.delete_document_atomic(uuid,uuid,boolean,text)') IS NOT NULL;` |
| 6 | `20261016100000_invoice_source_files.sql` | Keeps signed-in users' original invoice files (server-write-only, "View source" in History). Independent of steps 1 to 5. | `SELECT to_regprocedure('public.invoice_source_storage_ready()') IS NOT NULL;` |
| 7 | `20261017100000_solar_signals.sql` | Rooftop solar reduction signal (/solar-signal): grid factors, solar systems, readings and an append-only signal log. Independent of steps 1 to 6. After it, insert one sourced CEA combined-margin factor (see the pending migrations README) or tonnes stay withheld. | `SELECT to_regclass('public.credit_signals') IS NOT NULL;` |

## Separate: Decarbonize India applications

Independent of steps 1 to 4. Apply `20261014100000_ambassador_applications.sql` the same way. Check: `SELECT to_regclass('public.ambassador_applications') IS NOT NULL;`. After it, the application form on /decarbonize-india saves applications and emails palanisamy@senseible.earth. Before it, the form points applicants to WhatsApp and email.

## After step 3, in the app

- Open Team. It loads without a "permission denied" message.
- The seat count shows 3 (Essential), 10 (Pro), or the seats on the customer's Scale quote (at least 10).

## After step 4, in the app

- Owners and admins see six roles in Invite Member (admins do not see Admin; only the owner hands out admin access).
- Members of an organisation see a workspace switcher next to their name: Personal or the organisation.
- In the organisation workspace, invoices added by any member appear for everyone in the team; personal workspaces stay private.

## After step 5, in the app

- Verify an invoice on Verify. The result, the verified marks and the ledger rows appear together; if saving fails, the page says nothing was changed and you can try again.
- Delete an unverified invoice from History. It disappears with its records, and one entry is written to the security audit log. An invoice with verified records still cannot be deleted.

## After step 6, in the app

- Upload an invoice while signed in, then open History: the invoice shows "View source", which opens the original file in a new tab (the link works for 5 minutes).
- Invoices uploaded before step 6 have no kept file; "View source" does not appear for them.

## Scale seats

Seats for a Scale customer come from the quote you issue. When creating a quote, set `seats`:

```sql
INSERT INTO public.scale_price_quotes (user_id, amount_inr, billing_cycle, seats, valid_until, notes, created_by)
VALUES ('<customer auth uid>', <agreed amount in INR incl. GST>, 'yearly', <seats>, now() + interval '30 days', '<reference>', '<admin auth uid>');
```

When the customer pays, the quote is marked consumed and their organisation's seats update automatically.

## Undo

Roll back in reverse order (6, 5, 4, then 3, 2, 1), only as far as needed, with the
files in `supabase/pending-migrations/rollback/`, applied the same way as above.
Rolling back step 4 keeps every record; members with the new roles are mapped
to the nearest old role and their previous roles are saved.
Rolling back step 5 only removes the two functions; the app returns to
saving step by step. No data changes.
