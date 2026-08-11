-- Sentinela authorization is season-scoped. Application-wide profiles.role is
-- intentionally not referenced anywhere in this migration.
CREATE TABLE public.sentinela_seasons (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  name TEXT NOT NULL CHECK (length(btrim(name)) > 0),
  is_active BOOLEAN NOT NULL DEFAULT false,
  starts_at DATE NOT NULL,
  ends_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at IS NULL OR ends_at >= starts_at)
);

CREATE UNIQUE INDEX sentinela_one_active_season
  ON public.sentinela_seasons (is_active) WHERE is_active;

CREATE TABLE public.sentinela_memberships (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  season_id UUID NOT NULL REFERENCES public.sentinela_seasons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('participant', 'mentor', 'journey_admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  grants TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (season_id, user_id),
  CHECK (grants <@ ARRAY['manage_rehearsals']::TEXT[])
);

CREATE INDEX sentinela_memberships_user_season
  ON public.sentinela_memberships (user_id, season_id) WHERE status = 'active';

CREATE TABLE public.sentinela_rehearsals (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  season_id UUID NOT NULL REFERENCES public.sentinela_seasons(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (length(btrim(title)) > 0),
  scheduled_at TIMESTAMPTZ NOT NULL,
  private_notes TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX sentinela_rehearsals_season ON public.sentinela_rehearsals (season_id, scheduled_at);

ALTER TABLE public.sentinela_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sentinela_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sentinela_rehearsals ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_sentinela_membership(target_season UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM sentinela_memberships
    WHERE season_id = target_season AND user_id = auth.uid() AND status = 'active'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_sentinela_journey_admin(target_season UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM sentinela_memberships
    WHERE season_id = target_season AND user_id = auth.uid()
      AND status = 'active' AND role = 'journey_admin'
  )
$$;

CREATE OR REPLACE FUNCTION public.can_manage_sentinela_rehearsals(target_season UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM sentinela_memberships
    WHERE season_id = target_season AND user_id = auth.uid() AND status = 'active'
      AND (role = 'journey_admin' OR 'manage_rehearsals' = ANY(grants))
  )
$$;

REVOKE ALL ON FUNCTION public.has_sentinela_membership(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_sentinela_journey_admin(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_manage_sentinela_rehearsals(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_sentinela_membership(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_sentinela_journey_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_sentinela_rehearsals(UUID) TO authenticated;

CREATE POLICY sentinela_seasons_member_read ON public.sentinela_seasons FOR SELECT
  USING (public.has_sentinela_membership(id));
CREATE POLICY sentinela_seasons_admin_write ON public.sentinela_seasons FOR ALL
  USING (public.is_sentinela_journey_admin(id))
  WITH CHECK (public.is_sentinela_journey_admin(id));

CREATE POLICY sentinela_memberships_scoped_read ON public.sentinela_memberships FOR SELECT
  USING (user_id = auth.uid() OR public.is_sentinela_journey_admin(season_id));
CREATE POLICY sentinela_memberships_admin_write ON public.sentinela_memberships FOR ALL
  USING (public.is_sentinela_journey_admin(season_id))
  WITH CHECK (public.is_sentinela_journey_admin(season_id));

CREATE POLICY sentinela_rehearsals_member_read ON public.sentinela_rehearsals FOR SELECT
  USING (public.has_sentinela_membership(season_id));
CREATE POLICY sentinela_rehearsals_manager_insert ON public.sentinela_rehearsals FOR INSERT
  WITH CHECK (public.can_manage_sentinela_rehearsals(season_id) AND created_by = auth.uid());
CREATE POLICY sentinela_rehearsals_manager_update ON public.sentinela_rehearsals FOR UPDATE
  USING (public.can_manage_sentinela_rehearsals(season_id))
  WITH CHECK (public.can_manage_sentinela_rehearsals(season_id));
CREATE POLICY sentinela_rehearsals_manager_delete ON public.sentinela_rehearsals FOR DELETE
  USING (public.can_manage_sentinela_rehearsals(season_id));
