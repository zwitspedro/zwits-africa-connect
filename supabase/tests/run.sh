#!/usr/bin/env bash
# Zwits booking/dispatch engine test suite.
#   SUPABASE_DB_URL=... bash supabase/tests/run.sh
set -euo pipefail
: "${SUPABASE_DB_URL:?SUPABASE_DB_URL is required}"
here="$(cd "$(dirname "$0")" && pwd)"

psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f "$here/01_transitions.sql"
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f "$here/02_engine.sql"
bash "$here/03_concurrency.sh"
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f "$here/04_admin_safety.sql"
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f "$here/05_cash_commission.sql"
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f "$here/07_workflow_integrity.sql"
echo "ALL ENGINE TESTS PASSED"
