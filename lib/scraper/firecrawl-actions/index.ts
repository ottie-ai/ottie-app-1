/**
 * Firecrawl Actions Configuration
 * Website-specific actions to perform before scraping (e.g., clicking buttons)
 * 
 * Only websites with specific processing needs should have actions defined.
 * Random websites without specific processing will not have actions.
 */

export type FirecrawlAction = 
  | { type: 'wait'; milliseconds: number }
  | { type: 'click'; selector: string }
  | { type: 'write'; selector: string; text: string }
  | { type: 'press'; key: string }
  | { type: 'scroll'; direction: 'up' | 'down' | 'left' | 'right' }
  | { type: 'screenshot' }
  | { type: 'scrape' }

export interface FirecrawlActionsConfig {
  firstScrapeActions: FirecrawlAction[] | null // Actions for first scrape
  secondScrapeActions: FirecrawlAction[] | null // Actions for second scrape (if needed)
}

/**
 * Get Firecrawl actions for a specific URL
 * Returns null if no actions are needed for this website
 * 
 * For Realtor.com: Returns config with two different action sets
 * - First scrape: Click property-details accordion
 * - Second scrape: Click "View all listing photos" button
 * 
 * @param url - The URL to check
 * @returns FirecrawlActionsConfig with action sets, or null if no actions needed
 */
export function getFirecrawlActions(url: string): FirecrawlActionsConfig | null {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()
    
    // Realtor.com: Two scrapes with different actions
    if (hostname === 'realtor.com' || hostname === 'www.realtor.com') {
      return {
        firstScrapeActions: require('./realtor').getRealtorActionsPropertyDetails(),
        secondScrapeActions: require('./realtor').getRealtorActionsGalleryPhotos(),
      }
    }
    
    // Add more websites here as needed
    // Each website can have completely different actions
    
    // Return null for websites without specific actions
    return null
  } catch {
    return null
  }
}
