-- ==========================================
-- MIGRATION: REMOVE UNIQUE CONSTRAINT FROM EXTERNAL_URL
-- ==========================================
-- Removes the unique constraint from external_url column
-- This allows multiple previews for the same URL
-- ==========================================

-- Remove the unique constraint
alter table public.temp_previews
drop constraint if exists temp_previews_external_url_unique;

-- Remove the unique index if it exists (PostgreSQL creates index for unique constraints)
drop index if exists public.temp_previews_external_url_unique;

-- Add a regular index for faster lookups (non-unique)
create index if not exists idx_temp_previews_external_url 
on public.temp_previews(external_url);

-- Update comment
comment on column public.temp_previews.external_url is 'External URL of the property listing (can have multiple previews per URL)';
