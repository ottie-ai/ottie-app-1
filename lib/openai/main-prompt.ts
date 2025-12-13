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

  // Remove fields that are generated in the second OpenAI call (title, subtitle, highlights)
  const { title, subtitle, highlights, ...configWithoutTitleFields } = sampleConfig

  return `Analyze real estate listing. Fill JSON config for one-pager.

PRIORITY FIELDS (fill FIRST):

1. **language** (ISO 2-letter: en/es/de/cs/sk/fr/it) → ALL TEXT in this language

2. currency (infer from symbol/location: $, €, £, Kč → USD/EUR/GBP/CZK)

3. price info extract number only

4. photos

5. beds, baths, living_area

6. description, exactly as in the listing text

7. property address

8. agent info

9. property type: Choose ONE from: HOUSE, TOWNHOUSE, CONDO, LAND, MULTI_FAMILY, MOBILE_HOME, APARTMENT, FARM_RANCH, OTHER

10. property_status: choose ONE from: FOR_SALE, FOR_RENT, SOLD, UNDER_CONTRACT, PENDING, OFF_MARKET, OTHER.

RULES:

- Missing = "" / 0 / []

- NO hallucinations, use ONLY listing data

- Ignore: similar properties, navigation, footers

- floorplan_url: Find a dedicated floor plan (PDF/SVG/image url). Look for "Floor plan"/"Plans"/"Grundriss" links in all languages.

- language: detect from listing → set language field to ISO code (en/es/de/cs/sk/fr/it) and keep ALL text fields in this language.

- interest_rate: in percent

- do not use currency in unit

- country: if you can't generate country from content, guess it based on address and language combination

- photos: EXHAUSTIVE LIST. You MUST extract EVERY single photo URL found in the input. Do not truncate the array. Maximum 20. Keep the same order.

- agent.agency: 
  - On agency sites: use agency name from header/footer/contact.
  - On portals (Zillow, Idealista, etc.): use the listing agent's brokerage name if shown. Do NOT use the portal name (e.g. "Zillow") as the agency; if unknown, leave empty.

- photos:
  - Select the HIGHEST resolution available.
  - If an image appears in both src (thumbnail) and href (lightbox/zoom), ALWAYS use the URL from href.
  - Look for patterns indicating size like ".w1200.", "full", "large" over ".w425.", "thumb", "small".
  - Prefer URLs that share the same base pattern / path as the main listing gallery images.
  - If most photos come from e.g. "https://imgs.soukwportugal.pt/37734/properties/...", keep ONLY URLs that match this pattern.



JSON STRUCTURE:

${JSON.stringify(configWithoutTitleFields, null, 2)}

DATA TO PROCESS:

${dataToProcess}`
}

