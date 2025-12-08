/**
 * HTML Processors
 * Website-specific HTML processing functions
 * 
 * Each website can have its own processing logic to extract and clean HTML
 * (e.g., extract main component, remove specific elements, etc.)
 */

import { load } from 'cheerio'

export type HtmlProcessor = (rawHtml: string) => string
export type HtmlCleaner = (mainElement: any) => void

/**
 * Get the main content selector for a URL
 * Different websites use different elements for main content
 * 
 * @param url - The URL to check
 * @returns CSS selector for main content element, or null to use fallback
 */
export function getMainContentSelector(url: string): string | null {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()
    
    // Realtor.com: Uses <main> element
    if (hostname === 'realtor.com' || hostname === 'www.realtor.com') {
      return 'main'
    }
    
    // Redfin.com: Uses div#content
    if (hostname === 'redfin.com' || hostname === 'www.redfin.com') {
      return 'div#content'
    }
    
    // Homes.com: Uses fallback (main or body)
    // (hostname === 'homes.com' || hostname === 'www.homes.com') - uses fallback selector
    
    // Default: return null to use fallback (main or body)
    return null
  } catch {
    return null
  }
}

// Import website-specific processors
export { processRealtorHtml, extractRealtorGalleryImages, removeRealtorSpecificSections } from './realtor'
export { extractRedfinGalleryImages, removeRedfinSpecificSections } from './redfin'

/**
 * Get the appropriate HTML processor for a URL
 * 
 * @param url - The URL to check
 * @returns The processor function for that website, or null if no processor exists
 */
export function getHtmlProcessor(url: string): HtmlProcessor | null {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()
    
    if (hostname === 'realtor.com' || hostname === 'www.realtor.com') {
      return require('./realtor').processRealtorHtml
    }
    
    // Redfin.com: No HTML processor needed - uses raw HTML directly
    // (hostname === 'redfin.com' || hostname === 'www.redfin.com') - no processor required
    
    // Homes.com: No HTML processor needed - uses raw HTML directly
    // (hostname === 'homes.com' || hostname === 'www.homes.com') - no processor required
    
    return null
  } catch {
    return null
  }
}

/**
 * Get the appropriate HTML cleaner for a URL
 * HTML cleaner removes website-specific unwanted sections before text extraction
 * 
 * @param url - The URL to check
 * @returns The cleaner function for that website, or null if no cleaner exists
 */
export function getHtmlCleaner(url: string): HtmlCleaner | null {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()
    
    if (hostname === 'realtor.com' || hostname === 'www.realtor.com') {
      return require('./realtor').removeRealtorSpecificSections
    }
    
    if (hostname === 'redfin.com' || hostname === 'www.redfin.com') {
      return require('./redfin').removeRedfinSpecificSections
    }
    
    // Homes.com: No HTML cleaner needed - no specific sections to remove
    // (hostname === 'homes.com' || hostname === 'www.homes.com') - no cleaner required
    
    return null
  } catch {
    return null
  }
}

/**
 * Get the appropriate gallery image extractor for a URL
 * Gallery extractor extracts image URLs from gallery HTML after actions
 * 
 * @param url - The URL to check
 * @returns The extractor function for that website, or null if no extractor exists
 */
export function getGalleryImageExtractor(url: string): ((html: string) => string[]) | null {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()
    
    if (hostname === 'realtor.com' || hostname === 'www.realtor.com') {
      return require('./realtor').extractRealtorGalleryImages
    }
    
    if (hostname === 'redfin.com' || hostname === 'www.redfin.com') {
      return require('./redfin').extractRedfinGalleryImages
    }
    
    return null
  } catch {
    return null
  }
}
