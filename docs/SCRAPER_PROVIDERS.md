# Scraper Providers Configuration

The application supports multiple scraping providers that can be switched via environment variables.

## Supported Providers

### 1. Apify (Automatic for specific websites)
- **Provider ID**: `apify`
- **Environment Variable**: `APIFY_API_TOKEN`
- **Documentation**: https://docs.apify.com/
- **Returns**: Structured JSON data
- **Used For**: Specific websites like Zillow that have dedicated scrapers
- **See**: [APIFY_INTEGRATION.md](./APIFY_INTEGRATION.md) for full documentation

### 2. ScraperAPI (Default fallback)
- **Provider ID**: `scraperapi`
- **Environment Variable**: `SCRAPERAPI_KEY`
- **Documentation**: https://www.scraperapi.com/
- **Returns**: Raw HTML

### 3. Firecrawl (Alternative fallback)
- **Provider ID**: `firecrawl`
- **Environment Variable**: `FIRECRAWL_API_KEY`
- **Documentation**: https://docs.firecrawl.dev/
- **Returns**: Raw HTML

## Configuration

### Provider Priority

The system uses providers in this order:

1. **Apify** (automatic) - If URL matches a specific website (e.g., Zillow)
2. **General Provider** (configurable) - ScraperAPI or Firecrawl for all other URLs

### Environment Variables

Set these in your `.env.local` file:

```bash
# Apify (required for site-specific scrapers like Zillow)
APIFY_API_TOKEN=your_apify_token_here

# General scraper (required as fallback)
SCRAPER_PROVIDER=scraperapi  # or 'firecrawl'

# ScraperAPI (if using as general provider)
SCRAPERAPI_KEY=your_scraperapi_key_here

# OR Firecrawl (if using as general provider)
FIRECRAWL_API_KEY=fc-your_firecrawl_key_here
```

### Switching General Providers

**For ScraperAPI (default):**
```bash
SCRAPER_PROVIDER=scraperapi
SCRAPERAPI_KEY=your_api_key_here
```

**For Firecrawl:**
```bash
SCRAPER_PROVIDER=firecrawl
FIRECRAWL_API_KEY=fc-your_api_key_here
```

If `SCRAPER_PROVIDER` is not set, the application defaults to `scraperapi`.

## Implementation Details

The scraper abstraction is implemented in:

- `lib/scraper/providers.ts` - Provider routing and general scrapers
- `lib/scraper/apify-scrapers.ts` - Apify scraper configurations
- `lib/scraper/apify-client.ts` - Apify API client

### Key Functions

- `scrapeUrl(url, timeout)` - Main entry point, routes to appropriate provider
- `getScraperProvider()` - Returns the active general provider from env
- `findApifyScraperForUrl(url)` - Checks if URL has a dedicated Apify scraper

All providers return the same `ScrapeResult` interface for consistency.

## Timeout Configuration

Both providers use a 170-second timeout (configurable) to stay under the 180-second server action limit.

## Error Handling

Both providers handle:
- Timeout errors
- API key validation
- Network errors
- Provider-specific error messages
