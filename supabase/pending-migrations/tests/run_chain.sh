#!/usr/bin/env bash
# Builds a local copy of the production schema (every file in supabase/migrations,
# on Supabase stand-ins), applies the pending chain in order, runs the workspace
# behaviour tests, then proves the workspace rollback restores the catalog.
# Needs a local Postgres where the current user can create databases.
set -euo pipefail
export PGOPTIONS="-c client_min_messages=warning"
here="$(cd "$(dirname "$0")" && pwd)"; root="$here/../../.."
db="org_chain_$$"; psql_() { psql -X -q -v ON_ERROR_STOP=1 -d "$db" "$@"; }
createdb "$db"; trap 'dropdb --if-exists "$db"' EXIT
psql_ -f "$here/supabase_full_stubs.sql" >/dev/null 2>&1
for f in $(ls "$root"/supabase/migrations/*.sql | sort); do psql_ -f "$f" >/dev/null 2>&1 || { echo "replay failed at $(basename "$f")"; psql_ -f "$f" 2>&1 | grep -m3 ERROR; exit 1; }; done
chain="20261011120000_protect_privileged_columns 20261011150000_business_ids_on_profiles 20261011160000_scale_price_quotes 20261011180000_team_access_and_ledger_integrity"
for m in $chain; do psql_ -f "$here/../$m.sql" >/dev/null 2>&1 || { echo "apply failed: $m"; psql_ -f "$here/../$m.sql" 2>&1 | grep -m3 ERROR; exit 1; }; done
snap() { psql_ -Atc "SELECT md5(string_agg(x, ',' ORDER BY x)) FROM (
 SELECT 'rel:'||c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','private') AND c.relname NOT LIKE 'org_role_rollback_backup%'
 UNION ALL SELECT 'fn:'||p.oid::regprocedure::text||md5(p.prosrc) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','private')
 UNION ALL SELECT 'pol:'||polname||coalesce(pg_get_expr(polqual,polrelid),'') FROM pg_policy
 UNION ALL SELECT 'con:'||conname||pg_get_constraintdef(oid) FROM pg_constraint WHERE conname NOT LIKE 'org_role_rollback_backup%'
 UNION ALL SELECT 'col:'||table_name||'.'||column_name FROM information_schema.columns WHERE table_schema='public' AND table_name NOT LIKE 'org_role_rollback_backup%'
 UNION ALL SELECT 'trg:'||tgname||tgrelid::regclass::text FROM pg_trigger WHERE NOT tgisinternal) t(x)"; }
before="$(snap)"
psql_ -f "$here/../20261013100000_org_workspace_roles.sql" >/dev/null
out="$(psql_ -f "$here/20261013100000_org_workspace_roles.test.sql" 2>&1)" || { echo "$out" | grep -E "ERROR|FAIL" | head -5; exit 1; }
echo "$out" | grep -q "ALL ORG WORKSPACE TESTS PASSED" || { echo "tests did not finish"; exit 1; }
echo "$out" | grep -c "NOTICE:  ok" | xargs -I{} echo "{} behaviour checks passed"
# Rollback with data present (members holding new roles), then compare catalogs.
psql_ -f "$here/../rollback/20261013100000_org_workspace_roles.rollback.sql" >/dev/null
[ "$before" = "$(snap)" ] || { echo "rollback did not restore the catalog"; exit 1; }
[ "$(psql_ -Atc "SELECT count(*) FROM public.org_role_rollback_backup")" -gt 0 ] || { echo "rollback backup is empty"; exit 1; }
psql_ -f "$here/../20261013100000_org_workspace_roles.sql" >/dev/null
echo "OK: workspace migration applies, passes its tests, rolls back to the same catalog and re-applies"
