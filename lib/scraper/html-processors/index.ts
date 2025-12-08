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

// Import website-specific processors
export { processRealtorHtml, extractRealtorGalleryImages, removeRealtorSpecificSections } from './realtor'

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
    
    // Redfin.com: No HTML cleaner needed - no specific sections to remove
    // (hostname === 'redfin.com' || hostname === 'www.redfin.com') - no cleaner required
    
    return null
  } catch {
    return null
  }
}
