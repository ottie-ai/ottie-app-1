# Generation Flow Check ✅

## Flow Overview
1. User enters URL → `handleGenerate()` in marketing page
2. Calls `generatePreview()` server action
3. ScraperAPI scrapes URL → returns HTML
4. `parsePropertyData()` parses HTML with cheerio
5. Saves to `temp_previews` table
6. Navigates to `/temp-preview/[id]`
7. Preview page displays raw HTML and parsed JSON

### Site config sample
- Reference JSON stored at `docs/site-config-sample.json`.
- Use this shape when writing to `sites.config` (live sites) or `temp_previews.generated_config` (preview records).
- We will evolve this schema as we add more fields; treat the file as the source of truth for examples.

## ✅ Checks

### 1. Dependencies
- ✅ `cheerio` installed (v1.1.2)
- ✅ `@types/cheerio` installed
- ✅ `SCRAPERAPI_KEY` environment variable needed

### 2. Database
- ✅ `temp_previews` table exists
- ✅ Has columns: `id`, `source_url`, `raw_html`, `scraped_data`, `generated_config`, `created_at`, `expires_at`
- ✅ RLS policies allow public read (for previews)

### 3. Server Action (`app/(marketing)/actions.ts`)
- ✅ `generatePreview()` function exists
- ✅ Validates URL format
- ✅ Checks for `SCRAPERAPI_KEY`
- ✅ Calls ScraperAPI
- ✅ Calls `parsePropertyData()` with cheerio
- ✅ Saves to `temp_previews` with `raw_html` and `scraped_data`
- ✅ Returns `previewId` and timing

### 4. HTML Parser (`lib/scraper/html-parser.ts`)
- ✅ Uses `cheerio` (server-side compatible)
- ✅ `parsePropertyData()` extracts: title, price, address, beds, baths, sqft, images, description, features
- ✅ Returns `ParsedPropertyData` interface

### 5. Marketing Page (`app/(marketing)/page.tsx`)
- ✅ `handleGenerate()` calls `generatePreview()`
- ✅ Shows loading animation
- ✅ Navigates to `/temp-preview/${previewId}?totalTime=${duration}`
- ✅ Error handling

### 6. Preview Page (`app/(marketing)/temp-preview/[id]/page.tsx`)
- ✅ Loads preview via `getPreview(previewId)`
- ✅ Displays raw HTML from ScraperAPI
- ✅ Displays parsed JSON from cheerio
- ✅ Copy to clipboard for both
- ✅ Shows timing information
- ✅ "Save as Site" button (claim functionality)

### 7. Potential Issues Fixed
- ✅ DOMParser replaced with cheerio (server-side compatible)
- ✅ Sections generation removed (for now)
- ✅ Redirect loop fixed (rate limit check)
- ✅ TypeScript errors fixed (undefined error handling)

## ⚠️ Things to Verify

1. **Environment Variable**: `SCRAPERAPI_KEY` must be set in `.env.local` and Vercel
2. **Database Migration**: Run `create-temp-previews-table.sql` and `add-raw-html-to-temp-previews.sql` in Supabase
3. **RLS Policies**: Ensure `temp_previews` table allows public read for non-expired previews

## 🧪 Test Flow

1. Enter URL on marketing homepage
2. Click "Generate Free Site"
3. Should see loading animation
4. Should navigate to `/temp-preview/[id]`
5. Should see:
   - Raw HTML from ScraperAPI (scrollable, copyable)
   - Parsed JSON from cheerio (formatted, copyable)
   - Timing information
   - Source URL
   - "Save as Site" button

## 🔧 If Issues Occur

- **"DOMParser is not defined"**: Already fixed with cheerio
- **"Component not found"**: Not relevant (sections removed)
- **"Preview not found"**: Check if `temp_previews` table exists and RLS allows read
- **"Failed to scrape URL"**: Check `SCRAPERAPI_KEY` and API credits
- **Empty parsed data**: HTML might not match expected patterns (normal for some sites)
