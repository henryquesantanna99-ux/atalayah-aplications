-- Group chat messages with Realtime
CREATE TABLE chat_messages (
  id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  author_id UUID REFERENCES profiles(id) NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'audio')),
  audio_url TEXT,
  is_laia BOOLEAN NOT NULL DEFAULT FALSE,
  reply_to UUID REFERENCES chat_messages(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Active members can read chat messages
CREATE POLICY "chat_read_active" ON chat_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.status = 'active')
  );

-- Active members can send messages
CREATE POLICY "chat_insert_active" ON chat_messages
  FOR INSERT WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.status = 'active')
  );

-- Admins can delete messages
CREATE POLICY "chat_admin_delete" ON chat_messages
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Enable Realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
