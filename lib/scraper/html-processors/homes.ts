/**
 * Homes.com-specific HTML processor
 * Removes unwanted sections from Homes.com HTML and extracts gallery images
 */

import { load } from 'cheerio'

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

/**
 * Extract all image URLs from Homes.com gallery
 * This is used to get all photos from the expanded gallery (after clicking .hero-carousel-item)
 * 
 * @param html - The HTML after actions (with expanded gallery)
 * @returns Array of image URLs from gallery
 */
export function extractHomesGalleryImages(html: string): string[] {
  if (!html || html.trim().length === 0) {
    return []
  }

  const $ = load(html)
  const imageUrls: string[] = []

  // Find all images in gallery containers
  // Common selectors for Homes.com gallery images:
  // - Gallery modal/overlay images
  // - Photo carousel images
  // - Hero carousel images
  
  // Strategy 1: Look for gallery modal/overlay images
  $('[class*="gallery"] img, [class*="photo"] img, [class*="carousel"] img, [class*="hero"] img').each((_, img) => {
    const $img = $(img)
    
    // Get src attribute (or data-src, data-lazy as fallback)
    const src = $img.attr('src') || 
                $img.attr('data-src') || 
                $img.attr('data-lazy') ||
                $img.attr('data-original') ||
                null
    
    if (src && src.trim().length > 0) {
      // Filter out data: URLs, base64 images, and other non-http sources
      if (src.startsWith('data:') || src.startsWith('blob:') || !src.startsWith('http')) {
        return // Skip non-http images
      }
      
      // Filter out small icons, avatars, and tracking pixels
      const width = parseInt($img.attr('width') || '0')
      const height = parseInt($img.attr('height') || '0')
      
      // If width/height are available, use them for filtering
      // Otherwise, use URL pattern filtering
      let shouldInclude = false
      
      if (width > 0 && height > 0) {
        // Use width/height if available
        shouldInclude = width > 50 && height > 50
      } else {
        // Use URL pattern filtering if width/height not available
        // Exclude common icon/avatar patterns
        const lowerSrc = src.toLowerCase()
        const excludePatterns = [
          'icon', 'avatar', 'logo', 'badge', 'button', 'arrow', 
          'spinner', 'loader', 'placeholder', '1x1', 'pixel'
        ]
        shouldInclude = !excludePatterns.some(pattern => lowerSrc.includes(pattern)) &&
                       // Include images that look like property photos (common patterns)
                       (lowerSrc.includes('photo') || 
                        lowerSrc.includes('image') || 
                        lowerSrc.includes('img') ||
                        lowerSrc.includes('property') ||
                        lowerSrc.includes('listing') ||
                        !!lowerSrc.match(/\.(jpg|jpeg|png|webp|gif)(\?|$)/i))
      }
      
      if (shouldInclude) {
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

  // Strategy 2: Look for specific Homes.com gallery containers
  $('.hero-carousel-item img, [class*="PhotoViewer"] img, [id*="photo"] img, [id*="gallery"] img').each((_, img) => {
    const $img = $(img)
    const src = $img.attr('src') || 
                $img.attr('data-src') || 
                $img.attr('data-lazy') ||
                $img.attr('data-original') ||
                null
    
    if (src && src.trim().length > 0) {
      // Filter out data: URLs, base64 images, and other non-http sources
      if (src.startsWith('data:') || src.startsWith('blob:') || !src.startsWith('http')) {
        return // Skip non-http images
      }
      
      const width = parseInt($img.attr('width') || '0')
      const height = parseInt($img.attr('height') || '0')
      
      // If width/height are available, use them for filtering
      // Otherwise, use URL pattern filtering
      let shouldInclude = false
      
      if (width > 0 && height > 0) {
        // Use width/height if available
        shouldInclude = width > 50 && height > 50
      } else {
        // Use URL pattern filtering if width/height not available
        // Exclude common icon/avatar patterns
        const lowerSrc = src.toLowerCase()
        const excludePatterns = [
          'icon', 'avatar', 'logo', 'badge', 'button', 'arrow', 
          'spinner', 'loader', 'placeholder', '1x1', 'pixel'
        ]
        shouldInclude = !excludePatterns.some(pattern => lowerSrc.includes(pattern)) &&
                       // Include images that look like property photos (common patterns)
                       (lowerSrc.includes('photo') || 
                        lowerSrc.includes('image') || 
                        lowerSrc.includes('img') ||
                        lowerSrc.includes('property') ||
                        lowerSrc.includes('listing') ||
                        !!lowerSrc.match(/\.(jpg|jpeg|png|webp|gif)(\?|$)/i))
      }
      
      if (shouldInclude) {
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
    }
  })

  // Remove duplicates and return
  return [...new Set(imageUrls)]
}
