/**
 * Redfin.com-specific Firecrawl actions
 * Actions to perform before scraping Redfin.com property pages
 * 
 * These actions mimic human behavior with variable delays and scroll actions
 * to reduce bot detection and improve reliability.
 */

import type { FirecrawlAction } from './index'

/**
 * Generate a random delay between min and max milliseconds
 * Mimics human reading/thinking time
 */
function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Get actions for Redfin.com gallery expansion (Call 2)
 * Clicks photo preview button to expand gallery and extract all image URLs
 * 
 * Flow with human-like behavior:
 * 1. Wait for page to load (variable delay)
 * 2. Scroll down slightly (human-like reading behavior)
 * 3. Click button in div#photoPreviewButton to expand gallery
 * 4. Wait for gallery to load (variable delay)
 * 5. Scroll to ensure gallery is fully loaded (human-like behavior)
 * 6. Scrape the page with gallery expanded
 * 
 * @returns Array of actions to perform in sequence
 */
export function getRedfinActionsGallery(): FirecrawlAction[] {
  return [
    // Step 1: Wait for page to load (human-like: 1.5-2.5 seconds)
    { type: 'wait', milliseconds: randomDelay(1500, 2500) },
    
    // Step 2: Scroll down slightly (human-like: reading the page)
    { type: 'scroll', direction: 'down' },
    
    // Step 3: Small delay before clicking (human-like: reading time)
    { type: 'wait', milliseconds: randomDelay(500, 1000) },
    
    // Step 4: Click button in div#photoPreviewButton to expand gallery
    // Selector: div#photoPreviewButton button
    {
      type: 'click',
      selector: 'div#photoPreviewButton button',
    },
    
    // Step 5: Wait for gallery to load (human-like: 2.5-3.5 seconds)
    { type: 'wait', milliseconds: randomDelay(2500, 3500) },
    
    // Step 6: Scroll to ensure gallery is fully loaded (human-like: viewing gallery)
    { type: 'scroll', direction: 'down' },
    
    // Step 7: Final small delay before scraping (human-like: ensuring everything is loaded)
    { type: 'wait', milliseconds: randomDelay(500, 1000) },
    
    // Step 8: Scrape the page with gallery expanded
    { type: 'scrape' },
  ]
}
