-- Add Premium Fonts Feature to Plans
-- 
-- This migration adds a feature flag to the plans table to control
-- whether a plan allows access to premium fonts.
--
-- Run this after: schema.sql

-- Add premium fonts feature column
ALTER TABLE public.plans
ADD COLUMN IF NOT EXISTS feature_premium_fonts boolean DEFAULT false NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.plans.feature_premium_fonts IS 'Whether the plan allows access to premium fonts';

-- Update existing plans (you can customize which plans have this feature)
-- By default, set to false - update manually for plans that should have this feature
-- Example: UPDATE public.plans SET feature_premium_fonts = true WHERE name IN ('agency', 'enterprise');

-- ==========================================
-- NOTES:
-- ==========================================
-- 1. feature_premium_fonts: Boolean flag to enable/disable premium fonts feature per plan
-- 2. Default is false - update plans manually to enable for specific tiers
-- 3. This feature controls access to:
--    - Premium font selection in the builder
--    - Custom font uploads (if applicable)
--    - Advanced typography options
-- 4. Users on plans without this feature will only have access to standard fonts









