/**
 * Apify Scraper Configurations
 * Defines which Apify actors to use for specific websites
 */

import type { ApifyJsonCleaner } from './apify-cleaners'

export interface ApifyScraperConfig {
  id: string // Unique identifier (e.g., 'zillow')
  name: string // Display name (e.g., 'Zillow Detail Scraper')
  actorId: string // Apify actor ID (e.g., 'maxcopell/zillow-detail-scraper')
  shouldHandle: (url: string) => boolean // Function to check if this scraper should handle the URL
  buildInput: (url: string, proxyGroups?: string[]) => any // Function to build the input object for the actor
  cleanJson?: ApifyJsonCleaner // Optional: Website-specific JSON cleaning function
}

import { cleanZillowJson } from './apify-cleaners/zillow'
import { cleanRealtorJson } from './apify-cleaners/realtor'

/**
 * List of configured Apify scrapers
 * Add new scrapers here for additional website support
 * 
 * Each scraper can have:
 * - id: Unique identifier
 * - name: Display name
 * - actorId: Apify actor ID
 * - shouldHandle: Function to detect if URL matches this scraper
 * - buildInput: Function to build Apify actor input
 * - cleanJson: Optional website-specific JSON cleaning function
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
    cleanJson: cleanZillowJson, // Zillow-specific JSON cleaning
  },
  {
    id: 'realtor',
    name: 'Realtor.com Search Scraper',
    actorId: 'memo23~realtor-search-cheerio',
    shouldHandle: (url: string) => {
      try {
        const urlObj = new URL(url)
        const hostname = urlObj.hostname.toLowerCase()
        return hostname === 'realtor.com' || hostname === 'www.realtor.com'
      } catch {
        return false
      }
    },
    buildInput: (url: string, proxyGroups?: string[]) => {
      return {
        startUrls: [{ url }],
        proxy: {
          useApifyProxy: true,
          ...(proxyGroups && proxyGroups.length > 0 && { apifyProxyGroups: proxyGroups }),
        },
      }
    },
    cleanJson: cleanRealtorJson, // Realtor.com-specific JSON cleaning
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

/**
 * Find an Apify scraper by its ID
 * 
 * @param scraperId - The scraper ID (e.g., 'zillow')
 * @returns ApifyScraperConfig if found, null otherwise
 */
export function findApifyScraperById(scraperId: string): ApifyScraperConfig | null {
  return APIFY_SCRAPERS.find(scraper => scraper.id === scraperId) || null
}
