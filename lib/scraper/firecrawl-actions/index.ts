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
  actions: FirecrawlAction[] | null // Combined actions for single scrape
}

/**
 * Get Firecrawl actions for a specific URL (Call 1 - main content)
 * Returns null if no actions are needed for this website
 * 
 * For Realtor.com: Returns property details actions only
 * 
 * @param url - The URL to check
 * @returns FirecrawlActionsConfig with actions, or null if no actions needed
 */
export function getFirecrawlActions(url: string): FirecrawlActionsConfig | null {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()
    
    // Realtor.com: Property details actions only (Call 1)
    if (hostname === 'realtor.com' || hostname === 'www.realtor.com') {
      return {
        actions: require('./realtor').getRealtorActionsPropertyDetails(),
      }
    }
    
    // Redfin.com: No actions needed - uses universal Firecrawl scraping
    // (hostname === 'redfin.com' || hostname === 'www.redfin.com') - no actions required
    
    // Add more websites here as needed
    // Each website can have completely different actions
    
    // Return null for websites without specific actions (uses universal scraping)
    return null
  } catch {
    return null
  }
}

/**
 * Get Firecrawl actions for gallery extraction (Call 2 - images only)
 * Returns null if no gallery actions are needed for this website
 * 
 * For Realtor.com: Returns gallery expansion actions only
 * 
 * @param url - The URL to check
 * @returns FirecrawlActionsConfig with gallery actions, or null if no gallery actions needed
 */
export function getFirecrawlActionsGallery(url: string): FirecrawlActionsConfig | null {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()
    
    // Realtor.com: Gallery actions only (Call 2)
    if (hostname === 'realtor.com' || hostname === 'www.realtor.com') {
      return {
        actions: require('./realtor').getRealtorActionsGallery(),
      }
    }
    
    // Redfin.com: Gallery actions (Call 2)
    if (hostname === 'redfin.com' || hostname === 'www.redfin.com') {
      return {
        actions: require('./redfin').getRedfinActionsGallery(),
      }
    }
    
    // Add more websites here as needed
    
    // Return null for websites without gallery actions (uses single call)
    return null
  } catch {
    return null
  }
}
