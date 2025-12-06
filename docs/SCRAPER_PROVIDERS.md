# Scraper Providers Configuration

The application supports multiple scraping providers that can be switched via environment variables.

## Supported Providers

### 1. ScraperAPI (Default)
- **Provider ID**: `scraperapi`
- **Environment Variable**: `SCRAPERAPI_KEY`
- **Documentation**: https://www.scraperapi.com/

### 2. Firecrawl
- **Provider ID**: `firecrawl`
- **Environment Variable**: `FIRECRAWL_API_KEY`
- **Documentation**: https://docs.firecrawl.dev/

## Configuration

### Switching Providers

Set the `SCRAPER_PROVIDER` environment variable in your `.env.local` file:

```bash
# Use ScraperAPI (default)
SCRAPER_PROVIDER=scraperapi
SCRAPERAPI_KEY=your_scraperapi_key_here

# OR use Firecrawl
SCRAPER_PROVIDER=firecrawl
FIRECRAWL_API_KEY=fc-your_firecrawl_key_here
```

If `SCRAPER_PROVIDER` is not set, the application defaults to `scraperapi`.

### Required Environment Variables

**For ScraperAPI:**
```bash
SCRAPER_PROVIDER=scraperapi
SCRAPERAPI_KEY=your_api_key_here
```

**For Firecrawl:**
```bash
SCRAPER_PROVIDER=firecrawl
FIRECRAWL_API_KEY=fc-your_api_key_here
```

## Implementation Details

The scraper abstraction is implemented in `lib/scraper/providers.ts`:

- `getScraperProvider()` - Returns the active provider from env
- `scrapeUrl(url, timeout)` - Scrapes a URL using the configured provider
- Both providers return the same `ScrapeResult` interface for consistency

## Timeout Configuration

Both providers use a 170-second timeout (configurable) to stay under the 180-second server action limit.

## Error Handling

Both providers handle:
- Timeout errors
- API key validation
- Network errors
- Provider-specific error messages
