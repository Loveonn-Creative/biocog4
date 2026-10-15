#!/usr/bin/env bash
# Builds a local copy of the production schema (every file in supabase/migrations
# and drizzle/migrations, on Supabase stand-ins), seeds two ledger rows, then: applies 20261027100000_ledger_hash_chain,
# proves the rollback restores the exact starting catalog, re-applies it, runs
# the behaviour tests.
# Needs a local Postgres where the current user can create databases.
set -euo pipefail
export PGOPTIONS="-c client_min_messages=warning"
here="$(cd "$(dirname "$0")" && pwd)"; root="$here/../../.."
name="20261027100000_ledger_hash_chain"
db="ledger_chain_$$"; psql_() { psql -X -q -v ON_ERROR_STOP=1 -d "$db" "$@"; }
createdb "$db"; trap 'dropdb --if-exists "$db"' EXIT
psql_ -f "$here/supabase_full_stubs.sql" >/dev/null 2>&1
for f in $(ls "$root"/supabase/migrations/*.sql | sort); do psql_ -f "$f" >/dev/null 2>&1 || { echo "replay failed at $(basename "$f")"; psql_ -f "$f" 2>&1 | grep -m3 ERROR; exit 1; }; done
for f in $(ls "$root"/drizzle/migrations/*.sql | sort); do psql_ -1 -f "$f" >/dev/null 2>&1 || { echo "drizzle replay failed at $(basename "$f")"; psql_ -1 -f "$f" 2>&1 | grep -m3 ERROR; exit 1; }; done
# Rows already in the ledger before the chain exists become baseline events.
psql_ -c "INSERT INTO public.compliance_ledger (user_id, document_hash, emission_category, co2_kg, methodology_version, scope, created_at)
 VALUES ('00000000-0000-4000-8000-0000000000c0', repeat('b', 64), 'FUEL', 10.5, 'BIOCOG_MVR_IN_v1.1', 1, now() - interval '2 days'),
        ('00000000-0000-4000-8000-0000000000c0', repeat('c', 64), 'ELECTRICITY', 71, 'BIOCOG_MVR_IN_v1.1', 2, now() - interval '1 day')"
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
out="$(psql_ -f "$here/$name.test.sql" 2>&1)" || { echo "$out" | grep -E "ERROR|FAIL" | head -5; exit 1; }
echo "$out" | grep -q "ALL LEDGER CHAIN TESTS PASSED" || { echo "tests did not finish"; echo "$out" | tail -5; exit 1; }
echo "$out" | grep -cE "NOTICE:  ok" | xargs -I{} echo "{} behaviour checks passed"
# Two sessions writing to one account at once must not fork the chain.
ins="INSERT INTO public.compliance_ledger (user_id, document_hash, emission_category, co2_kg, methodology_version, scope) SELECT '00000000-0000-4000-8000-0000000000c7', repeat('a', 64), 'FUEL', g, 'v', 1 FROM generate_series(1, 25) g"
for i in 1 2 3 4; do (for j in 1 2 3 4; do psql_ -c "$ins"; done) & done; wait
[ "$(psql_ -Atc "SELECT ok AND events = 400 FROM public.verify_ledger_chain('00000000-0000-4000-8000-0000000000c7')")" = t ] || { echo "concurrent writes forked the chain"; exit 1; }
echo "concurrent writes: 400 events from 4 sessions, one unbroken chain"
echo "OK: $name applies, rolls back to the same catalog, re-applies and passes its tests"
