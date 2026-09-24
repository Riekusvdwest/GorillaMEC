#!/usr/bin/env bash
# Runs the migrations and database tests against a throwaway local Postgres.
# Needs a local Postgres; set PGHOST/PGPORT/PGUSER as usual (defaults below).
set -euo pipefail
cd "$(dirname "$0")/.."
export PGHOST="${PGHOST:-/home/claude/.pgtest}" PGPORT="${PGPORT:-54329}" PGUSER="${PGUSER:-postgres}"
DB=gorillapm_test
psql -X -q -d postgres -c "drop database if exists $DB" -c "create database $DB" >/dev/null 2>&1
psql -X -q -v ON_ERROR_STOP=1 -d "$DB" -f supabase/tests/00_local_supabase_shim.sql >/dev/null
for f in supabase/migrations/*.sql; do
  psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$f" >/dev/null
done
for f in supabase/tests/0[1-9]_*.sql; do
  echo "== $f"
  psql -X -q -t -A -v ON_ERROR_STOP=1 -d "$DB" -f "$f" 2>&1 \
    | grep -E "ok - |ASSERTION|ERROR|PASSED" | sed -E 's/^psql:[^ ]* (NOTICE|ERROR):  /  /'
  test "${PIPESTATUS[0]}" -eq 0
done
