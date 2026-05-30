-- Store original multitrack names and allow active users to upload study stems.

ALTER TABLE song_stems
  ADD COLUMN IF NOT EXISTS original_file_name TEXT;

CREATE POLICY "stems_insert_active" ON song_stems
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.status = 'active')
  );
