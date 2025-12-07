-- ==========================================
-- MIGRATION: MODIFY TEMP_PREVIEWS TABLE SCHEMA
-- ==========================================
-- Updates temp_previews table to new schema:
-- - Renames source_url to external_url (with UNIQUE constraint)
-- - Adds source_domain column
-- - Adds ai_ready_data column (JSONB for LLM input)
-- - Adds unified_data column (JSONB for frontend output)
-- - Adds status and error_message columns
-- ==========================================

-- Step 1: Remove duplicates before adding UNIQUE constraint
-- Keep only the most recent entry per source_url
delete from public.temp_previews t1
where exists (
  select 1 from public.temp_previews t2
  where t2.source_url = t1.source_url
  and t2.created_at > t1.created_at
);

-- Step 2: Rename source_url to external_url
alter table public.temp_previews
rename column source_url to external_url;

-- Step 3: Add UNIQUE constraint to external_url
alter table public.temp_previews
add constraint temp_previews_external_url_unique unique (external_url);

-- Step 4: Add source_domain column
alter table public.temp_previews
add column if not exists source_domain text;

-- Step 5: Add ai_ready_data column (nullable first, will be populated)
alter table public.temp_previews
add column if not exists ai_ready_data jsonb;

-- Step 6: Add unified_data column (nullable first, will be populated)
alter table public.temp_previews
add column if not exists unified_data jsonb;

-- Step 7: Add status column with default
alter table public.temp_previews
add column if not exists status text default 'pending';

-- Step 8: Add error_message column
alter table public.temp_previews
add column if not exists error_message text;

-- Step 9: Migrate existing data to new structure
-- Migrate source_domain from scraped_data.provider
update public.temp_previews
set source_domain = case
  when scraped_data->>'provider' = 'apify' and scraped_data->>'apifyScraperId' = 'zillow' then 'apify_zillow'
  when scraped_data->>'provider' = 'firecrawl' then 'firecrawl'
  when scraped_data->>'provider' is not null then scraped_data->>'provider'
  else 'unknown'
end
where source_domain is null;

-- Migrate ai_ready_data from cleaned_html, markdown, and scraped_data
update public.temp_previews
set ai_ready_data = jsonb_build_object(
  'html', coalesce(cleaned_html, ''),
  'markdown', coalesce(markdown, ''),
  'apify_json', case 
    when scraped_data->>'provider' = 'apify' then scraped_data
    else null
  end
)
where ai_ready_data is null;

-- Migrate unified_data from generated_config (or empty object if not set)
update public.temp_previews
set unified_data = coalesce(generated_config, '{}'::jsonb)
where unified_data is null;

-- Step 10: Make ai_ready_data NOT NULL (with default for existing rows)
-- First set default for any remaining NULL rows
update public.temp_previews
set ai_ready_data = '{}'::jsonb
where ai_ready_data is null;

alter table public.temp_previews
alter column ai_ready_data set not null,
alter column ai_ready_data set default '{}'::jsonb;

-- Step 11: Make unified_data NOT NULL (with default for existing rows)
-- First set default for any remaining NULL rows
update public.temp_previews
set unified_data = '{}'::jsonb
where unified_data is null;

alter table public.temp_previews
alter column unified_data set not null,
alter column unified_data set default '{}'::jsonb;

-- Step 12: Make source_domain NOT NULL (set default for any remaining NULL rows)
update public.temp_previews
set source_domain = 'unknown'
where source_domain is null;

alter table public.temp_previews
alter column source_domain set not null;

-- Step 13: Update created_at to use simpler default
alter table public.temp_previews
alter column created_at set default now();

-- Step 14: Add comments for new columns
comment on column public.temp_previews.external_url is 'External URL of the property listing (unique)';
comment on column public.temp_previews.source_domain is 'Source domain identifier: apify_zillow, firecrawl, etc.';
comment on column public.temp_previews.ai_ready_data is 'LLM input data: {html, markdown, apify_json}';
comment on column public.temp_previews.unified_data is 'Frontend output data after LLM processing: {price, photos, agent}';
comment on column public.temp_previews.status is 'Processing status: pending, processing, completed, error';
comment on column public.temp_previews.error_message is 'Error message if processing failed';
comment on column public.temp_previews.raw_html is 'Raw HTML content for manual debugging';

-- Step 15: Create indexes for faster lookups
-- Note: UNIQUE constraint on external_url already creates an index
create index if not exists idx_temp_previews_status 
on public.temp_previews(status);

create index if not exists idx_temp_previews_source_domain 
on public.temp_previews(source_domain);
