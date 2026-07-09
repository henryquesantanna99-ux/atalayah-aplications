-- Spec-driven worship foundation: member-safe suggestions, ministry profile,
-- enrichment storage, thematic/musical analyses and repertoire suggestions.

ALTER TABLE worship_song_suggestions
  ADD COLUMN IF NOT EXISTS age_range TEXT,
  ADD COLUMN IF NOT EXISTS ministry TEXT,
  ADD COLUMN IF NOT EXISTS youtube_video_id TEXT,
  ADD COLUMN IF NOT EXISTS youtube_title TEXT,
  ADD COLUMN IF NOT EXISTS youtube_channel TEXT,
  ADD COLUMN IF NOT EXISTS youtube_thumbnail TEXT,
  ADD COLUMN IF NOT EXISTS youtube_duration TEXT,
  ADD COLUMN IF NOT EXISTS youtube_url TEXT,
  ADD COLUMN IF NOT EXISTS lyrics_plain TEXT,
  ADD COLUMN IF NOT EXISTS lyrics_synced TEXT,
  ADD COLUMN IF NOT EXISTS lyrics_source TEXT,
  ADD COLUMN IF NOT EXISTS lyrics_confidence NUMERIC,
  ADD COLUMN IF NOT EXISTS lyrics_fetched_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS metadata_source TEXT,
  ADD COLUMN IF NOT EXISTS metadata_payload JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS metadata_fetched_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS church_members (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  tribe TEXT,
  ministry TEXT,
  birth_date DATE,
  age_range TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ministry_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theological_vision TEXT,
  current_emphasis TEXT,
  current_season TEXT,
  musical_culture JSONB DEFAULT '{}'::jsonb,
  pastoral_notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ministry_member_skill_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_profile_id UUID REFERENCES ministry_profiles(id) ON DELETE CASCADE,
  team_member_id UUID,
  member_name TEXT,
  role TEXT,
  instrument TEXT,
  technical_level INTEGER CHECK (technical_level BETWEEN 1 AND 5),
  harmonic_level INTEGER CHECK (harmonic_level BETWEEN 1 AND 5),
  rhythmic_level INTEGER CHECK (rhythmic_level BETWEEN 1 AND 5),
  improvisation_level INTEGER CHECK (improvisation_level BETWEEN 1 AND 5),
  vocal_range TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS song_thematic_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id UUID REFERENCES worship_song_suggestions(id) ON DELETE CASCADE,
  ministry_profile_id UUID REFERENCES ministry_profiles(id) ON DELETE SET NULL,
  classification JSONB DEFAULT '{}'::jsonb,
  quantification JSONB DEFAULT '{}'::jsonb,
  segmentation JSONB DEFAULT '{}'::jsonb,
  relationships JSONB DEFAULT '{}'::jsonb,
  evolution JSONB DEFAULT '{}'::jsonb,
  interpretation TEXT,
  planning JSONB DEFAULT '{}'::jsonb,
  model_used TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS song_musical_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id UUID REFERENCES worship_song_suggestions(id) ON DELETE CASCADE,
  ministry_profile_id UUID REFERENCES ministry_profiles(id) ON DELETE SET NULL,
  difficulty_score INTEGER,
  difficulty_label TEXT,
  vocal_analysis JSONB DEFAULT '{}'::jsonb,
  band_analysis JSONB DEFAULT '{}'::jsonb,
  congregational_analysis JSONB DEFAULT '{}'::jsonb,
  risks JSONB DEFAULT '[]'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  model_used TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS repertoire_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_profile_id UUID REFERENCES ministry_profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  pastoral_direction TEXT,
  source_analysis_ids UUID[] DEFAULT ARRAY[]::UUID[],
  suggested_setlist JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'draft',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE church_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE ministry_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ministry_member_skill_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_thematic_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_musical_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE repertoire_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "church_members_read_own" ON church_members FOR SELECT USING (auth.uid() = id);
CREATE POLICY "church_members_update_own" ON church_members FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "church_members_insert_own" ON church_members FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "ministry_profiles_authenticated_read" ON ministry_profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "ministry_profiles_authenticated_write" ON ministry_profiles FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "ministry_skills_authenticated_read" ON ministry_member_skill_profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "ministry_skills_authenticated_write" ON ministry_member_skill_profiles FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "thematic_analyses_authenticated_read" ON song_thematic_analyses FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "musical_analyses_authenticated_read" ON song_musical_analyses FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "repertoire_suggestions_authenticated_read" ON repertoire_suggestions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "repertoire_suggestions_authenticated_write" ON repertoire_suggestions FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
