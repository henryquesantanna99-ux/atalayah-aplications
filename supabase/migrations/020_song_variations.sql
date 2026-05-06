-- Song variations: catalog-level variations of songs (different keys, moments, soloists, versions)
-- This table represents the master catalog of songs with all their known configurations.

CREATE TABLE song_variations (
  id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  artist TEXT,
  key_note TEXT,
  moment TEXT CHECK (moment IN ('Prévia', 'Adoração', 'Palavra', 'Celebração')),
  soloist_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  version TEXT,
  youtube_url TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE song_variations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "song_variations_read_active" ON song_variations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.status = 'active')
  );

CREATE POLICY "song_variations_editor_all" ON song_variations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.email IN ('henryquesantanna99@gmail.com', 'contatoingridcamila@gmail.com')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.email IN ('henryquesantanna99@gmail.com', 'contatoingridcamila@gmail.com')
    )
  );

-- Seed catalog from existing setlist_songs entries that reference a song
INSERT INTO song_variations (song_id, artist, key_note, moment, soloist_id, version, youtube_url, created_by, created_at)
SELECT DISTINCT ON (ss.song_id, ss.key_note, ss.moment, ss.soloist_id, ss.version)
  ss.song_id,
  ss.artist,
  ss.key_note,
  ss.moment,
  ss.soloist_id,
  ss.version,
  ss.reference_link,
  NULL,
  ss.created_at
FROM setlist_songs ss
WHERE ss.song_id IS NOT NULL
ORDER BY ss.song_id, ss.key_note, ss.moment, ss.soloist_id, ss.version, ss.created_at DESC;
