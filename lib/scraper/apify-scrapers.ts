/**
 * Apify Scraper Configurations
 * Defines which Apify actors to use for specific websites
 */

export interface ApifyScraperConfig {
  id: string // Unique identifier (e.g., 'zillow')
  name: string // Display name (e.g., 'Zillow Detail Scraper')
  actorId: string // Apify actor ID (e.g., 'maxcopell/zillow-detail-scraper')
  shouldHandle: (url: string) => boolean // Function to check if this scraper should handle the URL
  buildInput: (url: string) => any // Function to build the input object for the actor
}

/**
 * List of configured Apify scrapers
 * Add new scrapers here for additional website support
 */
export const APIFY_SCRAPERS: ApifyScraperConfig[] = [
  {
    id: 'zillow',
    name: 'Zillow Detail Scraper',
    actorId: 'maxcopell~zillow-detail-scraper',
    shouldHandle: (url: string) => {
      try {
        const urlObj = new URL(url)
        const hostname = urlObj.hostname.toLowerCase()
        return hostname === 'zillow.com' || hostname === 'www.zillow.com'
      } catch {
        return false
      }
    },
    buildInput: (url: string) => {
      return {
        startUrls: [{ url }],
      }
    },
  },
]

/**
 * Find the appropriate Apify scraper for a given URL
 * 
 * @param url - URL to check
 * @returns ApifyScraperConfig if a matching scraper is found, null otherwise
 */
export function findApifyScraperForUrl(url: string): ApifyScraperConfig | null {
  for (const scraper of APIFY_SCRAPERS) {
    if (scraper.shouldHandle(url)) {
      return scraper
    }
  }
  return null
}
