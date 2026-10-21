#!/usr/bin/env bash
# Builds a local copy of the production schema (every file in supabase/migrations
# and drizzle/migrations except this file's copy, on Supabase stand-ins), then runs the dry run and the behaviour tests, which seed rows, apply
# 20261104100000_cng_factor_correction twice, roll it back and check every row
# and the catalog are restored exactly.
# Needs a local Postgres where the current user can create databases.
set -euo pipefail
export PGOPTIONS="-c client_min_messages=warning"
here="$(cd "$(dirname "$0")" && pwd)"; root="$here/../../.."
name="20261104100000_cng_factor_correction"
db="cng_$$"; psql_() { psql -X -q -v ON_ERROR_STOP=1 -d "$db" "$@"; }
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
before="$(snap)"
psql_ -f "$here/../cng_factor_correction_dry_run.sql" >/dev/null
out="$(psql_ -v mig="$here/../$name.sql" -v rb="$here/../rollback/$name.rollback.sql" -f "$here/$name.test.sql" 2>&1)" || { echo "$out" | grep -E "ERROR|FAIL" | head -5; exit 1; }
[ "$before" = "$(snap)" ] || { echo "rollback did not restore the starting catalog"; exit 1; }
echo "$out" | grep -q "ALL CNG TESTS PASSED" || { echo "tests did not finish"; echo "$out" | tail -5; exit 1; }
echo "$out" | grep -cE "NOTICE:  ok" | xargs -I{} echo "{} behaviour checks passed"
echo "OK: $name corrects only unverified CNG rows, is idempotent and rolls back exactly"
