/**
 * Realtor.com-specific HTML processor
 * Extracts only the main component from Realtor.com HTML
 */

import { load } from 'cheerio'

/**
 * Process Realtor.com HTML by extracting only the main component
 * 
 * @param rawHtml - The raw HTML from Realtor.com
 * @returns Processed HTML containing only the main component
 */
export function processRealtorHtml(rawHtml: string): string {
  if (!rawHtml || rawHtml.trim().length === 0) {
    return rawHtml
  }

  const $ = load(rawHtml)

  // Try to find the main content component
  // Realtor.com typically uses <main> or specific class/id for main content
  let mainContent: string | null = null

  // Strategy 1: Look for <main> element
  const mainElement = $('main')
  if (mainElement.length > 0) {
    // Return the entire <main> element with its content
    const mainHtml = mainElement.get(0)
    if (mainHtml) {
      mainContent = $.html(mainHtml)
      console.log('✅ [Realtor Processor] Found <main> element')
      // Clean up the extracted main element
      const processed = load(mainContent)
      // Remove scripts, styles, and other non-content elements
      processed('script, style, noscript, iframe, svg, canvas').remove()
      // Remove common noise elements
      processed('[class*="ad"], [class*="advertisement"], [id*="ad"]').remove()
      processed('[class*="cookie"], [class*="banner"], [class*="popup"]').remove()
      processed('[class*="social"], [class*="share"]').remove()
      return processed.html() || mainContent
    }
  }

  // If <main> element was not found, return original HTML
  // We only want to extract <main> element, nothing else
  console.warn('⚠️ [Realtor Processor] Could not find <main> element, returning original HTML')
  return rawHtml
}
