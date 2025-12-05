-- ==========================================
-- FIX: Brand Domain RLS Security Enhancement
-- ==========================================
-- This update adds workspace verification to brand domain RLS policy
-- to provide a second layer of security beyond middleware verification.
--
-- PROBLEM:
-- The original policy only checked domain != 'ottie.site' which could allow
-- access if someone manages to set a custom domain without proper verification.
--
-- SOLUTION:
-- Add a check that the site's workspace has a verified brand domain
-- that matches the site's domain.
-- ==========================================

-- Drop old policy
DROP POLICY IF EXISTS "Public can view published sites on brand domains" ON public.sites;

-- Create enhanced policy with workspace verification
-- This policy checks that:
-- 1. Site is not deleted
-- 2. Site is published
-- 3. Site has a custom domain (not ottie.site)
-- 4. The site's workspace has a verified brand domain that matches the site's domain
CREATE POLICY "Public can view published sites on brand domains"
ON public.sites
FOR SELECT
USING (
  deleted_at IS NULL
  AND status = 'published'
  AND domain != 'ottie.site'
  AND EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = sites.workspace_id
    AND w.deleted_at IS NULL
    AND (w.branding_config->>'custom_brand_domain') = sites.domain
    AND (w.branding_config->>'custom_brand_domain_verified') = 'true'
  )
);

-- Add index to improve policy performance
-- This helps with the EXISTS subquery
CREATE INDEX IF NOT EXISTS idx_workspaces_brand_domain_lookup 
ON public.workspaces ((branding_config->>'custom_brand_domain'), (branding_config->>'custom_brand_domain_verified'))
WHERE deleted_at IS NULL;

-- ==========================================
-- NOTES:
-- ==========================================
-- 1. This provides defense-in-depth - even if middleware is bypassed,
--    RLS will still prevent unauthorized access
-- 2. The EXISTS subquery ensures workspace has verified domain
-- 3. Domain must match exactly between site and workspace
-- 4. Performance impact is minimal with proper indexing
-- ==========================================
