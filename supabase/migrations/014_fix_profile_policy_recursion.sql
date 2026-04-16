-- Avoid recursive RLS checks when policies need to inspect the current profile.
CREATE OR REPLACE FUNCTION public.current_user_is_active()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

ALTER POLICY "profiles_select_active_members" ON profiles
  USING (public.current_user_is_active());

ALTER POLICY "profiles_admin_all" ON profiles
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

ALTER POLICY "team_members_read_active" ON team_members
  USING (public.current_user_is_active());

ALTER POLICY "team_members_admin_all" ON team_members
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

ALTER POLICY "events_read_active" ON events
  USING (public.current_user_is_active());

ALTER POLICY "events_admin_all" ON events
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

ALTER POLICY "event_members_read_active" ON event_members
  USING (public.current_user_is_active());

ALTER POLICY "event_members_admin_all" ON event_members
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

ALTER POLICY "setlist_read_active" ON setlist_songs
  USING (public.current_user_is_active());

ALTER POLICY "setlist_admin_all" ON setlist_songs
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

ALTER POLICY "schedules_read_active" ON schedules
  USING (public.current_user_is_active());

ALTER POLICY "schedules_admin_all" ON schedules
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

ALTER POLICY "communion_read_active" ON communion_posts
  USING (public.current_user_is_active());

ALTER POLICY "communion_insert_active" ON communion_posts
  WITH CHECK (
    auth.uid() = author_id AND
    public.current_user_is_active()
  );

ALTER POLICY "communion_admin_all" ON communion_posts
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

ALTER POLICY "chat_read_active" ON chat_messages
  USING (public.current_user_is_active());

ALTER POLICY "chat_insert_active" ON chat_messages
  WITH CHECK (
    auth.uid() = author_id AND
    public.current_user_is_active()
  );

ALTER POLICY "chat_admin_delete" ON chat_messages
  USING (public.current_user_is_admin());

ALTER POLICY "laia_usage_admin_read" ON laia_usage
  USING (public.current_user_is_admin());

-- Bootstrap safety: if no admin exists yet, promote the oldest profile.
UPDATE public.profiles
SET role = 'admin',
    status = 'active'
WHERE id = (
  SELECT id
  FROM public.profiles
  ORDER BY created_at ASC
  LIMIT 1
)
AND NOT EXISTS (
  SELECT 1
  FROM public.profiles
  WHERE role = 'admin'
);
