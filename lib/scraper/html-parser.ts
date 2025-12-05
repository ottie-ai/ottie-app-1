/**
 * HTML Parser for Real Estate Listings
 * Extracts structured property data from HTML content
 */

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
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

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
      doc.querySelectorAll(selector).forEach(el => el.remove())
    } catch (e) {
      // Ignore invalid selectors
    }
  })

  // Extract main content
  const mainContent =
    doc.querySelector('main') ||
    doc.querySelector('[role="main"]') ||
    doc.querySelector('.main-content') ||
    doc.querySelector('#main-content') ||
    doc.querySelector('article') ||
    doc.body

  return mainContent?.innerHTML || ''
}

/**
 * Extract text content from HTML
 */
export function extractText(html: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  // Remove script and style tags
  doc.querySelectorAll('script, style').forEach(el => el.remove())

  return doc.body.textContent || doc.body.innerText || ''
}

/**
 * Parse property data from HTML
 * Uses heuristics and common patterns for real estate sites
 */
export function parsePropertyData(html: string, sourceUrl: string): ParsedPropertyData {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

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
    doc.querySelector('h1')?.textContent?.trim() ||
    doc.querySelector('[class*="title"]')?.textContent?.trim() ||
    doc.querySelector('[class*="heading"]')?.textContent?.trim() ||
    doc.title ||
    null

  // Extract price (look for $, €, £ symbols and numbers)
  const priceText =
    doc.querySelector('[class*="price"]')?.textContent ||
    doc.querySelector('[id*="price"]')?.textContent ||
    doc.querySelector('[data-price]')?.getAttribute('data-price') ||
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
    const element = doc.querySelector(selector)
    if (element) {
      result.address = element.textContent?.trim() || null
      break
    }
  }

  // Extract bedrooms
  const bedText =
    doc.querySelector('[class*="bed"]')?.textContent ||
    doc.querySelector('[class*="bedroom"]')?.textContent ||
    null

  if (bedText) {
    const bedMatch = bedText.match(/(\d+)\s*(bed|br|bedroom)/i)
    if (bedMatch) {
      result.bedrooms = parseInt(bedMatch[1], 10)
    }
  }

  // Extract bathrooms
  const bathText =
    doc.querySelector('[class*="bath"]')?.textContent ||
    doc.querySelector('[class*="bathroom"]')?.textContent ||
    null

  if (bathText) {
    const bathMatch = bathText.match(/(\d+)\s*(bath|ba|bathroom)/i)
    if (bathMatch) {
      result.bathrooms = parseInt(bathMatch[1], 10)
    }
  }

  // Extract square footage
  const sqftText =
    doc.querySelector('[class*="sqft"]')?.textContent ||
    doc.querySelector('[class*="square"]')?.textContent ||
    doc.querySelector('[class*="area"]')?.textContent ||
    null

  if (sqftText) {
    const sqftMatch = sqftText.match(/([\d,]+)\s*(sq\s*ft|sqft|m²|sq\s*m)/i)
    if (sqftMatch) {
      result.squareFootage = parseInt(sqftMatch[1].replace(/,/g, ''), 10)
    }
  }

  // Extract images
  const imageElements = doc.querySelectorAll('img[src], img[data-src], img[data-lazy]')
  imageElements.forEach(img => {
    const src =
      img.getAttribute('src') ||
      img.getAttribute('data-src') ||
      img.getAttribute('data-lazy') ||
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
    const element = doc.querySelector(selector)
    if (element && element.textContent && element.textContent.length > 50) {
      result.description = element.textContent.trim()
      break
    }
  }

  // Extract features/amenities
  const featureElements = doc.querySelectorAll(
    '[class*="feature"], [class*="amenity"], [class*="amenities"], li[class*="feature"]'
  )
  featureElements.forEach(el => {
    const text = el.textContent?.trim()
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

  // Hero section
  if (data.images.length > 0 || data.title) {
    sections.push({
      type: 'hero',
      data: {
        title: data.title || 'Property Listing',
        subtitle: data.address || '',
        image: data.images[0] || null,
        backgroundImage: data.images[0] || null,
      },
    })
  }

  // Features section
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
        icon: 'area',
        label: 'Square Feet',
        value: data.squareFootage.toLocaleString(),
      })
    }

    if (features.length > 0) {
      sections.push({
        type: 'features',
        data: {
          title: 'Property Details',
          items: features,
        },
      })
    }
  }

  // Description section
  if (data.description) {
    sections.push({
      type: 'text',
      data: {
        title: 'Description',
        content: data.description,
      },
    })
  }

  // Gallery section
  if (data.images.length > 1) {
    sections.push({
      type: 'gallery',
      data: {
        title: 'Property Images',
        images: data.images.slice(1, 10), // Skip first (used in hero)
      },
    })
  }

  // Amenities section
  if (data.features.length > 0) {
    sections.push({
      type: 'features',
      data: {
        title: 'Features & Amenities',
        items: data.features.map(f => ({
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
