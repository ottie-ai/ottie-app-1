-- ==========================================
-- MIGRATION: ADD MARKDOWN COLUMN
-- ==========================================
-- Add markdown column to store markdown conversion of cleaned HTML
-- This markdown is intended as LLM-ready content for property description generation
-- ==========================================

alter table public.temp_previews
add column if not exists markdown text;

comment on column public.temp_previews.markdown is 'Markdown conversion of cleaned HTML, intended as LLM-ready content for property description generation';
