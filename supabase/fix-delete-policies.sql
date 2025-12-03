-- Fix Delete Policies to ensure they work correctly
-- The issue is that regular UPDATE policies check deleted_at IS NULL in USING
-- but don't have WITH CHECK, which causes conflicts with delete policies.
-- We need to update both regular UPDATE policies and delete policies.

-- Drop existing policies
DROP POLICY IF EXISTS "Owners and admins can update all workspace sites" ON public.sites;
DROP POLICY IF EXISTS "Agents can update their own sites" ON public.sites;
DROP POLICY IF EXISTS "Owners and admins can delete all workspace sites" ON public.sites;
DROP POLICY IF EXISTS "Agents can delete their own sites" ON public.sites;

-- ==========================================
-- UPDATE Policies - FIXED (allow both regular updates and soft delete)
-- ==========================================

-- Owners and admins can update all sites in workspace
-- WITH CHECK allows both regular updates (deleted_at IS NULL) and soft delete (deleted_at IS NOT NULL)
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
  -- Allow both regular updates (deleted_at stays NULL) and soft delete (deleted_at becomes NOT NULL)
  deleted_at IS NULL OR deleted_at IS NOT NULL
);

-- Agents can update sites they created or are assigned to
-- WITH CHECK allows both regular updates (deleted_at IS NULL) and soft delete (deleted_at IS NOT NULL)
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
  -- Allow both regular updates (deleted_at stays NULL) and soft delete (deleted_at becomes NOT NULL)
  deleted_at IS NULL OR deleted_at IS NOT NULL
);

-- ==========================================
-- DELETE (Soft Delete) Policies - FIXED
-- ==========================================

-- Owners and admins can delete all sites in workspace
-- IMPORTANT: Must check deleted_at IS NULL in USING to allow the update
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
-- IMPORTANT: Must check deleted_at IS NULL in USING to allow the update
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
-- 1. The USING clause checks permissions BEFORE the update
-- 2. The WITH CHECK clause validates the data AFTER the update
-- 3. We need deleted_at IS NULL in USING to allow the update to proceed
-- 4. We need deleted_at IS NOT NULL in WITH CHECK to ensure soft delete happened
-- 5. This ensures only non-deleted sites can be deleted, and the result is a deleted site

