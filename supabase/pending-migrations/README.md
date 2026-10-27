# Pending migrations (NOT applied)

> **Queued for Lovable (drizzle):** `drizzle/migrations/0008_invoice_source_files`,
> `0009_scope3_trail` and `0010_scope3_global_freight` are copies of
> `20261016100000`, `20261019100000` and `20261020100000` below (top-level
> BEGIN/COMMIT removed; drizzle wraps each file in a transaction). Tested on a
> replay of `supabase/migrations` plus drizzle 0000 to 0007, each file applied in
> its own transaction, with all three behaviour test files passing.

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

Creates one new private table, `ambassador_applications`. Nothing existing is touched. RLS is on with no policies, and `anon`/`authenticated` have no grants, so only the `submit-ambassador-application` edge function (service_role) writes or reads it. One application per email (case-insensitive); three submissions per network per hour. The program manager is emailed each application through the shared transactional email sender (`ambassador-application` template, fixed recipient `PROGRAM_CONTACT.managerEmail`, reply-to the applicant). Until this table exists the page shows the WhatsApp and email route instead of failing.

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

## 20261019100000_scope3_trail.sql (Scope 3 supplier evidence trail)

Additive only: four tables, three views, one service-role write function. Nothing existing changes. Apply on its own (no dependency on other pending migrations).

