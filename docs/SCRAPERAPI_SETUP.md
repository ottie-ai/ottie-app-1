# ScraperAPI Integration Guide

This document explains how the ScraperAPI integration works in the Ottie App marketing homepage.

## Overview

The marketing homepage (`/`) now includes functionality to scrape real estate listing URLs entered by users. When the user clicks "Generate Free Site", the app:

1. Shows the animated loading sphere with rotating messages
2. Calls ScraperAPI to scrape the entered URL
3. Navigates to a test results page displaying the scraped HTML content

## Setup

### 1. Get ScraperAPI Key

1. Sign up at [https://www.scraperapi.com/](https://www.scraperapi.com/)
2. Get your API key from the dashboard
3. ScraperAPI offers a free tier with 5,000 API credits per month

### 2. Configure Environment Variable

Add the following to your `.env.local` file:

```bash
SCRAPERAPI_KEY=your_api_key_here
```

**Important**: Do NOT commit `.env.local` to version control. It's already in `.gitignore`.

## How It Works

### 1. Marketing Homepage (`/app/(marketing)/page.tsx`)

The homepage includes:
- URL input field with animated placeholder examples
- "Generate Free Site" button
- Loading state with animated sphere and rotating messages
- Error handling and validation

When the button is clicked:
```typescript
const handleGenerate = async () => {
  // Validates URL
  // Shows loading animation
  // Calls scrapeUrl() server action
  // Navigates to results page
}
```

### 2. Server Action (`/app/(marketing)/actions.ts`)

The `scrapeUrl()` function:
- Validates the URL format
- Checks for SCRAPERAPI_KEY environment variable
- Makes a request to ScraperAPI
- Returns HTML content or error message

```typescript
export async function scrapeUrl(url: string) {
  // URL validation
  // ScraperAPI call
  // Return { success, html, url, scrapedAt } or { error }
}
```

### 3. Test Results Page (`/app/(marketing)/test-results/page.tsx`)

Displays:
- The scraped URL and timestamp
- Statistics (content size, lines, images, links found)
- Raw HTML content in a scrollable container
- Copy to clipboard button
- Information about future AI enhancements

## Testing

1. Start the development server:
```bash
npm run dev
```

2. Navigate to the homepage (`http://localhost:3000`)

3. Enter a real estate listing URL (e.g., from Zillow, Airbnb, Realtor.com)

4. Click "Generate Free Site"

5. Watch the loading animation

6. View the results on the test page

## Example URLs for Testing

```
https://www.zillow.com/homedetails/123-Main-St
https://www.airbnb.com/rooms/12345678
https://www.realtor.com/realestateandhomes-detail/456-Oak-Ave
```

## Error Handling

The integration handles several error cases:

- **Empty URL**: Shows error message below input
- **Invalid URL format**: Validates URL before making API call
- **Missing API key**: Returns user-friendly error
- **ScraperAPI error**: Displays API error message
- **Network error**: Catches and displays unexpected errors

All errors:
- Stop the loading animation
- Display error message below the input field
- Keep the user on the homepage to retry

## Future Enhancements

The test results page mentions these planned features:

1. **AI-powered content extraction**
   - Extract property details, descriptions, prices
   - Identify and download images
   - Parse structured data

2. **Automatic site generation**
   - Create Ottie site from scraped data
   - Apply appropriate templates
   - Import images to workspace

3. **Template selection**
   - AI-suggested templates based on content
   - Customization options

4. **Direct builder import**
   - Navigate directly to builder with pre-filled data
   - Skip manual data entry

## API Rate Limits

ScraperAPI free tier includes:
- 5,000 API credits/month
- Concurrent requests: 5
- Support for most websites

Monitor your usage in the ScraperAPI dashboard.

## Troubleshooting

### "Scraper API is not configured" error

- Make sure `SCRAPERAPI_KEY` is set in `.env.local`
- Restart the development server after adding the key
- Verify the key is correct (check ScraperAPI dashboard)

### "Failed to scrape URL" error

- Check if the URL is accessible
- Some websites may block scraping
- Verify your ScraperAPI account has remaining credits
- Check ScraperAPI dashboard for detailed error logs

### Loading animation doesn't stop

- Check browser console for JavaScript errors
- Verify the server action is completing (check server logs)
- Try refreshing the page

## Technical Notes

### Why ScraperAPI?

ScraperAPI handles:
- IP rotation and proxy management
- CAPTCHA solving
- Browser fingerprinting
- JavaScript rendering (on paid plans)
- Retry logic and error handling

This makes it much more reliable than direct HTTP requests for scraping real estate sites.

### Data Flow

```
User Input → Validation → Loading State → Server Action → ScraperAPI → 
Raw HTML → URL Params → Results Page → Display
```

### Security Considerations

- API key is stored server-side only (never exposed to client)
- URL validation prevents malicious input
- Server action runs on server (protected by Next.js)
- No scraped data is stored in database (ephemeral display only)
