-- Only name, tribe and song title are required for public worship suggestions.

ALTER TABLE worship_song_suggestions
  ALTER COLUMN phone DROP NOT NULL,
  ALTER COLUMN suggested_category DROP NOT NULL,
  ALTER COLUMN spiritual_area DROP NOT NULL,
  ALTER COLUMN next_step DROP NOT NULL;
