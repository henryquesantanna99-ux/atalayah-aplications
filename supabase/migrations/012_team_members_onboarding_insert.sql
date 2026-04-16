-- Allow members to create their own team member record during onboarding.
CREATE POLICY "team_members_insert_own" ON team_members
  FOR INSERT WITH CHECK (profile_id = auth.uid());
