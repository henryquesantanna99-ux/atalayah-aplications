-- Persist agenda authorization and save an entire scale atomically.
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'editor', 'integrante'));

-- One-time conversion of the former application allow-list. From this migration
-- onward profiles.role is the only source of authorization truth.
UPDATE profiles SET role = 'editor'
WHERE email IN ('henryquesantanna99@gmail.com', 'contatoingridcamila@gmail.com')
  AND role = 'integrante';

-- Some hosted projects were bootstrapped before the repertoire migration was
-- introduced. Keep this migration independently runnable without weakening the
-- foreign keys used by the transactional function.
DO $$ BEGIN
  CREATE TYPE repertoire_status AS ENUM ('draft', 'consolidated', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS repertoires (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
  name TEXT NOT NULL CHECK (length(btrim(name)) > 0),
  event_date DATE NOT NULL,
  status repertoire_status NOT NULL DEFAULT 'draft',
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, version),
  CHECK ((status = 'archived' AND archived_at IS NOT NULL) OR status <> 'archived')
);

CREATE TABLE IF NOT EXISTS repertoire_items (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  repertoire_id UUID NOT NULL REFERENCES repertoires(id) ON DELETE RESTRICT,
  song_id UUID NOT NULL REFERENCES songs(id) ON DELETE RESTRICT,
  order_index INTEGER NOT NULL DEFAULT 0 CHECK (order_index >= 0),
  key_note TEXT,
  arrangement_changed BOOLEAN NOT NULL DEFAULT false,
  arrangement_notes TEXT,
  liturgical_moment TEXT CHECK (liturgical_moment IN ('Prévia', 'Adoração', 'Palavra', 'Celebração')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (repertoire_id, order_index)
);

ALTER TABLE repertoires ENABLE ROW LEVEL SECURITY;
ALTER TABLE repertoire_items ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_user_can_edit()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND status = 'active' AND role IN ('admin', 'editor')
  )
$$;

-- Editors receive the same narrowly-scoped persistence rights as admins. The RPC
-- also checks this role itself because SECURITY DEFINER bypasses table RLS.
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'events', 'event_members', 'setlist_songs', 'songs', 'song_variations',
    'repertoires', 'repertoire_items'
  ] LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_editor_all', table_name);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL USING (public.current_user_can_edit()) WITH CHECK (public.current_user_can_edit())',
        table_name || '_editor_all', table_name
      );
    END IF;
  END LOOP;
END $$;

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
  v_normal_title text;
  v_normal_artist text;
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
    v_song_id := nullif(v_song->>'songId', '')::uuid;
    v_normal_title := translate(lower(regexp_replace(v_title, '\\s+', ' ', 'g')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc');
    v_normal_artist := translate(lower(regexp_replace(coalesce(v_artist, ''), '\\s+', ' ', 'g')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc');

    IF v_song_id IS NULL THEN
      SELECT id INTO v_song_id FROM songs
      WHERE translate(lower(regexp_replace(btrim(title), '\\s+', ' ', 'g')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') = v_normal_title
        AND translate(lower(regexp_replace(coalesce(btrim(artist), ''), '\\s+', ' ', 'g')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') = v_normal_artist
      ORDER BY created_at LIMIT 1;
      IF v_song_id IS NULL THEN
        BEGIN
          INSERT INTO songs (title, artist, created_by) VALUES (v_title, v_artist, auth.uid()) RETURNING id INTO v_song_id;
          IF nullif(v_song->>'keyNote', '') IS NOT NULL OR nullif(v_song->>'moment', '') IS NOT NULL
             OR nullif(v_song->>'version', '') IS NOT NULL OR nullif(v_song->>'referenceLink', '') IS NOT NULL THEN
            INSERT INTO song_variations (song_id, artist, key_note, moment, soloist_id, version, youtube_url, created_by)
            VALUES (v_song_id, v_artist, nullif(v_song->>'keyNote', ''), nullif(v_song->>'moment', ''),
              nullif(v_song->>'soloistId', '')::uuid, nullif(v_song->>'version', ''),
              nullif(v_song->>'referenceLink', ''), auth.uid());
          END IF;
        EXCEPTION WHEN OTHERS THEN
          RAISE EXCEPTION USING MESSAGE = 'Não foi possível cadastrar a música ' || v_title, ERRCODE = 'P0001';
        END;
      END IF;
    ELSIF NOT EXISTS (SELECT 1 FROM songs WHERE id = v_song_id) THEN
      RAISE EXCEPTION USING MESSAGE = 'Não foi possível cadastrar a música ' || v_title, ERRCODE = 'P0001';
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
