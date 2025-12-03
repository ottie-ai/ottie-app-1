-- ==========================================
-- Add Minimum Length Constraint for Site Slugs
-- ==========================================
-- This migration ensures that site slugs must be at least 5 characters long.
-- This prevents short slugs that could cause routing conflicts or be confusing.
-- 
-- Requirements:
-- - Slug must be at least 5 characters long
-- - Applies to all sites (published, draft, archived)
-- - Existing sites with shorter slugs will need to be updated manually
-- ==========================================

-- Step 1: Add CHECK constraint to enforce minimum slug length
-- This constraint ensures slug is at least 5 characters
ALTER TABLE public.sites 
ADD CONSTRAINT sites_slug_min_length 
CHECK (length(trim(slug)) >= 5);

-- Step 2: Add comment for documentation
COMMENT ON CONSTRAINT sites_slug_min_length ON public.sites IS 
  'Ensures site slug is at least 5 characters long. This prevents short slugs that could cause routing conflicts.';

-- ==========================================
-- Notes:
-- ==========================================
-- 1. The constraint uses trim() to ensure leading/trailing spaces don't count
-- 2. If you have existing sites with slugs shorter than 4 characters, you'll need to:
--    a. Either update them manually before running this migration
--    b. Or temporarily disable the constraint, update the data, then re-enable it
-- 3. The constraint applies to all sites regardless of status (published, draft, archived)
-- 4. This works together with the unique constraint on (slug, domain) to ensure
--    both uniqueness and minimum length requirements

-- ==========================================
-- Optional: If you need to update existing short slugs first
-- ==========================================
-- Uncomment and run this BEFORE adding the constraint if you have existing short slugs:

-- UPDATE public.sites
-- SET slug = slug || '-site'
-- WHERE length(trim(slug)) < 5
--   AND deleted_at IS NULL;

