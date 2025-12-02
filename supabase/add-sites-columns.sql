-- Add missing columns to sites table
-- Run this migration to add thumbnail_url and published_at columns

-- Add thumbnail_url column for site preview images
ALTER TABLE public.sites 
ADD COLUMN IF NOT EXISTS thumbnail_url text;

-- Add published_at column to track when site was published
ALTER TABLE public.sites 
ADD COLUMN IF NOT EXISTS published_at timestamp with time zone;

-- Add description column for SEO and preview
ALTER TABLE public.sites 
ADD COLUMN IF NOT EXISTS description text;

-- Add comment for documentation
COMMENT ON COLUMN public.sites.thumbnail_url IS 'URL to site preview/thumbnail image';
COMMENT ON COLUMN public.sites.published_at IS 'Timestamp when site was first published';
COMMENT ON COLUMN public.sites.description IS 'Short description of the site for SEO and preview';

