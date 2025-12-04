-- Add RLS Policy for Public Access to Published Sites on Brand Domains
-- 
-- This policy allows unauthenticated (public) users to view published sites
-- on verified brand domains (e.g., properties.ottie.ai)
-- 
-- WHY THIS IS NEEDED:
-- - Custom brand domain sites need to be accessible to public users
-- - Existing policy only covers ottie.site domain
-- - Without this policy, brand domain sites return 0 rows
--
-- SECURITY:
-- - Only published sites are accessible (status = 'published')
-- - Only sites with verified brand domains (domain != 'ottie.site')
-- - Only non-deleted sites (deleted_at IS NULL)
--
-- Run this after: add-public-sites-rls-policy.sql

-- Drop policy if it exists (for re-running)
DROP POLICY IF EXISTS "Public can view published sites on brand domains" ON public.sites;

-- Create policy for public access to published sites on brand domains
-- This allows access to sites where domain is NOT 'ottie.site' (i.e., custom brand domains)
CREATE POLICY "Public can view published sites on brand domains"
ON public.sites
FOR SELECT
USING (
  deleted_at IS NULL
  AND status = 'published'
  AND domain != 'ottie.site'
);

-- ==========================================
-- NOTES:
-- ==========================================
-- 1. This policy is PERMISSIVE (default) - it allows access if condition is true
-- 2. It works alongside existing policies (owner/admin/agent policies and ottie.site policy)
-- 3. Unauthenticated users can ONLY read (SELECT), not write/update/delete
-- 4. Only published sites are accessible - drafts remain private
-- 5. Covers ALL custom brand domains (any domain that's not ottie.site)
-- 6. Performance: This policy is simple and fast (no EXISTS subqueries)
-- 7. The brand domain verification is handled by middleware, not by this policy
--    This policy only checks that the domain is not 'ottie.site'
--
-- ==========================================
-- SECURITY CONSIDERATIONS:
-- ==========================================
-- Q: What if someone sets a random domain that's not verified?
-- A: Middleware will not route to the site if domain is not verified in workspace branding_config
--    This policy only ensures database access; middleware controls actual routing
--
-- Q: Why not check if domain is verified in this policy?
-- A: Because verification state is stored in workspaces.branding_config, which would require
--    a JOIN and make the policy much slower. Middleware handles verification check efficiently.
--
-- ==========================================
-- TESTING:
-- ==========================================
-- To test this policy:
-- 1. Set up a verified brand domain in workspace (e.g., properties.ottie.ai)
-- 2. Create/update a site with status='published' and domain='properties.ottie.ai'
-- 3. Visit the site at https://properties.ottie.ai/site-slug
-- 4. Site should load without authentication
-- 5. If you get 403 or redirect to ottie.com, check:
--    - Site status is 'published'
--    - Site domain matches brand domain (not 'ottie.site')
--    - Site deleted_at is NULL
--    - Brand domain is verified in workspace branding_config
--    - This policy is applied in Supabase
--    - DNS is correctly configured and pointing to Vercel
