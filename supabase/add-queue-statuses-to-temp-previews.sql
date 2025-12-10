-- Add queue-related statuses to temp_previews table
-- New statuses: 'queued', 'scraping' (in addition to existing 'pending', 'completed', 'error')

-- Add updated_at column if it doesn't exist
ALTER TABLE temp_previews 
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());

-- Create trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_temp_previews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_temp_previews_updated_at ON temp_previews;
CREATE TRIGGER set_temp_previews_updated_at
    BEFORE UPDATE ON temp_previews
    FOR EACH ROW
    EXECUTE FUNCTION update_temp_previews_updated_at();

-- Update status check constraint to include new statuses
ALTER TABLE temp_previews 
DROP CONSTRAINT IF EXISTS temp_previews_status_check;

ALTER TABLE temp_previews
ADD CONSTRAINT temp_previews_status_check 
CHECK (status IN ('queued', 'scraping', 'pending', 'completed', 'error'));

-- Add comment explaining status flow
COMMENT ON COLUMN temp_previews.status IS 
'Status flow: queued -> scraping -> pending -> completed/error
- queued: Waiting in Redis queue to be processed
- scraping: Currently scraping URL with Firecrawl/Apify
- pending: Scraped, processing with OpenAI
- completed: Done, ready to view
- error: Failed with error_message';

-- Create index on status for faster queue queries
CREATE INDEX IF NOT EXISTS idx_temp_previews_status_created 
ON temp_previews(status, created_at) 
WHERE status IN ('queued', 'scraping', 'pending');

-- Create index on updated_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_temp_previews_updated_at 
ON temp_previews(updated_at);
