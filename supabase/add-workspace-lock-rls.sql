-- ==========================================
-- ADD WORKSPACE LOCK RLS POLICIES
-- ==========================================
-- Updates RLS policies to restrict access based on subscription status
-- - Owners always have access (even when locked)
-- - Active members only have access if workspace is not locked
-- - Inactive/suspended members cannot access
-- ==========================================

-- Drop existing policies if they exist (we'll recreate them)
DROP POLICY IF EXISTS "Active members or owners can access workspace" ON public.memberships;
DROP POLICY IF EXISTS "Access workspace based on subscription" ON public.workspaces;

-- Update memberships RLS: Only active members can access (unless owner)
CREATE POLICY "Active members or owners can access workspace" ON memberships
FOR SELECT USING (
  -- Owner always has access
  EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.workspace_id = memberships.workspace_id
      AND m.user_id = (SELECT auth.uid())
      AND m.role = 'owner'
  )
  OR
  -- Active members have access
  (
    status = 'active'
    AND user_id = (SELECT auth.uid())
  )
);

-- Update workspaces RLS: Check subscription status
-- Note: This policy works with the existing "Access workspaces via membership" policy
-- We add an additional check for subscription status
CREATE POLICY "Access workspace based on subscription" ON workspaces
FOR SELECT USING (
  deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM memberships
    WHERE workspace_id = workspaces.id
      AND user_id = (SELECT auth.uid())
      AND (
        -- Owner always has access (even in locked state)
        role = 'owner'
        OR
        -- Active members only if workspace is not locked
        (
          status = 'active'
          AND (
            subscription_status IN ('active', 'grace_period')
            OR (
              subscription_status IN ('unpaid', 'canceled', 'past_due')
              AND grace_period_ends_at IS NOT NULL
              AND grace_period_ends_at > now()
            )
          )
          AND seats_used <= seats_limit
        )
      )
  )
);

-- Add comment
COMMENT ON POLICY "Active members or owners can access workspace" ON public.memberships IS 
'Allows owners to always access, and active members to access if workspace is not locked';

COMMENT ON POLICY "Access workspace based on subscription" ON public.workspaces IS 
'Restricts workspace access based on subscription status and seat limits';

