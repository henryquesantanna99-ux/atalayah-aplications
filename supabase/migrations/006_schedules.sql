-- Monthly schedule linking events to months/years
CREATE TABLE schedules (
  id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

-- Active members can read schedules
CREATE POLICY "schedules_read_active" ON schedules
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.status = 'active')
  );

-- Admins have full access
CREATE POLICY "schedules_admin_all" ON schedules
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
