-- Add Password Protection Feature to Plans
-- 
-- This migration adds a feature flag to the plans table to control
-- whether a plan allows password protection on sites.
--
-- Run this after: schema.sql

-- Add password protection feature column
ALTER TABLE public.plans
ADD COLUMN IF NOT EXISTS feature_password_protection boolean DEFAULT false NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.plans.feature_password_protection IS 'Whether the plan allows password protection on sites';

-- Update existing plans (you can customize which plans have this feature)
-- By default, set to false - update manually for plans that should have this feature
-- Example: UPDATE public.plans SET feature_password_protection = true WHERE name IN ('growth', 'agency', 'enterprise');

-- ==========================================
-- NOTES:
-- ==========================================
-- 1. feature_password_protection: Boolean flag to enable/disable password protection feature per plan
-- 2. Default is false - update plans manually to enable for specific tiers
-- 3. This feature controls access to:
--    - Setting passwords on sites
--    - Changing passwords on sites
--    - Removing passwords from sites
-- 4. Sites that already have passwords set will continue to work, but users on plans without
--    this feature won't be able to modify password settings

