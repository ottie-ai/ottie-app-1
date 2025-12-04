-- ==========================================
-- MIGRATE WORKSPACE SUBSCRIPTION LOCK
-- ==========================================
-- Main migration script to initialize subscription tracking
-- Run this after adding the new columns
-- ==========================================

-- Step 1: Initialize seats_limit from plan
-- Set seats_limit based on current plan (default to 1 for free plan)
-- Note: w.plan is sub_plan enum, so we need to cast it to text for comparison
-- Update ALL workspaces to ensure correct seats_limit (not just NULL/0 values)
UPDATE public.workspaces w
SET seats_limit = COALESCE(
  (SELECT max_users FROM public.plans WHERE name = COALESCE(w.plan::text, 'free')),
  1
)
WHERE w.deleted_at IS NULL;

-- Step 2: Initialize seats_used from active memberships
-- Count all memberships (treating all existing as active for migration)
UPDATE public.workspaces w
SET seats_used = (
  SELECT COUNT(*)::int
  FROM public.memberships m
  WHERE m.workspace_id = w.id
    AND (m.status = 'active' OR m.status IS NULL)
);

-- Step 3: Set subscription_status to 'active' for all existing workspaces
UPDATE public.workspaces
SET subscription_status = 'active'
WHERE subscription_status IS NULL;

-- Step 4: Verify migration
-- This query should return 0 rows if migration was successful
SELECT 
  w.id,
  w.name,
  w.plan,
  w.seats_limit,
  w.seats_used,
  w.subscription_status,
  CASE 
    WHEN w.seats_limit IS NULL THEN 'ERROR: seats_limit is NULL'
    WHEN w.seats_used IS NULL THEN 'ERROR: seats_used is NULL'
    WHEN w.subscription_status IS NULL THEN 'ERROR: subscription_status is NULL'
    WHEN w.seats_used > w.seats_limit THEN 'WARNING: Over seat limit'
    ELSE 'OK'
  END as migration_status
FROM public.workspaces w
WHERE w.deleted_at IS NULL
  AND (
    w.seats_limit IS NULL 
    OR w.seats_used IS NULL 
    OR w.subscription_status IS NULL
    OR w.seats_used > w.seats_limit
  );

