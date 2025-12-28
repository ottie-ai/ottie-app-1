-- ==========================================
-- MIGRATION: REMOVE UNUSED COLUMNS FROM TEMP_PREVIEWS
-- ==========================================
-- Removes 9 unused/legacy columns from temp_previews table:
-- - Legacy columns with replacements (5)
-- - Unused metadata (1)
-- - Gallery columns (3)
--
-- This migration is safe to run multiple times (uses IF EXISTS)
-- ==========================================

-- Remove legacy columns (have replacements)
-- raw_html → replaced by default_raw_html
ALTER TABLE public.temp_previews DROP COLUMN IF EXISTS raw_html;

-- markdown → replaced by default_markdown
ALTER TABLE public.temp_previews DROP COLUMN IF EXISTS markdown;

-- unified_data → renamed to unified_json
ALTER TABLE public.temp_previews DROP COLUMN IF EXISTS unified_data;

-- cleaned_html → never used
ALTER TABLE public.temp_previews DROP COLUMN IF EXISTS cleaned_html;

-- ai_ready_data → replaced by default_raw_html + default_markdown
ALTER TABLE public.temp_previews DROP COLUMN IF EXISTS ai_ready_data;

-- Remove unused metadata
-- scraped_data → always empty {}, info now in source_domain
ALTER TABLE public.temp_previews DROP COLUMN IF EXISTS scraped_data;

-- Remove gallery columns (not used, gallery images in photos[])
ALTER TABLE public.temp_previews DROP COLUMN IF EXISTS gallery_raw_html;
ALTER TABLE public.temp_previews DROP COLUMN IF EXISTS gallery_markdown;
ALTER TABLE public.temp_previews DROP COLUMN IF EXISTS gallery_image_urls;

-- Add comments for clarity
COMMENT ON TABLE public.temp_previews IS 'Temporary preview records for scraped property listings. Expires after 24 hours. Simplified schema with 13 columns.';

-- Final schema (13 columns):
-- Identifiers: id, external_url, source_domain
-- Status: status, error_message
-- Timestamps: created_at, expires_at, updated_at
-- Content: default_raw_html, default_markdown
-- AI results: generated_config, unified_json, image_analysis

