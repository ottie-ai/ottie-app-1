-- Add RLS Policy for Public Access to Published Sites
-- 
-- This policy allows unauthenticated (public) users to view published sites
-- on ottie.site subdomain (e.g., testujem.ottie.site)
-- 
-- WHY THIS IS NEEDED:
-- - Client site pages (e.g., testujem.ottie.site) are accessed by anonymous users
-- - Existing RLS policies require authenticated users (auth.uid())
-- - Without this policy, public sites return 0 rows and redirect to ottie.com
--
-- SECURITY:
-- - Only published sites are accessible (status = 'published')
-- - Only sites on ottie.site domain (not custom domains yet)
-- - Only non-deleted sites (deleted_at IS NULL)
--
-- Run this after: sites-rls-policies.sql or optimize-rls-policies-performance.sql

-- Drop policy if it exists (for re-running)
DROP POLICY IF EXISTS "Public can view published sites on ottie.site" ON public.sites;

-- Create policy for public access to published sites
CREATE POLICY "Public can view published sites on ottie.site"
ON public.sites
FOR SELECT
USING (
  deleted_at IS NULL
  AND status = 'published'
  AND domain = 'ottie.site'
);

-- ==========================================
-- NOTES:
-- ==========================================
-- 1. This policy is PERMISSIVE (default) - it allows access if condition is true
-- 2. It works alongside existing policies (owner/admin/agent policies)
-- 3. Unauthenticated users can ONLY read (SELECT), not write/update/delete
-- 4. Only published sites are accessible - drafts remain private
-- 5. Only sites on ottie.site domain - custom domains will need separate handling
-- 6. Performance: This policy is simple and fast (no EXISTS subqueries)
-- 7. Index: Make sure there's an index on (domain, status, deleted_at) for performance
--    (see add-performance-indexes.sql)

-- ==========================================
-- TESTING:
-- ==========================================
-- To test this policy:
-- 1. Create a site with status='published' and domain='ottie.site'
-- 2. Visit the site at https://{slug}.ottie.site
-- 3. Site should load without authentication
-- 4. If you get 403 or redirect to ottie.com, check:
--    - Site status is 'published'
--    - Site domain is 'ottie.site'
--    - Site deleted_at is NULL
--    - This policy is applied in Supabase

-- ==========================================
-- PERFORMANCE INDEX (if not already exists):
-- ==========================================
-- This index helps the policy perform efficiently:
CREATE INDEX IF NOT EXISTS idx_sites_public_access 
ON public.sites (domain, status, deleted_at)
WHERE deleted_at IS NULL AND status = 'published';

