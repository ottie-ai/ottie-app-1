-- Verify and Fix Delete Policies
-- This script checks current policies and ensures delete policies work correctly

-- ==========================================
-- STEP 1: Check current policies
-- ==========================================
SELECT 
    policyname,
    cmd,
    permissive,
    qual AS using_expression,
    with_check AS with_check_expression
FROM pg_policies
WHERE tablename = 'sites'
AND cmd = 'UPDATE'
ORDER BY policyname;

-- ==========================================
-- STEP 2: Drop ALL UPDATE policies to start fresh
-- ==========================================
DROP POLICY IF EXISTS "Owners and admins can update all workspace sites" ON public.sites;
DROP POLICY IF EXISTS "Agents can update their own sites" ON public.sites;
DROP POLICY IF EXISTS "Owners and admins can delete all workspace sites" ON public.sites;
DROP POLICY IF EXISTS "Agents can delete their own sites" ON public.sites;

-- ==========================================
-- STEP 3: Create UPDATE policies (for regular updates, NOT delete)
-- ==========================================

-- Owners and admins can update all sites in workspace (regular updates only)
CREATE POLICY "Owners and admins can update all workspace sites"
ON public.sites
FOR UPDATE
USING (
  deleted_at IS NULL  -- Only allow updating non-deleted sites
  AND EXISTS (
    SELECT 1
    FROM memberships m
    WHERE m.workspace_id = sites.workspace_id
      AND m.user_id = (select auth.uid())
      AND m.role IN ('owner', 'admin')
  )
)
WITH CHECK (
  -- Only allow regular updates (deleted_at must stay NULL)
  deleted_at IS NULL
);

-- Agents can update sites they created or are assigned to (regular updates only)
CREATE POLICY "Agents can update their own sites"
ON public.sites
FOR UPDATE
USING (
  deleted_at IS NULL  -- Only allow updating non-deleted sites
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
  -- Only allow regular updates (deleted_at must stay NULL)
  deleted_at IS NULL
);

-- ==========================================
-- STEP 4: Create DELETE policies (separate, for soft delete only)
-- ==========================================

-- Owners and admins can delete all sites in workspace
CREATE POLICY "Owners and admins can delete all workspace sites"
ON public.sites
FOR UPDATE
USING (
  deleted_at IS NULL  -- Only allow deleting sites that aren't already deleted
  AND EXISTS (
    SELECT 1
    FROM memberships m
    WHERE m.workspace_id = sites.workspace_id
      AND m.user_id = (select auth.uid())
      AND m.role IN ('owner', 'admin')
  )
)
WITH CHECK (
  -- After update, deleted_at must be set (soft delete)
  deleted_at IS NOT NULL
);

-- Agents can delete sites they created or are assigned to
CREATE POLICY "Agents can delete their own sites"
ON public.sites
FOR UPDATE
USING (
  deleted_at IS NULL  -- Only allow deleting sites that aren't already deleted
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
  -- After update, deleted_at must be set (soft delete)
  deleted_at IS NOT NULL
);

-- ==========================================
-- Notes:
-- ==========================================
-- 1. Regular UPDATE policies have WITH CHECK (deleted_at IS NULL) - they don't allow soft delete
-- 2. DELETE policies have WITH CHECK (deleted_at IS NOT NULL) - they only allow soft delete
-- 3. Both types of policies can coexist because they have different WITH CHECK conditions
-- 4. PostgreSQL will use the policy that matches the WITH CHECK condition

