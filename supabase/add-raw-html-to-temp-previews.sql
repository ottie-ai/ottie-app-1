-- ==========================================
-- ADD RAW HTML COLUMN TO TEMP_PREVIEWS
-- ==========================================
-- Adds raw_html column to store original ScraperAPI response
-- ==========================================

-- Add raw_html column (text, can be large)
alter table public.temp_previews
add column if not exists raw_html text;

-- Add comment
comment on column public.temp_previews.raw_html is 'Raw HTML content from ScraperAPI response (for debugging/inspection)';
