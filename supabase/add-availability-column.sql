-- ==========================================
-- ADD AVAILABILITY COLUMN TO SITES TABLE
-- ==========================================
-- This migration adds the 'availability' column to sites table
-- Run this SQL in your Supabase SQL Editor
-- ==========================================

-- Create enum type for availability status
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'availability_status') THEN
    CREATE TYPE availability_status AS ENUM (
      'available',
      'under_offer',
      'reserved',
      'sold',
      'off_market'
    );
  END IF;
END $$;

-- Add availability column to sites table
ALTER TABLE public.sites 
ADD COLUMN IF NOT EXISTS availability availability_status DEFAULT 'available';

-- Add comment for documentation
COMMENT ON COLUMN public.sites.availability IS 'Availability status of the property: available, under_offer, reserved, sold, or off_market';

-- Optional: Migrate existing data from metadata.state or config.state to the new column
-- Uncomment and run if you have existing data in metadata/config:
/*
UPDATE public.sites
SET availability = CASE
  WHEN metadata->>'state' IN ('available', 'under_offer', 'reserved', 'sold', 'off_market') 
    THEN (metadata->>'state')::availability_status
  WHEN config->>'state' IN ('available', 'under_offer', 'reserved', 'sold', 'off_market') 
    THEN (config->>'state')::availability_status
  ELSE 'available'::availability_status
END
WHERE metadata ? 'state' OR config ? 'state';
*/

