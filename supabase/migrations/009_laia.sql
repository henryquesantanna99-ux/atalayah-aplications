-- Private chat history with Laia AI (per user)
CREATE TABLE laia_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Daily usage control for Laia calls in group chat
CREATE TABLE laia_usage (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  used_at DATE NOT NULL DEFAULT CURRENT_DATE,
  count INTEGER NOT NULL DEFAULT 1,
  UNIQUE(profile_id, used_at)
);

ALTER TABLE laia_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE laia_usage ENABLE ROW LEVEL SECURITY;

-- Users can only access their own Laia messages
CREATE POLICY "laia_messages_own" ON laia_messages
  FOR ALL USING (auth.uid() = profile_id);

-- Users can only access their own usage records
CREATE POLICY "laia_usage_own" ON laia_usage
  FOR ALL USING (auth.uid() = profile_id);

-- Admins can see all (for monitoring)
CREATE POLICY "laia_usage_admin_read" ON laia_usage
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
