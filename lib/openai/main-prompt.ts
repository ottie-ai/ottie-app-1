/**
 * OpenAI Main Prompt
 * Centralized main prompt for first OpenAI call (JSON config generation)
 */

import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Get system message for real estate config generation
 * @returns System message string
 */
export function getRealEstateConfigSystemMessage(): string {
  return `You are an AI assistant inside a SaaS tool that generates real estate one‑pager websites.

Role:

- Analyze LLM‑ready markdown of property listings.

- Produce clean, structured JSON configs that can be rendered directly into a one‑pager.

Behavior rules:

- Always respond with VALID JSON only, no explanations or extra text.

- Never include markdown, prose, or code fences in your reply.

- Use only fields and structure specified in the user's instructions.

- Do not invent facts that are not clearly supported or implied by the input.

- Ignore navigation menus, similar properties, recommendations, footer content, and portal boilerplate.

Style:

- Highlights must be concise, punchy, and benefit‑driven.

If there is any ambiguity, prefer conservative, safe defaults rather than guessing.`
}

/**
 * Get the real estate config generation prompt
 * 
 * @param dataType - Type of data: 'apify' for JSON data, 'text' for property text
 * @param dataToProcess - The actual data to process (JSON stringified or text)
 * @param sampleConfig - Optional sample config (will be loaded if not provided)
 * @returns Complete prompt string
 */
export function getRealEstateConfigPrompt(
  dataType: 'apify' | 'text',
  dataToProcess: string,
  sampleConfig?: any
): string {
  if (!sampleConfig) {
    const sampleConfigPath = join(process.cwd(), 'docs', 'site-config-sample.json')
    sampleConfig = JSON.parse(readFileSync(sampleConfigPath, 'utf-8'))
  }

  return `Analyze real estate listing. Fill JSON config for one-pager.

PRIORITY FIELDS (fill FIRST):

1. **language** (ISO 2-letter: en/es/de/cs/sk/fr/it) → ALL TEXT in this language

3. currency (infer from symbol/location: $, €, £, Kč → USD/EUR/GBP/CZK)

4. price info extract number only

5. photos: list of main property photos, ideally JPEG or WebP and largest size you can find, no duplicates

6. beds, baths, living_area

7. description, exactly as in the listing text, usually the longest text

8. highlights

9. property address

10. agent info

11. property type: Choose ONE from: HOUSE, TOWNHOUSE, CONDO, LAND, MULTI_FAMILY, MOBILE_HOME, APARTMENT, FARM_RANCH, OTHER

12. property_status: choose ONE from: FOR_SALE, FOR_RENT, SOLD, UNDER_CONTRACT, PENDING, OFF_MARKET, OTHER, Map portal labels like "available", "for sale", "à vendre" → FOR_SALE.

RULES:

- Missing = "" / 0 / []

- NO hallucinations, use ONLY listing data

- Ignore: similar properties, navigation, footers

- font: "Inter" (modern) or "Playfair Display" (luxury) based on property style

- brand_color: single HEX matching property style

- **highlights exactly 6**

- floorplan_url:
   - Try to find a dedicated floor plan file or image for this listing.
   - Accept formats: PDF, SVG, JPG, JPEG, PNG, WEBP.
   - Look for buttons or links labeled "Floor plan", "Plans", "Grundriss", "Plano", etc., or gallery images that clearly show a 2D floor plan

- completeness: integer 0–100, conservative estimate of how many relevant fields were successfully filled.

- language: detect from listing → set language field to ISO code (en/es/de/cs/sk/fr/it) and keep ALL text fields in this language.

- agent.agency:
  - If the listing is on an agency's own website, use the real estate agency / brokerage name from the site header, footer, url or contact/about section.
  - If the listing is on a large portal (Zillow, Idealista, Rightmove, etc.), prefer the listing agent's brokerage/office name if shown; if only portal branding is visible and no brokerage is clearly indicated, leave agency as an empty string.

- photo rules:
  - only REAL property photos (interior/exterior, views, amenities).
  - Prefer URLs that share the same base pattern / path as the main listing gallery images.
  - If most photos come from e.g. "https://imgs.soukwportugal.pt/37734/properties/...", keep ONLY URLs that match this pattern.
  - exclude:
    - generic site images (e.g. "/images/photo-*.webp", stock backgrounds, logos, icons),
    - images from different domains or paths that are not part of the listing gallery.
  - Remove any duplicates.

JSON STRUCTURE:

${JSON.stringify(sampleConfig, null, 2)}

DATA TO PROCESS:

${dataToProcess}`
}

