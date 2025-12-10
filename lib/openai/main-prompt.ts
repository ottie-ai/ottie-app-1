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
  return `Analyze real estate listing markdown. Ignore boilerplate. Return VALID JSON config for one-pager only.`
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

PRIORITY (fill first):
1. language (ISO: en/es/de/cs/sk/fr/it) → ALL text in this language
2. currency ($→USD, €→EUR, £→GBP, Kč→CZK)
3. price (numbers only)
4. photos (main property JPEG/WebP, same gallery pattern, no duplicates/logos)
5. beds/baths/living_area
6. description (exact as in listing)
7. address/agent/property_type (HOUSE, TOWNHOUSE, CONDO, LAND, MULTI_FAMILY, MOBILE_HOME, APARTMENT, FARM_RANCH, OTHER)/status (FOR_SALE, FOR_RENT, SOLD, UNDER_CONTRACT, PENDING, OFF_MARKET, OTHER)

RULES:
- Missing: ""/0/[]
- Exactly 6 highlights
- Ignore boilerplate/similar listings
- font: Inter (modern) or Playfair (luxury)
- brand_color: matching HEX
- completeness: 0-100 conservative
- floorplan_url: dedicated PDF/JPG/SVG "Floor plan"/"Grundriss"
- agency: listing agent's brokerage/office name if available (agency sites OR portals), empty if only portal branding

JSON STRUCTURE:

${JSON.stringify(sampleConfig, null, 2)}

DATA TO PROCESS:

${dataToProcess}`
}

