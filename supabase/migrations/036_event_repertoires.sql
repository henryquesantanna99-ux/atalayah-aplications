-- Versioned event repertoires and the operational analysis of each performance.
CREATE TYPE repertoire_status AS ENUM ('draft', 'consolidated', 'archived');
CREATE TYPE repertoire_mastery AS ENUM ('low', 'medium', 'high');
CREATE TYPE repertoire_rotation AS ENUM ('low', 'balanced', 'high');
CREATE TYPE repertoire_strategic_weight AS ENUM ('low', 'medium', 'high');
CREATE TYPE repertoire_kanban_stage AS ENUM ('backlog', 'analysis', 'rehearsal', 'ready', 'performed');

CREATE TABLE repertoires (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
  name TEXT NOT NULL CHECK (length(btrim(name)) > 0),
  event_date DATE NOT NULL,
  status repertoire_status NOT NULL DEFAULT 'draft',
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, version),
  CHECK ((status = 'archived' AND archived_at IS NOT NULL) OR status <> 'archived')
);

CREATE TABLE repertoire_items (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  repertoire_id UUID NOT NULL REFERENCES repertoires(id) ON DELETE RESTRICT,
  song_id UUID NOT NULL REFERENCES songs(id) ON DELETE RESTRICT,
  order_index INTEGER NOT NULL DEFAULT 0 CHECK (order_index >= 0),
  key_note TEXT,
  arrangement_changed BOOLEAN NOT NULL DEFAULT false,
  arrangement_notes TEXT,
  liturgical_moment TEXT CHECK (liturgical_moment IN ('Prévia', 'Adoração', 'Palavra', 'Celebração')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (repertoire_id, order_index)
);

CREATE TABLE repertoire_item_analyses (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  repertoire_item_id UUID NOT NULL UNIQUE REFERENCES repertoire_items(id) ON DELETE RESTRICT,
  recency_days INTEGER CHECK (recency_days IS NULL OR recency_days >= 0),
  team_mastery repertoire_mastery NOT NULL,
  rotation repertoire_rotation NOT NULL,
  strategic_weight repertoire_strategic_weight NOT NULL,
  ip NUMERIC(5,2) NOT NULL CHECK (ip BETWEEN 0 AND 100),
  ici NUMERIC(5,2) NOT NULL CHECK (ici BETWEEN 0 AND 100),
  ico NUMERIC(5,2) NOT NULL CHECK (ico BETWEEN 0 AND 100),
  kanban_stage repertoire_kanban_stage NOT NULL DEFAULT 'backlog',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX repertoires_event_id_idx ON repertoires(event_id);
CREATE INDEX repertoires_event_date_idx ON repertoires(event_date);
CREATE INDEX repertoire_items_repertoire_id_idx ON repertoire_items(repertoire_id);
CREATE INDEX repertoire_items_song_id_idx ON repertoire_items(song_id);

-- Recency is derived from the most recent earlier performance of this catalog song.
CREATE FUNCTION calculate_repertoire_item_recency()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  current_event_date DATE;
  previous_event_date DATE;
BEGIN
  SELECT r.event_date INTO current_event_date
  FROM repertoires r JOIN repertoire_items ri ON ri.repertoire_id = r.id
  WHERE ri.id = NEW.repertoire_item_id;

  SELECT max(r.event_date) INTO previous_event_date
  FROM repertoire_items current_item
  JOIN repertoire_items previous_item ON previous_item.song_id = current_item.song_id
  JOIN repertoires r ON r.id = previous_item.repertoire_id
  WHERE current_item.id = NEW.repertoire_item_id
    AND r.event_date < current_event_date
    AND r.status IN ('consolidated', 'archived');

  NEW.recency_days := CASE WHEN previous_event_date IS NULL THEN NULL
    ELSE current_event_date - previous_event_date END;
  RETURN NEW;
END;
$$;

CREATE TRIGGER calculate_repertoire_item_analysis_recency
  BEFORE INSERT OR UPDATE OF repertoire_item_id ON repertoire_item_analyses
  FOR EACH ROW EXECUTE FUNCTION calculate_repertoire_item_recency();
CREATE TRIGGER update_repertoires_updated_at BEFORE UPDATE ON repertoires
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_repertoire_items_updated_at BEFORE UPDATE ON repertoire_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_repertoire_item_analyses_updated_at BEFORE UPDATE ON repertoire_item_analyses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Convert the existing event setlists into immutable initial historical versions.
INSERT INTO repertoires (event_id, name, event_date, status)
SELECT e.id, e.title, e.date,
  CASE WHEN e.date < current_date THEN 'consolidated'::repertoire_status ELSE 'draft'::repertoire_status END
FROM events e
WHERE EXISTS (SELECT 1 FROM setlist_songs ss WHERE ss.event_id = e.id AND ss.song_id IS NOT NULL);

INSERT INTO repertoire_items (repertoire_id, song_id, order_index, key_note, arrangement_changed, arrangement_notes, liturgical_moment)
SELECT r.id, ss.song_id, row_number() OVER (PARTITION BY r.id ORDER BY ss.order_index, ss.id) - 1,
  ss.key_note, ss.version IS NOT NULL, ss.version, ss.moment
FROM repertoires r JOIN setlist_songs ss ON ss.event_id = r.event_id
WHERE ss.song_id IS NOT NULL;

ALTER TABLE repertoires ENABLE ROW LEVEL SECURITY;
ALTER TABLE repertoire_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE repertoire_item_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "repertoires_read_active" ON repertoires FOR SELECT USING (public.current_user_is_active());
CREATE POLICY "repertoires_admin_all" ON repertoires FOR ALL USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
CREATE POLICY "repertoire_items_read_active" ON repertoire_items FOR SELECT USING (public.current_user_is_active());
CREATE POLICY "repertoire_items_admin_all" ON repertoire_items FOR ALL USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
CREATE POLICY "repertoire_analyses_read_active" ON repertoire_item_analyses FOR SELECT USING (public.current_user_is_active());
CREATE POLICY "repertoire_analyses_admin_insert" ON repertoire_item_analyses FOR INSERT WITH CHECK (public.current_user_is_admin());
CREATE POLICY "repertoire_analyses_admin_update" ON repertoire_item_analyses FOR UPDATE USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
CREATE POLICY "repertoire_analyses_admin_delete" ON repertoire_item_analyses FOR DELETE USING (public.current_user_is_admin());
