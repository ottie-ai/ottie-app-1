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

  // Helper function to extract image URL from img element
  const extractImageUrl = ($img: any): string | null => {
    // Check multiple possible attributes for image source (lazy loading support)
    const src = $img.attr('src') || 
                $img.attr('data-src') || 
                $img.attr('data-lazy') ||
                $img.attr('data-original') ||
                $img.attr('data-image') ||
                $img.attr('data-url') ||
                null
    
    if (!src || src.trim().length === 0) {
      return null
    }
    
    // Filter out obvious non-gallery images
    const srcLower = src.toLowerCase()
    if (srcLower.includes('icon') || 
        srcLower.includes('logo') || 
        srcLower.includes('avatar') ||
        srcLower.includes('placeholder') ||
        srcLower.includes('1x1') ||
        srcLower.includes('pixel')) {
      return null
    }
    
    // Check if it's a Redfin photo URL pattern
    if (src.includes('cdn-redfin.com') || src.includes('redfin.com/photo')) {
      return src
    }
    
    // Also accept other absolute URLs that look like photos
    if (src.startsWith('http://') || src.startsWith('https://')) {
      // Check width/height to filter out small icons
      const width = parseInt($img.attr('width') || '0')
      const height = parseInt($img.attr('height') || '0')
      
      // If width/height are not set, check style attribute
      let styleWidth = 0
      let styleHeight = 0
      const style = $img.attr('style') || ''
      const widthMatch = style.match(/width:\s*(\d+)px/)
      const heightMatch = style.match(/height:\s*(\d+)px/)
      if (widthMatch) styleWidth = parseInt(widthMatch[1])
      if (heightMatch) styleHeight = parseInt(heightMatch[1])
      
      const finalWidth = width || styleWidth
      const finalHeight = height || styleHeight
      
      // If dimensions are available, filter out very small images
      // But if dimensions are not available, include it anyway (might be lazy loaded)
      if (finalWidth > 0 && finalHeight > 0) {
        if (finalWidth <= 50 || finalHeight <= 50) {
          return null
        }
      }
      
      // If it's a Redfin photo URL or looks like a photo, include it
      if (src.match(/\.(jpg|jpeg|png|webp|gif)(\?|$)/i)) {
        return src
      }
    }
    
    return null
  }

  // Strategy 1: Look for all img tags and filter by Redfin photo patterns
  $('img').each((_, img) => {
    const $img = $(img)
    const url = extractImageUrl($img)
    if (url) {
      imageUrls.push(url)
    }
  })

  // Strategy 2: Look for specific Redfin gallery containers (more targeted)
  $('[id*="photo"], [id*="gallery"], [class*="PhotoViewer"], [class*="Photo"], [class*="Gallery"]').find('img').each((_, img) => {
    const $img = $(img)
    const url = extractImageUrl($img)
    if (url) {
      imageUrls.push(url)
    }
  })

  // Remove duplicates and sort (to maintain consistent order)
  const uniqueUrls = [...new Set(imageUrls)]
  
  // Sort by URL to maintain consistent order (helps with debugging)
  uniqueUrls.sort()
  
  return uniqueUrls
}

/**
 * Remove Redfin.com specific unwanted sections from HTML main element
 * This is website-specific cleaning logic that removes sections not relevant for property details
 * 
 * @param mainElement - Cheerio main element to clean
 */
export function removeRedfinSpecificSections(mainElement: any): void {
  // List of class names to remove
  const classesToRemove = [
    'OpenHouseTourInsightSection',
    'AskRedfinSection',
    'PropertyHistory',
    'ClimateRiskDataSection',
    'SunExposureSection',
    'DPRedfinEstimateSection',
    'SimilarsPanel',
    'SiteFooter',
    'SmartInterlinksSection',
  ]
  
  // Build combined selector for all elements to check
  const classSelector = classesToRemove.map(className => `.${className}`).join(', ')
  const allSelectors = `${classSelector}, #neighborhood-scroll`
  
  // Find all matching elements
  const allMatchingElements = mainElement.find(allSelectors)
  
  if (allMatchingElements.length > 0) {
    // Get the first element (Cheerio returns elements in DOM order)
    const firstElement = allMatchingElements.first()
    
    if (firstElement.length > 0) {
      // Remove all following siblings
      firstElement.nextAll().remove()
      // Remove the element itself
      firstElement.remove()
      console.log('🔵 [removeRedfinSpecificSections] Removed first unwanted section and all following content')
    }
  }
  
  // Also remove individual elements by class as fallback (in case selector didn't catch them all)
  classesToRemove.forEach(className => {
    mainElement.find(`.${className}`).remove()
  })
  mainElement.find('#neighborhood-scroll').remove()
}
