-- Versioned technical analysis linked to the canonical catalog song.
ALTER TABLE song_musical_analyses
  ADD COLUMN IF NOT EXISTS song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS version INTEGER,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'reviewed')),
  ADD COLUMN IF NOT EXISTS scores JSONB,
  ADD COLUMN IF NOT EXISTS ici_score INTEGER CHECK (ici_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS ico_score INTEGER CHECK (ico_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS team_profile_snapshot JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS supersedes_id UUID REFERENCES song_musical_analyses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

ALTER TABLE song_musical_analyses
  ADD CONSTRAINT song_musical_scores_valid CHECK (
    scores IS NULL OR (jsonb_typeof(scores) = 'object' AND scores ?& ARRAY['melodic','harmonic','rhythmic','technical','structural','interpretative','collective'] AND
      (scores->>'melodic')::int BETWEEN 1 AND 3 AND (scores->>'harmonic')::int BETWEEN 1 AND 3 AND
      (scores->>'rhythmic')::int BETWEEN 1 AND 3 AND (scores->>'technical')::int BETWEEN 1 AND 3 AND
      (scores->>'structural')::int BETWEEN 1 AND 3 AND (scores->>'interpretative')::int BETWEEN 1 AND 3 AND
      (scores->>'collective')::int BETWEEN 1 AND 3
    )
  );
CREATE UNIQUE INDEX IF NOT EXISTS song_musical_analysis_version ON song_musical_analyses(song_id, version) WHERE song_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS repertoire_readiness_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  musical_analysis_id UUID REFERENCES song_musical_analyses(id) ON DELETE SET NULL,
  ici_score INTEGER CHECK (ici_score BETWEEN 0 AND 100),
  ico_score INTEGER CHECK (ico_score BETWEEN 0 AND 100),
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, song_id)
);
ALTER TABLE repertoire_readiness_analyses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "musical_analyses_admin_write" ON song_musical_analyses;
CREATE POLICY "musical_analyses_admin_write" ON song_musical_analyses FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "repertoire_readiness_authenticated_read" ON repertoire_readiness_analyses FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "repertoire_readiness_admin_write" ON repertoire_readiness_analyses FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
