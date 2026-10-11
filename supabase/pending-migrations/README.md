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
- **Seat sync.** `organizations.max_members` is derived from the owner's `profiles.subscription_tier` (basic/Essential 3, pro 10, scale **25: placeholder, TO CONFIRM**; expired or free 1) by a `BEFORE INSERT OR UPDATE` trigger that fires after the protect trigger, plus an `AFTER UPDATE` trigger on `profiles`. service_role may still set an explicit value. Existing rows are backfilled; their previous values are saved in `organizations_max_members_backup` for the rollback.
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
