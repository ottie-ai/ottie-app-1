# OpenAI Integration

The application now supports OpenAI API for AI-powered features like generating structured JSON from scraped data.

## Overview

The OpenAI integration provides utilities for:
- **Structured JSON Generation** - Convert text/HTML into structured JSON matching a schema
- **Text Generation** - Generate text completions for various use cases

## Setup

### 1. Get OpenAI API Key

1. Sign up at [https://platform.openai.com/](https://platform.openai.com/)
2. Go to API Keys section
3. Create a new API key
4. Copy the key (starts with `sk-`)

### 2. Configure Environment Variable

Add the following to your `.env.local` file:

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-your_api_key_here

# Optional: Disable OpenAI processing for debugging
# DISABLE_OPENAI_PROCESSING=true
```

**Important**: Do NOT commit `.env.local` to version control. It's already in `.gitignore`.

### Debug Mode

To disable OpenAI processing (useful for debugging scraping without AI costs):

```bash
DISABLE_OPENAI_PROCESSING=true
```

When enabled, Apify data will still be scraped and saved, but the OpenAI config generation step will be skipped. You can manually trigger it later via the "Generate Config" button on the preview page.

### 3. Usage

#### Generate Structured JSON

```typescript
import { generateStructuredJSON } from '@/lib/openai/client'

// Generate JSON from text/HTML
const json = await generateStructuredJSON(
  'Extract property data from this HTML: ...',
  schema, // Optional JSON schema
  'gpt-4o-mini' // Optional model (default: gpt-4o-mini)
)
```


## Implementation Details

### Client Location

The OpenAI client is located in:
- `lib/openai/client.ts` - Main client with utility functions

### Available Functions

1. **`getOpenAIClient()`** - Get OpenAI client instance
2. **`generateStructuredJSON(prompt, schema?, model?)`** - Generate structured JSON (first call - config generation)
3. **`generateTitle(propertyData, currentTitle?, currentHighlights?, model?)`** - Generate title and highlights (second call - creative generation)

### Error Handling

The client handles common errors:
- **401** - Invalid API key
- **429** - Rate limit exceeded
- **Other errors** - Generic error messages

### Models

Default model is `gpt-4o-mini` (cost-effective). You can override with:
- `gpt-4o` - More capable, higher cost
- `gpt-4-turbo` - Latest model
- `gpt-3.5-turbo` - Faster, cheaper alternative

## Example: Converting Scraped Data to Site Config

```typescript
import { generateStructuredJSON } from '@/lib/openai/client'
import { readFileSync } from 'fs'

// Load the sample config schema
const sampleConfig = JSON.parse(
  readFileSync('docs/site-config-sample.json', 'utf-8')
)

// Generate config from scraped HTML
const config = await generateStructuredJSON(
  `Convert this scraped property data into the site config format:\n\n${scrapedData}`,
  undefined, // No strict schema, just JSON object
  'gpt-4o-mini'
)
```

## Cost Considerations

- **gpt-4o-mini**: ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens
- **gpt-4o**: ~$2.50 per 1M input tokens, ~$10 per 1M output tokens
- Monitor usage in OpenAI dashboard

## Security Notes

1. **Never expose API key** - Keep it in `.env.local` only
2. **Use server-side only** - OpenAI client should only be used in server actions/API routes
3. **Rate limiting** - Implement rate limiting for production use
4. **Error handling** - Always handle API errors gracefully
