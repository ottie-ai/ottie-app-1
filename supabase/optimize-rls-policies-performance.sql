-- ==========================================
-- Optimize RLS Policies Performance
-- ==========================================
-- This migration optimizes all RLS policies by wrapping auth.uid() and auth.jwt()
-- calls in (select ...) to ensure they're evaluated once per query, not per row.
-- 
-- This fixes the "Auth RLS Initialization Plan" warnings from Performance Advisor.
-- ==========================================

-- PROFILES
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles 
  FOR SELECT USING ((select auth.uid()) = id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles 
  FOR UPDATE USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
CREATE POLICY "Users can delete own profile" ON public.profiles 
  FOR DELETE USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Workspace admins can view team member profiles" ON public.profiles;
CREATE POLICY "Workspace admins can view team member profiles" ON public.profiles
  FOR SELECT USING (
    (select auth.uid()) = id 
    OR (
      deleted_at IS NULL 
      AND EXISTS (
        SELECT 1
        FROM memberships m1
        JOIN memberships m2 ON m1.workspace_id = m2.workspace_id
        WHERE m1.user_id = (select auth.uid())
          AND m1.role IN ('owner', 'admin')
          AND m2.user_id = profiles.id
      )
    )
  );

-- WORKSPACES
DROP POLICY IF EXISTS "Access workspaces via membership" ON public.workspaces;
CREATE POLICY "Access workspaces via membership" ON public.workspaces
  FOR SELECT USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM memberships
      WHERE workspace_id = workspaces.id
        AND user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Owners can update workspace" ON public.workspaces;
CREATE POLICY "Owners can update workspace" ON public.workspaces
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE workspace_id = workspaces.id
        AND user_id = (select auth.uid())
        AND role = 'owner'
    )
  );

-- MEMBERSHIPS
DROP POLICY IF EXISTS "Update own activity" ON public.memberships;
CREATE POLICY "Update own activity" ON public.memberships
  FOR UPDATE USING (user_id = (select auth.uid()));

-- Create security definer functions (if not exists)
CREATE OR REPLACE FUNCTION public.check_user_workspace_access(
  p_workspace_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.memberships
    WHERE workspace_id = p_workspace_id
      AND user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.check_user_is_owner_or_admin(
  p_workspace_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.memberships
    WHERE workspace_id = p_workspace_id
      AND user_id = p_user_id
      AND role IN ('owner', 'admin')
  );
$$;

DROP POLICY IF EXISTS "Owners/admins can create memberships" ON public.memberships;
CREATE POLICY "Owners/admins can create memberships" ON public.memberships
  FOR INSERT WITH CHECK (
    public.check_user_is_owner_or_admin(workspace_id, (select auth.uid()))
    OR NOT EXISTS (
      SELECT 1 FROM memberships memberships_1
      WHERE memberships_1.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Owners/admins can update memberships" ON public.memberships;
CREATE POLICY "Owners/admins can update memberships" ON public.memberships
  FOR UPDATE USING (
    public.check_user_is_owner_or_admin(workspace_id, (select auth.uid()))
  );

DROP POLICY IF EXISTS "Owners/admins can delete memberships" ON public.memberships;
CREATE POLICY "Owners/admins can delete memberships" ON public.memberships
  FOR DELETE USING (
    public.check_user_is_owner_or_admin(workspace_id, (select auth.uid()))
    OR user_id = (select auth.uid())
  );

-- Update function to use optimized auth.uid()
CREATE OR REPLACE FUNCTION public.user_has_workspace_access(ws_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE workspace_id = ws_id
    AND user_id = (select auth.uid())
  );
$$;

-- INVITATIONS
DROP POLICY IF EXISTS "Admins manage invitations" ON public.invitations;
CREATE POLICY "Admins manage invitations" ON public.invitations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM memberships m
      JOIN workspaces w ON w.id = m.workspace_id
      WHERE m.workspace_id = invitations.workspace_id
        AND m.user_id = (select auth.uid())
        AND m.role IN ('owner', 'admin')
        AND w.plan IN ('agency', 'enterprise')
    )
  );

DROP POLICY IF EXISTS "Read invitation by token" ON public.invitations;
CREATE POLICY "Read invitation by token" ON public.invitations 
  FOR SELECT USING (
    ((select auth.jwt()) ->> 'email') = email 
    OR EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.workspace_id = invitations.workspace_id
        AND m.user_id = (select auth.uid())
        AND m.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can accept own invitation" ON public.invitations;
CREATE POLICY "Users can accept own invitation" ON public.invitations
  FOR UPDATE USING (
    ((select auth.jwt()) ->> 'email') = email
    AND status = 'pending'
    AND expires_at > now()
  )
  WITH CHECK (
    status = 'accepted'
    AND ((select auth.jwt()) ->> 'email') = email
  );

-- INTEGRATIONS
DROP POLICY IF EXISTS "Admins manage integrations" ON public.integrations;
CREATE POLICY "Admins manage integrations" ON public.integrations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.workspace_id = integrations.workspace_id
        AND m.user_id = (select auth.uid())
        AND m.role IN ('owner', 'admin')
    )
  );

-- SITES (Note: Sites policies are in sites-rls-policies.sql, but we'll update them here too)
DROP POLICY IF EXISTS "Owners and admins can view all workspace sites" ON public.sites;
CREATE POLICY "Owners and admins can view all workspace sites" ON public.sites
  FOR SELECT USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM memberships m
      WHERE m.workspace_id = sites.workspace_id
        AND m.user_id = (select auth.uid())
        AND m.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Agents can view their own sites" ON public.sites;
CREATE POLICY "Agents can view their own sites" ON public.sites
  FOR SELECT USING (
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
  );

DROP POLICY IF EXISTS "Users can create sites in their workspace" ON public.sites;
CREATE POLICY "Users can create sites in their workspace" ON public.sites
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM memberships m
      WHERE m.workspace_id = sites.workspace_id
        AND m.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Owners and admins can update all workspace sites" ON public.sites;
CREATE POLICY "Owners and admins can update all workspace sites" ON public.sites
  FOR UPDATE USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM memberships m
      WHERE m.workspace_id = sites.workspace_id
        AND m.user_id = (select auth.uid())
        AND m.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Agents can update their own sites" ON public.sites;
CREATE POLICY "Agents can update their own sites" ON public.sites
  FOR UPDATE USING (
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
  );

DROP POLICY IF EXISTS "Owners and admins can delete all workspace sites" ON public.sites;
CREATE POLICY "Owners and admins can delete all workspace sites" ON public.sites
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM memberships m
      WHERE m.workspace_id = sites.workspace_id
        AND m.user_id = (select auth.uid())
        AND m.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    deleted_at IS NOT NULL
  );

DROP POLICY IF EXISTS "Agents can delete their own sites" ON public.sites;
CREATE POLICY "Agents can delete their own sites" ON public.sites
  FOR UPDATE USING (
    EXISTS (
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
    deleted_at IS NOT NULL
  );

-- ==========================================
-- Notes:
-- ==========================================
-- 1. All auth.uid() calls are now wrapped in (select auth.uid())
-- 2. All auth.jwt() calls are now wrapped in (select auth.jwt())
-- 3. This ensures these functions are evaluated once per query, not per row
-- 4. This significantly improves performance for queries that scan many rows
-- 5. Multiple permissive policies warnings are expected and acceptable
--    - They allow different access patterns (e.g., owners vs agents)
--    - PostgreSQL optimizes these efficiently with proper indexes

