/**
 * Realtor.com-specific Firecrawl actions
 * Actions to perform before scraping Realtor.com property pages
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
 * Get actions for Realtor.com property details expansion (Call 1)
 * Expands property-details accordion for main content scraping
 * 
 * Flow with human-like behavior:
 * 1. Wait for page to load (variable delay)
 * 2. Scroll down slightly (human-like reading behavior)
 * 3. Click property-details accordion to expand property details
 * 4. Wait for property details to expand (variable delay)
 * 5. Scroll down to view expanded content (human-like behavior)
 * 6. Scrape the page with property details expanded
 * 
 * @returns Array of actions to perform in sequence
 */
export function getRealtorActionsPropertyDetails(): FirecrawlAction[] {
  return [
    // Step 1: Wait for page to load (human-like: 1.5-2.5 seconds)
    { type: 'wait', milliseconds: randomDelay(1500, 2500) },
    
    // Step 2: Scroll down slightly (human-like: reading the page)
    { type: 'scroll', direction: 'down' },
    
    // Step 3: Small delay before clicking (human-like: reading time)
    { type: 'wait', milliseconds: randomDelay(500, 1000) },
    
    // Step 4: Click property-details accordion to expand property details
    // Selector: [data-accordion-id="property-details"]
    {
      type: 'click',
      selector: '[data-accordion-id="property-details"]',
    },
    
    // Step 5: Wait for property details to expand (human-like: 1.5-2.5 seconds)
    { type: 'wait', milliseconds: randomDelay(1500, 2500) },
    
    // Step 6: Scroll down to view expanded content (human-like: reading expanded details)
    { type: 'scroll', direction: 'down' },
    
    // Step 7: Final small delay before scraping (human-like: ensuring everything is loaded)
    { type: 'wait', milliseconds: randomDelay(500, 1000) },
    
    // Step 8: Scrape the page with property details expanded
    { type: 'scrape' },
  ]
}

/**
 * Get actions for Realtor.com gallery expansion (Call 2)
 * Expands gallery to extract all image URLs
 * 
 * Flow with human-like behavior:
 * 1. Wait for page to load (variable delay)
 * 2. Scroll down slightly (human-like reading behavior)
 * 3. Click "View all listing photos" button to expand gallery
 * 4. Wait for gallery modal/overlay to load (variable delay)
 * 5. Scroll to ensure gallery is fully loaded (human-like behavior)
 * 6. Scrape the page with gallery expanded
 * 
 * @returns Array of actions to perform in sequence
 */
export function getRealtorActionsGallery(): FirecrawlAction[] {
  return [
    // Step 1: Wait for page to load (human-like: 1.5-2.5 seconds)
    { type: 'wait', milliseconds: randomDelay(1500, 2500) },
    
    // Step 2: Scroll down slightly (human-like: reading the page)
    { type: 'scroll', direction: 'down' },
    
    // Step 3: Small delay before clicking (human-like: reading time)
    { type: 'wait', milliseconds: randomDelay(500, 1000) },
    
    // Step 4: Click "View all listing photos" button using aria-label (universal selector)
    // This button expands the photo gallery to show all images
    // Selector: button[aria-label="View all listing photos"]
    {
      type: 'click',
      selector: 'button[aria-label="View all listing photos"]',
    },
    
    // Step 5: Wait for gallery modal/overlay to load (human-like: 2.5-3.5 seconds)
    { type: 'wait', milliseconds: randomDelay(2500, 3500) },
    
    // Step 6: Scroll to ensure gallery is fully loaded (human-like: viewing gallery)
    { type: 'scroll', direction: 'down' },
    
    // Step 7: Final small delay before scraping (human-like: ensuring everything is loaded)
    { type: 'wait', milliseconds: randomDelay(500, 1000) },
    
    // Step 8: Scrape the page with gallery expanded
    { type: 'scrape' },
  ]
}

/**
 * @deprecated Use getRealtorActionsPropertyDetails() and getRealtorActionsGallery() separately
 * Kept for backwards compatibility
 */
export function getRealtorActionsCombined(): FirecrawlAction[] {
  return getRealtorActionsPropertyDetails()
}
