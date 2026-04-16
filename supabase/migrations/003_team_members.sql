-- Team members: instruments, teams, and roles per member
CREATE TABLE team_members (
  id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  teams TEXT[] DEFAULT '{}', -- ['Instrumental','Vocal','Som','Mídia','Adm','Liderança']
  function_role TEXT CHECK (function_role IN ('lider', 'integrante')),
  instruments TEXT[] DEFAULT '{}', -- e.g. ['Guitarra','Vocal']
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Active members can read all team_members
CREATE POLICY "team_members_read_active" ON team_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.status = 'active'
    )
  );

-- Members can update their own team data
CREATE POLICY "team_members_update_own" ON team_members
  FOR UPDATE USING (profile_id = auth.uid());

-- Admins have full access
CREATE POLICY "team_members_admin_all" ON team_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );
