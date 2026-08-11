-- Give every song a stable, reusable identity based on normalized title and artist.
CREATE OR REPLACE FUNCTION public.normalize_song_identity_part(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
RETURNS NULL ON NULL INPUT
SET search_path = public
AS $$
  SELECT translate(
    lower(regexp_replace(btrim(value), '\s+', ' ', 'g')),
    'áàâãäåéèêëíìîïóòôõöúùûüçñýÿ',
    'aaaaaaeeeeiiiiooooouuuucnyy'
  )
$$;

ALTER TABLE public.songs
  ADD COLUMN normalized_title text GENERATED ALWAYS AS (public.normalize_song_identity_part(title)) STORED,
  ADD COLUMN normalized_artist text GENERATED ALWAYS AS (public.normalize_song_identity_part(coalesce(artist, ''))) STORED;

CREATE UNIQUE INDEX songs_normalized_identity_unique
  ON public.songs (normalized_title, normalized_artist);

COMMENT ON INDEX public.songs_normalized_identity_unique IS
  'Serializes concurrent song upserts by normalized title and artist; ON CONFLICT guarantees one catalog row.';

CREATE OR REPLACE FUNCTION public.save_event_scale(
  p_event_id uuid,
  p_event jsonb,
  p_members jsonb DEFAULT '[]'::jsonb,
  p_songs jsonb DEFAULT '[]'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id uuid := p_event_id;
  v_song jsonb;
  v_member jsonb;
  v_song_id uuid;
  v_repertoire_id uuid;
  v_latest_id uuid;
  v_latest_version integer := 0;
  v_latest_status repertoire_status;
  v_index integer := 0;
  v_title text;
  v_artist text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.current_user_can_edit() THEN
    RAISE EXCEPTION USING MESSAGE = 'Você não possui permissão para criar repertórios', ERRCODE = '42501';
  END IF;

  IF nullif(btrim(p_event->>'title'), '') IS NULL THEN
    RAISE EXCEPTION USING MESSAGE = 'Informe o título do evento.', ERRCODE = 'P0001';
  END IF;

  IF v_event_id IS NULL THEN
    INSERT INTO events (title, type, date, arrival_time, start_time, notes, agenda_topic,
      conductor_id, location, is_online, meet_link, created_by)
    VALUES (btrim(p_event->>'title'), p_event->>'type', (p_event->>'date')::date,
      nullif(p_event->>'arrival_time', '')::time, nullif(p_event->>'start_time', '')::time,
      nullif(p_event->>'notes', ''), nullif(p_event->>'agenda_topic', ''),
      nullif(p_event->>'conductor_id', '')::uuid, nullif(p_event->>'location', ''),
      coalesce((p_event->>'is_online')::boolean, false), nullif(p_event->>'meet_link', ''), auth.uid())
    RETURNING id INTO v_event_id;
  ELSE
    IF NOT EXISTS (SELECT 1 FROM events WHERE id = v_event_id) THEN
      RAISE EXCEPTION USING MESSAGE = 'Evento não encontrado.', ERRCODE = 'P0001';
    END IF;
    UPDATE events SET title = btrim(p_event->>'title'), type = p_event->>'type',
      date = (p_event->>'date')::date, arrival_time = nullif(p_event->>'arrival_time', '')::time,
      start_time = nullif(p_event->>'start_time', '')::time, notes = nullif(p_event->>'notes', ''),
      agenda_topic = nullif(p_event->>'agenda_topic', ''), conductor_id = nullif(p_event->>'conductor_id', '')::uuid,
      location = nullif(p_event->>'location', ''), is_online = coalesce((p_event->>'is_online')::boolean, false),
      meet_link = nullif(p_event->>'meet_link', '') WHERE id = v_event_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_members) m
    LEFT JOIN schedule_functions sf ON sf.id = m->>'scheduleFunctionId' AND sf.is_active
    WHERE sf.id IS NULL
  ) THEN
    RAISE EXCEPTION USING MESSAGE = 'Uma ou mais funções da escala são inválidas ou inativas.', ERRCODE = 'P0001';
  END IF;

  DELETE FROM event_members WHERE event_id = v_event_id;
  FOR v_member IN SELECT value FROM jsonb_array_elements(p_members) LOOP
    INSERT INTO event_members (event_id, profile_id, schedule_function_id, instrument)
    VALUES (v_event_id, (v_member->>'profileId')::uuid, v_member->>'scheduleFunctionId', NULL);
  END LOOP;

  DELETE FROM setlist_songs WHERE event_id = v_event_id;

  IF p_event->>'type' = 'culto' THEN
    SELECT id, version, status INTO v_latest_id, v_latest_version, v_latest_status
    FROM repertoires WHERE event_id = v_event_id ORDER BY version DESC LIMIT 1 FOR UPDATE;
    IF v_latest_id IS NOT NULL AND v_latest_status <> 'archived' THEN
      UPDATE repertoires SET status = 'archived', archived_at = now() WHERE id = v_latest_id;
    END IF;
    INSERT INTO repertoires (event_id, name, event_date, status, version)
    VALUES (v_event_id, btrim(p_event->>'title'), (p_event->>'date')::date,
      CASE WHEN (p_event->>'date')::date < current_date THEN 'consolidated'::repertoire_status ELSE 'draft'::repertoire_status END,
      coalesce(v_latest_version, 0) + 1)
    RETURNING id INTO v_repertoire_id;
  END IF;

  FOR v_song IN SELECT value FROM jsonb_array_elements(p_songs) LOOP
    v_title := btrim(v_song->>'songTitle');
    v_artist := nullif(btrim(v_song->>'artist'), '');
    -- The unique identity index makes resolution and creation one atomic operation.
    -- EXCLUDED values only fill blank/null fields, so partial provider responses
    -- cannot erase metadata already present in the catalog.
    INSERT INTO songs (
      title, artist, youtube_video_id, youtube_url, youtube_thumbnail,
      youtube_duration, lyrics_plain, lyrics_synced, album_name, bpm,
      metadata_source, metadata_payload, metadata_fetched_at, created_by
    ) VALUES (
      v_title, v_artist, nullif(btrim(v_song->>'youtubeVideoId'), ''),
      nullif(btrim(v_song->>'youtubeUrl'), ''), nullif(btrim(v_song->>'youtubeThumbnail'), ''),
      nullif(btrim(v_song->>'youtubeDuration'), ''), nullif(v_song->>'lyricsPlain', ''),
      nullif(v_song->>'lyricsSynced', ''), nullif(btrim(v_song->>'albumName'), ''),
      nullif(v_song->>'bpm', '')::integer, nullif(btrim(v_song->>'metadataSource'), ''),
      CASE WHEN jsonb_typeof(v_song->'metadataPayload') = 'object' THEN v_song->'metadataPayload' ELSE '{}'::jsonb END,
      CASE WHEN nullif(btrim(v_song->>'metadataSource'), '') IS NOT NULL THEN now() END,
      auth.uid()
    )
    ON CONFLICT (normalized_title, normalized_artist) DO UPDATE SET
      youtube_video_id = coalesce(nullif(btrim(songs.youtube_video_id), ''), EXCLUDED.youtube_video_id),
      youtube_url = coalesce(nullif(btrim(songs.youtube_url), ''), EXCLUDED.youtube_url),
      youtube_thumbnail = coalesce(nullif(btrim(songs.youtube_thumbnail), ''), EXCLUDED.youtube_thumbnail),
      youtube_duration = coalesce(nullif(btrim(songs.youtube_duration), ''), EXCLUDED.youtube_duration),
      lyrics_plain = coalesce(nullif(songs.lyrics_plain, ''), EXCLUDED.lyrics_plain),
      lyrics_synced = coalesce(nullif(songs.lyrics_synced, ''), EXCLUDED.lyrics_synced),
      album_name = coalesce(nullif(btrim(songs.album_name), ''), EXCLUDED.album_name),
      bpm = coalesce(songs.bpm, EXCLUDED.bpm),
      metadata_source = coalesce(nullif(btrim(songs.metadata_source), ''), EXCLUDED.metadata_source),
      metadata_payload = coalesce(EXCLUDED.metadata_payload, '{}'::jsonb) || coalesce(songs.metadata_payload, '{}'::jsonb),
      metadata_fetched_at = coalesce(songs.metadata_fetched_at, EXCLUDED.metadata_fetched_at),
      updated_at = CASE WHEN
        songs.youtube_video_id IS NULL OR songs.youtube_url IS NULL OR songs.youtube_thumbnail IS NULL OR
        songs.youtube_duration IS NULL OR songs.lyrics_plain IS NULL OR songs.lyrics_synced IS NULL OR
        songs.album_name IS NULL OR songs.bpm IS NULL OR songs.metadata_source IS NULL
        THEN now() ELSE songs.updated_at END
    RETURNING id INTO v_song_id;

    IF nullif(v_song->>'keyNote', '') IS NOT NULL OR nullif(v_song->>'moment', '') IS NOT NULL
       OR nullif(v_song->>'version', '') IS NOT NULL OR nullif(v_song->>'referenceLink', '') IS NOT NULL THEN
      INSERT INTO song_variations (song_id, artist, key_note, moment, soloist_id, version, youtube_url, created_by)
      VALUES (v_song_id, v_artist, nullif(v_song->>'keyNote', ''), nullif(v_song->>'moment', ''),
        nullif(v_song->>'soloistId', '')::uuid, nullif(v_song->>'version', ''),
        nullif(v_song->>'referenceLink', ''), auth.uid());
    END IF;

    IF p_event->>'type' = 'culto' THEN
      INSERT INTO setlist_songs (id, event_id, song_id, order_index, song_title, artist,
        soloist_id, key_note, moment, version, reference_link)
      VALUES ((v_song->>'setlistSongId')::uuid, v_event_id, v_song_id, v_index, v_title, v_artist,
        nullif(v_song->>'soloistId', '')::uuid, nullif(v_song->>'keyNote', ''),
        nullif(v_song->>'moment', ''), nullif(v_song->>'version', ''), nullif(v_song->>'referenceLink', ''));
      INSERT INTO repertoire_items (repertoire_id, song_id, order_index, key_note,
        arrangement_changed, arrangement_notes, liturgical_moment)
      VALUES (v_repertoire_id, v_song_id, v_index, nullif(v_song->>'keyNote', ''),
        nullif(btrim(v_song->>'version'), '') IS NOT NULL, nullif(btrim(v_song->>'version'), ''),
        nullif(v_song->>'moment', ''));
    END IF;
    v_index := v_index + 1;
  END LOOP;

  RETURN v_event_id;
EXCEPTION
  WHEN SQLSTATE '42501' OR SQLSTATE 'P0001' THEN RAISE;
  WHEN OTHERS THEN
    RAISE EXCEPTION USING MESSAGE = 'Não foi possível salvar a escala. Tente novamente.', ERRCODE = 'P0001';
END;
$$;

REVOKE ALL ON FUNCTION public.save_event_scale(uuid, jsonb, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_event_scale(uuid, jsonb, jsonb, jsonb) TO authenticated;
