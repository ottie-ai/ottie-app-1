-- ==========================================
-- ADD MEMBERSHIP STATUS
-- ==========================================
-- Adds status column to memberships table to track active/inactive/suspended members
-- This is used when workspace subscription expires or plan is downgraded
-- ==========================================

-- Add status column to memberships table
ALTER TABLE public.memberships 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' 
CHECK (status IN ('active', 'inactive', 'suspended'));

-- Add index for performance (only index non-active members)
CREATE INDEX IF NOT EXISTS idx_memberships_status 
ON public.memberships(status) 
WHERE status != 'active';

-- Set all existing memberships to active (migration)
UPDATE public.memberships
SET status = 'active'
WHERE status IS NULL;

-- Add comment
COMMENT ON COLUMN public.memberships.status IS 'Membership status: active (can access), inactive (lost access due to plan), suspended (temporarily disabled)';

