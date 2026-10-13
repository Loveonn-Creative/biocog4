# Pending migrations (NOT applied)

SQL in this folder has **not** been applied to any database. It lives outside
`supabase/migrations/` on purpose so Lovable Cloud / the Supabase CLI does not
pick it up automatically.

## 20261011120000_protect_privileged_columns.sql

Adds `BEFORE INSERT OR UPDATE` triggers that silently restore server-owned
columns when the caller is not `service_role` (edge functions) or a direct
DB/migration context:

- `profiles`: `subscription_tier`, `subscription_expires_at`, `razorpay_customer_id`,
  `razorpay_subscription_id` (an expired subscription may still be downgraded to
  `snapshot` by the browser).
- `organizations`: `subscription_tier`, `max_members`.
- `emissions`: `verified` (forced `false` on insert), `verification_notes`, `co2_kg` on update.
- `carbon_verifications`: verification results/status/score/eligibility/`verified_at`.
- `monetization_pathways`: `status`, `estimated_value`, `verification_id`, `completed_at` on update.

## Apply (after review/approval)

1. Test on a branch/staging database first.
2. Either copy the file into `supabase/migrations/` (keep the filename) and let
   Lovable apply it, or paste its contents into the Lovable Cloud SQL/migration
   tool and run it once.

## Roll back

Run `rollback/20261011120000_protect_privileged_columns.rollback.sql`. It drops
the five triggers, their functions, and `public.is_trusted_db_writer()`. No data
is changed by either script.

## 20261011150000_business_ids_on_profiles.sql

Adds `cin`, `company_pan` and business-ID check columns to `profiles`, syncs them from signup metadata in `handle_new_user`, and stops browser clients from setting `verified` or `not_found` (only service_role can, once a licensed registry API is connected). Depends on `public.is_trusted_db_writer()` from `20261011120000_protect_privileged_columns.sql`, so apply that one first. Roll back with `rollback/20261011150000_business_ids_on_profiles.rollback.sql`.

## 20261011160000_scale_price_quotes.sql

Creates `public.scale_price_quotes` (admin-issued, per-user Scale quotes with `amount_inr`, `billing_cycle`, `seats`, `valid_until`, `status` active/consumed/revoked). RLS is on: a signed-in user can SELECT only their own active, unexpired quotes; there are no write policies, so only service_role can insert or update. Admins create and revoke quotes via the SQL editor or a service-role client for now, because `has_role` EXECUTE was revoked from `authenticated` in `20260613142133`. `create-razorpay-order` already refuses Scale checkout with HTTP 403 until this table exists and holds a valid quote for the caller; `verify-razorpay-payment` marks the quote consumed after activation. No dependency on the other pending migrations. Roll back with `rollback/20261011160000_scale_price_quotes.sql` (drops the table and any quotes in it).

## 20261011180000_team_access_and_ledger_integrity.sql

Runs in one transaction. Depends on `public.is_trusted_db_writer()` from `20261011120000_protect_privileged_columns.sql` (it aborts if that is missing), so apply that one first.

- **RLS helper access (fixes "permission denied for function is_org_member").** `20260613142133` revoked EXECUTE on `has_role`, `is_org_member`, `is_org_admin`, `is_partner_admin` and `has_partner_access`, but policies from `20260122104318`, `20260123170433` and `20260124091714` still call them, so organization, member, invitation, partner and audit-log queries fail for signed-in users and anon. Adds `SECURITY DEFINER` copies in a `private` schema (`search_path = ''`, not exposed through the API), grants `USAGE`/`EXECUTE` to `authenticated` and `anon`, and recreates the 15 affected policies with identical names and expressions pointing at `private.*`. The `public.*` helpers stay revoked.
- **Seat sync.** `organizations.max_members` is derived from the owner's `profiles.subscription_tier` (basic/Essential 3, pro 10, Scale = `seats` on the owner's most recently consumed Scale quote, never fewer than 10; expired or free 1; needs `20261011160000_scale_price_quotes.sql` first) by a `BEFORE INSERT OR UPDATE` trigger that fires after the protect trigger, plus an `AFTER UPDATE` trigger on `profiles`. service_role may still set an explicit value. Existing rows are backfilled; their previous values are saved in `organizations_max_members_backup` for the rollback.
- **`create_organization(p_name)`** creates the org, the owner member row and the active context atomically (granted to `authenticated`).
- **`update_member_role(org, user, role)` / `remove_member(org, user)`**: admin only, the owner cannot be changed or removed, admins cannot change their own role, any non-owner can remove themselves.
- **compliance_ledger.** Moves duplicate `(user_id, emission_id)` rows (keeps the latest by `verified_at`, then `created_at`) into `compliance_ledger_duplicates_backup` (RLS on, no policies), adds unique index `compliance_ledger_user_emission_key`, and drops the owner UPDATE policy. A commented-out line can also drop the owner INSERT policy (owner decision).

