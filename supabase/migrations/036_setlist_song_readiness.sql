ALTER TABLE setlist_songs
  ADD COLUMN plays_like_last_time BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN change_new_key BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN change_new_arrangement BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN change_new_intro BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN change_new_vocal_division BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN change_new_member BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN change_notes TEXT,
  ADD COLUMN readiness_index INTEGER NOT NULL DEFAULT 100 CHECK (readiness_index BETWEEN 0 AND 100),
  ADD COLUMN suggested_stage TEXT NOT NULL DEFAULT 'Pronta';

COMMENT ON COLUMN setlist_songs.readiness_index IS 'Índice de prontidão calculado a partir das mudanças do repertório.';
