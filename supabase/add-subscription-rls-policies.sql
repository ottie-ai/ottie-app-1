-- ==========================================
-- ADD SUBSCRIPTION-GATED RLS POLICIES
-- ==========================================
-- Adds RLS policies that enforce subscription limits
-- Run this after add-stripe-subscription-id.sql
-- ==========================================

-- Helper function to check if workspace has active subscription
CREATE OR REPLACE FUNCTION public.has_active_subscription(workspace_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  sub_status text;
BEGIN
  SELECT subscription_status INTO sub_status
  FROM public.workspaces
  WHERE id = workspace_uuid;
  
  -- Active or grace period allows access
  RETURN sub_status IN ('active', 'grace_period');
END;
$$;

-- Helper function to check if workspace is within plan limits
CREATE OR REPLACE FUNCTION public.workspace_within_site_limit(workspace_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  current_count int;
  max_allowed int;
  workspace_plan text;
  workspace_status text;
BEGIN
  -- Get workspace plan and status
  SELECT plan, subscription_status INTO workspace_plan, workspace_status
  FROM public.workspaces
  WHERE id = workspace_uuid;
  
  -- If subscription is not active, deny
  IF workspace_status NOT IN ('active', 'grace_period') THEN
    RETURN false;
  END IF;
  
  -- Count active sites (published + draft, exclude archived)
  SELECT count(*) INTO current_count
  FROM public.sites
  WHERE workspace_id = workspace_uuid
    AND deleted_at IS NULL
    AND status IN ('published', 'draft');
  
  -- Get max sites from plan
  SELECT max_sites INTO max_allowed
  FROM public.plans
  WHERE name = COALESCE(workspace_plan, 'free');
  
  -- Check if within limit
  RETURN current_count < max_allowed;
END;
$$;

-- Example policy: Sites creation limited by plan
-- This prevents creating new sites if workspace exceeds plan limit
DROP POLICY IF EXISTS "Sites creation limited by plan" ON public.sites;
CREATE POLICY "Sites creation limited by plan"
ON public.sites FOR INSERT
WITH CHECK (
  public.workspace_within_site_limit(workspace_id)
);

-- Add comment
COMMENT ON FUNCTION public.has_active_subscription IS 'Check if workspace has active subscription (active or grace_period)';
COMMENT ON FUNCTION public.workspace_within_site_limit IS 'Check if workspace is within site creation limit based on plan';

