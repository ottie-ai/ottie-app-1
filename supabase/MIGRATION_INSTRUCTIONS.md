# Migration Instructions: Remove Unused Columns from temp_previews

## Overview
This migration removes 9 unused/legacy columns from the `temp_previews` table to simplify the schema and reduce storage overhead.

## Migration File
`supabase/remove-unused-columns-from-temp-previews.sql`

## Columns Being Removed (9 total)

### Legacy columns with replacements:
1. `raw_html` → replaced by `default_raw_html`
2. `markdown` → replaced by `default_markdown`
3. `unified_data` → renamed to `unified_json`
4. `cleaned_html` → never used
5. `ai_ready_data` → replaced by `default_raw_html` + `default_markdown`

### Unused metadata:
6. `scraped_data` → always empty `{}`, info now in `source_domain`

### Gallery columns:
7. `gallery_raw_html` → not needed
8. `gallery_markdown` → not needed
9. `gallery_image_urls` → gallery images now in `photos[]` array

## How to Run

### Option 1: Supabase Dashboard (Recommended for Production)
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of `supabase/remove-unused-columns-from-temp-previews.sql`
4. Paste and execute

### Option 2: Supabase CLI (Local Development)
```bash
# If you have local Supabase setup
supabase db push

# Or execute directly
supabase db execute -f supabase/remove-unused-columns-from-temp-previews.sql
```

### Option 3: psql (Direct Database Connection)
```bash
psql $DATABASE_URL -f supabase/remove-unused-columns-from-temp-previews.sql
```

## Code Changes Made
The following files were updated to remove references to deleted columns:

1. **lib/queue/scrape-queue.ts**
   - Removed `scraped_data` variable and references
   - Removed `gallery_raw_html`, `gallery_markdown`, `gallery_image_urls` from UPDATE statements

2. **app/(marketing)/actions.ts**
   - Removed `gallery_image_urls` from INSERT statement
   - Removed `gallery_raw_html`, `gallery_image_urls` from SELECT statement
   - Updated `raw_html` fallbacks to use only `default_raw_html`
   - Updated `scraped_data` references to use `source_domain` directly
   - Removed gallery phase detection logic

3. **app/(marketing)/temp-preview/[id]/page.tsx**
   - Updated to use `unified_json.photos` instead of `gallery_image_urls`
   - Removed `raw_html` fallbacks, now uses only `default_raw_html`

## Testing Checklist

After running the migration, verify:

- [ ] Scraping workflow works (both Firecrawl and Apify)
- [ ] Temp preview page displays correctly
- [ ] No console errors related to missing columns
- [ ] Manual actions (Call 1, Call 2) work
- [ ] Image display works in preview

## Rollback (If Needed)

If you need to rollback, you can restore the columns:

```sql
-- Add back removed columns (all nullable)
ALTER TABLE public.temp_previews 
  ADD COLUMN IF NOT EXISTS raw_html text,
  ADD COLUMN IF NOT EXISTS markdown text,
  ADD COLUMN IF NOT EXISTS unified_data jsonb,
  ADD COLUMN IF NOT EXISTS cleaned_html text,
  ADD COLUMN IF NOT EXISTS ai_ready_data jsonb,
  ADD COLUMN IF NOT EXISTS scraped_data jsonb,
  ADD COLUMN IF NOT EXISTS gallery_raw_html text,
  ADD COLUMN IF NOT EXISTS gallery_markdown text,
  ADD COLUMN IF NOT EXISTS gallery_image_urls jsonb DEFAULT '[]'::jsonb;
```

Note: Rollback will restore the columns but not the data (data is lost after DROP COLUMN).

## Final Schema (13 columns)

After migration, `temp_previews` will have:

**Identifiers:**
- `id`, `external_url`, `source_domain`

**Status:**
- `status`, `error_message`

**Timestamps:**
- `created_at`, `expires_at`, `updated_at`

**Content:**
- `default_raw_html`, `default_markdown`

**AI Results:**
- `generated_config`, `unified_json`, `image_analysis`

