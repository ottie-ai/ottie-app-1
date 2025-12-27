# Apify Scraper Integration - README

## 🎯 What Was Implemented

Your URL scraper now has **automatic routing** to dedicated Apify scrapers for specific websites. The system intelligently chooses the best scraper based on the URL.

### Current Implementation

- ✅ **Zillow.com** → Automatic routing to Zillow Detail Scraper (returns structured JSON)
- ✅ **All other websites** → Fallback to general scraper (ScraperAPI or Firecrawl)
- ✅ **Extensible system** → Easy to add more websites (5 minutes per site)

## 🚀 Quick Start

### 1. Add Your Apify Token

```bash
# Add to .env.local
APIFY_API_TOKEN=your_apify_token_here
```

Get your token: [apify.com/settings/integrations](https://apify.com/settings/integrations)

### 2. Test with Zillow

Try scraping any Zillow property URL:
```
https://www.zillow.com/homedetails/123-Main-St-City-CA-12345/123456789_zpid/
```

The system will:
- Detect it's Zillow
- Automatically use the Zillow Apify scraper
- Return structured JSON with property details

### 3. Test with Other URL

Try scraping any other URL:
```
https://example.com/property
```

The system will:
- Detect no specific scraper available
- Use general scraper (ScraperAPI/Firecrawl)
- Return raw HTML

## 📋 How URLs Are Routed

```
┌─────────────────────────────────────────────┐
│            User enters URL                   │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│     Check: Is this a known website?          │
└──────────────────┬──────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
  ┌──────────┐        ┌──────────────┐
  │   YES    │        │      NO      │
  └────┬─────┘        └──────┬───────┘
       │                     │
       ▼                     ▼
┌─────────────┐      ┌──────────────┐
│ Apify Actor │      │ General      │
│ (JSON)      │      │ Scraper(HTML)│
└─────────────┘      └──────────────┘
```

## 🔧 Adding New Websites

### Supported by Apify Store

Find actors at [apify.com/store](https://apify.com/store) for:
- Real estate sites (Redfin, Realtor.com, Trulia)
- Job boards (Indeed, LinkedIn)
- E-commerce (Amazon, eBay)
- Social media (Twitter, Instagram)
- And many more...

### Implementation (5 Minutes)

1. Find actor in Apify Store
2. Edit `lib/scraper/apify-scrapers.ts`
3. Add new entry to `APIFY_SCRAPERS` array:

```typescript
{
  id: 'redfin',
  name: 'Redfin Scraper',
  actorId: 'username/redfin-scraper',
  shouldHandle: (url: string) => {
    try {
      const urlObj = new URL(url)
      return urlObj.hostname.includes('redfin.com')
    } catch {
      return false
    }
  },
  buildInput: (url: string) => ({
    urls: [url],
  }),
}
```

4. Done! Restart dev server and test.

## 📖 Documentation

| Document | Purpose |
|----------|---------|
| [APIFY_SETUP_GUIDE.md](./APIFY_SETUP_GUIDE.md) | Quick start guide |
| [APIFY_INTEGRATION.md](./APIFY_INTEGRATION.md) | Complete integration guide |
| [SCRAPER_PROVIDERS.md](./SCRAPER_PROVIDERS.md) | All scraper providers |

## 💰 Cost Comparison

### Zillow Example (1,000 properties)

**Before** (General Scraper):
- Get HTML → Parse with AI → Extract data
- Cost: Variable (depends on provider + AI parsing)
- Reliability: Medium (breaks when HTML changes)

**After** (Apify Zillow Scraper):
- Get structured JSON directly
- Cost: $3 per 1,000 properties
- Reliability: High (maintained by Apify)

## 🎨 Benefits

### For Known Websites (Zillow, etc.)
- 🚀 **Faster**: No HTML parsing needed
- 💎 **Better Data**: Structured JSON vs raw HTML
- 🛡️ **More Reliable**: Better anti-scraping bypass
- 🔄 **Maintained**: Apify handles website changes

### For Unknown Websites
- 🔄 **No Change**: Same workflow as before
- 📄 **Raw HTML**: For custom processing
- 💰 **Cost-effective**: Use general scraper for simple sites

## 🐛 Troubleshooting

### Zillow URLs using general scraper

Check console logs. You should see:
```
🎯 [Routing] URL matched Apify scraper: Zillow Detail Scraper
```

If you see `Using general scraper` instead, the URL might not be recognized. Verify it's a valid Zillow URL.

### Error: APIFY_API_TOKEN not configured

Add the token to `.env.local` and restart your dev server.

### Apify run failed

Check [Apify Console](https://apify.com/console) for run details and error logs.

## ✅ Verification

Test your implementation:

```bash
# Console logs should show:
🎯 [Routing] URL matched Apify scraper: Zillow Detail Scraper
🔵 [Apify:Zillow Detail Scraper] Scraping URL: https://...
🔵 [Apify:Zillow Detail Scraper] Run started with ID: ...
✅ [Apify:Zillow Detail Scraper] Successfully scraped URL, items count: 1
```

## 📦 Implementation Files

```
lib/scraper/
├── apify-scrapers.ts   ← Add new websites here
├── apify-client.ts     ← Apify API client
└── providers.ts        ← Routing logic

app/(marketing)/
└── actions.ts          ← Handles both JSON & HTML results
```

## 🎉 You're Ready!

The system is fully functional and ready to use. Start by testing with Zillow URLs, then add more websites as needed.

Need help? See [APIFY_INTEGRATION.md](./APIFY_INTEGRATION.md) for detailed documentation.















