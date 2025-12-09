/**
 * Homes.com-specific HTML processor
 * Removes unwanted sections from Homes.com HTML and extracts gallery images
 */

import { load } from 'cheerio'

/**
 * Extract all image URLs from Homes.com gallery
 * Extracts images from cleaned HTML (after unwanted sections are removed)
 * 
 * @param html - The HTML after cleaning (with unwanted sections removed)
 * @returns Array of image URLs from gallery
 */
export function extractHomesGalleryImages(html: string): string[] {
  if (!html || html.trim().length === 0) {
    return []
  }

  const $ = load(html)
  const imageUrls: string[] = []

  // Strategy: Find all img tags in gallery-related containers
  // Look for common gallery patterns on Homes.com
  $('[class*="gallery"] img, [class*="photo"] img, [class*="carousel"] img, [class*="image"] img').each((_, img) => {
    const $img = $(img)
    
    // Get src attribute (or data-src, data-lazy as fallback)
    const src = $img.attr('src') || 
                $img.attr('data-src') || 
                $img.attr('data-lazy') ||
                $img.attr('data-original') ||
                null
    
    if (src && src.trim().length > 0) {
      // Filter out small icons, avatars, and tracking pixels
      const width = parseInt($img.attr('width') || '0')
      const height = parseInt($img.attr('height') || '0')
      
      // Skip very small images (likely icons) - but allow if dimensions not specified
      if (width === 0 && height === 0 || (width > 50 && height > 50)) {
        // Convert relative URLs to absolute if needed
        try {
          // If it's already absolute, use it as is
          if (src.startsWith('http://') || src.startsWith('https://')) {
            imageUrls.push(src)
          } else {
            // If relative, we'd need base URL - for now just add as is
            // In practice, Homes.com likely uses absolute URLs
            imageUrls.push(src)
          }
        } catch {
          // Invalid URL, skip
        }
      }
    }
  })

  // Also look for img tags with specific data attributes that might indicate gallery images
  $('img[data-gallery], img[data-photo], img[data-image]').each((_, img) => {
    const $img = $(img)
    const src = $img.attr('src') || 
                $img.attr('data-src') || 
                $img.attr('data-lazy') ||
                null
    
    if (src && src.trim().length > 0) {
      try {
        if (src.startsWith('http://') || src.startsWith('https://')) {
          imageUrls.push(src)
        } else {
          imageUrls.push(src)
        }
      } catch {
        // Invalid URL, skip
      }
    }
  })

  // Remove duplicates and return
  return [...new Set(imageUrls)]
}

/**
 * Remove Homes.com specific unwanted sections from HTML main element
 * This is website-specific cleaning logic that removes sections not relevant for property details
 * 
 * @param mainElement - Cheerio main element to clean
 */
export function removeHomesSpecificSections(mainElement: any): void {
  // List of class names to remove
  const classesToRemove = [
    'schools-container',
    'parks-in-area-section',
    'transportation-container',
    'area-factors-container',
    'environment-factor-container',
    'estimated-value',
    'home-valuation-report-cta-container',
    'home-values-container',
    'average-home-value-container',
    'ldp-property-history-container',
    'suggested-listings-container',
    'breadcrumbs-container',
    'nearby-links-section-dt-v2',
  ]
  
  // Build combined selector for all elements to remove
  const classSelector = classesToRemove.map(className => `.${className}`).join(', ')
  
  // Remove all matching elements by class
  mainElement.find(classSelector).remove()
  
  // Remove footer and header elements
  mainElement.find('footer').remove()
  mainElement.find('header').remove()
  
  console.log(`🔵 [removeHomesSpecificSections] Removed ${classesToRemove.length} unwanted sections, footer, and header from Homes.com HTML`)
}
