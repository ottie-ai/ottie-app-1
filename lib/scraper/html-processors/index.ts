/**
 * HTML Processors
 * Website-specific HTML processing functions
 * 
 * Each website can have its own processing logic to extract and clean HTML
 * (e.g., extract main component, remove specific elements, etc.)
 */

import { load } from 'cheerio'

export type HtmlProcessor = (rawHtml: string) => string

// Import website-specific processors
export { processRealtorHtml, extractRealtorGalleryImages } from './realtor'

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
    
    return null
  } catch {
    return null
  }
}
