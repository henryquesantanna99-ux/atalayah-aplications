-- Stable taxonomy used by schedules. `instrument` is kept temporarily as the
-- original legacy value so unmapped data remains visible to administrators.
CREATE TYPE schedule_function_category AS ENUM ('band', 'vocal', 'sound', 'other');

CREATE TABLE schedule_functions (
  id TEXT PRIMARY KEY CHECK (id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  display_name TEXT NOT NULL UNIQUE,
  category schedule_function_category NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO schedule_functions (id, display_name, category) VALUES
  ('acoustic-guitar', 'Violão', 'band'),
  ('bass', 'Baixo', 'band'),
  ('drums', 'Bateria', 'band'),
  ('electric-guitar', 'Guitarra', 'band'),
  ('keyboard', 'Teclado', 'band'),
  ('piano', 'Piano', 'band'),
  ('percussion', 'Percussão', 'band'),
  ('vocal', 'Vocal', 'vocal'),
  ('lead-vocal', 'Vocal principal', 'vocal'),
  ('backing-vocal', 'Backing vocal', 'vocal'),
  ('sound', 'Som', 'sound'),
  ('sound-desk', 'Mesa de som', 'sound'),
  ('leader', 'Líder', 'other'),
  ('other', 'Outra função', 'other');

ALTER TABLE event_members
  ADD COLUMN schedule_function_id TEXT REFERENCES schedule_functions(id);

-- Normalize spelling, accents and common historical labels. Unknown values are
-- deliberately left with a NULL FK: guessing would corrupt rotation reports.
UPDATE event_members
SET schedule_function_id = CASE
  WHEN lower(trim(instrument)) IN ('violao', 'violão') THEN 'acoustic-guitar'
  WHEN lower(trim(instrument)) IN ('baixo', 'contrabaixo') THEN 'bass'
  WHEN lower(trim(instrument)) = 'bateria' THEN 'drums'
  WHEN lower(trim(instrument)) = 'guitarra' THEN 'electric-guitar'
  WHEN lower(trim(instrument)) IN ('teclado', 'teclas') THEN 'keyboard'
  WHEN lower(trim(instrument)) = 'piano' THEN 'piano'
  WHEN lower(trim(instrument)) IN ('percussao', 'percussão') THEN 'percussion'
  WHEN lower(trim(instrument)) IN ('vocal', 'voz') THEN 'vocal'
  WHEN lower(trim(instrument)) IN ('vocal principal', 'lead vocal', 'solista') THEN 'lead-vocal'
  WHEN lower(trim(instrument)) IN ('backing vocal', 'back vocal', 'vocal de apoio') THEN 'backing-vocal'
  WHEN lower(trim(instrument)) IN ('som', 'audio', 'áudio', 'sonoplastia') THEN 'sound'
  WHEN lower(trim(instrument)) IN ('mesa de som', 'técnico de som', 'tecnico de som') THEN 'sound-desk'
  WHEN lower(trim(instrument)) IN ('lider', 'líder', 'lideranca', 'liderança') THEN 'leader'
END
WHERE instrument IS NOT NULL;

CREATE INDEX event_members_schedule_function_idx
  ON event_members(schedule_function_id);

ALTER TABLE schedule_functions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "schedule_functions_read_active_members" ON schedule_functions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.status = 'active')
  );
CREATE POLICY "schedule_functions_admin_all" ON schedule_functions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

COMMENT ON COLUMN event_members.instrument IS
  'Legacy unnormalized value; only populated while an assignment still needs administrator correction.';
