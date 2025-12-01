-- RLS Policy: Allow workspace admins/owners to view team member profiles
-- This policy allows only admins and owners to see profiles of other members in the same workspace
-- Required for team management features (viewing team members list)
-- Agents can only see their own profile

-- Drop existing policy if it exists (for idempotency)
DROP POLICY IF EXISTS "Workspace admins can view team member profiles" ON profiles;

CREATE POLICY "Workspace admins can view team member profiles" ON profiles
  FOR SELECT
  USING (
    -- User can view their own profile (already covered by existing policy, but included for clarity)
    auth.uid() = id
    OR
    -- Only admins/owners can view profiles of other members in workspaces they manage
    (
      deleted_at IS NULL
      AND EXISTS (
        SELECT 1 FROM memberships m1
        INNER JOIN memberships m2 ON m1.workspace_id = m2.workspace_id
        WHERE m1.user_id = auth.uid()  -- Current user is member
        AND m1.role IN ('owner', 'admin')  -- Current user is admin/owner
        AND m2.user_id = profiles.id   -- Profile belongs to another member
      )
    )
  );

