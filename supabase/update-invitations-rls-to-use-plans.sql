-- ==========================================
-- UPDATE INVITATIONS RLS POLICY TO USE PLANS TABLE
-- ==========================================
-- This migration updates the invitations RLS policy to use
-- the plans table as single source of truth for multi-user access.
-- Instead of hardcoded plan names, it checks plans.max_users > 1
-- ==========================================

-- Drop the old policy
DROP POLICY IF EXISTS "Admins manage invitations" ON invitations;

-- Create updated policy that uses plans table
-- This makes the plans table the single source of truth for multi-user functionality
CREATE POLICY "Admins manage invitations" ON invitations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM memberships m
      JOIN workspaces w ON w.id = m.workspace_id
      JOIN plans p ON p.name = COALESCE(w.plan::text, 'free')
      WHERE m.workspace_id = invitations.workspace_id
      AND m.user_id = (SELECT auth.uid())
      AND m.role IN ('owner', 'admin')
      AND p.max_users > 1  -- Only multi-user plans can manage invitations
    )
  );

-- Verify the policy was created
-- SELECT * FROM pg_policies WHERE tablename = 'invitations';







