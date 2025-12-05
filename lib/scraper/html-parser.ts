/**
 * HTML Parser for Real Estate Listings
 * Extracts structured property data from HTML content
 * Uses cheerio for server-side HTML parsing
 */

import { load } from 'cheerio'

type CheerioAPI = ReturnType<typeof load>

export interface ParsedPropertyData {
  title: string | null
  address: string | null
  price: number | null
  propertyType: string | null
  bedrooms: number | null
  bathrooms: number | null
  squareFootage: number | null
  lotSize: number | null
  yearBuilt: number | null
  description: string | null
  images: string[]
  features: string[]
  location: {
    city: string | null
    state: string | null
    zipCode: string | null
    country: string | null
  }
  rawData: Record<string, any> // Store any additional extracted data
}

/**
 * Conservative HTML cleaning function for real estate listings
 * 
 * This cleaner is intentionally conservative - it removes only obvious "noise" elements
 * (scripts, styles, ads, cookies, tracking) while preserving all meaningful content
 * including property facts, descriptions, and headings with substantial text.
 * 
 * The cleaned HTML will be passed to AI and used for extracting structured data,
 * so we prioritize keeping content over aggressive filtering.
 * 
 * To extend: Add new selectors to the helper functions below. Always test against
 * scrape_example.html to ensure property facts and descriptions are preserved.
 * 
 * Compare scrape_example.html and cheerio_example.html to ensure the new cleaner
 * preserves all descriptive text and property facts visible in scrape_example.html.
 */
export function cleanHtml(rawHtml: string): string {
  const $ = load(rawHtml)

  // Work on the full body content (or main if available, but don't restrict to just that)
  // This ensures we don't lose content that might be outside semantic containers
  const bodyContent = $('body').html() || ''
  if (!bodyContent) {
    return ''
  }

  const $content = load(bodyContent)

  // Run removals in clear, small steps
  removeScriptsAndStyles($content)
  removeTrackingAndAds($content)
  removeCookieBanners($content)
  removeBanners($content)
  removeEmptyElements($content)
  removeSocialShareButtons($content)
  removeNavigationAndFooters($content)
  
  // Convert lazy-loading attributes to regular src attributes
  // This ensures images are visible even if JavaScript is disabled
  convertLazyImages($content)

  return $content.html() || ''
}

/**
 * Remove script, style, noscript, iframe, svg, and canvas elements
 */
function removeScriptsAndStyles($: CheerioAPI): void {
  $('script, style, noscript, iframe, svg, canvas').remove()
}

/**
 * Remove elements with obvious tracking/ads classes or IDs
 */
function removeTrackingAndAds($: CheerioAPI): void {
  // Remove ads by class/id patterns
  $('[class*="ads"]').remove()
  $('[id*="ads"]').remove()
  $('[class*="ad-"]').remove()
  $('[class*="advertisement"]').remove()
  
  // Remove tracking elements
  $('[class*="tracking"]').remove()
  $('[id*="tracking"]').remove()
  $('[class*="analytics"]').remove()
  $('[id*="analytics"]').remove()
}

/**
 * Remove cookie consent banners and popups
 */
function removeCookieBanners($: CheerioAPI): void {
  $('[class*="cookie"]').remove()
  $('[id*="cookie"]').remove()
  $('[class*="consent"]').remove()
  $('[id*="consent"]').remove()
  
  // Remove popups and modals (but be conservative - only obvious ones)
  $('[class*="popup"]').each((_, el) => {
    const $el = $(el)
    const text = $el.text().toLowerCase()
    // Only remove if it's clearly a popup/modal (not content that happens to have "popup" in class)
    if (text.includes('cookie') || text.includes('consent') || text.length < 50) {
      $el.remove()
    }
  })
  
  $('[class*="modal"]').each((_, el) => {
    const $el = $(el)
    const text = $el.text().toLowerCase()
    if (text.includes('cookie') || text.includes('consent') || text.length < 50) {
      $el.remove()
    }
  })
}

/**
 * Remove banners that don't contain property-related content
 */
function removeBanners($: CheerioAPI): void {
  $('[class*="banner"]').each((_, el) => {
    const $el = $(el)
    const text = $el.text().toLowerCase()
    
    // Keep banners that contain property facts
    const propertyKeywords = ['bed', 'bath', 'price', 'sqft', 'bedroom', 'bathroom', 'square', 'address']
    const hasPropertyContent = propertyKeywords.some(keyword => text.includes(keyword))
    
    // Only remove if it doesn't have property content and is likely a UI banner
    if (!hasPropertyContent && text.length < 100) {
      $el.remove()
    }
  })
}

