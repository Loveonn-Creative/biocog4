#!/usr/bin/env bash
# Builds a local copy of the production schema (every file in supabase/migrations,
# on Supabase stand-ins), then proves 20261112100000_report_downloads in both
# states the live database may be in:
#   1. without intelligence_usage: applies, rolls back to the identical catalog;
#   2. with 20261024100000_intelligence_usage applied first: applies, rolls back
#      to the identical catalog (original kind check restored), re-applies, runs
#      the behaviour tests, checks the rollback refuses while report_download
#      counts exist, then deletes them and rolls back to the identical catalog.
# Needs a local Postgres where the current user can create databases.
set -euo pipefail
export PGOPTIONS="-c client_min_messages=warning"
here="$(cd "$(dirname "$0")" && pwd)"; root="$here/../../.."
name="20261112100000_report_downloads"
usage="20261024100000_intelligence_usage"
db="report_dl_$$"; psql_() { psql -X -q -v ON_ERROR_STOP=1 -d "$db" "$@"; }
createdb "$db"; trap 'dropdb --if-exists "$db"' EXIT
psql_ -f "$here/supabase_full_stubs.sql" >/dev/null 2>&1
for f in $(ls "$root"/supabase/migrations/*.sql | sort); do psql_ -f "$f" >/dev/null 2>&1 || { echo "replay failed at $(basename "$f")"; psql_ -f "$f" 2>&1 | grep -m3 ERROR; exit 1; }; done
snap() { psql_ -Atc "SELECT md5(string_agg(x, ',' ORDER BY x)) FROM (
 SELECT 'rel:'||c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','private')
 UNION ALL SELECT 'fn:'||p.oid::regprocedure::text||md5(p.prosrc) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','private')
 UNION ALL SELECT 'pol:'||polname||coalesce(pg_get_expr(polqual,polrelid),'') FROM pg_policy
 UNION ALL SELECT 'con:'||conname||pg_get_constraintdef(oid) FROM pg_constraint
 UNION ALL SELECT 'trg:'||tgname||tgrelid::regclass::text FROM pg_trigger WHERE NOT tgisinternal) t(x)"; }
kindcheck() { psql_ -Atc "SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'intelligence_usage_kind_check'"; }

# 1. intelligence_usage not applied
before="$(snap)"
psql_ -f "$here/../$name.sql" >/dev/null
psql_ -f "$here/../$name.sql" >/dev/null   # safe to run twice
psql_ -f "$here/../rollback/$name.rollback.sql" >/dev/null
[ "$before" = "$(snap)" ] || { echo "rollback did not restore the starting catalog (without intelligence_usage)"; exit 1; }
echo "ok without intelligence_usage: applies twice, rolls back to the same catalog"

# 2. intelligence_usage applied first
psql_ -f "$here/../$usage.sql" >/dev/null
before="$(snap)"; original="$(kindcheck)"
psql_ -f "$here/../$name.sql" >/dev/null
kindcheck | grep -q "report_download" || { echo "kind check was not widened"; exit 1; }
psql_ -f "$here/../rollback/$name.rollback.sql" >/dev/null
[ "$before" = "$(snap)" ] || { echo "rollback did not restore the starting catalog (with intelligence_usage)"; exit 1; }
[ "$original" = "$(kindcheck)" ] || { echo "rollback did not restore the original kind check"; exit 1; }
echo "ok with intelligence_usage: widens the kind check, rolls back to the same catalog and check: $original"
psql_ -f "$here/../$name.sql" >/dev/null
out="$(psql_ -f "$here/$name.test.sql" 2>&1)" || { echo "$out" | grep -E "ERROR|FAIL" | head -5; exit 1; }
echo "$out" | grep -q "ALL REPORT DOWNLOAD TESTS PASSED" || { echo "tests did not finish"; echo "$out" | tail -5; exit 1; }
echo "$out" | grep -cE "NOTICE:  ok" | xargs -I{} echo "{} behaviour checks passed"
if psql_ -f "$here/../rollback/$name.rollback.sql" >/dev/null 2>&1; then echo "rollback ran while report_download counts exist"; exit 1; fi
kindcheck | grep -q "report_download" || { echo "refused rollback changed the kind check"; exit 1; }
echo "ok rollback refuses while report_download counts exist"
psql_ -c "DELETE FROM public.intelligence_usage WHERE kind = 'report_download'; DELETE FROM public.intelligence_usage WHERE subject LIKE 'u:00000000-0000-4000-8000-0000000000c%';" >/dev/null
psql_ -f "$here/../rollback/$name.rollback.sql" >/dev/null
[ "$before" = "$(snap)" ] || { echo "rollback after deleting counts did not restore the catalog"; exit 1; }
echo "ok after deleting the counts, rollback restores the same catalog"
echo "OK: $name applies, rolls back to the same catalog in both states, re-applies and passes its tests"
