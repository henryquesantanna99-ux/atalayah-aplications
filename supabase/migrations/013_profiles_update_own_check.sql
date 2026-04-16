-- Explicitly allow users to update their own profile values during onboarding.
ALTER POLICY "profiles_update_own" ON profiles
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
