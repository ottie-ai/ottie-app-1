-- ==========================================
-- MIGRATE STATE TO AVAILABILITY COLUMN
-- ==========================================
-- This migration migrates 'state' from metadata/config to the new 'availability' column
-- Run this SQL AFTER running add-availability-column.sql
-- Run this SQL in your Supabase SQL Editor
-- ==========================================

-- Migrate data from metadata.state to availability column
UPDATE public.sites
SET availability = CASE
  WHEN metadata->>'state' IN ('available', 'under_offer', 'reserved', 'sold', 'off_market') 
    THEN (metadata->>'state')::availability_status
  ELSE 'available'::availability_status
END
WHERE metadata ? 'state' 
  AND metadata->>'state' IS NOT NULL
  AND availability IS NULL;

-- Migrate data from config.state to availability column (if not already set)
UPDATE public.sites
SET availability = CASE
  WHEN config->>'state' IN ('available', 'under_offer', 'reserved', 'sold', 'off_market') 
    THEN (config->>'state')::availability_status
  ELSE 'available'::availability_status
END
WHERE config ? 'state' 
  AND config->>'state' IS NOT NULL
  AND availability IS NULL;

-- Clean up: Remove 'state' keys from metadata and config after migration
UPDATE public.sites
SET metadata = metadata - 'state'
WHERE metadata ? 'state';

UPDATE public.sites
SET config = config - 'state'
WHERE config ? 'state';

-- Verify the migration
-- Run this query to check migration results:
-- SELECT id, title, availability, metadata, config 
-- FROM public.sites 
-- ORDER BY created_at DESC 
-- LIMIT 10;

