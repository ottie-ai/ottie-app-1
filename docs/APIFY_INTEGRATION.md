# Apify Integration

The application now supports dedicated Apify scrapers for specific websites, providing structured JSON data instead of raw HTML.

## Overview

The scraper system has three tiers:

1. **Apify Scrapers** (Priority 1) - Dedicated scrapers for specific websites (e.g., Zillow)
2. **Firecrawl** (Priority 2) - General purpose scraper
3. **ScraperAPI** (Priority 2) - General purpose scraper

When you scrape a URL, the system automatically detects if there's a dedicated Apify scraper available. If yes, it uses that. Otherwise, it falls back to the general scraper (Firecrawl or ScraperAPI).

## Configuration

### Environment Variables

Add the following to your `.env.local` file:

```bash
# Apify API Token (required for Apify scrapers)
APIFY_API_TOKEN=your_apify_api_token_here

# General scrapers (one required as fallback)
SCRAPER_PROVIDER=scraperapi  # or 'firecrawl'
SCRAPERAPI_KEY=your_scraperapi_key_here
# OR
FIRECRAWL_API_KEY=fc-your_firecrawl_key_here
```

### Getting an Apify API Token

1. Sign up at [apify.com](https://apify.com)
2. Go to Settings > Integrations
3. Copy your API token
4. Add it to your `.env.local` as `APIFY_API_TOKEN`

## Currently Supported Websites

The following websites automatically use dedicated Apify scrapers:

| Website | Apify Actor | Returns |
|---------|-------------|---------|
| zillow.com | [maxcopell/zillow-detail-scraper](https://apify.com/maxcopell/zillow-detail-scraper) | Structured property data (JSON) |

## How It Works

### Automatic Routing

When you scrape a URL:

1. **URL Detection**: The system checks if the URL matches any configured Apify scraper
2. **Apify Execution**: If match found, runs the dedicated Apify actor
3. **Fallback**: If no match, uses general scraper (Firecrawl/ScraperAPI)

Example:

```typescript
// Scraping zillow.com URL
const result = await scrapeUrl('https://www.zillow.com/homedetails/...')
// ✅ Automatically uses Zillow Detail Scraper
// Returns: { json: {...}, provider: 'apify', ... }

// Scraping other URL
const result = await scrapeUrl('https://example.com/property')
// ✅ Uses general scraper (Firecrawl or ScraperAPI)
// Returns: { html: '...', provider: 'firecrawl', ... }
```

### Response Format

**Apify Scrapers** (structured data):
```typescript
{
  json: any,           // Structured JSON from Apify actor
  provider: 'apify',
  duration: number,
  apifyScraperId: string
}
```

**General Scrapers** (HTML):
```typescript
{
  html: string,        // Raw HTML
  provider: 'scraperapi' | 'firecrawl',
  duration: number
}
```

## Adding New Apify Scrapers

Want to add support for a new website? Follow these steps:

### 1. Find an Apify Actor

Browse the [Apify Store](https://apify.com/store) to find a scraper for your target website.

Example actors:
- Zillow: `maxcopell/zillow-detail-scraper`
- Realtor.com: (find in Apify store)
- Redfin: (find in Apify store)

### 2. Add Configuration

Edit `lib/scraper/apify-scrapers.ts` and add a new entry to the `APIFY_SCRAPERS` array:

```typescript
{
  id: 'website-name',           // Unique identifier
  name: 'Website Scraper Name', // Display name
  actorId: 'username/actor-id', // From Apify store
  shouldHandle: (url: string) => {
    // Logic to detect if this scraper should handle the URL
    try {
      const urlObj = new URL(url)
      const hostname = urlObj.hostname.toLowerCase()
      return hostname === 'example.com' || hostname === 'www.example.com'
    } catch {
      return false
    }
  },
  buildInput: (url: string) => {
    // Build the input object for the Apify actor
    // Check the actor's documentation for required fields
    return {
      startUrls: [{ url }],
      // Add other required fields here
    }
  },
}
```

### 3. Example: Adding Redfin Support

```typescript
{
  id: 'redfin',
  name: 'Redfin Property Scraper',
  actorId: 'username/redfin-scraper',  // Replace with actual actor ID
  shouldHandle: (url: string) => {
    try {
      const urlObj = new URL(url)
      const hostname = urlObj.hostname.toLowerCase()
      return hostname === 'redfin.com' || hostname === 'www.redfin.com'
    } catch {
      return false
    }
  },
  buildInput: (url: string) => ({
    urls: [url],
    // Add other fields based on the actor's requirements
  }),
}
```

### 4. Test the Integration

1. Restart your development server
2. Try scraping a URL from the new website
3. Check the console logs for routing messages:
   ```
   🎯 [Routing] URL matched Apify scraper: Redfin Property Scraper
   🔵 [Apify:Redfin Property Scraper] Scraping URL: ...
   ```

## Cost Considerations

### Apify Pricing

- Most Apify scrapers charge per result (e.g., $3 per 1,000 results)
- Check the actor's pricing page before adding it
- Apify has a free tier with monthly credits

### When to Use Apify vs General Scrapers

**Use Apify when:**
- You need structured data (JSON) instead of HTML
- The website has complex JavaScript or anti-scraping measures
- The website's structure changes frequently (actor maintainers handle updates)
- You need specific data fields that are hard to extract from HTML

**Use General Scrapers when:**
- You just need the raw HTML
- The website is simple and doesn't block scrapers
- You want to save costs

## Troubleshooting

### Error: "APIFY_API_TOKEN is not configured"

Make sure you've added `APIFY_API_TOKEN=your_token` to your `.env.local` file.

### Apify Scraper Not Being Used

Check the console logs for routing messages. If you see:

```
🎯 [Routing] Using general scraper: scraperapi
```

Instead of:

```
🎯 [Routing] URL matched Apify scraper: ...
```

Then the URL isn't matching any Apify scraper. Check your `shouldHandle` function in the scraper configuration.

### Apify Run Timeout

If you get timeout errors, increase the timeout in the `scrapeUrl` call:

```typescript
const result = await scrapeUrl(url, 300000) // 5 minutes
```

### Apify Run Failed

Check the Apify dashboard to see the run details and error messages:
1. Go to [apify.com/console](https://apify.com/console)
2. Find the failed run
3. Check the logs for error details

## Implementation Files

- `lib/scraper/apify-scrapers.ts` - Scraper configurations
- `lib/scraper/apify-client.ts` - Apify API client
- `lib/scraper/providers.ts` - Provider routing logic
- `app/(marketing)/actions.ts` - Preview generation with Apify support


