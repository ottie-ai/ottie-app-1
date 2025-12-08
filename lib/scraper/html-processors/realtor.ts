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
 * Remove Realtor.com specific unwanted sections from HTML main element
 * This is website-specific cleaning logic that removes sections not relevant for property details
 * 
 * @param mainElement - Cheerio main element to clean
 */
export function removeRealtorSpecificSections(mainElement: any): void {
  // Find element with data-testid="similar_homes" and remove it and everything after it
  const similarHomesElement = mainElement.find('[data-testid="similar_homes"]')
  if (similarHomesElement.length > 0) {
    // Remove the element itself and all following siblings
    similarHomesElement.nextAll().remove()
    similarHomesElement.remove()
    console.log('🔵 [removeRealtorSpecificSections] Removed similar_homes element and all following content')
  }
  
  // Also remove other similar sections (fallback if similar_homes not found)
  mainElement.find('[data-testid*="similar"]').remove()
  mainElement.find('section:contains("Similar homes")').remove()
  mainElement.find('h2:contains("Similar homes")').parent().remove()
  mainElement.find('h2:contains("Homes with similar exteriors")').parent().remove()
  mainElement.find('h2:contains("Similar new construction homes")').parent().remove()
  mainElement.find('h3:contains("Homes with similar exteriors")').parent().remove()
  mainElement.find('h3:contains("Similar new construction homes")').parent().remove()
  mainElement.find('section:contains("Homes with similar exteriors")').remove()
  mainElement.find('section:contains("Similar new construction homes")').remove()
  
  // Remove "Schedule tour" section
  mainElement.find('[data-testid*="schedule"]').remove()
  mainElement.find('[data-testid*="tour"]').remove()
  mainElement.find('section:contains("Schedule")').remove()
  mainElement.find('button:contains("Schedule")').parent().remove()
  
  // Remove "Nearby" sections (Cities, ZIPs, Neighborhoods)
  mainElement.find('[data-testid*="nearby"]').remove()
  mainElement.find('section:contains("Nearby Cities")').remove()
  mainElement.find('section:contains("Nearby ZIPs")').remove()
  mainElement.find('section:contains("Nearby Neighborhoods")').remove()
  mainElement.find('h2:contains("Nearby Cities")').parent().remove()
  mainElement.find('h2:contains("Nearby ZIPs")').parent().remove()
  mainElement.find('h2:contains("Nearby Neighborhoods")').parent().remove()
  mainElement.find('h3:contains("Nearby Cities")').parent().remove()
  mainElement.find('h3:contains("Nearby ZIPs")').parent().remove()
  mainElement.find('h3:contains("Nearby Neighborhoods")').parent().remove()
  
  // Remove sidebar and other noise
  mainElement.find('[data-testid="ldp-sidebar"]').remove()
  mainElement.find('[data-testid="ldp-footer-additional-information"]').remove()
  mainElement.find('[data-testid="footer-lead-form"]').remove()
}

/**
 * Process Realtor.com HTML by extracting only the main component
 * 
 * IMPORTANT: This processor preserves ALL content within <main>, including:
 * - Accordion elements (even if collapsed/hidden)
 * - Amenities and description sections
 * - All data attributes and nested structures
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
      
      // Process the main content
      const processed = load(mainContent)
      
      // Remove only Realtor.com specific sidebar (keep everything else)
      processed('div[data-testid="ldp-sidebar"]').remove()
      
      // IMPORTANT: Preserve all accordion elements and their content
      // Don't remove elements based on aria-hidden, hidden attributes, or display:none
      // These might contain amenities, description, and other important data
      
      // Remove only obvious noise (scripts, styles, tracking) but keep all content elements
      processed('script').remove()
      processed('style').remove()
      processed('noscript').remove()
      
      // Remove tracking pixels and beacons
      processed('img[width="1"][height="1"]').remove()
      processed('img[src*="tracking"]').remove()
      processed('img[src*="beacon"]').remove()
      
      // Keep everything else - all divs, sections, accordions, etc.
      // This ensures amenities, description, and all property details are preserved
      
      const result = processed.html() || mainContent
      console.log(`✅ [Realtor Processor] Processed HTML length: ${result.length} chars`)
      return result
    }
  }

  // If <main> element was not found, return original HTML
  // We only want to extract <main> element, nothing else
  console.warn('⚠️ [Realtor Processor] Could not find <main> element, returning original HTML')
  return rawHtml
}
