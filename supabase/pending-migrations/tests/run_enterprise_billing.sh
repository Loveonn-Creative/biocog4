#!/usr/bin/env bash
# Builds a local copy of the production schema (every file in supabase/migrations
# and drizzle/migrations on Supabase stand-ins), then: applies 20261030 and 20261107 (its prerequisites), then 20261108100000_enterprise_billing,
# proves the rollback restores the exact starting catalog, re-applies it, runs
# the behaviour tests.
# Needs a local Postgres where the current user can create databases.
set -euo pipefail
export PGOPTIONS="-c client_min_messages=warning"
here="$(cd "$(dirname "$0")" && pwd)"; root="$here/../../.."
name="20261108100000_enterprise_billing"
db="entbill_$$"; psql_() { psql -X -q -v ON_ERROR_STOP=1 -d "$db" "$@"; }
createdb "$db"; trap 'dropdb --if-exists "$db"' EXIT
psql_ -f "$here/supabase_full_stubs.sql" >/dev/null 2>&1
for f in $(ls "$root"/supabase/migrations/*.sql | sort); do psql_ -f "$f" >/dev/null 2>&1 || { echo "replay failed at $(basename "$f")"; psql_ -f "$f" 2>&1 | grep -m3 ERROR; exit 1; }; done
for f in $(ls "$root"/drizzle/migrations/*.sql | sort); do psql_ -1 -f "$f" >/dev/null 2>&1 || { echo "drizzle replay failed at $(basename "$f")"; psql_ -1 -f "$f" 2>&1 | grep -m3 ERROR; exit 1; }; done
snap() { psql_ -Atc "SELECT md5(string_agg(x, ',' ORDER BY x)) FROM (
 SELECT 'rel:'||c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','private')
 UNION ALL SELECT 'fn:'||p.oid::regprocedure::text||md5(p.prosrc) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','private')
 UNION ALL SELECT 'pol:'||polname||coalesce(pg_get_expr(polqual,polrelid),'') FROM pg_policy
 UNION ALL SELECT 'con:'||conname||pg_get_constraintdef(oid) FROM pg_constraint
 UNION ALL SELECT 'trg:'||tgname||tgrelid::regclass::text FROM pg_trigger WHERE NOT tgisinternal) t(x)"; }
# Applied pending chain the live database already has (confirmed by the owner), plus the auth column real Supabase carries.
for f in 20261011120000_protect_privileged_columns 20261011150000_business_ids_on_profiles 20261013100000_org_workspace_roles 20261106100000_security_hardening 20261030100000_invoice_reads_and_purchases; do psql_ -f "$here/../$f.sql" >/dev/null 2>&1 || true; done
psql_ -c "ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS email_confirmed_at timestamptz" >/dev/null
psql_ -f "$here/../20261107100000_enterprise_pilot.sql" >/dev/null
before="$(snap)"
psql_ -f "$here/../$name.sql" >/dev/null
psql_ -f "$here/../rollback/$name.rollback.sql" >/dev/null
[ "$before" = "$(snap)" ] || { echo "rollback did not restore the starting catalog"; exit 1; }
psql_ -f "$here/../$name.sql" >/dev/null
out="$(psql_ -f "$here/$name.test.sql" 2>&1)" || { echo "$out" | grep -E "ERROR|FAIL" | head -5; exit 1; }
echo "$out" | grep -q "ALL ENTERPRISE BILLING TESTS PASSED" || { echo "tests did not finish"; echo "$out" | tail -5; exit 1; }
echo "$out" | grep -cE "NOTICE:  ok" | xargs -I{} echo "{} behaviour checks passed"
if psql_ -f "$here/../rollback/$name.rollback.sql" >/dev/null 2>&1; then echo "rollback did not refuse while shared data exists"; exit 1; fi
echo "rollback refuses while billable usage exists"
psql_ -c "SET senseible.confirm_enterprise_billing_rollback = 'yes'" -f "$here/../rollback/$name.rollback.sql" >/dev/null
[ "$before" = "$(snap)" ] || { echo "confirmed rollback did not restore the starting catalog"; exit 1; }
echo "OK: $name applies, rolls back to the same catalog, re-applies and passes its tests"
