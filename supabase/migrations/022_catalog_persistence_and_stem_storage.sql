-- Ensure catalog editors can persist songs and upload multitracks.

-- The catalog action already allows these editor emails. This policy lets the
-- same editors create/update the base songs row used by song_variations.
DROP POLICY IF EXISTS "songs_editor_insert" ON songs;
CREATE POLICY "songs_editor_insert" ON songs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.email IN ('henryquesantanna99@gmail.com', 'contatoingridcamila@gmail.com')
    )
  );

DROP POLICY IF EXISTS "songs_editor_update" ON songs;
CREATE POLICY "songs_editor_update" ON songs
  FOR UPDATE USING (
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

-- Bucket used by /api/study/stems/upload. Public URLs are stored in song_stems.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'song-stems',
  'song-stems',
  TRUE,
  104857600,
  ARRAY[
    'audio/mpeg',
    'audio/wav',
    'audio/x-wav',
    'audio/mp4',
    'audio/aac',
    'audio/flac',
    'audio/ogg',
    'audio/aiff',
    'audio/x-aiff',
    'audio/x-ms-wma'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "song_stems_storage_read_active" ON storage.objects;
CREATE POLICY "song_stems_storage_read_active" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'song-stems'
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.status = 'active')
  );

DROP POLICY IF EXISTS "song_stems_storage_insert_active" ON storage.objects;
CREATE POLICY "song_stems_storage_insert_active" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'song-stems'
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.status = 'active')
  );
