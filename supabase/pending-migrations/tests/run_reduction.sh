#!/usr/bin/env bash
# Builds a local copy of the production schema (every file in supabase/migrations,
# on Supabase stand-ins), applies the solar migration it depends on, then:
# applies 20261018100000_reduction_projects, runs its behaviour tests, proves
# the rollback refuses while data exists, rolls back with confirmation to the
# exact starting catalog, re-applies, and rolls back the empty install.
# Needs a local Postgres where the current user can create databases.
set -euo pipefail
export PGOPTIONS="-c client_min_messages=warning"
here="$(cd "$(dirname "$0")" && pwd)"; root="$here/../../.."
name="20261018100000_reduction_projects"
db="reduction_chain_$$"; psql_() { psql -X -q -v ON_ERROR_STOP=1 -d "$db" "$@"; }
createdb "$db"; trap 'dropdb --if-exists "$db"' EXIT
psql_ -f "$here/supabase_full_stubs.sql" >/dev/null 2>&1
for f in $(ls "$root"/supabase/migrations/*.sql | sort); do psql_ -f "$f" >/dev/null 2>&1 || { echo "replay failed at $(basename "$f")"; psql_ -f "$f" 2>&1 | grep -m3 ERROR; exit 1; }; done
psql_ -f "$here/../20261017100000_solar_signals.sql" >/dev/null
snap() { psql_ -Atc "SELECT md5(string_agg(x, ',' ORDER BY x)) FROM (
 SELECT 'rel:'||c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','private')
 UNION ALL SELECT 'fn:'||p.oid::regprocedure::text||md5(p.prosrc) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','private')
 UNION ALL SELECT 'pol:'||polname||coalesce(pg_get_expr(polqual,polrelid),'') FROM pg_policy
 UNION ALL SELECT 'con:'||conname||pg_get_constraintdef(oid) FROM pg_constraint
 UNION ALL SELECT 'col:'||table_name||'.'||column_name||':'||is_nullable FROM information_schema.columns WHERE table_schema='public'
 UNION ALL SELECT 'trg:'||tgname||tgrelid::regclass::text FROM pg_trigger WHERE NOT tgisinternal) t(x)"; }
before="$(snap)"
psql_ -f "$here/../$name.sql" >/dev/null
out="$(psql_ -f "$here/$name.test.sql" 2>&1)" || { echo "$out" | grep -E "ERROR|FAIL" | head -5; exit 1; }
echo "$out" | grep -q "ALL REDUCTION PROJECT TESTS PASSED" || { echo "tests did not finish"; exit 1; }
echo "$out" | grep -cE "NOTICE:  ok" | xargs -I{} echo "{} behaviour checks passed"
# Rollback must refuse while data exists, then succeed with explicit confirmation.
if psql_ -f "$here/../rollback/$name.rollback.sql" >/dev/null 2>&1; then echo "rollback should have refused with data present"; exit 1; fi
{ echo "BEGIN; SET LOCAL reduction.rollback_confirm = 'drop reduction data';"; sed -e '/^BEGIN;$/d' "$here/../rollback/$name.rollback.sql"; } | psql_ >/dev/null
[ "$before" = "$(snap)" ] || { echo "rollback did not restore the starting catalog"; exit 1; }
[ "$(psql_ -Atc "SELECT count(*) FROM public.credit_signals")" = "1" ] || { echo "solar signal lost in rollback"; exit 1; }
# Re-apply after rollback, and roll back the empty install without confirmation.
psql_ -c "DELETE FROM public.credit_signals; DELETE FROM public.solar_assets;" >/dev/null
psql_ -f "$here/../$name.sql" >/dev/null
psql_ -f "$here/../rollback/$name.rollback.sql" >/dev/null
[ "$before" = "$(snap)" ] || { echo "second rollback did not restore the starting catalog"; exit 1; }
# The solar rollback still works afterwards.
psql_ -f "$here/../rollback/20261017100000_solar_signals.rollback.sql" >/dev/null
echo "OK: $name applies on top of solar, passes its tests, rolls back to the same catalog and re-applies"
