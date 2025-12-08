/**
 * Redfin.com-specific HTML processor
 * Extracts gallery images from Redfin.com HTML
 */

import { load } from 'cheerio'

/**
 * Extract all image URLs from Redfin gallery
 * This is used to get all photos from the expanded gallery (after clicking photo preview button)
 * 
 * @param html - The HTML after actions (with expanded gallery)
 * @returns Array of image URLs from gallery
 */
export function extractRedfinGalleryImages(html: string): string[] {
  if (!html || html.trim().length === 0) {
    return []
  }

  const $ = load(html)
  const imageUrls: string[] = []

  // Redfin gallery structure - find all img tags in gallery containers
  // Common selectors for Redfin gallery images:
  // - Gallery modal/overlay images
  // - Photo carousel images
  // - Main photo container images
  
  // Strategy 1: Look for gallery modal/overlay images
  $('[class*="gallery"] img, [class*="photo"] img, [class*="carousel"] img').each((_, img) => {
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
      
      // Skip very small images (likely icons)
      if (width > 50 && height > 50) {
        // Convert relative URLs to absolute if needed
        try {
          // If it's already absolute, use it as is
          if (src.startsWith('http://') || src.startsWith('https://')) {
            imageUrls.push(src)
          } else {
            // If relative, we'd need base URL - for now just add as is
            // In practice, Redfin.com likely uses absolute URLs
            imageUrls.push(src)
          }
        } catch {
          // Invalid URL, skip
        }
      }
    }
  })

  // Strategy 2: Look for specific Redfin gallery containers
  // This might need adjustment based on actual Redfin HTML structure
  $('[id*="photo"], [id*="gallery"], [class*="PhotoViewer"]').find('img').each((_, img) => {
    const $img = $(img)
    const src = $img.attr('src') || 
                $img.attr('data-src') || 
                $img.attr('data-lazy') ||
                $img.attr('data-original') ||
                null
    
    if (src && src.trim().length > 0) {
      const width = parseInt($img.attr('width') || '0')
      const height = parseInt($img.attr('height') || '0')
      
      if (width > 50 && height > 50) {
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
