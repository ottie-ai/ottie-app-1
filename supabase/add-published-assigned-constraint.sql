-- Add constraint: Site cannot be published if unassigned (assigned_agent_id IS NULL)
-- This ensures business rule: published sites must have an assigned agent

-- ==========================================
-- STEP 1: Add CHECK constraint to sites table
-- ==========================================

-- Drop existing constraint if it exists
ALTER TABLE public.sites 
DROP CONSTRAINT IF EXISTS sites_published_must_be_assigned;

-- Add constraint: If status is 'published', assigned_agent_id must NOT be NULL
ALTER TABLE public.sites
ADD CONSTRAINT sites_published_must_be_assigned
CHECK (
  -- If status is published, assigned_agent_id must be set
  (status != 'published' OR assigned_agent_id IS NOT NULL)
);

-- ==========================================
-- STEP 2: Create trigger function to validate on update
-- ==========================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS validate_published_assigned();

-- Create function to validate published sites have assigned agent
CREATE OR REPLACE FUNCTION validate_published_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If site is being published (status = 'published'), ensure assigned_agent_id is set
  IF NEW.status = 'published' AND NEW.assigned_agent_id IS NULL THEN
    RAISE EXCEPTION 'Site cannot be published without an assigned agent. Please assign an agent before publishing.';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS sites_validate_published_assigned ON public.sites;

-- Create trigger that runs before INSERT or UPDATE
CREATE TRIGGER sites_validate_published_assigned
BEFORE INSERT OR UPDATE ON public.sites
FOR EACH ROW
EXECUTE FUNCTION validate_published_assigned();

-- ==========================================
-- Notes:
-- ==========================================
-- 1. CHECK constraint prevents invalid data at database level
-- 2. Trigger provides better error message for users
-- 3. Both work together to ensure data integrity
-- 4. If you try to publish a site without assigned_agent_id, you'll get an error

