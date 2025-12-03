-- ==========================================
-- MERGE CUSTOM_DOMAIN INTO DOMAIN COLUMN
-- ==========================================
-- This migration merges custom_domain into domain column
-- Logic: domain defaults to 'ottie.site', but if custom_domain exists, 
-- it replaces the domain value. Then we remove custom_domain column.
-- Run this SQL in your Supabase SQL Editor
-- ==========================================

-- Step 1: Migrate custom_domain values to domain column
-- If a site has custom_domain, use it as the domain (full domain, not just base)
-- For custom domains, we store the full domain (e.g., 'example.com' or 'subdomain.example.com')
UPDATE public.sites
SET domain = custom_domain
WHERE custom_domain IS NOT NULL
  AND custom_domain != '';

-- Step 2: Remove unique constraint from custom_domain (if it exists)
-- We'll use domain for uniqueness instead
ALTER TABLE public.sites 
DROP CONSTRAINT IF EXISTS sites_custom_domain_key;

-- Step 3: Drop the custom_domain column
ALTER TABLE public.sites 
DROP COLUMN IF EXISTS custom_domain;

-- Step 4: Update the unique index to use domain instead
-- The existing index sites_slug_domain_unique_active should already handle this
-- But let's make sure domain has proper constraints
-- Domain should be NOT NULL with default 'ottie.site'
ALTER TABLE public.sites 
ALTER COLUMN domain SET DEFAULT 'ottie.site',
ALTER COLUMN domain SET NOT NULL;

-- Step 5: Ensure all sites have a domain (set default for any NULLs)
UPDATE public.sites
SET domain = 'ottie.site'
WHERE domain IS NULL;

-- Step 6: Update comment for documentation
COMMENT ON COLUMN public.sites.domain IS 
  'Domain where the site is hosted. Default is ''ottie.site'' for all sites. Can be set to custom domain (e.g., ''example.com'' or ''subdomain.example.com''). Slug must be unique per domain for all active sites (published, draft, archived).';

-- ==========================================
-- Verification
-- ==========================================
-- Run this query to verify the migration:
-- SELECT id, title, slug, domain, status 
-- FROM public.sites 
-- ORDER BY created_at DESC 
-- LIMIT 10;

