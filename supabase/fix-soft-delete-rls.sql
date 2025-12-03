-- Fix Soft Delete RLS Policies
-- IMPORTANT: We're doing SOFT DELETE (UPDATE deleted_at), not DELETE
-- The issue is that UPDATE needs to pass both SELECT policy (to find the row) 
-- and UPDATE policy (to modify it)

-- ==========================================
-- STEP 1: Drop ALL existing UPDATE policies
-- ==========================================
DROP POLICY IF EXISTS "Owners and admins can update all workspace sites" ON public.sites;
DROP POLICY IF EXISTS "Agents can update their own sites" ON public.sites;
DROP POLICY IF EXISTS "Owners and admins can delete all workspace sites" ON public.sites;
DROP POLICY IF EXISTS "Agents can delete their own sites" ON public.sites;

-- ==========================================
-- STEP 2: Create unified UPDATE policies that handle BOTH regular updates AND soft delete
-- ==========================================

-- Owners and admins can update all sites (including soft delete)
-- This policy allows both:
-- - Regular updates (deleted_at stays NULL)
-- - Soft delete (deleted_at becomes NOT NULL)
CREATE POLICY "Owners and admins can update all workspace sites"
ON public.sites
FOR UPDATE
USING (
  deleted_at IS NULL  -- Can only update non-deleted sites
  AND EXISTS (
    SELECT 1
    FROM memberships m
    WHERE m.workspace_id = sites.workspace_id
      AND m.user_id = (select auth.uid())
      AND m.role IN ('owner', 'admin')
  )
)
WITH CHECK (
  -- Allow both regular updates AND soft delete
  -- Regular update: deleted_at stays NULL
  -- Soft delete: deleted_at becomes NOT NULL
  (deleted_at IS NULL OR deleted_at IS NOT NULL)
  AND EXISTS (
    SELECT 1
    FROM memberships m
    WHERE m.workspace_id = sites.workspace_id
      AND m.user_id = (select auth.uid())
      AND m.role IN ('owner', 'admin')
  )
);

-- Agents can update their own sites (including soft delete)
-- This policy allows both:
-- - Regular updates (deleted_at stays NULL)
-- - Soft delete (deleted_at becomes NOT NULL)
CREATE POLICY "Agents can update their own sites"
ON public.sites
FOR UPDATE
USING (
  deleted_at IS NULL  -- Can only update non-deleted sites
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
  -- Allow both regular updates AND soft delete
  -- Regular update: deleted_at stays NULL
  -- Soft delete: deleted_at becomes NOT NULL
  (deleted_at IS NULL OR deleted_at IS NOT NULL)
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
);

-- ==========================================
-- Notes:
-- ==========================================
-- 1. We use a SINGLE policy for both regular updates and soft delete
-- 2. USING clause: deleted_at IS NULL (can only update non-deleted sites)
-- 3. WITH CHECK: (deleted_at IS NULL OR deleted_at IS NOT NULL) - allows both
-- 4. This avoids conflicts between separate UPDATE and DELETE policies
-- 5. The membership check is in both USING and WITH CHECK for security

