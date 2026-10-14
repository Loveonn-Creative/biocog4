#!/usr/bin/env bash
# Replays every migration, applies 20261019100000_scope3_trail, snapshots the
# catalog, applies 20261020100000_scope3_global_freight, runs its tests, proves
# the rollback refuses while GLOBAL factors exist, removes the test drafts,
# rolls back to the identical catalog and re-applies. The scope3 trail tests
# are run again on top to show nothing else changed.
set -euo pipefail
export PGOPTIONS="-c client_min_messages=warning"
here="$(cd "$(dirname "$0")" && pwd)"; root="$here/../../.."
name="20261020100000_scope3_global_freight"
db="s3g_chain_$$"; psql_() { psql -X -q -v ON_ERROR_STOP=1 -d "$db" "$@"; }
createdb "$db"; trap 'dropdb --if-exists "$db"' EXIT
psql_ -f "$here/supabase_full_stubs.sql" >/dev/null 2>&1
for f in $(ls "$root"/supabase/migrations/*.sql | sort); do psql_ -f "$f" >/dev/null 2>&1 || { echo "replay failed at $(basename "$f")"; exit 1; }; done
psql_ -f "$here/../20261019100000_scope3_trail.sql" >/dev/null
psql_ -c "INSERT INTO auth.users (id, email) VALUES ('00000000-0000-4000-8000-0000000000a1', 'a@x.in') ON CONFLICT DO NOTHING" >/dev/null
snap() { psql_ -Atc "SELECT md5(string_agg(x, ',' ORDER BY x)) FROM (SELECT 'con:'||conname||pg_get_constraintdef(oid) FROM pg_constraint UNION ALL SELECT 'rel:'||relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public') t(x)"; }
before="$(snap)"
psql_ -f "$here/../$name.sql" >/dev/null
out="$(psql_ -f "$here/$name.test.sql" 2>&1)" || { echo "$out" | grep -E "ERROR|FAIL" | head -5; exit 1; }
echo "$out" | grep -q "ALL SCOPE3 GLOBAL FREIGHT TESTS PASSED" || { echo "tests did not finish"; exit 1; }
echo "$out" | grep -cE "NOTICE:  ok" | xargs -I{} echo "{} behaviour checks passed"
if psql_ -f "$here/../rollback/$name.rollback.sql" >/dev/null 2>&1; then echo "rollback should have refused"; exit 1; fi
psql_ -c "DELETE FROM public.scope3_factors" >/dev/null
psql_ -f "$here/../rollback/$name.rollback.sql" >/dev/null
[ "$before" = "$(snap)" ] || { echo "rollback did not restore the catalog"; exit 1; }
psql_ -f "$here/../$name.sql" >/dev/null
out2="$(psql_ -f "$here/20261019100000_scope3_trail.test.sql" 2>&1)" || { echo "$out2" | grep -E "ERROR|FAIL" | head -5; exit 1; }
echo "$out2" | grep -q "ALL SCOPE3 TRAIL TESTS PASSED" && echo "scope3 trail tests still pass on top"
echo "OK: $name applies, passes its tests, rolls back to the same catalog and re-applies"
