-- Final fix for delete RLS policies
-- This ensures delete policies work correctly by separating them from update policies

-- ==========================================
-- STEP 1: Drop ALL existing UPDATE policies
-- ==========================================
DROP POLICY IF EXISTS "Owners and admins can update all workspace sites" ON public.sites;
DROP POLICY IF EXISTS "Agents can update their own sites" ON public.sites;
DROP POLICY IF EXISTS "Owners and admins can delete all workspace sites" ON public.sites;
DROP POLICY IF EXISTS "Agents can delete their own sites" ON public.sites;

-- ==========================================
-- STEP 2: Create UPDATE policies (for regular updates, NOT delete)
-- These policies only allow updates where deleted_at stays NULL
-- ==========================================

-- Owners and admins can update all sites (but NOT delete them via this policy)
CREATE POLICY "Owners and admins can update all workspace sites"
ON public.sites
FOR UPDATE
USING (
  deleted_at IS NULL
  AND EXISTS (
    SELECT 1
    FROM memberships m
    WHERE m.workspace_id = sites.workspace_id
      AND m.user_id = (select auth.uid())
      AND m.role IN ('owner', 'admin')
  )
)
WITH CHECK (
  -- Only allow regular updates - deleted_at must stay NULL
  deleted_at IS NULL
);

-- Agents can update their own sites (but NOT delete them via this policy)
CREATE POLICY "Agents can update their own sites"
ON public.sites
FOR UPDATE
USING (
  deleted_at IS NULL
  AND EXISTS (
    SELECT 1
    FROM memberships m
    WHERE m.workspace_id = sites.workspace_id
      AND m.user_id = (select auth.uid())
      AND m.role = 'agent'
  )
  AND (
    sites.creator_id = (select auth.uid())
    OR sites.assigned_agent_id = (select auth.uid())
  )
)
WITH CHECK (
  -- Only allow regular updates - deleted_at must stay NULL
  deleted_at IS NULL
);

-- ==========================================
-- STEP 3: Create DELETE policies (for soft delete only)
-- These policies ONLY allow setting deleted_at to NOT NULL
-- ==========================================

-- Owners and admins can delete all sites
CREATE POLICY "Owners and admins can delete all workspace sites"
ON public.sites
FOR UPDATE
USING (
  deleted_at IS NULL  -- Can only delete non-deleted sites
  AND EXISTS (
    SELECT 1
    FROM memberships m
    WHERE m.workspace_id = sites.workspace_id
      AND m.user_id = (select auth.uid())
      AND m.role IN ('owner', 'admin')
  )
)
WITH CHECK (
  -- ONLY allow soft delete - deleted_at must be NOT NULL
  deleted_at IS NOT NULL
);

-- Agents can delete their own sites
CREATE POLICY "Agents can delete their own sites"
ON public.sites
FOR UPDATE
USING (
  deleted_at IS NULL  -- Can only delete non-deleted sites
  AND EXISTS (
    SELECT 1
    FROM memberships m
    WHERE m.workspace_id = sites.workspace_id
      AND m.user_id = (select auth.uid())
      AND m.role = 'agent'
  )
  AND (
    sites.creator_id = (select auth.uid())
    OR sites.assigned_agent_id = (select auth.uid())
  )
)
WITH CHECK (
  -- ONLY allow soft delete - deleted_at must be NOT NULL
  deleted_at IS NOT NULL
);

-- ==========================================
-- Verification query (run this to check policies)
-- ==========================================
-- SELECT 
--     policyname,
--     cmd,
--     permissive,
--     qual AS using_expression,
--     with_check AS with_check_expression
-- FROM pg_policies
-- WHERE tablename = 'sites'
-- AND cmd = 'UPDATE'
-- ORDER BY policyname;

