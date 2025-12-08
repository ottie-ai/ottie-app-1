/**
 * Realtor.com-specific HTML processor
 * Extracts only the main component from Realtor.com HTML
 */

import { load } from 'cheerio'

/**
 * Extract all image URLs from gallery-photo-container elements
 * This is used to get all photos from the expanded gallery (after clicking "View all listing photos")
 * 
 * @param html - The HTML after actions (with expanded gallery)
 * @returns Array of image URLs from gallery-photo-container elements
 */
export function extractRealtorGalleryImages(html: string): string[] {
  if (!html || html.trim().length === 0) {
    return []
  }

  const $ = load(html)
  const imageUrls: string[] = []

  // Find all divs with data-testid="gallery-photo-container"
  $('div[data-testid="gallery-photo-container"]').each((_, container) => {
    const $container = $(container)
    
    // Find img tag within this container
    const $img = $container.find('img').first()
    
    if ($img.length > 0) {
      // Get src attribute (or data-src, data-lazy as fallback)
      const src = $img.attr('src') || 
                  $img.attr('data-src') || 
                  $img.attr('data-lazy') ||
                  null
      
      if (src && src.trim().length > 0) {
        // Convert relative URLs to absolute if needed
        try {
          // If it's already absolute, use it as is
          if (src.startsWith('http://') || src.startsWith('https://')) {
            imageUrls.push(src)
          } else {
            // If relative, we'd need base URL - for now just add as is
            // In practice, Realtor.com uses absolute URLs
            imageUrls.push(src)
          }
        } catch {
          // Invalid URL, skip
        }
      }
    }
  })

  // Remove duplicates and return
  return [...new Set(imageUrls)]
}

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
    // Return the entire <main> element with its content (without any cleaning)
    const mainHtml = mainElement.get(0)
    if (mainHtml) {
      mainContent = $.html(mainHtml)
      console.log('✅ [Realtor Processor] Found <main> element')
      // Just remove the sidebar, keep everything else (scripts, ads, etc.)
      const processed = load(mainContent)
      // Remove only Realtor.com specific sidebar
      processed('div[data-testid="ldp-sidebar"]').remove()
      return processed.html() || mainContent
    }
  }

  // If <main> element was not found, return original HTML
  // We only want to extract <main> element, nothing else
  console.warn('⚠️ [Realtor Processor] Could not find <main> element, returning original HTML')
  return rawHtml
}
