-- Add default value to source_domain column
-- This ensures that even if code doesn't explicitly set it, database will use 'firecrawl' as default

ALTER TABLE temp_previews
ALTER COLUMN source_domain SET DEFAULT 'firecrawl';

-- Update any existing NULL values (shouldn't be any, but just in case)
UPDATE temp_previews
SET source_domain = 'firecrawl'
WHERE source_domain IS NULL;
