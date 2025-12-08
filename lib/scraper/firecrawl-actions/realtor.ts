/**
 * Realtor.com-specific Firecrawl actions
 * Actions to perform before scraping Realtor.com property pages
 */

import type { FirecrawlAction } from './index'

/**
 * Get combined actions for Realtor.com
 * Performs both property-details expansion AND gallery photos expansion in ONE call
 * 
 * Flow:
 * 1. Wait for page to load
 * 2. Click property-details accordion to expand property details
 * 3. Wait for property details to expand
 * 4. Click "View all listing photos" button to expand gallery
 * 5. Wait for gallery to load
 * 6. Scrape the page with both expanded
 * 
 * @returns Array of actions to perform in sequence
 */
export function getRealtorActionsCombined(): FirecrawlAction[] {
  return [
    // Step 1: Wait for page to load
    { type: 'wait', milliseconds: 2000 },
    
    // Step 2: Click property-details accordion to expand property details
    // Selector: [data-accordion-id="property-details"]
    {
      type: 'click',
      selector: '[data-accordion-id="property-details"]',
    },
    
    // Step 3: Wait for property details to expand
    { type: 'wait', milliseconds: 2000 },
    
    // Step 4: Click "View all listing photos" button using aria-label (universal selector)
    // This button expands the photo gallery to show all images
    // Selector: button[aria-label="View all listing photos"]
    {
      type: 'click',
      selector: 'button[aria-label="View all listing photos"]',
    },
    
    // Step 5: Wait for gallery modal/overlay to load and expand
    { type: 'wait', milliseconds: 3000 },
    
    // Step 6: Scrape the page with both property details and gallery expanded
    { type: 'scrape' },
  ]
}
