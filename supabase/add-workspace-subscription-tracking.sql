-- ==========================================
-- ADD WORKSPACE SUBSCRIPTION TRACKING
-- ==========================================
-- Adds fields to track subscription status, seat limits, and grace periods
-- Used to lock workspace when subscription expires or plan is downgraded
-- ==========================================

-- Add subscription tracking fields
ALTER TABLE public.workspaces 
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'active' 
CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'unpaid', 'grace_period')),
ADD COLUMN IF NOT EXISTS seats_limit int DEFAULT 1,
ADD COLUMN IF NOT EXISTS seats_used int DEFAULT 1,
ADD COLUMN IF NOT EXISTS grace_period_ends_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS subscription_locked_at timestamp with time zone;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_workspaces_subscription_status 
ON public.workspaces(subscription_status) 
WHERE subscription_status != 'active';

CREATE INDEX IF NOT EXISTS idx_workspaces_seats_over_limit 
ON public.workspaces(id) 
WHERE seats_used > seats_limit;

-- Add comments
COMMENT ON COLUMN public.workspaces.subscription_status IS 'Subscription status: active, past_due, canceled, unpaid, grace_period';
COMMENT ON COLUMN public.workspaces.seats_limit IS 'Maximum number of active users allowed (from plan)';
COMMENT ON COLUMN public.workspaces.seats_used IS 'Current number of active users';
COMMENT ON COLUMN public.workspaces.grace_period_ends_at IS 'When grace period ends (14 days after payment failure)';
COMMENT ON COLUMN public.workspaces.subscription_locked_at IS 'When workspace was locked due to subscription issues';

