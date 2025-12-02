-- Sites RLS Policies
-- Drop existing policies first
DROP POLICY IF EXISTS "Access sites based on role" ON public.sites;

-- ==========================================
-- SELECT (View) Policies
-- ==========================================

-- Owners and Admins can view all sites in their workspace
CREATE POLICY "Owners and admins can view all workspace sites"
ON public.sites
FOR SELECT
USING (
  deleted_at IS NULL
  AND EXISTS (
    SELECT 1
    FROM memberships m
    WHERE m.workspace_id = sites.workspace_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'admin')
  )
);

-- Agents can view sites they created or are assigned to
CREATE POLICY "Agents can view their own sites"
ON public.sites
FOR SELECT
USING (
  deleted_at IS NULL
  AND EXISTS (
    SELECT 1
    FROM memberships m
    WHERE m.workspace_id = sites.workspace_id
      AND m.user_id = auth.uid()
      AND m.role = 'agent'
  )
  AND (
    sites.creator_id = auth.uid()
    OR sites.assigned_agent_id = auth.uid()
  )
);

-- ==========================================
-- INSERT (Create) Policies
-- ==========================================

-- Users can create sites in their workspace
CREATE POLICY "Users can create sites in their workspace"
ON public.sites
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM memberships m
    WHERE m.workspace_id = sites.workspace_id
      AND m.user_id = auth.uid()
  )
);

-- ==========================================
-- UPDATE (Edit) Policies
-- ==========================================

-- Owners and admins can update all sites in their workspace
CREATE POLICY "Owners and admins can update all workspace sites"
ON public.sites
FOR UPDATE
USING (
  deleted_at IS NULL
  AND EXISTS (
    SELECT 1
    FROM memberships m
    WHERE m.workspace_id = sites.workspace_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'admin')
  )
);

-- Agents can update sites they created or are assigned to
CREATE POLICY "Agents can update their own sites"
ON public.sites
FOR UPDATE
USING (
  deleted_at IS NULL
  AND EXISTS (
    SELECT 1
    FROM memberships m
    WHERE m.workspace_id = sites.workspace_id
      AND m.user_id = auth.uid()
      AND m.role = 'agent'
  )
  AND (
    sites.creator_id = auth.uid()
    OR sites.assigned_agent_id = auth.uid()
  )
);

-- ==========================================
-- DELETE (Soft Delete) Policies
-- ==========================================

-- Owners and admins can delete all sites in workspace
CREATE POLICY "Owners and admins can delete all workspace sites"
ON public.sites
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM memberships m
    WHERE m.workspace_id = sites.workspace_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'admin')
  )
)
WITH CHECK (
  -- Allow setting deleted_at only
  deleted_at IS NOT NULL
);

-- Agents can delete sites they created or are assigned to
CREATE POLICY "Agents can delete their own sites"
ON public.sites
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM memberships m
    WHERE m.workspace_id = sites.workspace_id
      AND m.user_id = auth.uid()
      AND m.role = 'agent'
  )
  AND (
    sites.creator_id = auth.uid()
    OR sites.assigned_agent_id = auth.uid()
  )
)
WITH CHECK (
  -- Allow setting deleted_at only
  deleted_at IS NOT NULL
);

-- ==========================================
-- Performance Notes
-- ==========================================
-- These policies use EXISTS subqueries which are optimized by PostgreSQL
-- Make sure to run add-performance-indexes.sql for optimal performance
-- Indexes on: memberships(workspace_id, user_id), sites(workspace_id), sites(creator_id), sites(assigned_agent_id)

