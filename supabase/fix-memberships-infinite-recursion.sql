-- ==========================================
-- FIX INFINITE RECURSION IN MEMBERSHIPS RLS
-- ==========================================
-- Problem: Policy "Active members or owners can access workspace" causes
-- infinite recursion because it queries memberships table within memberships policy
-- 
-- Solution: Use security definer function that bypasses RLS
-- ==========================================

-- Drop existing problematic policy
DROP POLICY IF EXISTS "Active members or owners can access workspace" ON public.memberships;
DROP POLICY IF EXISTS "View team members" ON public.memberships;

-- Create security definer function that bypasses RLS
-- This function can check memberships without triggering RLS policies
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

-- Create security definer function to check if user is owner/admin
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

-- Create new policy that uses security definer function (bypasses RLS)
CREATE POLICY "View team members" ON public.memberships
FOR SELECT USING (
  -- User can see their own membership
  user_id = (SELECT auth.uid())
  OR
  -- User can see memberships in workspaces they have access to
  public.check_user_workspace_access(workspace_id, (SELECT auth.uid()))
);

-- Add comment
COMMENT ON FUNCTION public.check_user_workspace_access(uuid, uuid) IS 
'Security definer function to check workspace access without RLS recursion';
COMMENT ON FUNCTION public.check_user_is_owner_or_admin(uuid, uuid) IS 
'Security definer function to check owner/admin role without RLS recursion';