- **`document_extractions`**: the OCR fields of each newly uploaded invoice, exactly as read (printed unit only, never one read from the description), sealed by `extract-document` with a SHA-256 of their canonical JSON. Immutable; browsers cannot write it (unlike `documents.cached_result`). Electricity bills are not sealed. Invoices uploaded before this migration have no seal and stay out of the trail.
- **`scope3_factors`**: versioned factors. Each carries its GHG Protocol Scope 3 category, material (`hsn:7208` or `hsn:720810`, `sac:…`, `freight:road|rail|air|sea`, `travel:…`, `waste:<route>`, `stay:hotel`; no 2-digit chapters), geography (`IN`, or `SUPPLIER:<GSTIN>` for a supplier's own figure), unit (no per-rupee units, so no spend-based factors), data class, boundary, GWP basis, source, reference, publication year and validity dates. Approval needs a second person (`approved_by` must differ from `created_by`). A supplier's own figure needs its evidence document. Approved factors cannot be edited or deleted, only retired; a correction is a new version. **Ships empty.**
- **`scope3_documents`**: one row per sealed invoice: the dedup key (SHA-256 of supplier GSTIN + normalised invoice number + date) and the reconciliation result. A partial unique index counts an invoice once per owner however often it is uploaded (photo, PDF, re-scan); later copies are recorded as `duplicate` with a pointer to the counted one.
- **`scope3_lines`**: one row per invoice line and calculation: source evidence (description, HSN/SAC, quantity, unit, line total, page, text, logistics), classification (scope, Scope 3 category, method HSN/SAC/KEYWORD, basis), factor copied from the registry (key, version, value, unit, source, geography, material), data class (primary supplier / supplier-specific factor / secondary factor / spend-based / unverified), activity, formula, kgCO2e, checks, confidence, status (`verified`, `needs_data`, `needs_review`, `duplicate`, `not_scope3`), reasons and next action. Append-only with `is_current`; a recalculation inserts a new row and keeps the old one.
- Database rules: kgCO2e exists only with a factor and activity and equals their product; a line's factor must be approved and match its category, value, unit, key, version, geography, material and data class; a `verified` line needs a counted invoice, no open reasons, a formula and a non-spend data class; a line that is not verified must say why.
- Views `scope3_trail`, `scope3_category_totals` and `scope3_supplier_ledger` (security invoker, so RLS applies) give the current trail, verified kgCO2e per category, and a supplier ledger keyed by GSTIN with coverage. Only verified lines on counted invoices are totalled.
- Owners read their own rows (personal workspace; organisation members follow once the org migration's helpers are applied). Approved factors are readable by signed-in users. All writes go through `scope3_record_document`, called by `extract-document` on upload and by the `scope3-trail` function (recalculate after factors change).
- **Method** (`supabase/functions/_shared/scope3.ts`, `SENSEIBLE-SCOPE3-LINES` v1.0): a line gets kgCO2e only from printed activity (quantity and unit; freight: printed weight × distance; travel: passengers × distance) times an approved factor for its category, material and geography (the supplier's own first, then its country). Missing quantity, unit, weight, distance, mode, waste route, supplier GSTIN or factor makes the line Needs Data. Totals that do not reconcile (line totals vs subtotal), quantity × rate ≠ line total, a repeated line, a missing invoice number or date, or an unconfirmed capital good make it Needs Review. Neither counts.

To add a factor (two people): the author inserts it as `draft`, a second person reviews the source and sets `status = 'approved', approved_by = <their id>, approved_at = now()`. Then each user's trail recalculates through `scope3-trail`.

```sql
INSERT INTO public.scope3_factors (factor_key, version, scope3_category, material_key, geography, unit, kg_co2e_per_unit,
  data_class, boundary, gwp_basis, source_name, source_ref, publication_year, valid_from, created_by)
VALUES ('<KEY>', '1', <category>, '<material>', 'IN', '<unit>', <value>, 'secondary_factor', '<boundary>', '<GWP basis>',
  '<publication>', '<table/page>', <year>, '<valid from>', '<author user id>');
```

Until approved factors exist, every Scope 3 line is recorded with its evidence as Needs Data (`no_factor`) and nothing is estimated.

Researched drafts (India rail freight; Ministry of Steel crude-steel intensity for six hot-rolled and semi-finished steel headings; GLOBAL air freight by distance band and sea freight, which need `20261020100000_scope3_global_freight.sql`) are in `scope3_factors_draft.template.sql`, with sources, confidence, caveats and gaps in `docs/methodology/scope3-factors.md`. The template does not run until every placeholder is filled from the cited publication.

Tested on local Postgres 16 with `tests/run_scope3.sh`: replays every migration, applies this one, runs `tests/20261019100000_scope3_trail.test.sql` (46 checks: sealed extractions immutable; factor four-eyes approval, material specificity, no per-rupee units, supplier evidence, immutability and retirement; dedup by invoice key with the unique index; database rules on kgCO2e, factor match, verified lines and reasons; append-only lines with history; views; owners read only their own rows; browsers cannot write or call the write function; anonymous visitors have no access), proves the rollback refuses with data, rolls back to the identical catalog and re-applies. The real `extract-document` and `scope3-trail` handlers were run against this schema with test-fixture factors (26 acceptance checks: one invoice from original file hash to sealed fields, classification, factor, formula, kgCO2e, category and supplier totals; a re-scan counted once; a unit printed only in the description left as Needs Data; a supplier's own factor applied on recalculation with history kept; nothing writes when nothing changed) and without it (uploads unaffected).

Roll back with `rollback/20261019100000_scope3_trail.rollback.sql`. It refuses while any sealed extraction, factor or line exists unless run with `SET LOCAL scope3.rollback_confirm = 'drop scope3 trail';` in the same transaction.

## 20261020100000_scope3_global_freight.sql (global defaults for air and sea freight)

**Requires 20261019100000_scope3_trail.sql.** Constraint changes only; no data is written. `scope3_factors` may hold geography `GLOBAL`, but only for air and sea freight (a new check refuses it for every other material). It also gains the air freight distance bands `freight:air:short` (under 1,500 km) and `freight:air:long` (1,500 km or more, per the GLEC split). The method (`_shared/scope3.ts`) picks the band from the printed distance. It resolves the supplier's own factor, then the country, and only then `GLOBAL`, for these two modes alone.

Tested with `tests/run_scope3_global.sh`: replays every migration, applies the trail migration and this one, runs `tests/20261020100000_scope3_global_freight.test.sql` (7 checks: GLOBAL air bands and sea accepted, a country air band accepted; GLOBAL road, rail and materials refused; unknown bands and region names refused), proves the rollback refuses while GLOBAL factors exist, rolls back to the identical catalog, re-applies, and the trail's own 46 checks still pass on top.

Roll back with `rollback/20261020100000_scope3_global_freight.rollback.sql`. It refuses while any GLOBAL or air-band factor exists.

## 20261021100000_electricity_engine.sql (Scope 2: location- and market-based electricity)

New tables only; nothing existing is altered and no factor or framework rows are seeded. It adds:

- `electricity_factors`: a versioned grid-factor registry. Kinds are `grid_average`, `residual_mix`, `supplier_specific` and `project_combined_margin`. Each row carries its country, optional grid region, gases (CO2 or CO2e, with a GWP basis for CO2e), validity window, source, publication year and uncertainty. Rows need four-eyes approval and become immutable once approved.
- `reporting_frameworks`: a registry of reporting frameworks. Mandatory, voluntary and customer frameworks are kept apart; each row has its jurisdiction, effective dates, Scope 2 rules and a source URL.
- `electricity_activities`: consumption printed on a bill, one row per document line. It holds billing details only (period, units, kWh, country and how the country was known); no consumer name, address or account or meter number has a column.
- `electricity_instruments`: certificates, PPAs and supplier contracts with their evidence document, vintage, generation market, retirement and beneficiary. A certificate (scheme plus reference) can be claimed once across the whole platform.
- `electricity_allocations` and `electricity_calculations`: append-only ledgers with `is_current`. The database refuses three things: allocating more than an instrument's quantity or an activity's kWh, any location-based result that uses an instrument or a non-grid-average factor, and any result that uses a combined-margin factor. Every result must satisfy `kg = instrument kg + factor kWh x factor`, with instrument kWh plus factor kWh equal to the consumption.
- `scope2_record(p)`: the only writer (service role). It runs under a per-owner lock, replaces the owner's allocations as a set, and writes a calculation only when its inputs hash changed.
- `scope2_totals`: dual totals per reporting year.

The method is in `_shared/electricity.ts`; reads and writes are in `_shared/scope2Record.ts`. The method:

- Splits consumption across reporting years by days. India uses April to March; other countries use the calendar year.
- Location-based results take the regional grid average, then the national one. A factor covering the period is preferred; otherwise the most recent earlier edition is used and flagged. A later edition or another country's factor is never used.
- Market-based results take eligible instruments first, then a supplier-specific rate, then the residual mix. If none exists, the grid average is used and disclosed (`residual_mix_unavailable`).
- An instrument is allocated only when it has evidence, is retired, has a confirmed beneficiary, sits in the same market and has a vintage in the reporting year.
- kVAh, kvarh and kW are refused as energy. Net-metered and ambiguous totals are left as Needs Data.

`extract-document` records a bill's consumption after upload. `scope2-engine` registers instruments and recalculates. Both do nothing until this migration is applied.

Tested with `tests/run_scope2.sh`. It replays every migration, applies this one and runs `tests/20261021100000_electricity_engine.test.sql`: 39 checks, each rejection confirmed to fire for its own reason. It then proves the rollback refuses with data, rolls back to the identical catalog and re-applies.

The real `extract-document` and `scope2-engine` handlers were run against this schema with test-fixture factors and passed 19 acceptance checks:

- A bill across the fiscal-year boundary is split, with results for both methods.
- The formula is recorded, and an earlier factor edition is flagged.
- The market-based fallback is disclosed, and the combined-margin factor is never used.
- An I-REC allocates 500 kWh and lowers market-based only.
- The same certificate from another account is refused with 409, and an unretired one is not allocated.
- Recalculating writes nothing when nothing changed.
- kVAh gives Needs Data, a German account gets no India factor, and owners see only their own rows.

Before results appear, two people must enter and approve factor rows from the publications: the CEA weighted average for India, with its edition confirmed, and any residual-mix or other-country rows.

Roll back with `rollback/20261021100000_electricity_engine.rollback.sql`. It refuses unless run with `SET LOCAL scope2.rollback_confirm = 'drop scope2 engine';` in the same transaction.

## 20261022100000_emissions_write_guard.sql (browser writes to emissions)

**Requires 20261011120000_protect_privileged_columns.sql.** Trigger only; no data is changed. Approved by the owner in October 2026.

- A browser INSERT is stored only if `co2_kg = activity_data x emission_factor`, within the tolerance verify-carbon uses, with a positive quantity and no negative factor or kgCO2e. `verified` is forced to false.
- A browser UPDATE is refused: the app never edits a stored row. Activity data, factor, kgCO2e, scope, category, verification and ownership change only through service-role functions (verify-carbon) or a reviewed migration.
- verify-carbon also re-derives the factor for rows written by the current methodology (`publishedFactorFor`) instead of trusting the stored value.

Tested with `tests/run_emissions_guard.sh`. It replays every migration and applies 20261011120000, then applies this migration, rolls back to the identical catalog, re-applies and runs `tests/20261022100000_emissions_write_guard.test.sql`. That runs 12 checks: consistent insert stored; verified forced false; inconsistent and negative inserts refused; edits and self-verification refused; service role can still verify; and, through 20261011170000, verified rows held.

Roll back with `rollback/20261022100000_emissions_write_guard.rollback.sql`.

**Change to 20261011170000_recalculate_emissions.sql (owner decision, October 2026):** verified rows are no longer recalculated. They keep the factor they were verified with, so they stay identical to their compliance_ledger and carbon_verifications snapshots. Only unverified rows are corrected. The dry run reports how many verified rows still carry an earlier factor.

## 20261023100000_finance_applications.sql (green loan applications)

New tables and one private storage bucket. Nothing existing is touched.

- `finance_applications`: one row per application, owned by the applicant. `kind` is `green_loan` today; grants, tenders and contracts can be added as further kinds.
  - Status runs: draft, submitted, under review, more information needed, shared with a partner (with consent), closed.
  - Each row stores the consent version and time, the indicative 2 to 4 week update window, and `retain_until`, set to 365 days.
  - Only one draft is open per applicant and kind.
- `finance_application_events`: the status timeline. It is append-only, even for the service role. Deleting the application (erasure) removes it.
- `finance_application_documents`: ITR, bank statement, financial statement or project quote. PDF, JPEG or PNG only, at most 2 MB per file, no duplicates.
- `finance_application_reviews`: the internal, indicative review (allow-listed figures, ratios, email delivery). The browser cannot read it.
- Storage bucket `finance-documents`: private, 2 MB limit, PDF/JPEG/PNG, no storage policies (service role only).

Owners can read their own application, timeline and document list. Browsers cannot write anything; every write goes through the `finance-application` edge function.

Tested with `tests/run_finance_applications.sh`. It replays every migration, applies this one, rolls back to the identical catalog, re-applies and runs `tests/20261023100000_finance_applications.test.sql`:

- 14 checks: one draft per applicant; a submission time is required; files over 2 MB and other file types are refused; the timeline is append-only; owners read their own rows; the review is hidden; the browser cannot write; other applicants and anonymous visitors see nothing; the bucket is private; erasure cascades.
- It then proves the rollback refuses while data exists, and that a confirmed rollback restores the catalog.

The real edge function was also run against a schema without this migration (2 checks: the probe reports it disabled and nothing breaks) and with it (26 checks).

Retention: schedule a daily call to `finance-application` with `{"action":"purge_expired"}` and the service-role key. It removes files and rows past `retain_until`.

Roll back with `rollback/20261023100000_finance_applications.rollback.sql`. First remove stored files through the Storage API. The rollback refuses while applications exist unless run with `SET LOCAL finance.rollback_confirm = 'drop finance applications';`.

## 20261024100000_intelligence_usage.sql (Biocog Intelligence limits)

One new table and three functions. Nothing existing is touched.

- `intelligence_usage`: counts per subject, kind and India-time day. Kinds: `message` (monthly question pool), `voice_session` (monthly real-time voice cap) and `guest_scan` (guest invoice reads: 30 a day per device, 300 per network address, owner decision October 2026). Subjects are `u:<user id>` or `g:<hash>` for guests. The guest hash is an HMAC of the network address and the day, keyed with a server secret, so no address is stored and a guest cannot be followed across days.
- `intelligence_take(subject, kind, day, window_start, limit)`: counts one use only if under the limit, locked per subject and kind so two requests at once cannot both take the last use.
- `intelligence_used(...)`: reads the count. `intelligence_usage_purge()`: deletes rows older than 400 days (schedule it like `purge_expired`).

No browser access at all; only the `intelligence-chat`, `elevenlabs-conversation-token` and `extract-document` functions (service role) use it. Until it is applied, both functions keep a per-instance count, which is weaker but never unlimited.

Limits (in `supabase/functions/_shared/intelligence.ts`): questions are a monthly pool (India time): guest 10 (per network address), Snapshot 20, Essential 300, Pro 2,000, Scale 5,000 (default until a quote sets its own). Voice is Pro 100 and Scale 300 minutes a month, as 20 and 60 sessions of 5 minutes. **Set the ElevenLabs agent's maximum conversation duration to 5 minutes** so the minutes hold.

Tested with `tests/run_intelligence_usage.sh`. It replays every migration, applies this one, rolls back to the identical catalog, re-applies and runs `tests/20261024100000_intelligence_usage.test.sql` (18 checks: limits, day and month windows, guest reads counted apart, refused uses not stored, raw addresses refused, purge, no browser or anonymous access).

Roll back with `rollback/20261024100000_intelligence_usage.rollback.sql` (counts only, so no confirmation step).

## 20261025100000_profile_size_large.sql (company size "Large")

Widens `profiles_size_check` from micro/small/medium to also allow `large`, which Settings has always offered (saving it failed). Existing rows are untouched; empty text and free text are still refused (the app now sends NULL for "Not set").

Until applied, the app saves every other detail and says "Large" will save later (`src/lib/profileSave.ts`). Tested with `tests/run_profile_size.sh` (4 checks). Rollback refuses while any profile is `large`.

## 20261027100000_ledger_hash_chain.sql

**Do not apply until the owner has reviewed `docs/ledger-hash-chain.md` (risks and use cases).** Adds `ledger_chain_events`, an append-only, per-account hash chain recording every INSERT, UPDATE and DELETE on `compliance_ledger` (ids and SHA-256 digests only), a baseline event for each existing row, and `verify_ledger_chain(uuid)` (service role only), which reports an altered or missing event, a broken link, or a ledger row changed or removed outside the chain. RLS on, no policies, no browser grants; nothing existing is changed. Test: `tests/run_ledger_chain.sh` (27 checks, rollback restores the catalog, 4 concurrent writers keep one chain). Roll back with `rollback/20261027100000_ledger_hash_chain.rollback.sql`; ledger rows are untouched.

## 20261028100000_resource_leads.sql

**Queued for Lovable as `drizzle/migrations/0012_resource_leads`.** Creates `resource_leads` for gated resources (the sample ESG report at `/esg-report-sample`): the six form answers, the notice version shown, optional marketing consent, delivery and download counts, and a salted IP hash for rate limiting. RLS on, no policies, no browser grants (service role only). Visitor rows expire after 90 days (Privacy Policy: three months for unauthenticated data), signed-in rows after 18 months; `esg-report-access` deletes expired rows on each request. It also creates the private `gated-resources` bucket; **upload the report there as `esg-report-sample-2026.pdf`** (the repository is public, so the PDF is not in code). Until the table exists the function still emails the private link and the team notification (saying the lead was not stored); until the file is uploaded it emails no link, tells the visitor the report follows within one working day, and flags the request to the team. Test: `tests/run_resource_leads.sh` (15 checks, rollback restores the catalog). Roll back with `rollback/20261028100000_resource_leads.rollback.sql` (drops the table and its leads).

## 20261031100000_machinery_beta.sql (test-only beta)

Purely additive: `public.machinery_entries` and a private `machinery-photos` bucket (JPEG, 400 KB, no storage policy) for the machinery beta at `/beta/machinery`. Written only by the `machinery-beta` edge function (service role), which requires a fresh live location (±100 m or better), a photo from a GPS camera app whose own EXIF GPS position is within 150 m of that location and whose DateTimeOriginal is within 30 minutes (400 KB at most; the page can reduce a larger photo and keeps its tags), and a voice description. Owners can read only their own rows; browsers cannot write. `status` is pinned to `unverified` and `verification_source` to NULL by CHECK constraints, so no entry can be marked verified in the beta; document or IoT/sensor/live-feed matching needs a later, reviewed migration. The rows never enter emission totals and no existing table changes. The function stays closed until the `MACHINERY_BETA_ENABLED` secret is `true`. Tested with `tests/run_machinery_beta.sh` (replay, apply, exact-catalog rollback, re-apply, behaviour tests). Roll back with `rollback/20261031100000_machinery_beta.rollback.sql`, which refuses while entries or photos exist unless confirmed.

## 20261101100000_reconcile_subscription_manual.sql

**Run `plan_conflicts_check.sql` (read-only) first; apply only if it returns no rows.** Adds how a subscription was paid (`payment_mode`, default `razorpay`, so existing and webhook-written rows read as before), the exact billed base price, GST, a discount note and who reconciled it, plus `reconcile_subscription_manual(...)` (service role only: server code or the SQL editor). In one transaction it ends the account's other active rows (status `cancelled`, nothing deleted), inserts the reconciled plan with exact dates and price, copies tier and expiry to the profile and stores the tax invoice row (base + 18% GST) that the Billing page lists; a zero price is allowed only as a discount with a note. Razorpay handlers are unchanged. Example: `select public.reconcile_subscription_manual('<user id>','pro','yearly','2026-10-20','2027-10-20',50000,'bank_transfer','Agreed annual price','<staff name>');`. Test: `tests/run_reconcile.sh` (9 checks, rollback restores the catalog). Roll back with `rollback/20261101100000_reconcile_subscription_manual.rollback.sql`; reconciled rows and their invoices stay.

## 20261103100000_subscriptions_staff_email.sql

Staff tracking by email, nothing stored twice. `subscriptions_with_email` lists every subscription row with the account's current sign-in email, read live from `auth.users`; `reconcile_subscription_by_email(email, tier, cycle, starts, expires, base_price, mode, note, by)` is `reconcile_subscription_manual` looked up by email (refuses an unknown email or one shared by two accounts). Both are service role only: browsers cannot read emails or reconcile. Requires 20261101100000. Example: `select * from public.subscriptions_with_email where email ilike '%@example.com' order by created_at desc;`. Test: `tests/run_staff_email.sh` (4 checks, rollback restores the catalog). Roll back with `rollback/20261103100000_subscriptions_staff_email.rollback.sql`.

## 20261102100000_finance_insights.sql

**Owner-approved (20 October 2026); apply with the Privacy Policy update.** Requires 20261026100000 (drizzle 0011). Adds `financial_documents.monthly` (month totals only: money in, money out, balances, money out by fixed categories; no narrations, payees or account details) and two functions a signed-in browser may call: `my_private_records()` (the caller's uploads, no figures) and `my_finance_insights()` (the caller's figures, only when Settings → Finance insights is on, by plan: Snapshot none, Essential monthly totals, Pro and Scale everything). Plan by the same rule as `planLimits.canonicalPlan`. The table keeps no browser grants and files are never returned. Test: `tests/run_finance_insights.sh` (8 checks incl. account isolation, rollback restores the catalog). Roll back with `rollback/20261102100000_finance_insights.rollback.sql`.

## 20261104100000_cng_factor_correction.sql

**Run `cng_factor_correction_dry_run.sql` (read-only) first.** Corrects stored CNG emissions saved at the old, unsourced 2.75 kg CO2 per kg to 2.69 (IPCC 2006 Vol. 2 Ch. 1: natural gas 56,100 kg CO2/TJ, Table 1.4, x 48.0 TJ/Gg, Table 1.2 = 2.6928), the value new rows already use. Only unverified rows change: category `fuel`, factor 2.75, unit kg, and a factorSource key of `CNG` (or no factorSource and a line description naming CNG). Verified rows, `compliance_ledger` and `carbon_verifications` are left as they were verified (owner decision, October 2026). Old values go to `emissions_cng_backup_20261104` (RLS on, no policies, no browser grants) and each corrected row's notes record the previous factor and kgCO2e. Re-running changes nothing. Test: `tests/run_cng.sh` (13 checks: correct rows changed, verified and non-CNG rows untouched, activity x factor holds, idempotent, rollback restores every row and the catalog). Roll back with `rollback/20261104100000_cng_factor_correction.rollback.sql`.

## 20261105100000_public_library.sql

Moves the public library Biocog Intelligence cites (answers, guides, product facts; about 2,000 entries, public content only) into `public_library_entries` with a full-text index, so a question reads only its closest matches instead of the chat function loading 1 MB on every start. `public_library_state` holds the loaded version. Three functions, granted to `service_role` only: `search_public_library(terms, limit)` (keywords limited to lower-case letters and digits, so nothing is parsed as query syntax; returns `ready=false` until a library is loaded), `claim_public_library_check(min_age)` (one check per six hours) and `apply_public_library(version, entries)` (replaces the library in one transaction; links must be on senseible.earth). RLS on, no policies, no grants to anon or authenticated.

intelligence-chat syncs the table itself from `https://senseible.earth/answer-data/_library.json` (written at build; the download must hash to the version in `_library-version.json` and every entry must validate, or nothing changes) and keeps its bundled copy as the fallback, so the chat works before the migration, after it, and after a rollback. Tested on the local schema replay (applies, rolls back to the same catalog, re-applies, 9 behaviour checks) and with the real library: the database lookup returned the same top four as the bundle for 10 of 10 sample questions. Roll back with `rollback/20261105100000_public_library.rollback.sql`.

## 20261106100000_security_hardening.sql

Closes browser write paths found in the October 2026 security audit. No data changes; signed-in users keep the same read access to their documents, emissions, verifications, ledger and reports.

- `compliance_ledger`: browser INSERT policy dropped (only verify-carbon / `commit_verification` write it; no browser code inserts).
- `case_studies_public`: INSERT/UPDATE/DELETE/TRUNCATE revoked from anon and authenticated (published stories become read-only; admins edit through story-review).
- Guests: `owns_guest_session` now answers false (guests are browser-only), closing the user-agent branch of every documents/emissions/verifications/reports/pathways policy; `get_session_by_fingerprint` revoked from browsers; anon UPDATE on `sessions` dropped; guest branches removed from `chat_history`.
- Teams: direct INSERT/UPDATE on `organization_members` and INSERT on `team_invitations` dropped; `create_organization`, `update_member_role`, `remove_member` and the invitation functions keep working.
- `invoices` INSERT: admin only. `marketplace_listings`: platform admins manage, org admins view. `partner_applications` insert must be `pending`. `monetization_pathways` insert must reference the caller's (or their team's) verification and starts as `applied`.

Tested on the local replay: applies, rolls back to the same catalog, re-applies, 14 behaviour checks (`tests/run_security_hardening.sh`). Roll back with `rollback/20261106100000_security_hardening.rollback.sql`.

`security_followup_checks.sql` (read-only counts: plan orders paid without GST since 15 Oct, translation-cache rows that look personal, legacy guest rows, bucket privacy, grant_applications policy) and `guest_rows_purge.sql` (optional, owner-approved; deletes only rows with no account and rolls back if any account-owned count changes) sit next to it.

## 20261107100000_enterprise_pilot.sql

Enterprise supplier pilot (owner approved 25 Oct 2026). New tables only; no existing table, policy or row changes.

- `enterprise_access`: granted by Senseible staff only, from the SQL editor: `SELECT private.grant_enterprise_access('head@buyer.com', 'Buyer Ltd', 100, 'staff name');` (revoke with `private.revoke_enterprise_access(email)`). No browser role can call these or read the table, whatever the plan, Scale included. The granted person signs in with that confirmed email and the app calls `claim_enterprise_access()`, which creates the enterprise organisation with them as owner.
- `supplier_requests`: one per supplier and period, created by the supplier-requests function (service role) through `service_create_supplier_request` (service role only); reminders re-issue the link with `service_reissue_supplier_link` (once per 3 days); the enterprise can cancel an open request, capped at the supplier limit staff set. Only a SHA-256 of the link token is stored. Records the share of purchases (BRSR value chain) and the Scope 3 category.
- Suppliers are ordinary accounts. `my_supplier_requests()` shows requests addressed to their confirmed email or profile GSTIN, so an existing MSME sees them in the app without a link. `accept_supplier_request` links one; `share_with_enterprise` records consent and writes a snapshot computed on the server from their own in-period records (scope totals, verified share, activity by unit, document counts, evidence hashes). `withdraw_supplier_consent` stops further sharing.
- Enterprise members read only `supplier_requests`, `supplier_consents` and `supplier_snapshots` for their organisation, never supplier documents or emission rows. Revoking access closes all of it.

Tested: `tests/run_enterprise_pilot.sh` replays every migration plus the applied pending chain, applies this file, proves the rollback restores the same catalog, re-applies, runs `tests/20261107100000_enterprise_pilot.test.sql` (10 groups: no browser or Scale grant, staff grant and one-time claim, unconfirmed email refused, supplier limit, token hash only, link preview, email and GSTIN matching, outsiders blocked, server-computed totals, enterprise cannot read supplier rows, withdraw and revoke), then shows the rollback refusing while shared data exists and restoring the catalog once confirmed.

Roll back with `rollback/20261107100000_enterprise_pilot.rollback.sql` (needs `SET senseible.confirm_enterprise_rollback = 'yes'` once suppliers have shared).

## 20261108100000_enterprise_billing.sql

Apply after `20261030100000_invoice_reads_and_purchases` and `20261107100000_enterprise_pilot` (it refuses to run otherwise).

- **What it adds:** included limits per enterprise on `enterprise_access` (10 seats, 150 bill reads per supplier a year, 120 report downloads a year, 2 reminders per request, 2,000 questions a month, contract start), internal rates in `enterprise_rates` (server only, never published), and an append-only `enterprise_usage` ledger.
- **Nothing is blocked:** suppliers past the quote are added and billed; reminders past 2 per request are billed; downloads past the quote are billed (viewers cannot download).
- **Supplier bill reads:** when an invited supplier has no reads left (their own free reads and any top-ups they bought), `extract-document` calls `service_enterprise_cover_reads`: the enterprise's 150 included reads are added as a credit pack (`funded_by_org`), then billed packs of 100. The supplier is never stopped or charged for them.
- **Staff billing:** `SELECT * FROM private.enterprise_bill('<org id>', '<from>', '<to>');` returns billable quantities and amounts in paise. Members see counts only through `my_enterprise_usage()`.
- **Deploy with it:** redeploy `extract-document` (one added step: ask for cover, then retry the reservation once).

Tested: `tests/run_enterprise_billing.sh` replays every migration plus the applied pending chain, applies 20261030 and 20261107, applies this file, proves the rollback restores the same catalog, re-applies, and runs `tests/20261108100000_enterprise_billing.test.sql` (6 groups: suppliers past the quote billed, reads covered only after acceptance, 150 included then billed packs of 100, third reminder billed, downloads billed past the quote with viewers refused and rates private, staff bill totals), then shows the rollback refusing while billable usage exists.

Roll back with `rollback/20261108100000_enterprise_billing.rollback.sql` (needs `SET senseible.confirm_enterprise_billing_rollback = 'yes'` once billable usage exists). Reads already added stay with the suppliers as ordinary credits.

## 20261109100000_enterprise_seats_and_question_billing.sql

Enterprise teams are no longer held to the owner's personal plan seats (ceiling 1,000; seats past the quote are billed yearly), and extra Superintelligence questions are billed per 1,000 instead of 1,000 times over. Tested: `tests/run_enterprise_seats_questions.sh`. Roll back with `rollback/20261109100000_enterprise_seats_and_question_billing.rollback.sql`.

## 20261110100000_enterprise_limits_and_supplier_claims.sql

Apply after 20261109.

- **Custom limits.** Each enterprise's quote sets its numbers and, per item, whether it stops at the limit or carries on and bills the extra. Existing enterprises keep billing everything at the stored rates until staff set their terms, for example:
  `UPDATE public.enterprise_access SET supplier_limit = <n>, seats_included = <n>, questions_per_month = <n>, over_limit = '{"seats":"stop","questions":"stop"}', rates = '{"supplier":<paise>}' WHERE email = '<enterprise email>';`
  Items: suppliers, seats, reads, reports, reminders, questions. Rates: supplier, seat, reads_100, report, reminder, questions_1000 (paise). A supplier counts once per contract year. Covered supplier reads stop when the request expires. `my_enterprise_usage()` feeds the usage card on Profile (amounts for owners and admins only).
- **Supplier claims.** A link claims only its own request. Forwarded links still work; the buyer sees the email that opened the request and can press Send new link (`service_reset_supplier_link`, once a day), which removes that account, stops its shares counting and sends the supplier a fresh link. Reminders keep the earlier links working.

Then deploy `supplier-requests` and `enterprise-intelligence` (both work before the migration too, with the old behaviour).

Tested: `tests/run_enterprise_limits_claims.sh` replays every migration, applies 20261109, applies this file, proves the rollback restores the same catalog, re-applies, and runs `tests/20261110100000_enterprise_limits_and_supplier_claims.test.sql` (9 groups: default billing and once-a-year supplier count, term validation with stop and custom rates, downloads and questions, seats, link claims and forwarding, reminders and Send new link, covered reads, Profile usage, server-only functions). Roll back with `rollback/20261110100000_enterprise_limits_and_supplier_claims.rollback.sql`.

## 20261112100000_report_downloads.sql (report downloads on the free plan)

Counts report downloads (any framework report as PDF or Excel, and the certificate) for signed-in users on the free plan, per India-time month, on the server. Paid plans are never counted or limited. Viewing reports on screen is not counted. Guests are not affected.

- Widens the kind check on `intelligence_usage` to accept `report_download`, only when that table exists. The monthly count lives there, beside questions and voice.
- `report_downloads(user_id, month, report_key)`: the reports already downloaded this month, so the same report and period in the same format is counted once, however many times it is downloaded (double clicks included). RLS on, no browser grants; rows go with the account and `report_downloads_purge()` removes those older than 400 days.
- `report_download_take(user, key, day, window_start, limit)`: one locked step. A key already recorded this month is let through without counting; otherwise one download is counted through `intelligence_take`, and the key is recorded only when allowed.

Only the `report-allowance` edge function (service role) calls it. When the function, the table or the plan cannot be read, `report-allowance` allows the download.

**Apply order**
1. `20261024100000_intelligence_usage.sql`, if it is not live yet (check: `SELECT to_regclass('public.intelligence_usage');`).
2. This file. It is safe to run again; if `intelligence_usage` is applied after it, run this file again so the kind check accepts `report_download`. Until both are in place every download is allowed.
3. Deploy the `report-allowance` edge function. The shared usage file it reads (`_shared/intelligenceUsage.ts`) gained the new kind with no change in behaviour, so `node scripts/function-versions.mjs --live` will show `extract-document` and `intelligence-chat` as different from the repo until their next redeploy; redeploying them is not needed for this feature.
4. Ship the website (Reports asks `report-allowance` before building a file and allows the download whenever the function does not answer).

Tested with `tests/run_report_downloads.sh`. It replays every migration and proves this file both without `intelligence_usage` (applies twice, rolls back to the identical catalog) and with it (widens the check, rolls back to the identical catalog and original check, re-applies, runs `tests/20261112100000_report_downloads.test.sql`: first download counted, repeats not counted, Excel and certificate counted apart, refused downloads not stored, new month, per account, malformed keys refused, purge, account deletion, no browser or anonymous access), then checks the rollback refuses while `report_download` counts exist and restores the identical catalog once they are deleted.

Roll back with `rollback/20261112100000_report_downloads.rollback.sql`. It refuses while `report_download` counts exist; delete them first with `DELETE FROM public.intelligence_usage WHERE kind = 'report_download';`. After rollback every download is allowed.
