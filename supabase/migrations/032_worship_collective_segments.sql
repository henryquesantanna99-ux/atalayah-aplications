-- Optional, self-declared context used only for collective segmentation.
ALTER TABLE worship_song_suggestions
  ADD COLUMN IF NOT EXISTS region TEXT,
  ADD COLUMN IF NOT EXISTS conversion_time TEXT,
  ADD COLUMN IF NOT EXISTS participation_time TEXT;

COMMENT ON COLUMN worship_song_suggestions.region IS 'Optional self-declared region for collective segmentation.';
COMMENT ON COLUMN worship_song_suggestions.conversion_time IS 'Optional self-declared conversion-time range for collective segmentation.';
COMMENT ON COLUMN worship_song_suggestions.participation_time IS 'Optional self-declared church participation range for collective segmentation.';
