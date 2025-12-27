# Replicate Setup Guide

This guide explains how to set up Replicate for hero image upscaling in the Ottie App.

## Overview

Replicate is used for **Call 4** in the generation pipeline - hero image upscaling with Real-ESRGAN. When the Vision Analysis (Call 3) selects a hero image that is smaller than 1920px width, Replicate automatically upscales it using AI to ensure high-quality images for real estate listings.

## Why Replicate?

- **AI-powered upscaling**: Real-ESRGAN produces high-quality results that look natural
- **Simple API**: Single endpoint for image upscaling
- **Pay-per-use**: Only pay when upscaling is needed
- **Fast**: Results typically in 10-30 seconds

## Setup Instructions

### 1. Create Replicate Account

1. Go to [https://replicate.com](https://replicate.com)
2. Sign up for a free account
3. Add billing information (required for API usage)

### 2. Get API Token

1. Go to [https://replicate.com/account/api-tokens](https://replicate.com/account/api-tokens)
2. Click "Create token"
3. Give it a name (e.g., "Ottie App")
4. Copy the token (starts with `r8_`)

### 3. Configure Environment Variable

Add your Replicate API token to your `.env.local` file:

```bash
REPLICATE_API_TOKEN=r8_your_replicate_api_token_here
```

### 4. Restart Development Server

If you're running the dev server, restart it to load the new environment variable:

```bash
npm run dev
```

## How It Works

### Generation Pipeline

```
Call 1: JSON Generation (Groq/OpenAI)
   ↓
Call 2: Title/Highlights (OpenAI)
   ↓
Call 3: Vision Analysis (Groq - selects best hero image)
   ↓
Call 4: Hero Upscaling (Replicate - if needed) ← NEW!
   ↓
Final Config Generated
```

### Upscaling Logic

1. **Check dimensions**: After Call 3 selects the best hero image, fetch the image and check its width
2. **Calculate scale factor**:
   - If width ≥ 1920px: Skip upscaling
   - If width < 1920px: Calculate optimal scale (2x or 4x)
3. **Upscale**: Send to Real-ESRGAN model on Replicate
4. **Upload**: Download upscaled image and upload to Supabase Storage
5. **Update config**: Replace hero image URL with upscaled version

### Scale Factor Examples

| Original Width | Scale Factor | Result Width |
|----------------|--------------|--------------|
| 1920px+        | None         | No upscaling |
| 960px          | 2x           | 1920px       |
| 1200px         | 2x           | 2400px       |
| 480px          | 4x           | 1920px       |
| 400px          | 4x           | 1600px       |

**Note**: Real-ESRGAN supports maximum 4x upscaling.

## Model Used

**Model**: `nightmareai/real-esrgan`
- **Version**: `42fd94b5...` (Real-ESRGAN x4plus)
- **Input**: Image URL + scale factor (2 or 4)
- **Output**: Upscaled image URL
- **Face enhance**: Disabled (we want general property images, not portrait enhancement)

## Error Handling

The upscaling system has robust error handling:

1. **Timeout**: 120 seconds max for API call
2. **Retry**: Automatically retries once on failure
3. **Fallback**: Uses original image if upscaling fails
4. **Silent failure**: Generation continues even if upscaling fails

### Example Logs

**Successful upscaling:**
```
🚀 [Upscale] Starting hero image upscaling check...
📐 [Upscale] Getting dimensions for: https://example.com/image.jpg
✅ [Upscale] Dimensions: 800x600
🔍 [Upscale] Image is 800px wide, upscaling with 2x factor...
🔍 [ESRGAN] Upscaling image with 2x scale...
✅ [ESRGAN] Upscaling complete (15234ms)
📥 [Upscale] Downloading and uploading upscaled image to storage...
✅ [Upscale] Hero image successfully upscaled from 800px to ~1600px
```

**Skipped (no upscaling needed):**
```
🚀 [Upscale] Starting hero image upscaling check...
📐 [Upscale] Getting dimensions for: https://example.com/image.jpg
✅ [Upscale] Dimensions: 2400x1800
✅ [Upscale] Image is already 2400px wide (>= 1920px), no upscaling needed
```

**Failure (uses original):**
```
🚀 [Upscale] Starting hero image upscaling check...
❌ [ESRGAN] Error after 5000ms: API timeout
🔄 [ESRGAN] Retrying upscaling...
❌ [ESRGAN] Retry failed: API timeout
⚠️ [Upscale] Falling back to original image
```

## Pricing

Replicate charges per-second of model runtime:

- **Real-ESRGAN**: ~$0.00055/second
- **Average upscaling**: 10-30 seconds
- **Cost per upscale**: ~$0.005-$0.015

For 1000 generations:
- If 50% need upscaling (500 upscales)
- Average cost: 500 × $0.01 = **$5**

Very affordable for high-quality AI upscaling.

## Optional: Disable Upscaling

If you want to disable upscaling:

1. Remove `REPLICATE_API_TOKEN` from `.env.local`
2. The system will skip Call 4 and log: `REPLICATE_API_TOKEN is not configured`

## Troubleshooting

### "REPLICATE_API_TOKEN is not configured"

**Solution**: Add the environment variable to `.env.local` and restart your dev server.

### "Replicate API timeout"

**Possible causes**:
- Large image taking too long to process
- Replicate API is slow/down
- Network issues

**Solution**: The system will retry once automatically, then fall back to the original image.

### Images still look small

**Possible causes**:
- Original image was already ≥1920px (no upscaling needed)
- Upscaling failed silently (check logs)
- Image quality was low before upscaling

**Solution**: Check the logs for `[ESRGAN]` and `[Upscale]` messages to see what happened.

## Testing

To test upscaling:

1. Generate a site with a small hero image (< 1920px width)
2. Check the logs for Call 4 messages
3. Verify the final hero image is upscaled in the preview

## Learn More

- [Replicate Documentation](https://replicate.com/docs)
- [Real-ESRGAN Model](https://replicate.com/nightmareai/real-esrgan)
- [AI Providers Documentation](./AI_PROVIDERS.md)

