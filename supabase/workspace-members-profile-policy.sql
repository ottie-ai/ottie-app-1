-- RLS Policy: Allow workspace members to view each other's profiles
-- This policy allows users to see profiles of other members in the same workspace
-- Required for team management features (viewing team members list)

CREATE POLICY "Workspace members can view each other's profiles" ON profiles
  FOR SELECT
  USING (
    -- User can view their own profile (already covered by existing policy, but included for clarity)
    auth.uid() = id
    OR
    -- User can view profiles of other members in workspaces they belong to
    EXISTS (
      SELECT 1 FROM memberships m1
      INNER JOIN memberships m2 ON m1.workspace_id = m2.workspace_id
      WHERE m1.user_id = auth.uid()  -- Current user is member
      AND m2.user_id = profiles.id   -- Profile belongs to another member
      AND profiles.deleted_at IS NULL -- Don't show deleted profiles
    )
  );

