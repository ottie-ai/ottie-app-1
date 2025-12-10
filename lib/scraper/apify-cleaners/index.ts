/**
 * Apify JSON Cleaners
 * Website-specific JSON cleaning functions for Apify scrapers
 * 
 * IMPORTANT: All Apify cleaners MUST follow this two-step cleaning process:
 * 
 * Step 1 (UNIVERSAL): Call removeEmptyValues() to remove all empty values
 *   - Removes: null, undefined, empty strings, empty arrays, empty objects
 *   - This ensures consistent cleaning across all scrapers
 * 
 * Step 2 (WEBSITE-SPECIFIC): Remove technical fields specific to the scraper
 *   - Example: 'url', 'requestId', 'loadedUrl', etc.
 *   - Each website may have different technical fields to remove
 * 
 * When adding a new Apify scraper, follow this pattern:
 * 1. Import removeEmptyValues from './utils'
 * 2. Call removeEmptyValues(apifyJson) as the first step
 * 3. Then remove website-specific technical fields
 * 
 * See zillow.ts or realtor.ts for reference implementations.
 */

export type ApifyJsonCleaner = (apifyJson: any) => any

// Import website-specific cleaners
export { cleanZillowJson } from './zillow'
export { cleanRealtorJson } from './realtor'
export { removeEmptyValues } from './utils'

/**
 * Get the appropriate JSON cleaner for a scraper ID
 * 
 * @param scraperId - The scraper ID (e.g., 'zillow', 'realtor')
 * @returns The cleaner function for that scraper, or null if no cleaner exists
 */
export function getApifyCleaner(scraperId: string): ApifyJsonCleaner | null {
  switch (scraperId) {
    case 'zillow':
      return require('./zillow').cleanZillowJson
    case 'realtor':
      return require('./realtor').cleanRealtorJson
    default:
      return null
  }
}
