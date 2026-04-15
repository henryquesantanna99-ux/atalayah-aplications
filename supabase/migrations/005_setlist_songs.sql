-- Setlist songs for each event
CREATE TABLE setlist_songs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  song_title TEXT NOT NULL,
  artist TEXT,
  version TEXT,
  reference_link TEXT,
  soloist_id UUID REFERENCES profiles(id),
  key_note TEXT, -- C, C#, D, D#, E, F, F#, G, G#, A, A#, B, Am, etc.
  vocal_guides TEXT[] DEFAULT '{}',
  instrumental_guides TEXT[] DEFAULT '{}',
  playlist_link TEXT,
  moment TEXT CHECK (moment IN ('Prévia', 'Adoração', 'Palavra', 'Celebração')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE setlist_songs ENABLE ROW LEVEL SECURITY;

-- Active members can read setlist songs
CREATE POLICY "setlist_read_active" ON setlist_songs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.status = 'active')
  );

-- Admins have full access
CREATE POLICY "setlist_admin_all" ON setlist_songs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
