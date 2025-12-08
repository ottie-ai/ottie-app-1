/**
 * Realtor.com-specific Firecrawl actions
 * Actions to perform before scraping Realtor.com property pages
 */

import type { FirecrawlAction } from './index'

/**
 * Get first set of actions for Realtor.com (property details)
 * Clicks on property-details accordion to expand property details
 * 
 * @returns Array of actions to perform
 */
export function getRealtorActionsPropertyDetails(): FirecrawlAction[] {
  return [
    // Wait for page to load
    { type: 'wait', milliseconds: 2000 },
    
    // Click property-details accordion to expand property details
    // Selector: [data-accordion-id="property-details"]
    {
      type: 'click',
      selector: '[data-accordion-id="property-details"]',
    },
    
    // Wait for property details to expand
    { type: 'wait', milliseconds: 2000 },
    
    // Scrape the page with expanded property details
    { type: 'scrape' },
  ]
}

/**
 * Get second set of actions for Realtor.com (gallery photos)
 * Clicks "View all listing photos" button to expand the photo gallery
 * 
 * Strategy: Use aria-label selector which is universal across all property pages
 * (unlike class names which change with each page)
 * 
 * @returns Array of actions to perform
 */
export function getRealtorActionsGalleryPhotos(): FirecrawlAction[] {
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
