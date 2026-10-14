#!/usr/bin/env bash
# Builds a local copy of the production schema (every file in supabase/migrations,
# on Supabase stand-ins), applies 20261011120000 (its prerequisite), then:
# applies 20261022100000_emissions_write_guard, proves the rollback restores the
# exact starting catalog, re-applies it, and runs the behaviour tests, which
# also run 20261011170000_recalculate_emissions to check verified rows are held.
# Needs a local Postgres where the current user can create databases.
set -euo pipefail
export PGOPTIONS="-c client_min_messages=warning"
here="$(cd "$(dirname "$0")" && pwd)"; root="$here/../../.."
name="20261022100000_emissions_write_guard"
db="emguard_chain_$$"; psql_() { psql -X -q -v ON_ERROR_STOP=1 -d "$db" "$@"; }
createdb "$db"; trap 'dropdb --if-exists "$db"' EXIT
psql_ -f "$here/supabase_full_stubs.sql" >/dev/null 2>&1
for f in $(ls "$root"/supabase/migrations/*.sql | sort); do psql_ -f "$f" >/dev/null 2>&1 || { echo "replay failed at $(basename "$f")"; psql_ -f "$f" 2>&1 | grep -m3 ERROR; exit 1; }; done
psql_ -f "$here/../20261011120000_protect_privileged_columns.sql" >/dev/null
snap() { psql_ -Atc "SELECT md5(string_agg(x, ',' ORDER BY x)) FROM (
 SELECT 'rel:'||c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','private')
 UNION ALL SELECT 'fn:'||p.oid::regprocedure::text||md5(p.prosrc) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','private')
 UNION ALL SELECT 'pol:'||polname||coalesce(pg_get_expr(polqual,polrelid),'') FROM pg_policy
 UNION ALL SELECT 'con:'||conname||pg_get_constraintdef(oid) FROM pg_constraint
 UNION ALL SELECT 'trg:'||tgname||tgrelid::regclass::text FROM pg_trigger WHERE NOT tgisinternal) t(x)"; }
before="$(snap)"
psql_ -f "$here/../$name.sql" >/dev/null
psql_ -f "$here/../rollback/$name.rollback.sql" >/dev/null
[ "$before" = "$(snap)" ] || { echo "rollback did not restore the starting catalog"; exit 1; }
psql_ -f "$here/../$name.sql" >/dev/null
out="$(psql_ -v recalc="$here/../20261011170000_recalculate_emissions.sql" -f "$here/$name.test.sql" 2>&1)" || { echo "$out" | grep -E "ERROR|FAIL" | head -5; exit 1; }
echo "$out" | grep -q "ALL EMISSIONS GUARD TESTS PASSED" || { echo "tests did not finish"; echo "$out" | tail -5; exit 1; }
echo "$out" | grep -cE "NOTICE:  ok" | xargs -I{} echo "{} behaviour checks passed"
echo "OK: $name applies, rolls back to the same catalog, re-applies and passes its tests"