Roll back with `rollback/20261011180000_team_access_and_ledger_integrity.sql`: restores the original policies (which fail again), drops the `private` helpers and schema, the RPCs, triggers and seat functions, restores saved `max_members`, puts the removed ledger rows back and recreates the UPDATE policy. Organizations created while the migration was live keep their tier-derived seat count.

## 20261011170000_recalculate_emissions.sql

Recomputes `co2_kg` and `emission_factor` for stored emissions whose factor changed in methodology v1.1: LPG 1.51 to 2.98 per kg, PNG 2.30 to 2.05 per scm, furnace oil 3.15 to 2.97 per L, grid 0.708 to 0.710 per kWh, kerosene (stored with diesel's 2.68) to 2.52 per L.

- Rows match on category, old factor and stored unit; kerosene rows are found through `sourceDescription`. Naphtha rows (old 3.00 per L) are listed for manual review and not changed, because the new factor is per kg. Negative green rows are untouched.
- Old values are first copied to `public.emissions_recalc_backup_20261011` (RLS on, no policies).
- `compliance_ledger` and `carbon_verifications.total_co2_kg` are left as snapshots of what was verified at the time.
- Dry run: execute up to and including the two preview SELECTs, then ROLLBACK. Re-running the migration changes nothing.
- Run as the DB owner, after 20261011120000 if that is applied (its trigger only lets trusted writers change `co2_kg`).
- Rollback: `rollback/20261011170000_recalculate_emissions.sql` restores the three columns exactly and drops the backup table.
- Needs confirmation before applying: the CEA edition behind 0.710, and the densities assumed for PNG (0.76 kg/scm), furnace oil (0.95 kg/L) and kerosene (0.80 kg/L).

## audit_20261012_ownership.sql (read-only)

Five SELECT queries that list records whose owner does not match the record they derive from (emissions vs documents, ledger vs emissions), documents that existed before their first emission (re-assigned), files held by several accounts, and recent guest-session merges. It changes nothing. Use it to find invoices that reached the wrong account before the ownership fixes; owners can then remove wrongly attached unverified invoices from History, and any verified ones are reviewed by hand.

## 20261012120000_water_mrv.sql (moved to supabase/migrations/ on approval, switch OFF)

Purely additive: creates ten new `water_*` tables, four guard triggers and three `service_role`-only functions (`water_persist_run`, `water_apply_recalc`, `water_transition_flag`). No existing table, policy, function or row is touched. The switch row `water_mrv_settings.enabled` is created as `false` and both write functions refuse to run until it is turned on. The factor and mapping tables ship empty: nothing is calculated until a factor steward loads sourced factors and a second person approves them. Results are append-only and versioned; audit events are immutable; NULL emissions without a factor are enforced by a CHECK. Clients can read only their own entity's rows. Methodology, sources and open decisions: `docs/methodology/water-mrv.md`.

Tested locally on Postgres 16: `supabase/pending-migrations/tests/run.sh 20261012120000_water_mrv` (run as a user that can create databases) applies it, runs `tests/20261012120000_water_mrv.test.sql`, rolls back and checks the catalog and an existing table match the starting snapshot.

Roll back with `rollback/20261012120000_water_mrv.rollback.sql`. It drops only the `water_*` objects. While any water bill exists it refuses unless `SET LOCAL water.rollback_confirm = 'drop water data';` is run in the same transaction (export the tables first if the data is needed).

Rollout helpers: `water_load_factors.template.sql` (empty template, no values), `water_shadow_compare.sql` (read-only comparison), `scripts/water-backfill.ts` (dry run by default). Steps in `docs/methodology/water-mrv.md` §12.

## 20261013100000_org_workspace_roles.sql (organisation workspace)

Depends on `20261011180000`. Purely additive apart from widening two role CHECK constraints; no row is deleted or rewritten.

- **Roles**: owner, admin, data_manager, analyst, carbon_auditor, viewer. One matrix, `private.role_can`, used by every policy, trigger and RPC (the app copy in `supabase/functions/_shared/teamRoles.ts` is tested against it). Analysts add invoices but cannot verify; carbon auditors verify but cannot add or change invoices; viewers only read.
- **Records**: rows written in an organisation workspace carry `organization_id`. `guard_record_organization` checks the writer's role, makes emissions inherit their invoice's workspace and stops a row moving between workspaces. One invoice file counts once per organisation (`documents_org_hash_key`). `compliance_ledger.organization_id` is added.
- **Reading**: additive SELECT policies let members read their organisation's documents, emissions, verifications, reports and ledger. Owner policies are untouched, so personal records stay private.
- **Team**: owners and admins edit the organisation profile; nobody can change `owner_id` from the browser; only the owner grants, removes or invites admins.
- **Functions**: `my_org_permissions(org)` for the browser, `service_org_can(user, org, capability)` for edge functions (service_role only).

Tested: `tests/run_chain.sh` replays all of `supabase/migrations` on local Postgres 16 with Supabase stand-ins, applies the pending chain, runs 33 behaviour checks across all six roles and an outsider, rolls back and compares the catalog, then re-applies.

Roll back with `rollback/20261013100000_org_workspace_roles.rollback.sql`. Members holding a new role are mapped (data_manager to analyst, carbon_auditor to viewer) and their previous roles are kept in `org_role_rollback_backup`. `organization_id` values already written stay on their rows.

Step-by-step apply guide: `docs/runbooks/team-workspace-rollout.md`.

## 20261014100000_ambassador_applications.sql (Decarbonize India applications)

Creates one new private table, `ambassador_applications`. Nothing existing is touched. RLS is on with no policies, and `anon`/`authenticated` have no grants, so only the `submit-ambassador-application` edge function (service_role) writes or reads it. One application per email (case-insensitive); three submissions per network per hour. The program manager is emailed each application through the shared transactional email sender (`ambassador-application` template, fixed recipient palanisamy@senseible.earth, reply-to the applicant). Until this table exists the page shows the WhatsApp and email route instead of failing.

Tested: `tests/run_ambassador.sh` replays `supabase/migrations`, applies it, runs 7 checks (uniqueness, lane and length rules, no browser access), confirms the rollback refuses while applications exist, then rolls back with confirmation and compares the catalog.

Roll back with `rollback/20261014100000_ambassador_applications.rollback.sql`. It refuses while applications exist unless `SET LOCAL ambassador.rollback_confirm = 'drop applications';` is run in the same transaction (export first).

## 20261015100000_atomic_verify_and_delete.sql (atomic verification and deletion)

Depends on `20261011180000` (the unique ledger index; aborts if missing). Adds two `service_role`-only functions; no table, policy or row is changed.

- **`commit_verification(p jsonb)`**: `verify-carbon` saves the verification, the `verified` marks and the ledger rows in one transaction. The emissions are locked first and must still belong to the caller's workspace (personal, organisation or guest session), otherwise `records_changed` (HTTP 409). Only records that passed their checks are marked verified. Re-sending the same set returns the stored verification and fills in any marks or ledger rows an interrupted earlier run left out. An existing unverified ledger row is promoted when that record is now verified; a verified row is never overwritten.
- **`delete_document_atomic(document, actor, allowed, user_agent)`**: `delete-document` removes an unverified invoice, its records and ledger rows, and writes the audit entry, in one transaction, after locking the invoice and its records. It refuses when any record, ledger row or verification of these records is verified, or a monetisation pathway or marketplace listing is built on one. Unverified attempts stay as history and are named in the audit entry. A delete that arrives while a verification of the same records is in progress waits for it, then refuses.

Until it is applied, both edge functions fall back to the previous step-by-step path, so the code can ship first.

Tested on local Postgres 16, with and without `20261013100000`: `tests/20261015100000_atomic_verify_and_delete.test.sql` (19 checks). The real `verify-carbon` and `delete-document` handlers were also run against the replayed schema, before and after the migration, including a forced ledger failure (atomic path: HTTP 500, nothing written) and a delete racing an open verification.

Roll back with `rollback/20261015100000_atomic_verify_and_delete.rollback.sql`. It drops the two functions; no data changes.

## 20261016100000_invoice_source_files.sql (original invoice files kept as evidence)

No dependency on the other pending migrations. Uses the existing private `documents` bucket (no new bucket, no table or row change).

- **Server-write-only bucket**: drops the owner INSERT, UPDATE and DELETE storage policies and the unused anonymous upload policy on the shared `guest/` folder, so a stored file cannot be planted in advance, replaced or deleted from the browser. Owners keep read access to their own folder. The billing-invoice HTML that `generate-invoice-pdf` writes (service role, `invoices/` folder) is unaffected.
- **`invoice_source_storage_ready()`** (service_role only): `extract-document` stores files only once this exists, so nothing is stored before the policies are tightened.
- **What happens after it is applied**: after a successful read, `extract-document` stores a signed-in user's original file at `<user id>/<document hash>.<ext>` and records the path in `documents.file_url`. Guest files are never stored on the server; they stay in the guest's browser (IndexedDB), cleared when the identity on the device changes. History shows "View source": `document-source-url` issues a 5-minute link only to the uploader, or for an organisation invoice to members whose role allows `records.view`, and writes `document_source_viewed` to `security_audit_log`. Deleting an unverified invoice also removes its file. Invoices added before this was applied have no kept file and say so.

Tested on local Postgres 16: `tests/20261016100000_invoice_source_files.test.sql` (9 checks: bucket private, no browser write policy, owner reads own file, owner cannot plant, replace or delete, other users read nothing, guests cannot upload, browsers cannot call the readiness function). The real `extract-document`, `document-source-url` and `delete-document` handlers were run before and after it.

Roll back with `rollback/20261016100000_invoice_source_files.rollback.sql`: restores the four policies exactly and drops the readiness function, so storing stops. Stored files are kept; delete them from the bucket separately if wanted.

## 20261017100000_solar_signals.sql (rooftop solar reduction signal)

No dependency on the other pending migrations. Adds four tables; changes no existing table.

- **`grid_emission_factors`**: combined-margin grid factors, each with a required `source` and `version`. Readable by everyone; written only from the SQL editor. No factor value ships in code or in this migration.
- **`solar_assets`, `solar_readings`**: a signed-in user's rooftop system and its metered monthly generation. Owners can read their own rows; all writes go through the `solar-signal` edge function (service role), which validates the input.
- **`credit_signals`**: append-only log of each computed signal, with the method id and version, inputs hash, conservative and central tCO2e (null while withheld). Owners read their own; no update or delete.
- **Method** (`supabase/functions/_shared/solarSignal.ts`, `SENSEIBLE-SOLAR-01` v0.1): ISO 14064-2 project accounting with CDM AMS-I.F arithmetic (metered generation × combined-margin factor from the CDM grid emission factor tool). Gaps are never filled, readings above a 30% capacity factor are excluded, and the conservative figure deducts the meter accuracy class. It is a signal for the offline credit process, not a credit.

**After applying, add the factor** from the latest CEA CO2 Baseline Database (combined margin, India grid), copying the value and version exactly from the published document:

```sql
INSERT INTO public.grid_emission_factors (region, kind, kg_per_kwh, source, version)
VALUES ('IN', 'combined_margin', <value from CEA>, 'CEA CO2 Baseline Database', '<version, e.g. Version 20.0>');
```

Until a factor exists, /solar-signal shows every check and the kWh, but tonnes stay withheld. Before the migration, saving shows "not switched on" and the page still previews.

Tested on local Postgres 16: `tests/20261017100000_solar_signals.test.sql` (10 checks: owners read only their own rows, browsers cannot write any table, signals cannot be updated or deleted, factors need a source and version). The real `solar-signal` handler was typechecked; the arithmetic is covered by `tests/solar-signal.test.ts`.

Roll back with `rollback/20261017100000_solar_signals.rollback.sql`. It refuses while any solar data exists unless run with `SET LOCAL solar.rollback_confirm = 'drop solar data';` in the same transaction, then drops the four tables.

## 20261018100000_reduction_projects.sql (fuel-switch and energy-efficiency signals)

**Requires 20261017100000_solar_signals.sql** (it reuses `grid_emission_factors` and extends `credit_signals`). Apply it after the solar migration; roll it back before the solar one.

- **`reduction_projects`**: a signed-in user's change at a site, one lever each: `fuel_switch` (old fuel and the new energy that replaced it) or `energy_efficiency` (the energy measured and the output unit). Check constraints make the lever's fields required and forbid the other lever's fields. Fuels are limited to the ones with an IPCC-derived factor in code (diesel, furnace oil, kerosene, LPG, PNG); grid electricity uses the combined-margin factor table.
- **`reduction_periods`**: the monthly figures behind a project, split into `baseline` (before the change) and `project` (after) phases, each with its evidence type and optional link to the stored invoice. A period must carry at least one figure; quantities cannot be negative; the same period cannot be entered twice.
- **`credit_signals`** (from the solar migration): a signal now belongs to exactly one solar asset **or** one reduction project, and gains `baseline_tco2e`, `project_tco2e` and `details`. Existing solar rows and policies are unchanged; a new policy lets owners read their project signals.
- Owners read their own rows; browsers cannot write any of these tables. All writes go through the `reduction-signal` edge function (service role), which recomputes the signal server-side with the shared method.
- **Methods** (`supabase/functions/_shared/reductionSignal.ts`):
  - `SENSEIBLE-FUELSWITCH-01` v0.1 follows the baseline structure of CDM AMS-III.B v18.0 (switches between fossil fuels). The baseline is the lower of the historical old-fuel rate (per unit of output when recorded) and the old fuel needed to supply the energy the new source delivered. A switch to grid electricity is outside AMS-III.B and is never marked ready.
  - `SENSEIBLE-EFFICIENCY-01` v0.1 follows CDM AMS-II.D v13.0 as adopted by BEE BM IN02.001 v1.0: baseline energy per unit of output × output, allowed only when the baseline stays within ±10% of its average; lower production is never credited.
  - Conservative figure: the lower 90% confidence limit of the baseline rate, IPCC 2006 lower limits for baseline fuel and upper limits for project fuel (CDM TOOL03), and meter accuracy added to project energy.
  - At least 12 months of baseline (a Senseible minimum; the signal notes that credit methods commonly use three years). It is a signal for the offline credit process, not a credit.

No factor value ships in this migration. Grid electricity needs the CEA combined-margin row described under the solar migration; fuel factors come from the IPCC tables cited in code.

Tested on local Postgres 16 with `tests/run_reduction.sh`: replays every migration, applies solar, then this migration, runs `tests/20261018100000_reduction_projects.test.sql` (24 checks: lever fields, period rules, one subject per signal, owners read only their own rows, browsers cannot write, deletes cascade, solar rows untouched), proves the rollback refuses with data, rolls back to the identical catalog, re-applies, and the solar rollback still works afterwards. The solar behaviour tests also pass with this migration applied. The real `reduction-signal` handler was run against this schema (13 scenarios: save, recompute, set replacement, append-only signals, other users blocked, overlap refused, withheld without a factor, ready with one, 401 without sign-in, 503 before the migration).

Roll back with `rollback/20261018100000_reduction_projects.rollback.sql`. It refuses while any project or project signal exists unless run with `SET LOCAL reduction.rollback_confirm = 'drop reduction data';` in the same transaction, then deletes project signals, restores `credit_signals` to its solar-only shape and drops the two tables.
