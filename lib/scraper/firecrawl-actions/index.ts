/**
 * Firecrawl Actions Configuration
 * Website-specific actions to perform before scraping (e.g., clicking buttons)
 * 
 * Only websites with specific processing needs should have actions defined.
 * Random websites without specific processing will not have actions.
 */

export type FirecrawlAction = 
  | { type: 'wait'; milliseconds?: number; ms?: number } // Support both 'milliseconds' and 'ms'
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
    
    // Homes.com: No actions needed - uses universal Firecrawl scraping
    // (hostname === 'homes.com' || hostname === 'www.homes.com') - no actions required
    
    // Add more websites here as needed
    // Each website can have completely different actions
    
    // Return null for websites without specific actions (uses universal scraping)
    return null
  } catch {
    return null
  }
}

/**
 * Generate a random delay between min and max milliseconds
 * Mimics human reading/thinking time
 */
function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Get combined Firecrawl actions for single call with multiple scrapes
 * Combines main content actions + first scrape + gallery click + second scrape
 * Returns actions array: [main actions..., scrape1, wait, click, wait, scrape2]
 * 
 * Format matches user requirement:
 * - scrape1 (raw HTML) - 1 credit
 * - wait (random delay) - 0 credits
 * - click (gallery button) - 0 credits (only for websites that need it)
 * - wait (random delay) - 0 credits
 * - scrape2 (gallery HTML) - 1 credit
 * 
 * @param url - The URL to check
 * @returns Combined actions array, or null if no gallery actions needed (single scrape)
 */
export function getFirecrawlActionsCombined(url: string): FirecrawlAction[] | null {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()
    
    // Get main content actions (if any) - for property details expansion
    const mainActions = getFirecrawlActions(url)
    const mainActionsList = mainActions?.actions || []
    
    // Get gallery actions (if any) - to extract click action
    const galleryActionsConfig = getFirecrawlActionsGallery(url)
    
    // If no gallery actions, return null (use single scrape, no combined call needed)
    if (!galleryActionsConfig || !galleryActionsConfig.actions) {
      return null
    }
    
    // Extract click action from gallery actions
    // Gallery actions format: [wait, scroll, wait, click, wait, scroll, wait, scrape]
    // We need the click action and wait timings
    const galleryActions = galleryActionsConfig.actions
    const galleryClickAction = galleryActions.find((a: any) => a.type === 'click')
    
    if (!galleryClickAction) {
      // No click action needed, return null (single scrape)
      return null
    }
    
    // Build combined actions array:
    // 1. Main content actions (if any) - remove final 'scrape' if present
    // 2. First scrape (get raw HTML) - 1 credit
    // 3. Wait (random 1.5-2.5s) - 0 credits
    // 4. Click gallery button - 0 credits
    // 5. Wait (random 1-2s) - 0 credits
    // 6. Second scrape (get gallery HTML) - 1 credit
    
    const combinedActions: FirecrawlAction[] = []
    
    // Add main content actions (without final scrape if present)
    // These are actions like expanding property details, scrolling, etc.
    const mainActionsWithoutScrape = mainActionsList.filter((a: any) => a.type !== 'scrape')
    combinedActions.push(...mainActionsWithoutScrape)
    
    // First scrape (raw HTML - pre-action)
    combinedActions.push({ type: 'scrape' })
    
    // Wait before clicking gallery (random delay like before)
    combinedActions.push({ type: 'wait', ms: randomDelay(1500, 2500) })
    
    // Click gallery button (extracted from gallery actions)
    combinedActions.push(galleryClickAction)
    
    // Wait after clicking (random delay like before)
    combinedActions.push({ type: 'wait', ms: randomDelay(1000, 2000) })
    
    // Second scrape (gallery HTML - post-action)
    combinedActions.push({ type: 'scrape' })
    
    return combinedActions
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
 * @deprecated Use getFirecrawlActionsCombined() for single call with multiple scrapes
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
    
    // Homes.com: Gallery actions (Call 2)
    if (hostname === 'homes.com' || hostname === 'www.homes.com') {
      return {
        actions: require('./homes').getHomesActionsGallery(),
      }
    }
    
    // Add more websites here as needed
    
    // Return null for websites without gallery actions (uses single call)
    return null
  } catch {
    return null
  }
}
