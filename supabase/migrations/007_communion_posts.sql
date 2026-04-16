-- Communion: Bible studies and reflections
CREATE TABLE communion_posts (
  id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  author_id UUID REFERENCES profiles(id) NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  type TEXT NOT NULL DEFAULT 'estudo' CHECK (type IN ('estudo', 'reflexao_texto', 'reflexao_audio')),
  audio_url TEXT,
  bible_references TEXT[] DEFAULT '{}', -- ['João 3:16', 'Salmos 23']
  meet_link TEXT,
  meet_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE communion_posts ENABLE ROW LEVEL SECURITY;

-- Active members can read communion posts
CREATE POLICY "communion_read_active" ON communion_posts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.status = 'active')
  );

-- Active members can create posts
CREATE POLICY "communion_insert_active" ON communion_posts
  FOR INSERT WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.status = 'active')
  );

-- Authors can update their own posts
CREATE POLICY "communion_update_own" ON communion_posts
  FOR UPDATE USING (author_id = auth.uid());

-- Admins have full access
CREATE POLICY "communion_admin_all" ON communion_posts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
