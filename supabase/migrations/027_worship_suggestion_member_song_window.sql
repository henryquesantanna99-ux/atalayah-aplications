-- Track member/song keys to block repeated suggestions of the same song by the same member for 7 days.

ALTER TABLE worship_song_suggestions
  ADD COLUMN IF NOT EXISTS member_key TEXT,
  ADD COLUMN IF NOT EXISTS song_key TEXT;

CREATE INDEX IF NOT EXISTS worship_song_suggestions_member_song_created_idx
  ON worship_song_suggestions (member_key, song_key, created_at DESC);