/**
 * Remove elements whose textContent is empty or only whitespace
 */
function removeEmptyElements($: CheerioAPI): void {
  $('*').each((_, el) => {
    const $el = $(el)
    const text = $el.text().trim()
    
    // Skip if element has meaningful content
    if (text.length > 0) {
      return
    }
    
    // Skip if element has images or other meaningful attributes
    if ($el.find('img').length > 0 || $el.attr('src') || $el.attr('href')) {
      return
    }
    
    // Remove if truly empty (but preserve structure elements that might be styled)
    // Check if element has a name property (Element, not TextElement)
    const tagName = 'name' in el && el.name ? el.name.toLowerCase() : null
    if (tagName && !['br', 'hr', 'img', 'input', 'meta', 'link'].includes(tagName)) {
      // Only remove if it's a leaf node (no children with content)
      let hasChildrenWithContent = false
      $el.children().each((_, child) => {
        const $child = $(child)
        if ($child.text().trim().length > 0 || $child.find('img').length > 0) {
          hasChildrenWithContent = true
          return false // break
        }
      })
      
      if (!hasChildrenWithContent) {
        $el.remove()
      }
    }
  })
}

/**
 * Remove elements that contain only social/share buttons
 */
function removeSocialShareButtons($: CheerioAPI): void {
  $('[class*="share"], [class*="social"], [class*="facebook"], [class*="twitter"], [class*="instagram"], [class*="linkedin"]').each((_, el) => {
    const $el = $(el)
    const text = $el.text().trim().toLowerCase()
    
    // Check if this is likely just a social/share button container
    const socialKeywords = ['share', 'facebook', 'twitter', 'instagram', 'linkedin', 'pinterest', 'tweet', 'like']
    const hasOnlySocialContent = socialKeywords.some(keyword => text.includes(keyword)) && text.length < 100
    
    // Also check if it's mostly links
    const linkCount = $el.find('a').length
    const textLength = text.length
    
    if (hasOnlySocialContent || (linkCount > 2 && textLength < 50)) {
      $el.remove()
    }
  })
}

/**
 * Remove nav bars and footers where innerText is mostly links
 * But keep them if they contain property facts or substantial text
 */
function removeNavigationAndFooters($: CheerioAPI): void {
  // Check nav elements
  $('nav').each((_, el) => {
    const $el = $(el)
    const text = $el.text().trim()
    const linkCount = $el.find('a').length
    const textLength = text.length
    
    // Keep if it has substantial text (likely contains property info)
    if (textLength > 100) {
      return
    }
    
    // Keep if it contains property keywords
    const propertyKeywords = ['bed', 'bath', 'price', 'sqft', 'bedroom', 'bathroom', 'square', 'address']
    const hasPropertyContent = propertyKeywords.some(keyword => text.toLowerCase().includes(keyword))
    if (hasPropertyContent) {
      return
    }
    
    // Remove if it's mostly links (likely navigation)
    if (linkCount > textLength / 10) {
      $el.remove()
    }
  })
  
  // Check footer elements
  $('footer').each((_, el) => {
    const $el = $(el)
    const text = $el.text().trim()
    const linkCount = $el.find('a').length
    const textLength = text.length
    
    // Keep if it has substantial text
    if (textLength > 100) {
      return
    }
    
    // Keep if it contains property keywords
    const propertyKeywords = ['bed', 'bath', 'price', 'sqft', 'bedroom', 'bathroom', 'square', 'address']
    const hasPropertyContent = propertyKeywords.some(keyword => text.toLowerCase().includes(keyword))
    if (hasPropertyContent) {
      return
    }
    
    // Remove if it's mostly links (likely footer navigation)
    if (linkCount > textLength / 10) {
      $el.remove()
    }
  })
  
  // Also check header elements (but be more conservative)
  $('header').each((_, el) => {
    const $el = $(el)
    const text = $el.text().trim()
    const linkCount = $el.find('a').length
    const textLength = text.length
    
    // Keep if it has substantial text or property content
    const propertyKeywords = ['bed', 'bath', 'price', 'sqft', 'bedroom', 'bathroom', 'square', 'address']
    const hasPropertyContent = propertyKeywords.some(keyword => text.toLowerCase().includes(keyword))
    
    if (textLength > 100 || hasPropertyContent) {
      return
    }
    
    // Remove if it's mostly links and short (likely site header)
    if (linkCount > textLength / 10 && textLength < 50) {
      $el.remove()
    }
  })
}

