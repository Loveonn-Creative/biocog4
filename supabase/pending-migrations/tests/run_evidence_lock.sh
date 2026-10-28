#!/usr/bin/env bash
# Builds a local copy of the production schema (every file in supabase/migrations,
# on Supabase stand-ins), then proves 20261113100000_evidence_lock in both
# states the live database may be in:
#   A. without the emission guards (is_trusted_db_writer missing): applies,
#      applies again, rolls back to the identical catalog, re-applies, runs the
#      behaviour tests, checks the rollback refuses while history exists and
#      restores the identical catalog once confirmed;
#   B. with 20261011120000_protect_privileged_columns and
#      20261022100000_emissions_write_guard applied first: the same steps.
# Finally checks that applying 20261011120000 after this file keeps the shared
# helper on rollback.
# Needs a local Postgres where the current user can create databases.
set -euo pipefail
export PGOPTIONS="-c client_min_messages=warning"
here="$(cd "$(dirname "$0")" && pwd)"; root="$here/../../.."
name="20261113100000_evidence_lock"
protect="20261011120000_protect_privileged_columns"
guard="20261022100000_emissions_write_guard"
dbs=()
trap 'for d in "${dbs[@]}"; do dropdb --if-exists "$d"; done' EXIT
db=""; psql_() { psql -X -q -v ON_ERROR_STOP=1 -d "$db" "$@"; }
fresh() {
  db="evlock_${1}_$$"; dbs+=("$db"); createdb "$db"
  psql_ -f "$here/supabase_full_stubs.sql" >/dev/null 2>&1
  for f in $(ls "$root"/supabase/migrations/*.sql | sort); do psql_ -f "$f" >/dev/null 2>&1 || { echo "replay failed at $(basename "$f")"; psql_ -f "$f" 2>&1 | grep -m3 ERROR; exit 1; }; done
}
snap() { psql_ -Atc "SELECT md5(string_agg(x, ',' ORDER BY x)) FROM (
 SELECT 'rel:'||c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','private')
 UNION ALL SELECT 'fn:'||p.oid::regprocedure::text||md5(p.prosrc) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','private')
 UNION ALL SELECT 'pol:'||polname||coalesce(pg_get_expr(polqual,polrelid),'') FROM pg_policy
 UNION ALL SELECT 'con:'||conname||pg_get_constraintdef(oid) FROM pg_constraint
 UNION ALL SELECT 'trg:'||tgname||tgrelid::regclass::text FROM pg_trigger WHERE NOT tgisinternal) t(x)"; }
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
  echo "$out" | grep -q "ALL EVIDENCE LOCK TESTS PASSED" || { echo "tests did not finish ($label)"; echo "$out" | tail -5; exit 1; }
  echo "$out" | grep -cE "NOTICE:  ok" | xargs -I{} echo "{} behaviour checks passed ($label)"
  if psql_ -f "$here/../rollback/$name.rollback.sql" >/dev/null 2>&1; then echo "rollback ran while record_events holds rows ($label)"; exit 1; fi
  [ "$(psql_ -Atc "SELECT count(*) > 0 FROM public.record_events")" = "t" ] || { echo "refused rollback lost history ($label)"; exit 1; }
  echo "ok $label: rollback refuses while record_events holds rows"
  psql_ -c "SET senseible.confirm_record_events_rollback = 'yes'" -f "$here/../rollback/$name.rollback.sql" >/dev/null
  [ "$before" = "$(snap)" ] || { echo "confirmed rollback did not restore the catalog ($label)"; exit 1; }
  echo "ok $label: confirmed rollback restores the same catalog"
  psql_ -f "$here/../$name.sql" >/dev/null
  echo "ok $label: re-applies after rollback"
}

# A. emission guards not applied
fresh a
[ "$(helper)" = "f" ] || { echo "expected no is_trusted_db_writer in the plain replay"; exit 1; }
prove "without guards"

# B. 20261011120000 and 20261022100000 applied first
fresh b
psql_ -f "$here/../$protect.sql" >/dev/null
psql_ -f "$here/../$guard.sql" >/dev/null
prove "with $protect and $guard"
psql_ -c "SET senseible.confirm_record_events_rollback = 'yes'" -f "$here/../rollback/$name.rollback.sql" >/dev/null
[ "$(helper)" = "t" ] || { echo "rollback dropped the helper the guards use"; exit 1; }
echo "ok rollback keeps is_trusted_db_writer when the guards own it"

# C. this file first, then 20261011120000: rollback keeps the shared helper
fresh c
psql_ -f "$here/../$name.sql" >/dev/null
psql_ -f "$here/../$protect.sql" >/dev/null
psql_ -f "$here/../rollback/$name.rollback.sql" >/dev/null
[ "$(helper)" = "t" ] || { echo "rollback dropped the helper after $protect was applied"; exit 1; }
echo "ok applied before $protect: rollback keeps the shared helper"
echo "OK: $name applies, rolls back to the same catalog in both states, re-applies and passes its tests"
