/**
 * Realtor.com-specific Firecrawl actions
 * Actions to perform before scraping Realtor.com property pages
 * 
 * Clicks "View all listing photos" button to expand the photo gallery
 * so that all images are visible in the scraped HTML.
 */

import type { FirecrawlAction } from './index'

/**
 * Get Firecrawl actions for Realtor.com
 * 
 * Strategy: Use aria-label selector which is universal across all property pages
 * (unlike class names which change with each page)
 * 
 * @returns Array of actions to perform
 */
export function getRealtorActions(): FirecrawlAction[] {
  return [
    // Wait for page to load and carousel to initialize
    { type: 'wait', milliseconds: 2000 },
    
    // Click "View all listing photos" button using aria-label (universal selector)
    // This button expands the photo gallery to show all images
    // Selector: button[aria-label="View all listing photos"]
    {
      type: 'click',
      selector: 'button[aria-label="View all listing photos"]',
    },
    
    // Wait for gallery modal/overlay to load and expand
    { type: 'wait', milliseconds: 3000 },
    
    // Scrape the page with expanded gallery
    { type: 'scrape' },
  ]
}
