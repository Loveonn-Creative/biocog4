#!/usr/bin/env bash
# Applies a pending migration to a throwaway local Postgres database, runs its
# behaviour tests, applies the rollback and proves the database is back to its
# starting state. Usage: run.sh 20261012120000_water_mrv
set -euo pipefail
name="${1:?migration name}"
here="$(cd "$(dirname "$0")" && pwd)"
db="pending_mig_test_$$"
psql_() { psql -v ON_ERROR_STOP=1 -X -q -d "$db" "$@"; }
createdb "$db"
trap 'dropdb --if-exists "$db"' EXIT
psql_ -f "$here/supabase_stubs.sql"
snapshot() { psql_ -Atc "SELECT md5(string_agg(x, ',' ORDER BY x)) FROM (
  SELECT 'rel:'||c.relname||':'||c.relkind::text FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'
  UNION ALL SELECT 'fn:'||p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public'
  UNION ALL SELECT 'pol:'||polname FROM pg_policy
  UNION ALL SELECT 'row:'||id::text||':'||co2_kg::text FROM public.emissions) t(x)"; }
mig="$here/../$name.sql"; [ -f "$mig" ] || mig="$here/../../migrations/$name.sql"
before="$(snapshot)"
psql_ -f "$mig"
psql_ -f "$here/$name.test.sql"
# Rollback must refuse while data exists, then succeed with explicit confirmation.
if psql_ -f "$here/../rollback/$name.rollback.sql" 2>/dev/null; then echo "rollback should have refused with data present"; exit 1; fi
{ echo "BEGIN; SET LOCAL water.rollback_confirm = 'drop water data';"; sed -e '/^BEGIN;$/d' "$here/../rollback/$name.rollback.sql"; } | psql_
after="$(snapshot)"
[ "$before" = "$after" ] || { echo "rollback did not restore the starting state"; exit 1; }
# Re-apply after rollback, and roll back the empty install without confirmation.
psql_ -f "$mig"
psql_ -f "$here/../rollback/$name.rollback.sql"
[ "$before" = "$(snapshot)" ] || { echo "second rollback did not restore the starting state"; exit 1; }
echo "OK: $name applies, passes its tests, and rolls back cleanly"
