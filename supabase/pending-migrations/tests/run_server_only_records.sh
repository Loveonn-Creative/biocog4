#!/usr/bin/env bash
# Builds a local copy of the production schema (every file in supabase/migrations,
# on Supabase stand-ins), then proves 20261114100000_server_only_records in the
# states the live database may be in:
#   A. nothing else applied (is_trusted_db_writer missing);
#   B. 20261011120000_protect_privileged_columns, 20261022100000_emissions_write_guard
#      and 20261113100000_evidence_lock applied first;
#   C. only 20261113100000_evidence_lock applied first (it owns the helper).
# In each: applies, applies again, rolls back to the identical catalog,
# re-applies, runs the behaviour tests, rolls back to the identical catalog
# again (test rows left in place) and re-applies.
# Finally checks the helper is kept by the rollback whenever another migration
# uses it, and dropped when only this file created and used it.
# Needs a local Postgres where the current user can create databases.
set -euo pipefail
export PGOPTIONS="-c client_min_messages=warning"
here="$(cd "$(dirname "$0")" && pwd)"; root="$here/../../.."
name="20261114100000_server_only_records"
protect="20261011120000_protect_privileged_columns"
guard="20261022100000_emissions_write_guard"
lock="20261113100000_evidence_lock"
dbs=()
trap 'for d in "${dbs[@]}"; do dropdb --if-exists "$d"; done' EXIT
db=""; psql_() { psql -X -q -v ON_ERROR_STOP=1 -d "$db" "$@"; }
fresh() {
  db="sorec_${1}_$$"; dbs+=("$db"); createdb "$db"
  psql_ -f "$here/supabase_full_stubs.sql" >/dev/null 2>&1
  for f in $(ls "$root"/supabase/migrations/*.sql | sort); do psql_ -f "$f" >/dev/null 2>&1 || { echo "replay failed at $(basename "$f")"; psql_ -f "$f" 2>&1 | grep -m3 ERROR; exit 1; }; done
}
snap() { psql_ -Atc "SELECT md5(string_agg(x, ',' ORDER BY x)) FROM (
 SELECT 'rel:'||c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','private')
 UNION ALL SELECT 'fn:'||p.oid::regprocedure::text||md5(p.prosrc)||coalesce(array_to_string(p.proacl,','),'') FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','private')
 UNION ALL SELECT 'pol:'||polname||coalesce(pg_get_expr(polqual,polrelid),'')||coalesce(pg_get_expr(polwithcheck,polrelid),'') FROM pg_policy
 UNION ALL SELECT 'con:'||conname||pg_get_constraintdef(oid) FROM pg_constraint
 UNION ALL SELECT 'trg:'||tgname||tgrelid::regclass::text||tgenabled::text FROM pg_trigger WHERE NOT tgisinternal) t(x)"; }
helper() { psql_ -Atc "SELECT to_regprocedure('public.is_trusted_db_writer()') IS NOT NULL"; }

prove() {
  local label="$1" before out
  before="$(snap)"
  psql_ -f "$here/../$name.sql" >/dev/null
  psql_ -f "$here/../$name.sql" >/dev/null   # safe to run twice
  psql_ -f "$here/../rollback/$name.rollback.sql" >/dev/null
  [ "$before" = "$(snap)" ] || { echo "rollback did not restore the starting catalog ($label)"; exit 1; }
  echo "ok $label: applies twice, rolls back to the same catalog ($before)"
  psql_ -f "$here/../$name.sql" >/dev/null
  out="$(psql_ -f "$here/$name.test.sql" 2>&1)" || { echo "$out" | grep -E "ERROR|FAIL" | head -5; exit 1; }
  echo "$out" | grep -q "ALL SERVER ONLY RECORDS TESTS PASSED" || { echo "tests did not finish ($label)"; echo "$out" | tail -5; exit 1; }
  echo "$out" | grep -cE "NOTICE:  ok" | xargs -I{} echo "{} behaviour checks passed ($label)"
  psql_ -f "$here/../rollback/$name.rollback.sql" >/dev/null
  [ "$before" = "$(snap)" ] || { echo "rollback after the tests did not restore the catalog ($label)"; exit 1; }
  echo "ok $label: rollback with records present restores the same catalog, rows kept"
  psql_ -f "$here/../$name.sql" >/dev/null
  echo "ok $label: re-applies after rollback"
}

# A. nothing else applied
fresh a
[ "$(helper)" = "f" ] || { echo "expected no is_trusted_db_writer in the plain replay"; exit 1; }
prove "without other guards"
psql_ -f "$here/../rollback/$name.rollback.sql" >/dev/null
[ "$(helper)" = "f" ] || { echo "rollback left the helper this file created"; exit 1; }
echo "ok rollback drops the helper it created when nothing else uses it"

# B. 20261011120000, 20261022100000 and 20261113100000 applied first
fresh b
psql_ -f "$here/../$protect.sql" >/dev/null
psql_ -f "$here/../$guard.sql" >/dev/null
psql_ -f "$here/../$lock.sql" >/dev/null
prove "with $protect, $guard and $lock"
psql_ -f "$here/../rollback/$name.rollback.sql" >/dev/null
[ "$(helper)" = "t" ] || { echo "rollback dropped the helper the guards use"; exit 1; }
echo "ok rollback keeps is_trusted_db_writer when the guards own it"

# C. only 20261113100000 applied first (it created the helper)
fresh c
psql_ -f "$here/../$lock.sql" >/dev/null
prove "with $lock only"
psql_ -f "$here/../rollback/$name.rollback.sql" >/dev/null
[ "$(helper)" = "t" ] || { echo "rollback dropped the helper $lock created"; exit 1; }
echo "ok rollback keeps the helper $lock created"

# D. this file first, then 20261011120000: rollback keeps the shared helper
fresh d
psql_ -f "$here/../$name.sql" >/dev/null
psql_ -f "$here/../$protect.sql" >/dev/null
psql_ -f "$here/../rollback/$name.rollback.sql" >/dev/null
[ "$(helper)" = "t" ] || { echo "rollback dropped the helper after $protect was applied"; exit 1; }
echo "ok applied before $protect: rollback keeps the shared helper"
echo "OK: $name applies, rolls back to the same catalog in every state, re-applies and passes its tests"
