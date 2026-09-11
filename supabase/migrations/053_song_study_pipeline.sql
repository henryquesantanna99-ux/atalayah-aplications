-- Estudo > Uma música específica: identificação, análise objetiva, cifra
-- estruturada e sessões pessoais de estudo (REGER: Registrar/Estruturar/Guardar),
-- com upload opcional de gravações para Exercitar/Realizar.
--
-- song_audio_versions e os dados derivados dela (identificação, análise,
-- acordes, estrutura, letra com timestamp, cifra) são compartilhados entre
-- usuários e chaveados por audio_hash: o mesmo arquivo enviado por pessoas
-- diferentes reaproveita a mesma versão/análise. song_study_sessions e
-- song_study_recordings são pessoais.

CREATE TABLE song_audio_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id UUID REFERENCES songs(id) ON DELETE SET NULL,
  audio_hash TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  duration_seconds NUMERIC,
  sample_rate INTEGER,
  channels INTEGER,
  file_format TEXT,
  file_size_bytes BIGINT,
  first_uploaded_by UUID REFERENCES profiles(id),
  status TEXT NOT NULL DEFAULT 'uploaded'
    CHECK (status IN ('uploaded', 'identifying', 'needs_manual_lyrics', 'processing', 'ready', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX song_audio_versions_hash_unique ON song_audio_versions(audio_hash);
COMMENT ON INDEX song_audio_versions_hash_unique IS
  'Reaproveitamento global: o mesmo arquivo enviado por usuários diferentes reaproveita a mesma versão/análise em vez de reprocessar.';

CREATE TABLE song_study_identifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES song_audio_versions(id) ON DELETE CASCADE,
  attempt INTEGER NOT NULL DEFAULT 0 CHECK (attempt BETWEEN 0 AND 2),
  candidate_song_id UUID REFERENCES songs(id) ON DELETE SET NULL,
  candidate_title TEXT,
  candidate_artist TEXT,
  candidate_lyrics_excerpt TEXT,
  rejected_song_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'manual_lyrics')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE song_audio_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES song_audio_versions(id) ON DELETE CASCADE,
  bpm NUMERIC,
  key_note TEXT,
  mode TEXT,
  key_confidence NUMERIC,
  time_signature TEXT,
  midi_storage_path TEXT,
  analyzer_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX song_audio_analyses_version_unique ON song_audio_analyses(version_id);

CREATE TABLE song_chord_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES song_audio_versions(id) ON DELETE CASCADE,
  start_time NUMERIC NOT NULL,
  end_time NUMERIC NOT NULL,
  bar INTEGER,
  beat NUMERIC,
  chord TEXT NOT NULL,
  confidence NUMERIC,
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  source TEXT NOT NULL DEFAULT 'algorithm' CHECK (source IN ('algorithm', 'gemini_validated')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX song_chord_events_version_time_idx ON song_chord_events(version_id, start_time);

CREATE TABLE song_structure_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES song_audio_versions(id) ON DELETE CASCADE,
  segment_key TEXT NOT NULL CHECK (segment_key IN ('intro', 'verso', 'pre_refrao', 'refrao', 'ponte', 'final', 'outro')),
  order_index INTEGER NOT NULL,
  start_time NUMERIC NOT NULL,
  end_time NUMERIC NOT NULL,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX song_structure_segments_version_order_idx ON song_structure_segments(version_id, order_index);

CREATE TABLE song_lyric_timestamps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES song_audio_versions(id) ON DELETE CASCADE,
  line_index INTEGER NOT NULL,
  word_index INTEGER NOT NULL,
  text TEXT NOT NULL,
  start_time NUMERIC NOT NULL,
  end_time NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX song_lyric_timestamps_version_time_idx ON song_lyric_timestamps(version_id, start_time);

CREATE TABLE song_study_charts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES song_audio_versions(id) ON DELETE CASCADE,
  difficulty_level TEXT NOT NULL CHECK (difficulty_level IN ('iniciante', 'intermediario', 'avancado')),
  content_json JSONB,
  plain_text TEXT,
  pdf_storage_path TEXT,
  validated_by_ai BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX song_study_charts_version_level_unique ON song_study_charts(version_id, difficulty_level);

CREATE TABLE song_study_processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES song_audio_versions(id) ON DELETE CASCADE,
  stage TEXT NOT NULL CHECK (stage IN ('identify', 'analyze', 'chart', 'explain')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX song_study_processing_jobs_version_idx ON song_study_processing_jobs(version_id, stage);

CREATE TABLE song_study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  version_id UUID NOT NULL REFERENCES song_audio_versions(id) ON DELETE CASCADE,
  song_id UUID REFERENCES songs(id) ON DELETE SET NULL,
  level TEXT NOT NULL CHECK (level IN ('iniciante', 'intermediario', 'avancado')),
  instrument TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'registrar' CHECK (stage IN ('registrar', 'estruturar', 'guardar', 'exercitar', 'realizar')),
  progress JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX song_study_sessions_user_idx ON song_study_sessions(user_id, created_at DESC);
CREATE UNIQUE INDEX song_study_sessions_user_version_unique ON song_study_sessions(user_id, version_id);
COMMENT ON INDEX song_study_sessions_user_version_unique IS
  'Reabrir uma música já estudada reaproveita a mesma sessão em vez de criar outra.';

CREATE TABLE song_study_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES song_study_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('ensaio', 'ministracao')),
  storage_path TEXT NOT NULL,
  duration_seconds NUMERIC NOT NULL CHECK (duration_seconds <= 360),
  instrument_detected TEXT,
  feedback JSONB,
  analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX song_study_recordings_user_created_idx ON song_study_recordings(user_id, created_at DESC);
COMMENT ON INDEX song_study_recordings_user_created_idx IS
  'Usado para aplicar a cota de 10 gravações por usuário em janela rolante de 24h (ver lib/music/study-recordings-quota.ts).';

-- updated_at triggers, seguindo o padrão do projeto (update_updated_at_column, 011_updated_at_triggers.sql)
CREATE TRIGGER update_song_audio_versions_updated_at BEFORE UPDATE ON song_audio_versions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_song_study_identifications_updated_at BEFORE UPDATE ON song_study_identifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_song_audio_analyses_updated_at BEFORE UPDATE ON song_audio_analyses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_song_study_charts_updated_at BEFORE UPDATE ON song_study_charts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_song_study_processing_jobs_updated_at BEFORE UPDATE ON song_study_processing_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_song_study_sessions_updated_at BEFORE UPDATE ON song_study_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: dados derivados da versão (song_audio_versions e tudo que pende dela) são
-- de leitura compartilhada entre usuários ativos, como songs/song_chords/song_stems;
-- escrita de resultado de pipeline é feita pelo service role (webhooks), por isso só
-- "admin" tem policy de escrita direta aqui além do insert inicial do próprio upload.
ALTER TABLE song_audio_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_study_identifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_audio_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_chord_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_structure_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_lyric_timestamps ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_study_charts ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_study_processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_study_recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "song_audio_versions_read_active" ON song_audio_versions
  FOR SELECT USING (public.current_user_is_active());
CREATE POLICY "song_audio_versions_insert_active" ON song_audio_versions
  FOR INSERT WITH CHECK (public.current_user_is_active() AND first_uploaded_by = auth.uid());
CREATE POLICY "song_audio_versions_admin_all" ON song_audio_versions
  FOR ALL USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

CREATE POLICY "song_study_identifications_read_active" ON song_study_identifications
  FOR SELECT USING (public.current_user_is_active());
CREATE POLICY "song_study_identifications_write_active" ON song_study_identifications
  FOR ALL USING (public.current_user_is_active()) WITH CHECK (public.current_user_is_active());

CREATE POLICY "song_audio_analyses_read_active" ON song_audio_analyses
  FOR SELECT USING (public.current_user_is_active());
CREATE POLICY "song_audio_analyses_admin_all" ON song_audio_analyses
  FOR ALL USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

CREATE POLICY "song_chord_events_read_active" ON song_chord_events
  FOR SELECT USING (public.current_user_is_active());
CREATE POLICY "song_chord_events_admin_all" ON song_chord_events
  FOR ALL USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

CREATE POLICY "song_structure_segments_read_active" ON song_structure_segments
  FOR SELECT USING (public.current_user_is_active());
CREATE POLICY "song_structure_segments_admin_all" ON song_structure_segments
  FOR ALL USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

CREATE POLICY "song_lyric_timestamps_read_active" ON song_lyric_timestamps
  FOR SELECT USING (public.current_user_is_active());
CREATE POLICY "song_lyric_timestamps_admin_all" ON song_lyric_timestamps
  FOR ALL USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

CREATE POLICY "song_study_charts_read_active" ON song_study_charts
  FOR SELECT USING (public.current_user_is_active());
CREATE POLICY "song_study_charts_admin_all" ON song_study_charts
  FOR ALL USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

CREATE POLICY "song_study_processing_jobs_read_active" ON song_study_processing_jobs
  FOR SELECT USING (public.current_user_is_active());
CREATE POLICY "song_study_processing_jobs_admin_all" ON song_study_processing_jobs
  FOR ALL USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

-- song_study_sessions / song_study_recordings são pessoais (a "seção isolada" do usuário).
CREATE POLICY "song_study_sessions_owner_all" ON song_study_sessions
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "song_study_sessions_admin_all" ON song_study_sessions
  FOR ALL USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

CREATE POLICY "song_study_recordings_owner_all" ON song_study_recordings
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "song_study_recordings_admin_all" ON song_study_recordings
  FOR ALL USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

-- Storage: áudio original da versão é um recurso compartilhado (mesmo padrão de
-- leitura de song-stems), já que a mesma versão pode ser reaproveitada por
-- qualquer usuário que enviar o arquivo idêntico.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'study-song-audio',
  'study-song-audio',
  TRUE,
  104857600,
  ARRAY['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/wav', 'audio/x-wav', 'audio/aac', 'audio/flac', 'audio/ogg', 'audio/webm']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "study_song_audio_read_active" ON storage.objects
  FOR SELECT USING (bucket_id = 'study-song-audio' AND public.current_user_is_active());
CREATE POLICY "study_song_audio_insert_active" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'study-song-audio' AND public.current_user_is_active());

-- Storage: gravações pessoais de Exercitar/Realizar são privadas por dono,
-- mesmo padrão RLS de sentinela-recordings (047_sentinela_practice_identity_storage.sql),
-- mas o path aqui é apenas "${userId}/...".
CREATE FUNCTION public.study_owns_storage_path(p_name TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT (storage.foldername(p_name))[1]::uuid = auth.uid()
$$;

REVOKE ALL ON FUNCTION public.study_owns_storage_path(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.study_owns_storage_path(TEXT) TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'study-user-recordings',
  'study-user-recordings',
  FALSE,
  26214400,
  ARRAY['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/wav', 'audio/x-wav', 'audio/aac', 'audio/flac', 'audio/ogg', 'audio/webm']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "study_user_recordings_owner_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'study-user-recordings' AND (public.study_owns_storage_path(name) OR public.current_user_is_admin()));
CREATE POLICY "study_user_recordings_owner_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'study-user-recordings' AND public.study_owns_storage_path(name));
CREATE POLICY "study_user_recordings_owner_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'study-user-recordings' AND (public.study_owns_storage_path(name) OR public.current_user_is_admin()));
