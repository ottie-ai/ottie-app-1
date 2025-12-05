-- ==========================================
-- MIGRATION: ADD CLEANED_HTML COLUMN
-- ==========================================
-- Add cleaned_html column to store HTML after cheerio cleaning
-- ==========================================

alter table public.temp_previews
add column if not exists cleaned_html text;

comment on column public.temp_previews.cleaned_html is 'HTML content after cleaning with cheerio (removed headers, footers, scripts, etc.)';