/**
 * Convert lazy-loading image attributes to regular src attributes
 */
function convertLazyImages($: CheerioAPI): void {
  // Convert data-src to src
  $('img[data-src]').each((_, img) => {
    const $img = $(img)
    const dataSrc = $img.attr('data-src')
    if (dataSrc && !$img.attr('src')) {
      $img.attr('src', dataSrc)
    }
  })

  // Convert data-lazy to src
  $('img[data-lazy]').each((_, img) => {
    const $img = $(img)
    const dataLazy = $img.attr('data-lazy')
    if (dataLazy && !$img.attr('src')) {
      $img.attr('src', dataLazy)
    }
  })

  // Convert data-srcset to srcset for responsive images
  $('img[data-srcset]').each((_, img) => {
    const $img = $(img)
    const dataSrcset = $img.attr('data-srcset')
    if (dataSrcset && !$img.attr('srcset')) {
      $img.attr('srcset', dataSrcset)
    }
  })

  // Convert picture source data-srcset
  $('source[data-srcset]').each((_, source) => {
    const $source = $(source)
    const dataSrcset = $source.attr('data-srcset')
    if (dataSrcset && !$source.attr('srcset')) {
      $source.attr('srcset', dataSrcset)
    }
  })
}

/**
 * Extract text content from HTML
 */
export function extractText(html: string): string {
  const $ = load(html)

  // Remove script and style tags
  $('script, style').remove()

  return $('body').text() || ''
}

/**
 * Parse property data from HTML
 * Uses heuristics and common patterns for real estate sites
 */
export function parsePropertyData(html: string, sourceUrl: string): ParsedPropertyData {
  const $ = load(html)

  const result: ParsedPropertyData = {
    title: null,
    address: null,
    price: null,
    propertyType: null,
    bedrooms: null,
    bathrooms: null,
    squareFootage: null,
    lotSize: null,
    yearBuilt: null,
    description: null,
    images: [],
    features: [],
    location: {
      city: null,
      state: null,
      zipCode: null,
      country: null,
    },
    rawData: {},
  }

  // Extract title
  const h1Text = $('h1').first().text().trim()
  const titleClassText = $('[class*="title"]').first().text().trim()
  const headingClassText = $('[class*="heading"]').first().text().trim()
  const titleTagText = $('title').text().trim()
  
  result.title = h1Text || titleClassText || headingClassText || titleTagText || null

  // Extract price (look for $, €, £ symbols and numbers)
  const priceClassText = $('[class*="price"]').first().text()
  const priceIdText = $('[id*="price"]').first().text()
  const priceDataAttr = $('[data-price]').first().attr('data-price')
  const priceText = priceClassText || priceIdText || priceDataAttr || null

  if (priceText) {
    const priceMatch = priceText.match(/[\$€£]?\s*([\d,]+)/)
    if (priceMatch) {
      result.price = parseInt(priceMatch[1].replace(/,/g, ''), 10)
    }
  }

  // Extract address
  const addressSelectors = [
    '[class*="address"]',
    '[id*="address"]',
    '[itemprop="address"]',
    '[class*="location"]',
  ]

  for (const selector of addressSelectors) {
    const element = $(selector).first()
    if (element.length > 0) {
      result.address = element.text().trim() || null
      break
    }
  }

  // Extract bedrooms
  const bedText =
    $('[class*="bed"]').first().text() ||
    $('[class*="bedroom"]').first().text() ||
    null

  if (bedText) {
    const bedMatch = bedText.match(/(\d+)\s*(bed|br|bedroom)/i)
    if (bedMatch) {
      result.bedrooms = parseInt(bedMatch[1], 10)
    }
  }

  // Extract bathrooms
  const bathText =
    $('[class*="bath"]').first().text() ||
    $('[class*="bathroom"]').first().text() ||
    null

  if (bathText) {
    const bathMatch = bathText.match(/(\d+)\s*(bath|ba|bathroom)/i)
    if (bathMatch) {
      result.bathrooms = parseInt(bathMatch[1], 10)
    }
  }

  // Extract square footage
  const sqftText =
    $('[class*="sqft"]').first().text() ||
    $('[class*="square"]').first().text() ||
    $('[class*="area"]').first().text() ||
    null

  if (sqftText) {
    const sqftMatch = sqftText.match(/([\d,]+)\s*(sq\s*ft|sqft|m²|sq\s*m)/i)
    if (sqftMatch) {
      result.squareFootage = parseInt(sqftMatch[1].replace(/,/g, ''), 10)
    }
  }

  // Extract images
  $('img[src], img[data-src], img[data-lazy]').each((_, img) => {
    const $img = $(img)
    const src =
      $img.attr('src') ||
      $img.attr('data-src') ||
      $img.attr('data-lazy') ||
      null

    if (src && !src.includes('placeholder') && !src.includes('logo') && !src.includes('icon')) {
      // Convert relative URLs to absolute
      try {
        const url = new URL(src, sourceUrl)
        result.images.push(url.toString())
      } catch {
        // Invalid URL, skip
      }
    }
  })

  // Remove duplicates and limit to 20 images
  result.images = [...new Set(result.images)].slice(0, 20)

  // Extract description
  const descriptionSelectors = [
    '[class*="description"]',
    '[id*="description"]',
    '[itemprop="description"]',
    '[class*="details"]',
    'article p',
  ]

  for (const selector of descriptionSelectors) {
    const element = $(selector).first()
    const text = element.text().trim()
    if (text && text.length > 50) {
      result.description = text
      break
    }
  }

  // Extract features/amenities
  $('[class*="feature"], [class*="amenity"], [class*="amenities"], li[class*="feature"]').each((_, el) => {
    const text = $(el).text().trim()
    if (text && text.length < 100) {
      result.features.push(text)
    }
  })

  // Limit features to 20
  result.features = result.features.slice(0, 20)

  return result
}

