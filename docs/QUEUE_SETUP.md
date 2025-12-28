# Queue Setup Guide

This guide explains how to set up the Redis queue system for scraping jobs.

## Overview

The queue system prevents Firecrawl rate limiting by:
- Queuing all scrape requests in Redis
- Processing jobs one at a time (or in small batches)
- Providing real-time status updates to users
- Automatic retry and error handling

## Required Environment Variables

### Queue Configuration

```bash
# Maximum concurrent scrape jobs (default: 2, upgrade to 50 when Firecrawl plan upgraded)
MAX_CONCURRENT_SCRAPES=2
```

### Option 1: Vercel Upstash Integration (Recommended)
When you add Upstash Redis integration in Vercel, it automatically sets:
```bash
KV_REST_API_URL=https://your-redis-url.upstash.io
KV_REST_API_TOKEN=your-token-here
KV_REST_API_READ_ONLY_TOKEN=read-only-token
REDIS_URL=https://your-redis-url.upstash.io
KV_URL=https://your-redis-url.upstash.io
```

**No manual setup needed!** The code automatically uses these variables.

### Option 2: Manual Setup
If setting up manually, add to `.env.local`:

```bash
# Upstash Redis (from Upstash Dashboard)
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here

# App URL for worker trigger
NEXT_PUBLIC_APP_URL=http://localhost:3000  # In production: https://your-domain.com
```

### Priority Order
The code checks env vars in this order:
1. `KV_REST_API_URL` + `KV_REST_API_TOKEN` (Vercel integration)
2. `REDIS_URL` + `KV_REST_API_TOKEN` (Alternative Vercel format)
3. `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (Manual setup)

## How It Works

### 1. User submits URL
- `generatePreview()` creates temp_preview record with `status: 'queued'`
- Job is added to Redis queue
- User sees "Waiting in queue" message with position

**temp_previews schema (13 columns):**
- Identifiers: `id`, `external_url`, `source_domain`
- Status: `status`, `error_message`
- Timestamps: `created_at`, `expires_at`, `updated_at`
- Content: `default_raw_html`, `default_markdown`
- AI Results: `generated_config`, `unified_json`, `image_analysis`

### 2. Worker processes job
- Vercel cron runs every minute: `POST /api/queue/process-scrape`
- Worker picks next job from queue
- Updates status: `queued` → `scraping` → `pending` → `completed`

### 3. Frontend polls status
- Frontend calls `getPreviewStatus()` every 1 second
- Shows appropriate loading message based on status
- Redirects to preview page when completed

## Queue Statuses

- `queued` - Waiting in queue
- `scraping` - Currently scraping URL
- `pending` - Processing scraped data (OpenAI, etc.)
- `completed` - Done, ready to view
- `error` - Failed with error message

## API Endpoints

### POST /api/queue/process-scrape
Process next job in queue (or batch)

**Request:**
```json
{
  "batch": 5  // Optional: process 5 jobs (default: 1)
}
```

**Response:**
```json
{
  "success": true,
  "message": "Job processed successfully",
  "jobId": "preview-id"
}
```

### GET /api/queue/status/[id]
Get status of specific job

**Response:**
```json
{
  "success": true,
  "status": "scraping",
  "queuePosition": 3,
  "processing": true,
  "errorMessage": null
}
```

### GET /api/queue/process-scrape
Get queue statistics

**Response:**
```json
{
  "success": true,
  "stats": {
    "queueLength": 5,
    "processingCount": 1,
    "completedToday": 42,
    "failedToday": 2
  }
}
```

## Vercel Cron Setup

The `vercel.json` file includes a cron job that runs every minute:

```json
{
  "crons": [
    {
      "path": "/api/queue/process-scrape",
      "schedule": "* * * * *"
    }
  ]
}
```

**Note:** Vercel cron is only available on paid plans. For free plans, the worker is triggered manually after each job is added to queue.

## Testing

### Add a job to queue
```bash
curl -X POST http://localhost:3000/api/generate-preview \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

### Process queue manually
```bash
curl -X POST http://localhost:3000/api/queue/process-scrape
```

### Check queue stats
```bash
curl http://localhost:3000/api/queue/process-scrape
```

### Check job status
```bash
curl http://localhost:3000/api/queue/status/[preview-id]
```

## Rate Limiting

The queue system handles Firecrawl rate limits by:
- Processing jobs sequentially (no concurrent scrapes by default)
- Each job includes all Firecrawl fallbacks (basic → stealth proxy)
- Failed jobs are marked as `error` and removed from queue
- Queue position is shown to users in real-time

## Monitoring

Monitor queue health:
- Check `/api/queue/process-scrape` (GET) for stats
- View logs in Vercel dashboard
- Redis keys:
  - `queue:scrape` - Main queue (list)
  - `queue:scrape:processing:*` - Currently processing jobs (TTL: 5min)
  - `queue:scrape:stats` - Statistics (hash)

## Troubleshooting

### Jobs stuck in queue
1. Check if worker is running: `GET /api/queue/process-scrape`
2. Manually trigger worker: `POST /api/queue/process-scrape`
3. Check Vercel logs for errors

### High queue length
1. Increase batch size in cron job (edit worker to process more jobs)
2. Deploy more workers (Vercel Pro+ only)
3. Check for rate limit errors in logs

### Jobs failing
1. Check error messages in temp_previews table
2. Verify Firecrawl API key is valid
3. Check if URL is accessible
4. Review worker logs in Vercel dashboard

## Database Schema

The `temp_previews` table has been simplified to 13 columns (as of migration `remove-unused-columns-from-temp-previews.sql`):

**Identifiers:**
- `id` (uuid) - Primary key
- `external_url` (text) - Source URL
- `source_domain` (text) - Provider identifier (e.g., 'firecrawl', 'apify_zillow')

**Status Tracking:**
- `status` (text) - Current job status: 'queued', 'scraping', 'pending', 'completed', 'error'
- `error_message` (text) - Error details if status is 'error'

**Timestamps:**
- `created_at` (timestamptz) - When job was created
- `expires_at` (timestamptz) - When preview expires (24 hours after creation)
- `updated_at` (timestamptz) - Last update time

**Scraped Content:**
- `default_raw_html` (text) - Raw HTML from scraper or Apify JSON string
- `default_markdown` (text) - Markdown/text format for AI processing

**AI Processing Results:**
- `generated_config` (jsonb) - Call 1 output (base config with metadata)
- `unified_json` (jsonb) - Final config with all AI enhancements (Call 1 + Call 2 + Call 3)
- `image_analysis` (jsonb) - Call 3 vision analysis results

**Note:** Legacy columns (`raw_html`, `markdown`, `unified_data`, `cleaned_html`, `ai_ready_data`, `scraped_data`, `gallery_raw_html`, `gallery_markdown`, `gallery_image_urls`) have been removed. See `supabase/MIGRATION_INSTRUCTIONS.md` for details.
