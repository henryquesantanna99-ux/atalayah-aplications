-- Study tools: song library, stem extraction jobs, extracted stems, and chords.

CREATE TABLE songs (
  id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT,
  youtube_video_id TEXT,
  youtube_url TEXT,
  youtube_thumbnail TEXT,
  youtube_duration TEXT,
  cifra_club_url TEXT,
  default_key TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX songs_youtube_video_id_unique
  ON songs(youtube_video_id)
  WHERE youtube_video_id IS NOT NULL;

ALTER TABLE setlist_songs
  ADD COLUMN song_id UUID REFERENCES songs(id) ON DELETE SET NULL;

CREATE TABLE song_stem_jobs (
  id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
  setlist_song_id UUID REFERENCES setlist_songs(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES profiles(id),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  stems_requested TEXT[] NOT NULL DEFAULT '{}',
  preprocessing_options TEXT[] NOT NULL DEFAULT '{}',
  musicgpt_task_id TEXT,
  musicgpt_conversion_id TEXT,
  credit_estimate NUMERIC,
  eta INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE song_stems (
  id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
  setlist_song_id UUID REFERENCES setlist_songs(id) ON DELETE CASCADE,
  job_id UUID REFERENCES song_stem_jobs(id) ON DELETE CASCADE,
  stem_type TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  wav_url TEXT,
  storage_path TEXT,
  duration NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE song_chords (
  id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  song_id UUID REFERENCES songs(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL DEFAULT 'cifra_club',
  title TEXT NOT NULL,
  artist TEXT,
  source_url TEXT,
  key_note TEXT,
  content_json JSONB,
  plain_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_stem_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_stems ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_chords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "songs_read_active" ON songs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.status = 'active')
  );

CREATE POLICY "songs_admin_all" ON songs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "stem_jobs_read_active" ON song_stem_jobs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.status = 'active')
  );

CREATE POLICY "stem_jobs_insert_active" ON song_stem_jobs
  FOR INSERT WITH CHECK (
    requested_by = auth.uid()
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.status = 'active')
  );

CREATE POLICY "stem_jobs_admin_update" ON song_stem_jobs
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "stem_jobs_update_own" ON song_stem_jobs
  FOR UPDATE USING (
    requested_by = auth.uid()
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.status = 'active')
  );

CREATE POLICY "stems_read_active" ON song_stems
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.status = 'active')
  );

CREATE POLICY "stems_admin_all" ON song_stems
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "chords_read_active" ON song_chords
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.status = 'active')
  );

CREATE POLICY "chords_admin_all" ON song_chords
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "chords_insert_active" ON song_chords
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.status = 'active')
  );

CREATE TRIGGER update_songs_updated_at BEFORE UPDATE ON songs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_song_stem_jobs_updated_at BEFORE UPDATE ON song_stem_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_song_chords_updated_at BEFORE UPDATE ON song_chords
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
