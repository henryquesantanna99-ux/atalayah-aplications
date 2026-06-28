-- YouTube link is no longer collected in the public worship suggestion form.

ALTER TABLE worship_song_suggestions
  ALTER COLUMN youtube_link DROP NOT NULL;
