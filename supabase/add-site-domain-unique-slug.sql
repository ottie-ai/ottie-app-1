-- ==========================================
-- Add Domain Support and Unique Slug per Domain
-- ==========================================
-- This migration adds domain support to sites table and ensures
-- that each slug is unique per domain for all active sites (published, draft, archived).
-- 
-- Requirements:
-- - Each site must have a unique slug per domain (applies to published, draft, archived)
-- - Default domain is 'ottie.site' for ALL sites (draft, published, archived)
-- - Future-proof: supports custom domains (subdomain or main domain)
-- - Soft-deleted sites (deleted_at IS NOT NULL) release their slug for reuse
-- ==========================================

-- Step 1: Add domain column to sites table with default value
-- Default is 'ottie.site' for all sites (both new and existing)
ALTER TABLE public.sites 
ADD COLUMN IF NOT EXISTS domain text DEFAULT 'ottie.site';

-- Step 2: Set default domain for ALL existing sites
-- All sites (draft, published, archived) get 'ottie.site' as default domain
UPDATE public.sites 
SET domain = 'ottie.site'
WHERE domain IS NULL;

-- Step 3: Override domain for sites with custom_domain
-- If a site has a custom_domain, extract the base domain from it
-- For example: 'example.com' -> 'example.com', 'subdomain.example.com' -> 'example.com'
UPDATE public.sites 
SET domain = CASE 
  WHEN custom_domain ~ '^[^.]+\.[^.]+\.' THEN
    -- Has subdomain: extract base domain (e.g., 'subdomain.example.com' -> 'example.com')
    regexp_replace(custom_domain, '^[^.]+\.(.+)$', '\1')
  ELSE
    -- No subdomain: use as-is (e.g., 'example.com' -> 'example.com')
    custom_domain
END
WHERE custom_domain IS NOT NULL;

-- Step 4: Remove old unique constraint (workspace_id, slug)
-- We're replacing it with domain-based uniqueness
ALTER TABLE public.sites 
DROP CONSTRAINT IF EXISTS sites_workspace_id_slug_key;

-- Step 5: Create partial unique index for all active sites
-- This ensures slug is unique per domain for published, draft, and archived sites
-- Soft-deleted sites (deleted_at IS NOT NULL) are excluded, so their slug is released
CREATE UNIQUE INDEX IF NOT EXISTS sites_slug_domain_unique_active
ON public.sites (slug, domain)
WHERE deleted_at IS NULL
  AND domain IS NOT NULL;

-- Step 6: Add comment for documentation
COMMENT ON COLUMN public.sites.domain IS 
  'Domain where the site is hosted. Default is ''ottie.site'' for all sites (draft, published, archived). For custom domains, this stores the base domain (e.g., ''example.com''). Slug must be unique per domain for all active sites (published, draft, archived). Soft-deleted sites release their slug for reuse.';

-- ==========================================
-- Notes:
-- ==========================================
-- 1. All sites (draft, published, archived) default to domain = 'ottie.site'
-- 2. The unique constraint applies to ALL active sites (published, draft, archived)
-- 3. Slug must be unique per domain across all statuses (no duplicates allowed)
-- 4. Soft-deleted sites (deleted_at IS NOT NULL) are excluded from uniqueness check
--    This means when a site is deleted, its slug is released and can be reused
-- 5. Custom domains: When custom_domain is set, domain is automatically set to the base domain
--    Example: custom_domain = 'subdomain.example.com' -> domain = 'example.com'
-- 6. Future: When users set custom domains, update both custom_domain and domain fields
-- 7. The index automatically handles soft-deleted sites (excluded from uniqueness check)

