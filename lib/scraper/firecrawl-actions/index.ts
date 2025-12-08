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
 * Get Firecrawl actions for a specific URL
 * Returns null if no actions are needed for this website
 * 
 * For Realtor.com: Returns combined actions that:
 * 1. Click property-details accordion
 * 2. Click "View all listing photos" button
 * 3. Scrape once with both expanded
 * 
 * @param url - The URL to check
 * @returns FirecrawlActionsConfig with actions, or null if no actions needed
 */
export function getFirecrawlActions(url: string): FirecrawlActionsConfig | null {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()
    
    // Realtor.com: Combined actions in one scrape
    if (hostname === 'realtor.com' || hostname === 'www.realtor.com') {
      return {
        actions: require('./realtor').getRealtorActionsCombined(),
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
