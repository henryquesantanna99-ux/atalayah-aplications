-- Extra details for communion events created from the agenda.
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS agenda_topic TEXT,
  ADD COLUMN IF NOT EXISTS conductor_id UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS is_online BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS meet_link TEXT;
