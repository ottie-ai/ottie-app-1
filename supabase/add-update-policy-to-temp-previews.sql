-- ==========================================
-- MIGRATION: ADD UPDATE POLICY TO TEMP_PREVIEWS
-- ==========================================
-- Allow server actions to update temp_previews
-- Needed for reprocessing HTML (updating cleaned_html)
-- ==========================================

-- RLS Policy: Allow updates to temp_previews (via server actions)
-- This allows reprocessing HTML and updating cleaned_html, scraped_data, generated_config
create policy "Server actions can update temp_previews"
  on public.temp_previews
  for update
  using (expires_at > now()) -- Can only update non-expired previews
  with check (expires_at > now()); -- Can only update to non-expired state
