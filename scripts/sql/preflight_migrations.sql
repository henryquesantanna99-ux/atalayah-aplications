DO $check$
DECLARE
  migration_051_recorded boolean;
  partial_artifacts text[] := ARRAY[]::text[];
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM supabase_migrations.schema_migrations
    WHERE version = '051' AND name = 'general_setlist_visibility'
  ) INTO migration_051_recorded;

  IF migration_051_recorded THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'songs' AND column_name = 'is_catalog_visible'
  ) THEN
    partial_artifacts := array_append(partial_artifacts, 'ALTER TABLE songs ADD COLUMN is_catalog_visible');
  END IF;

  IF to_regclass('public.song_variations_catalog_identity_unique') IS NOT NULL THEN
    partial_artifacts := array_append(partial_artifacts, 'CREATE UNIQUE INDEX song_variations_catalog_identity_unique');
  END IF;

  IF cardinality(partial_artifacts) > 0 THEN
    RAISE EXCEPTION USING
      MESSAGE = 'Migration 051 is absent from migration history but has partial artifacts: ' || array_to_string(partial_artifacts, ', '),
      HINT = 'Inspect PostgreSQL logs and reconcile the first failing statement; do not mark 051 as applied or execute isolated statements.';
  END IF;
END
$check$;
