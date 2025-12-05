/**
 * HTML Parser for Real Estate Listings
 * Extracts structured property data from HTML content
 * Uses cheerio for server-side HTML parsing
 */

import { load } from 'cheerio'

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
 * Clean HTML by removing unwanted elements
 */
export function cleanHtml(html: string): string {
  const $ = load(html)

  // Remove unwanted elements
  const selectorsToRemove = [
    'header',
    'footer',
    'nav',
    'script',
    'style',
    '[class*="ad"]',
    '[class*="advertisement"]',
    '[id*="ad"]',
    '[class*="cookie"]',
    '[class*="banner"]',
    '[class*="popup"]',
    '[class*="modal"]',
    'noscript',
    'iframe[src*="ads"]',
    'iframe[src*="tracking"]',
    'iframe[src*="analytics"]',
  ]

  selectorsToRemove.forEach(selector => {
    try {
      $(selector).remove()
    } catch (e) {
      // Ignore invalid selectors
    }
  })

  // Extract main content
  const mainContent =
    $('main').first() ||
    $('[role="main"]').first() ||
    $('.main-content').first() ||
    $('#main-content').first() ||
    $('article').first() ||
    $('body')

  return mainContent.html() || ''
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
  result.title =
    $('h1').first().text().trim() ||
    $('[class*="title"]').first().text().trim() ||
    $('[class*="heading"]').first().text().trim() ||
    $('title').text().trim() ||
    null

  // Extract price (look for $, €, £ symbols and numbers)
  const priceText =
    $('[class*="price"]').first().text() ||
    $('[id*="price"]').first().text() ||
    $('[data-price]').first().attr('data-price') ||
    null

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
