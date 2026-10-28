#!/usr/bin/env bash
# Builds a local copy of the production schema (every file in supabase/migrations
# and drizzle/migrations, on Supabase stand-ins), then runs the real
# extract-document and import-records handlers against it
# (import_records_replay.test.ts): an uploaded bill and an imported spreadsheet
# row must land in documents, emissions and invoice_reads the same way.
# No migration is added by import-records. Needs a local Postgres where the
# current user can create databases.
set -euo pipefail
export PGOPTIONS="-c client_min_messages=warning"
here="$(cd "$(dirname "$0")" && pwd)"; root="$here/../../.."
db="import_records_$$"; psql_() { psql -X -q -v ON_ERROR_STOP=1 -d "$db" "$@"; }
createdb "$db"; trap 'dropdb --if-exists "$db"' EXIT
psql_ -f "$here/supabase_full_stubs.sql" >/dev/null 2>&1
for f in $(ls "$root"/supabase/migrations/*.sql | sort); do psql_ -f "$f" >/dev/null 2>&1 || { echo "replay failed at $(basename "$f")"; psql_ -f "$f" 2>&1 | grep -m3 ERROR; exit 1; }; done
psql_ -c "ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS email_confirmed_at timestamptz" >/dev/null
for f in $(ls "$root"/drizzle/migrations/*.sql | sort); do psql_ -1 -f "$f" >/dev/null 2>&1 || { echo "drizzle replay failed at $(basename "$f")"; psql_ -1 -f "$f" 2>&1 | grep -m3 ERROR; exit 1; }; done
cd "$root" && IMPORT_REPLAY_DB="$db" bun test supabase/pending-migrations/tests/import_records_replay.test.ts
echo "OK: uploaded and imported bills land the same way on the replayed production schema"
