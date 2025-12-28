-- ==========================================
-- ADD STRIPE SUBSCRIPTION FIELDS
-- ==========================================
-- Adds fields to track Stripe subscription details
-- Run this migration after add-workspace-subscription-tracking.sql
-- ==========================================

-- Add Stripe subscription tracking fields
ALTER TABLE public.workspaces 
ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
ADD COLUMN IF NOT EXISTS stripe_price_id text,
ADD COLUMN IF NOT EXISTS subscription_period_end timestamp with time zone,
ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS trial_used_at timestamp with time zone;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_workspaces_stripe_subscription 
ON public.workspaces(stripe_subscription_id) 
WHERE stripe_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workspaces_stripe_customer 
ON public.workspaces(stripe_customer_id) 
WHERE stripe_customer_id IS NOT NULL;

-- Add comments
COMMENT ON COLUMN public.workspaces.stripe_subscription_id IS 'Stripe subscription ID (sub_...)';
COMMENT ON COLUMN public.workspaces.stripe_price_id IS 'Current Stripe price ID (price_...)';
COMMENT ON COLUMN public.workspaces.subscription_period_end IS 'When current subscription period ends';
COMMENT ON COLUMN public.workspaces.cancel_at_period_end IS 'Whether subscription will cancel at period end';
COMMENT ON COLUMN public.workspaces.trial_used_at IS 'When trial was used (null if never used)';

