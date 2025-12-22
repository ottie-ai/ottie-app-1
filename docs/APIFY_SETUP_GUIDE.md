# Quick Start: Apify Integration

This guide will help you set up the Apify integration to automatically use dedicated scrapers for specific websites.

## Step 1: Get Your Apify API Token

1. Go to [apify.com](https://apify.com) and sign up (or log in)
2. Navigate to **Settings** → **Integrations**
3. Copy your **API Token**

## Step 2: Add Environment Variable

Add to your `.env.local` file:

```bash
APIFY_API_TOKEN=your_apify_token_here
```

## Step 3: Test with Zillow

The system is now ready to use! Try scraping a Zillow property URL:

```
https://www.zillow.com/homedetails/123-Main-St-City-CA-12345/123456789_zpid/
```

### What Happens:

1. System detects it's a Zillow URL
2. Automatically routes to Zillow Detail Scraper (maxcopell/zillow-detail-scraper)
3. Returns structured JSON with property details
4. No manual configuration needed!

### Console Output:

```
🎯 [Routing] URL matched Apify scraper: Zillow Detail Scraper
🔵 [Apify:Zillow Detail Scraper] Scraping URL: https://www.zillow.com/...
🔵 [Apify:Zillow Detail Scraper] Run started with ID: ...
✅ [Apify:Zillow Detail Scraper] Successfully scraped URL, items count: 1
```

## Currently Supported Websites

| Website | Auto-detected | Returns |
|---------|---------------|---------|
| Zillow.com | ✅ Yes | Property details (JSON) |

## Adding More Websites

Want to add support for another website? See [APIFY_INTEGRATION.md](./APIFY_INTEGRATION.md) for detailed instructions.

Quick example:

```typescript
// In lib/scraper/apify-scrapers.ts, add to APIFY_SCRAPERS array:
{
  id: 'redfin',
  name: 'Redfin Scraper',
  actorId: 'username/redfin-scraper',
  shouldHandle: (url: string) => url.includes('redfin.com'),
  buildInput: (url: string) => ({ urls: [url] }),
}
```

That's it! The system will automatically use this scraper for all Redfin URLs.

## Costs

- Apify charges per result (e.g., Zillow scraper: $3 per 1,000 results)
- Apify free tier includes monthly credits
- For unknown websites, system falls back to your general scraper (ScraperAPI/Firecrawl)

## Troubleshooting

### Error: "APIFY_API_TOKEN is not configured"

Make sure you added the token to `.env.local` and restarted your dev server.

### Scraper not being used automatically

Check console logs. If you see "Using general scraper" instead of "URL matched Apify scraper", the URL detection might need adjustment in `lib/scraper/apify-scrapers.ts`.

## Full Documentation

- [Complete Apify Integration Guide](./APIFY_INTEGRATION.md)
- [General Scraper Providers](./SCRAPER_PROVIDERS.md)













