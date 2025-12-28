-- Migration: Add image_analysis column to temp_previews table
-- This column stores the vision analysis results from Llama 4 Scout 17B
-- Used to determine the best hero image for real estate listings

-- Add the image_analysis column
ALTER TABLE temp_previews 
ADD COLUMN IF NOT EXISTS image_analysis JSONB;

-- Add comment explaining the column
COMMENT ON COLUMN temp_previews.image_analysis IS 'Vision analysis results from Llama 4 Scout 17B. Contains best_hero_index, reasoning, and per-image scores for composition, lighting, wow_factor, and quality.';

-- Create index for querying by best_hero_index if needed
CREATE INDEX IF NOT EXISTS idx_temp_previews_image_analysis_best_hero 
ON temp_previews ((image_analysis->>'best_hero_index'))
WHERE image_analysis IS NOT NULL;

