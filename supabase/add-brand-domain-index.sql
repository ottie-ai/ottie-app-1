-- ==========================================
-- Add Index for Brand Domain Lookup
-- ==========================================
-- This migration adds a GIN index on branding_config->custom_brand_domain
-- to enable fast lookup of workspaces by brand domain in middleware
-- ==========================================

-- Create GIN index for fast brand domain lookup
-- This allows efficient queries like: WHERE branding_config->>'custom_brand_domain' = 'example.com'
CREATE INDEX IF NOT EXISTS idx_workspaces_brand_domain 
ON workspaces USING GIN ((branding_config->'custom_brand_domain'));

-- Create partial index for verified brand domains only
-- This is even faster for middleware lookups (only verified domains)
CREATE INDEX IF NOT EXISTS idx_workspaces_brand_domain_verified 
ON workspaces ((branding_config->>'custom_brand_domain'))
WHERE (branding_config->>'custom_brand_domain_verified')::boolean = true
  AND deleted_at IS NULL;

-- Add comment for documentation
COMMENT ON INDEX idx_workspaces_brand_domain IS 'GIN index for fast lookup of workspaces by brand domain';
COMMENT ON INDEX idx_workspaces_brand_domain_verified IS 'Partial index for verified brand domains only - used in middleware for routing';

