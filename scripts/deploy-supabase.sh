#!/usr/bin/env bash
set -Eeuo pipefail

required=(SUPABASE_ACCESS_TOKEN SUPABASE_DB_PASSWORD SUPABASE_PROJECT_REF SUPABASE_DB_URL NEXT_PUBLIC_SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY)
for variable in "${required[@]}"; do
  if [[ -z "${!variable:-}" ]]; then
    echo "Missing required deployment secret: ${variable}" >&2
    exit 1
  fi
done

# Linking plus db push is the Supabase CLI migration deployment flow. Never run
# individual statements: migrations 050, 051, and 052 must retain their order and
# transactional boundary.
supabase link --project-ref "$SUPABASE_PROJECT_REF" --password "$SUPABASE_DB_PASSWORD"
supabase migration list --linked

# Refuse to paper over a manually/partially executed 051. If it is absent from
# migration history but one of its durable artifacts exists, intervention is
# required to determine the failing statement and reconcile the whole migration.
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f scripts/sql/preflight_migrations.sql
supabase db push --linked --password "$SUPABASE_DB_PASSWORD"
supabase migration list --linked
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f scripts/sql/validate_production_schema.sql

# A successful catalog query proves the PostgREST schema cache has observed all
# three columns. `db push` sends the reload notification, but this check makes the
# release gate explicit.
status="$({ curl --silent --show-error --output /tmp/postgrest-schema-check.json --write-out '%{http_code}' \
  --get "${NEXT_PUBLIC_SUPABASE_URL%/}/rest/v1/songs" \
  --data-urlencode 'select=normalized_title,normalized_artist,is_catalog_visible' \
  --data-urlencode 'limit=0' \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"; } || true)"
if [[ "$status" != 200 ]]; then
  echo "PostgREST schema-cache validation failed (HTTP ${status})." >&2
  cat /tmp/postgrest-schema-check.json >&2
  exit 1
fi
