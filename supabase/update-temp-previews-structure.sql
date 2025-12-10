-- ==========================================
-- TEMP_PREVIEWS STRUCTURE ALIGNMENT
-- ==========================================
-- Adds explicit columns for default/gallery raw HTML + markdown,
-- aligns generated_config/unified_json fields, and keeps gallery URLs.
-- Designed to be idempotent for existing environments.
-- ==========================================

-- Core content fields
alter table public.temp_previews
add column if not exists default_raw_html   text,
add column if not exists default_markdown   text,
add column if not exists gallery_raw_html   text,
add column if not exists gallery_markdown   text,
add column if not exists gallery_image_urls jsonb not null default '[]'::jsonb,
add column if not exists generated_config   jsonb not null default '{}'::jsonb,
add column if not exists unified_json       jsonb not null default '{}'::jsonb,
add column if not exists updated_at         timestamptz not null default timezone('utc', now());

-- Align defaults for existing columns
alter table public.temp_previews
alter column status set default 'pending',
alter column source_domain set default 'firecrawl';

-- Backfill new columns from legacy data where available
update public.temp_previews
set default_raw_html = coalesce(default_raw_html, raw_html)
where default_raw_html is null and raw_html is not null;

-- Backfill default_markdown from legacy markdown column when present
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'temp_previews'
      and column_name = 'markdown'
  ) then
    update public.temp_previews
    set default_markdown = coalesce(default_markdown, markdown)
    where default_markdown is null and markdown is not null;
  end if;
end $$;

-- Backfill gallery/html fields from ai_ready_data when column exists
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'temp_previews'
      and column_name = 'ai_ready_data'
  ) then
    update public.temp_previews
    set default_markdown = coalesce(
      default_markdown,
      ai_ready_data ->> 'markdown'
    )
    where default_markdown is null
      and ai_ready_data ? 'markdown';

    update public.temp_previews
    set gallery_raw_html = coalesce(
      gallery_raw_html,
      ai_ready_data ->> 'gallery_html'
    )
    where gallery_raw_html is null
      and ai_ready_data ? 'gallery_html';

    update public.temp_previews
    set gallery_image_urls = coalesce(
      gallery_image_urls,
      coalesce(ai_ready_data -> 'gallery_images', '[]'::jsonb)
    );
  end if;
end $$;

-- Optional rename of legacy unified_data column if it exists
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'temp_previews'
      and column_name = 'unified_data'
  ) then
    begin
      alter table public.temp_previews
      rename column unified_data to unified_json;
    exception
      when duplicate_column then null;
    end;
  end if;
end $$;

-- Indexes for lookups
create index if not exists temp_previews_external_url_idx on public.temp_previews (external_url);
create index if not exists temp_previews_status_idx on public.temp_previews (status);
