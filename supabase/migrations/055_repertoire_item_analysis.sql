-- Per-event preparation analysis. Automatic indicators are persisted together
-- with the manual assessment so every repertoire remains completely isolated.
CREATE TABLE IF NOT EXISTS repertoire_item_analyses (
  id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  setlist_song_id UUID NOT NULL UNIQUE REFERENCES setlist_songs(id) ON DELETE CASCADE,
  mastery NUMERIC(3,1) NOT NULL DEFAULT 5 CHECK (mastery BETWEEN 0 AND 10),
  complexity NUMERIC(3,1) NOT NULL DEFAULT 5 CHECK (complexity BETWEEN 0 AND 10),
  changes NUMERIC(3,1) NOT NULL DEFAULT 0 CHECK (changes BETWEEN 0 AND 10),
  strategic_weight NUMERIC(3,1) NOT NULL DEFAULT 5 CHECK (strategic_weight BETWEEN 0 AND 10),
  preparation_stage TEXT NOT NULL DEFAULT 'escuta' CHECK (preparation_stage IN (
    'escuta', 'mapeamento_escrita', 'memorizacao_tecnica', 'ensaio_passagem', 'pronta_ministracao'
  )),
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE repertoire_item_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "repertoire_analysis_active_read" ON repertoire_item_analyses
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND status = 'active'
  ));

CREATE POLICY "repertoire_analysis_admin_write" ON repertoire_item_analyses
  FOR ALL USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE TRIGGER set_repertoire_item_analyses_updated_at
  BEFORE UPDATE ON repertoire_item_analyses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
