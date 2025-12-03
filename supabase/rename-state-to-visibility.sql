-- ==========================================
-- RENAME STATE TO AVAILABILITY
-- ==========================================
-- This migration renames the 'state' metadata key to 'availability' in sites table
-- Run this SQL in your Supabase SQL Editor
-- ==========================================

-- Update metadata JSONB: Rename 'state' key to 'availability' in all sites
-- This handles cases where availability was stored as metadata.state
UPDATE public.sites
SET metadata = jsonb_set(
  metadata - 'state',  -- Remove old 'state' key
  '{availability}',   -- Add new 'availability' key
  metadata->'state'    -- Copy value from old key
)
WHERE metadata ? 'state'  -- Only update rows that have 'state' key
  AND metadata->>'state' IS NOT NULL;

-- Also update config JSONB if availability was stored there
-- (Some implementations might store it in config instead of metadata)
UPDATE public.sites
SET config = jsonb_set(
  config - 'state',      -- Remove old 'state' key
  '{availability}',      -- Add new 'availability' key
  config->'state'        -- Copy value from old key
)
WHERE config ? 'state'  -- Only update rows that have 'state' key
  AND config->>'state' IS NOT NULL;

-- Note: If you have a dedicated column for state/availability, uncomment and adjust:
-- ALTER TABLE public.sites RENAME COLUMN state TO availability;

-- Verify the migration
-- Run this query to check if any 'state' keys still exist:
-- SELECT id, title, metadata, config 
-- FROM public.sites 
-- WHERE metadata ? 'state' OR config ? 'state';

