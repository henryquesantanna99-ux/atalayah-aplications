-- Auditable inputs and derived repertoire preparation indices.
CREATE TABLE repertoire_readiness (
  id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  setlist_song_id UUID NOT NULL UNIQUE REFERENCES setlist_songs(id) ON DELETE CASCADE,
  inputs JSONB NOT NULL,
  ici NUMERIC(5,2) NOT NULL CHECK (ici BETWEEN 0 AND 100),
  ico NUMERIC(5,2) NOT NULL CHECK (ico BETWEEN 0 AND 100),
  ip NUMERIC(5,2) NOT NULL CHECK (ip BETWEEN 0 AND 100),
  preparation_level TEXT NOT NULL CHECK (preparation_level IN ('ready', 'light_review', 'individual_process', 'full_process')),
  suggested_stage TEXT NOT NULL CHECK (suggested_stage IN ('ready', 'collective_review', 'individual_study', 'technical_analysis')),
  current_stage TEXT NOT NULL CHECK (current_stage IN ('ready', 'collective_review', 'individual_study', 'technical_analysis')),
  stage_manually_moved BOOLEAN NOT NULL DEFAULT FALSE,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE repertoire_readiness ENABLE ROW LEVEL SECURITY;
CREATE POLICY "repertoire_readiness_active_read" ON repertoire_readiness FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.status = 'active')
);
CREATE POLICY "repertoire_readiness_admin_write" ON repertoire_readiness FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);