/**
 * Generate PageConfig from parsed property data
 */
export function generatePageConfig(data: ParsedPropertyData): any {
  const sections: any[] = []
  let sectionIndex = 0

  // Helper to generate unique section ID
  const generateId = (type: string) => `${type}-${sectionIndex++}`

  // Hero section
  if (data.images.length > 0 || data.title) {
    sections.push({
      id: generateId('hero'),
      type: 'hero',
      variant: 'full', // Use 'full' variant for hero
      data: {
        headline: data.title || 'Property Listing',
        subheadline: data.address || '',
        price: data.price ? `$${data.price.toLocaleString()}` : '',
        address: data.address || '',
        propertyImage: data.images[0] || null,
      },
    })
  }

  // Features section (Property Details)
  if (data.bedrooms || data.bathrooms || data.squareFootage) {
    const features: any[] = []

    if (data.bedrooms) {
      features.push({
        icon: 'bed',
        label: 'Bedrooms',
        value: data.bedrooms.toString(),
      })
    }

    if (data.bathrooms) {
      features.push({
        icon: 'bath',
        label: 'Bathrooms',
        value: data.bathrooms.toString(),
      })
    }

    if (data.squareFootage) {
      features.push({
        icon: 'ruler',
        label: 'Square Feet',
        value: data.squareFootage.toLocaleString(),
      })
    }

    if (features.length > 0) {
      sections.push({
        id: generateId('features'),
        type: 'features',
        variant: 'grid', // Use 'grid' variant for features
        data: {
          title: 'Property Details',
          features: features,
        },
      })
    }
  }

  // Description section - skip for now (text type not in registry)
  // We'll add it later if needed

  // Gallery section
  if (data.images.length > 1) {
    sections.push({
      id: generateId('gallery'),
      type: 'gallery',
      variant: 'grid', // Use 'grid' variant for gallery
      data: {
        title: 'Property Images',
        images: data.images.slice(1, 10).map((src: string) => ({
          src,
          alt: 'Property image',
        })),
        layout: 'grid',
      },
    })
  }

  // Amenities section
  if (data.features.length > 0) {
    sections.push({
      id: generateId('features'),
      type: 'features',
      variant: 'list', // Use 'list' variant for amenities
      data: {
        title: 'Features & Amenities',
        features: data.features.map(f => ({
          label: f,
        })),
      },
    })
  }

  return {
    sections,
    theme: {
      primaryColor: '#000000',
      secondaryColor: '#ffffff',
    },
  }
}
