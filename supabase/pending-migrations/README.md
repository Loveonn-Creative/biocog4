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
