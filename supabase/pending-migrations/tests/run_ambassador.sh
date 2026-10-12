#!/usr/bin/env bash
# Replays supabase/migrations locally, applies the ambassador applications
# migration, runs its tests, checks the rollback refuses while rows exist, then
# rolls back with confirmation and compares the catalog.
set -euo pipefail
export PGOPTIONS="-c client_min_messages=warning"
here="$(cd "$(dirname "$0")" && pwd)"; root="$here/../../.."
db="amb_$$"; psql_() { psql -X -q -v ON_ERROR_STOP=1 -d "$db" "$@"; }
createdb "$db"; trap 'dropdb --if-exists "$db"' EXIT
psql_ -f "$here/supabase_full_stubs.sql" >/dev/null 2>&1
for f in $(ls "$root"/supabase/migrations/*.sql | sort); do psql_ -f "$f" >/dev/null 2>&1 || { echo "replay failed at $(basename "$f")"; exit 1; }; done
snap() { psql_ -Atc "SELECT md5(string_agg(c.relname, ',' ORDER BY c.relname)) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'"; }
before="$(snap)"
m=20261014100000_ambassador_applications
psql_ -f "$here/../$m.sql" >/dev/null
out="$(psql_ -f "$here/$m.test.sql" 2>&1)" || { echo "$out" | grep -E "ERROR|FAIL" | head; exit 1; }
echo "$out" | grep -q "ALL AMBASSADOR TESTS PASSED" || { echo "tests did not finish"; exit 1; }
if psql_ -f "$here/../rollback/$m.rollback.sql" >/dev/null 2>&1; then echo "rollback should refuse while applications exist"; exit 1; fi
{ echo "BEGIN; SET LOCAL ambassador.rollback_confirm = 'drop applications';"; sed -e '/^BEGIN;$/d' "$here/../rollback/$m.rollback.sql"; } | psql_ >/dev/null
[ "$before" = "$(snap)" ] || { echo "rollback did not restore the catalog"; exit 1; }
echo "OK: ambassador applications migration applies, passes $(echo "$out" | grep -c 'ok rejected') checks, and rolls back"
