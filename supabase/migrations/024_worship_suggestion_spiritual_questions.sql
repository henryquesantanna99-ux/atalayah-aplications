-- Add spiritual response fields to public worship song suggestions.

ALTER TABLE worship_song_suggestions
  ADD COLUMN IF NOT EXISTS spiritual_area TEXT,
  ADD COLUMN IF NOT EXISTS spiritual_area_other TEXT,
  ADD COLUMN IF NOT EXISTS spiritual_experience_note TEXT,
  ADD COLUMN IF NOT EXISTS next_step TEXT,
  ADD COLUMN IF NOT EXISTS next_step_other TEXT;
