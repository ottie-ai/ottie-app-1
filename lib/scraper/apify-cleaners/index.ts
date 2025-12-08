/**
 * Apify JSON Cleaners
 * Website-specific JSON cleaning functions for Apify scrapers
 * 
 * Each website has its own cleaning logic to remove unnecessary fields
 * and transform the data structure as needed.
 */

export type ApifyJsonCleaner = (apifyJson: any) => any

// Import website-specific cleaners
export { cleanZillowJson } from './zillow'

/**
 * Get the appropriate JSON cleaner for a scraper ID
 * 
 * @param scraperId - The scraper ID (e.g., 'zillow')
 * @returns The cleaner function for that scraper, or null if no cleaner exists
 */
export function getApifyCleaner(scraperId: string): ApifyJsonCleaner | null {
  switch (scraperId) {
    case 'zillow':
      return require('./zillow').cleanZillowJson
    default:
      return null
  }
}
