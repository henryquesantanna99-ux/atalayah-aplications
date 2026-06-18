-- Worship song suggestions and voting module.
-- Votes are a church thermometer only; repertoire approval remains pastoral,
-- theological, ministerial, technical and contextual.

CREATE TABLE worship_songs (
  id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  song_title TEXT NOT NULL,
  artist TEXT,
  youtube_link TEXT,
  category TEXT CHECK (category IN ('Prévia', 'Celebração', 'Adoração')),
  status TEXT NOT NULL DEFAULT 'Em análise' CHECK (status IN ('Aprovada', 'Em teste', 'Repertório oficial', 'Reprovada', 'Pausada', 'Em análise', 'Necessita validação pastoral')),
  theme TEXT,
  worship_type TEXT CHECK (worship_type IN ('Sacerdotal', 'Profético', 'Ambos')),
  vocal_difficulty TEXT,
  band_difficulty TEXT,
  original_key TEXT,
  church_key TEXT,
  bpm INTEGER,
  last_sung_at DATE,
  sung_count INTEGER NOT NULL DEFAULT 0,
  votes INTEGER NOT NULL DEFAULT 0,
  average_rating NUMERIC(3,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE worship_song_suggestions (
  id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  name TEXT NOT NULL,
  tribe TEXT NOT NULL,
  phone TEXT NOT NULL,
  song_title TEXT NOT NULL,
  artist TEXT,
  youtube_link TEXT NOT NULL,
  suggested_category TEXT NOT NULL CHECK (suggested_category IN ('Prévia', 'Celebração', 'Adoração', 'Não sei informar')),
  worship_type TEXT CHECK (worship_type IN ('Necessidade / clamor / entrega', 'Resposta / direção / declaração', 'Os dois', 'Não sei informar')),
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'Sugerida' CHECK (status IN ('Sugerida', 'Em análise', 'Aprovada', 'Em teste', 'Repertório oficial', 'Pausada', 'Reprovada', 'Necessita validação pastoral'))
);

CREATE TABLE worship_song_votes (
  id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  song_id UUID NOT NULL,
  song_title TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  tribe TEXT,
  knows_song TEXT NOT NULL CHECK (knows_song IN ('Sim', 'Não')),
  helps_singing TEXT NOT NULL CHECK (helps_singing IN ('Sim', 'Não', 'Não sei')),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  user_agent TEXT,
  UNIQUE (song_id, phone)
);

ALTER TABLE worship_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE worship_song_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE worship_song_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "worship_songs_read_active" ON worship_songs
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.status = 'active'));

CREATE POLICY "worship_suggestions_insert_active" ON worship_song_suggestions
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.status = 'active'));

CREATE POLICY "worship_votes_insert_active" ON worship_song_votes
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.status = 'active'));

CREATE POLICY "worship_votes_read_active" ON worship_song_votes
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.status = 'active'));

CREATE POLICY "worship_admin_all_songs" ON worship_songs
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY "worship_admin_all_suggestions" ON worship_song_suggestions
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY "worship_admin_all_votes" ON worship_song_votes
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE OR REPLACE FUNCTION update_worship_song_vote_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE worship_songs
  SET votes = (SELECT COUNT(*) FROM worship_song_votes WHERE song_id = NEW.song_id),
      average_rating = (SELECT ROUND(AVG(rating)::numeric, 2) FROM worship_song_votes WHERE song_id = NEW.song_id),
      updated_at = NOW()
  WHERE id = NEW.song_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER worship_song_vote_stats_after_insert
AFTER INSERT ON worship_song_votes
FOR EACH ROW EXECUTE FUNCTION update_worship_song_vote_stats();
