DO $validate$
DECLARE
  applied text[];
  save_event_scale_definition text;
BEGIN
  SELECT array_agg(version ORDER BY version)
  INTO applied
  FROM supabase_migrations.schema_migrations
  WHERE (version, name) IN (
    ('050', 'normalized_song_identity'),
    ('051', 'general_setlist_visibility'),
    ('052', 'event_youtube_playlists')
  );
  IF applied IS DISTINCT FROM ARRAY['050', '051', '052']::text[] THEN
    RAISE EXCEPTION 'Required migrations are not recorded in order: %', applied;
  END IF;

  IF (SELECT count(*) FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'songs'
        AND column_name IN ('normalized_title', 'normalized_artist', 'is_catalog_visible')) <> 3 THEN
    RAISE EXCEPTION 'public.songs is missing normalized/catalog visibility columns';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'songs' AND column_name = 'is_catalog_visible'
      AND is_nullable = 'NO' AND column_default IN ('true', 'true::boolean')
  ) THEN
    RAISE EXCEPTION 'public.songs.is_catalog_visible must be NOT NULL DEFAULT true';
  END IF;

  IF to_regclass('public.songs_normalized_identity_unique') IS NULL THEN
    RAISE EXCEPTION 'Index public.songs_normalized_identity_unique is missing';
  END IF;

  SELECT pg_get_functiondef('public.save_event_scale(uuid,jsonb,jsonb,jsonb)'::regprocedure)
  INTO save_event_scale_definition;
  IF save_event_scale_definition NOT LIKE '%is_catalog_visible%'
     OR save_event_scale_definition NOT LIKE '%addToGeneralCatalog%'
     OR save_event_scale_definition NOT LIKE '%ON CONFLICT (song_id, artist, key_note, moment, soloist_id, version, youtube_url)%' THEN
    RAISE EXCEPTION 'public.save_event_scale(uuid,jsonb,jsonb,jsonb) is not the migration 051 version';
  END IF;
END
$validate$;
