#!/usr/bin/env bash
# Builds a local copy of the production schema on Supabase stand-ins, then
# proves 20261115100000_factor_corrections_unverified in both states:
#   A. supabase/migrations only (no emission guards, no record_events);
#   B. supabase/migrations plus drizzle/migrations, as live: emission guards
#      (protect_privileged_columns, emissions_write_guard), the ledger hash
#      chain and the evidence lock (record_events) applied.
# In each: runs the read-only dry run (and checks it changed nothing), then the
# behaviour tests, which seed rows, apply the migration twice, check every
# corrected and untouched row, roll it back and check every row is restored;
# finally checks the catalog matches the starting one.
# Needs a local Postgres where the current user can create databases.
set -euo pipefail
export PGOPTIONS="-c client_min_messages=warning"
here="$(cd "$(dirname "$0")" && pwd)"; root="$here/../../.."
name="20261115100000_factor_corrections_unverified"
dbs=()
trap 'for d in "${dbs[@]}"; do dropdb --if-exists "$d"; done' EXIT
db=""; psql_() { psql -X -q -v ON_ERROR_STOP=1 -d "$db" "$@"; }
fresh() {
  db="factor_${1}_$$"; dbs+=("$db"); createdb "$db"
  psql_ -f "$here/supabase_full_stubs.sql" >/dev/null 2>&1
  for f in $(ls "$root"/supabase/migrations/*.sql | sort); do psql_ -f "$f" >/dev/null 2>&1 || { echo "replay failed at $(basename "$f")"; psql_ -f "$f" 2>&1 | grep -m3 ERROR; exit 1; }; done
}
drizzle() {
  # Stand-in for the auth column drizzle 0034 reads (as run_import_records.sh does).
  psql_ -c "ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS email_confirmed_at timestamptz" >/dev/null
  for f in $(ls "$root"/drizzle/migrations/*.sql | sort); do psql_ -1 -f "$f" >/dev/null 2>&1 || { echo "drizzle replay failed at $(basename "$f")"; psql_ -1 -f "$f" 2>&1 | grep -m3 ERROR; exit 1; }; done
}
snap() { psql_ -Atc "SELECT md5(string_agg(x, ',' ORDER BY x)) FROM (
 SELECT 'rel:'||c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','private')
 UNION ALL SELECT 'fn:'||p.oid::regprocedure::text||md5(p.prosrc) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','private')
 UNION ALL SELECT 'pol:'||polname||coalesce(pg_get_expr(polqual,polrelid),'') FROM pg_policy
 UNION ALL SELECT 'con:'||conname||pg_get_constraintdef(oid) FROM pg_constraint
 UNION ALL SELECT 'trg:'||tgname||tgrelid::regclass::text FROM pg_trigger WHERE NOT tgisinternal) t(x)"; }

prove() {
  local label="$1" before out
  before="$(snap)"
  psql_ -f "$here/../factor_corrections_dry_run.sql" >/dev/null
  [ "$before" = "$(snap)" ] || { echo "dry run changed the catalog ($label)"; exit 1; }
  echo "ok $label: dry run runs and changes nothing"
  out="$(psql_ -v mig="$here/../$name.sql" -v rb="$here/../rollback/$name.rollback.sql" -v dry="$here/../factor_corrections_dry_run.sql" -f "$here/$name.test.sql" 2>&1)" || { echo "$out" | grep -E "ERROR|FAIL" | head -5; exit 1; }
  echo "$out" | grep -q "ALL FACTOR CORRECTION TESTS PASSED" || { echo "tests did not finish ($label)"; echo "$out" | tail -5; exit 1; }
  echo "$out" | grep -cE "NOTICE:  ok" | xargs -I{} echo "{} behaviour checks passed ($label)"
  echo "$out" | grep -E "NOTICE:  ok record_events" | sed "s/^.*NOTICE:  /  /"
  [ "${SHOW_DRY_RUN:-}" = "$label" ] && echo "$out" | sed -n "/DRY RUN START/,/DRY RUN END/p" | grep -v "NOTICE"
  [ "$before" = "$(snap)" ] || { echo "rollback did not restore the starting catalog ($label)"; exit 1; }
  echo "ok $label: applies twice, rolls back to the same catalog ($before)"
}

fresh a
prove "supabase/migrations only"

fresh b
SHOW_DRY_RUN="as live (with drizzle: write guard, ledger chain, evidence lock)"
drizzle
[ "$(psql_ -Atc "SELECT to_regclass('public.record_events') IS NOT NULL AND to_regprocedure('public.guard_emissions_browser_writes()') IS NOT NULL")" = "t" ] || { echo "expected the evidence lock and emissions write guard in the live replay"; exit 1; }
prove "as live (with drizzle: write guard, ledger chain, evidence lock)"
echo "OK: $name corrects only unverified diesel, petrol, Indian-default coal and grid rows, is idempotent and rolls back exactly"
