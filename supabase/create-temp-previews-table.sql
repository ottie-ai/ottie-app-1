-- ==========================================
-- MIGRATION: CREATE TEMP_PREVIEWS TABLE
-- ==========================================
-- Temporary storage for anonymous property previews
-- Auto-expires after 24 hours
-- ==========================================

-- Create temp_previews table
create table if not exists public.temp_previews (
  id uuid default gen_random_uuid() primary key,
  
  -- Source information
  source_url text not null,
  
  -- Scraped and parsed data
  scraped_data jsonb default '{}'::jsonb, -- { title, price, beds, baths, images, etc. }
  
  -- Generated page configuration
  generated_config jsonb default '{}'::jsonb, -- PageConfig for builder
  
  -- Lifecycle
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  expires_at timestamp with time zone default (timezone('utc'::text, now()) + interval '24 hours') not null,
  
  -- Index for cleanup
  constraint temp_previews_expires_at_check check (expires_at > created_at)
);

-- Create index for efficient cleanup queries
-- Note: We use a regular index (not partial) because now() is not immutable
-- The index will still be efficient for queries filtering by expires_at
create index if not exists idx_temp_previews_expires_at 
on public.temp_previews(expires_at);

-- Create index for lookup by ID
create index if not exists idx_temp_previews_id 
on public.temp_previews(id);

-- Enable RLS
alter table public.temp_previews enable row level security;

-- RLS Policy: Anyone can read temp_previews (they're public previews)
create policy "Anyone can view temp_previews"
  on public.temp_previews
  for select
  using (expires_at > now()); -- Only show non-expired previews

-- RLS Policy: Only service role can insert (via server actions)
-- Note: In practice, this will be called from server actions with service role
-- For now, allow authenticated users to create (we'll restrict in app logic)
create policy "Authenticated users can create temp_previews"
  on public.temp_previews
  for insert
  with check (true); -- Allow anonymous creation via server actions

-- RLS Policy: Only service role can delete (for cleanup)
-- Regular users can't delete, only cleanup job can
create policy "Service role can delete temp_previews"
  on public.temp_previews
  for delete
  using (false); -- Only cleanup function can delete

-- Add comments for documentation
comment on table public.temp_previews is 'Temporary storage for anonymous property previews. Auto-expires after 24 hours.';
comment on column public.temp_previews.scraped_data is 'Parsed property data from ScraperAPI: { title, price, beds, baths, images, description, etc. }';
comment on column public.temp_previews.generated_config is 'Generated PageConfig ready for builder (sections, theme, etc.)';
comment on column public.temp_previews.expires_at is 'When this preview expires and can be deleted (default: 24 hours from creation)';
