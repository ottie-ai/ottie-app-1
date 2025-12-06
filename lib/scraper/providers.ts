/**
 * Scraper Provider Abstraction
 * Supports multiple scraping providers (ScraperAPI, Firecrawl)
 * Switch between providers via SCRAPER_PROVIDER env variable
 */

import Firecrawl from '@mendable/firecrawl-js'

export type ScraperProvider = 'scraperapi' | 'firecrawl'

export interface ScrapeResult {
  html: string
  markdown?: string // Optional markdown (for Firecrawl)
  provider: ScraperProvider
  duration: number
}

/**
 * Get the active scraper provider from environment variable
 * Defaults to 'scraperapi' if not set
 */
export function getScraperProvider(): ScraperProvider {
  const provider = process.env.SCRAPER_PROVIDER?.toLowerCase()
  if (provider === 'firecrawl' || provider === 'scraperapi') {
    return provider
  }
  return 'scraperapi' // Default to ScraperAPI
}

/**
 * Scrape URL using ScraperAPI
 */
async function scrapeWithScraperAPI(url: string, timeout: number): Promise<ScrapeResult> {
  const apiKey = process.env.SCRAPERAPI_KEY
  
  if (!apiKey) {
    throw new Error('SCRAPERAPI_KEY is not configured')
  }

  const scraperUrl = `http://api.scraperapi.com/?api_key=${apiKey}&url=${encodeURIComponent(url)}`
  
  console.log('🔵 [ScraperAPI] Scraping URL:', url)
  const callStartTime = Date.now()
  
  // Set timeout for ScraperAPI call
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  try {
    const response = await fetch(scraperUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    })
    
    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`ScraperAPI error: ${response.status} ${response.statusText}`)
    }

    const html = await response.text()
    const callDuration = Date.now() - callStartTime
    
    console.log('✅ [ScraperAPI] Successfully scraped URL, content length:', html.length, `(${callDuration}ms)`)
    
    return {
      html,
      provider: 'scraperapi',
      duration: callDuration,
    }
  } catch (error: any) {
    clearTimeout(timeoutId)
    
    if (error.name === 'AbortError' || error.message?.includes('aborted')) {
      throw new Error(`ScraperAPI timeout after ${timeout / 1000} seconds`)
    }
    
    throw error
  }
}

/**
 * Scrape URL using Firecrawl
 */
async function scrapeWithFirecrawl(url: string, timeout: number): Promise<ScrapeResult> {
  const apiKey = process.env.FIRECRAWL_API_KEY
  
  if (!apiKey) {
    throw new Error('FIRECRAWL_API_KEY is not configured')
  }

  console.log('🔵 [Firecrawl] Scraping URL:', url)
  const callStartTime = Date.now()
  
  try {
    const firecrawl = new Firecrawl({ apiKey })
    
    // Scrape with markdown format
    // Firecrawl's markdown format is cleaner and already processed
    // Explicitly disable stealth mode and use basic proxy to save credits (1 credit instead of 5)
    const scrapeResponse = await firecrawl.scrape(url, {
      formats: ['markdown'],
      actions: { stealth: false }, // Disable stealth mode (saves 4 credits)
      proxy: 'basic', // Use basic proxy instead of stealth (saves 4 credits)
    })
    
    const callDuration = Date.now() - callStartTime
    
    // Firecrawl returns ScrapeResponse directly with properties: markdown, html, title, etc.
    let markdown = ''
    
    if (scrapeResponse.markdown) {
      markdown = scrapeResponse.markdown
    } else if (scrapeResponse.html) {
      // Fallback to HTML if markdown not available
      markdown = scrapeResponse.html
    } else if (scrapeResponse.rawHtml) {
      markdown = scrapeResponse.rawHtml
    } else {
      // Fallback: try to get any text content from response
      console.warn('⚠️ [Firecrawl] No markdown or HTML in response:', Object.keys(scrapeResponse))
      markdown = JSON.stringify(scrapeResponse)
    }
    
    if (!markdown || markdown.trim().length === 0) {
      throw new Error('Firecrawl returned empty content')
    }
    
    // For Firecrawl, we return markdown as-is
    // HTML conversion will happen later if needed (for cheerio processing)
    // For now, return markdown directly and empty HTML (will be generated from markdown if needed)
    console.log('✅ [Firecrawl] Successfully scraped URL, markdown length:', markdown.length, `(${callDuration}ms)`)
    
    return {
      html: '', // Empty HTML for Firecrawl - we use markdown directly
      markdown, // Return markdown so it can be stored directly
      provider: 'firecrawl',
      duration: callDuration,
    }
  } catch (error: any) {
    const callDuration = Date.now() - callStartTime
    
    if (error.message?.includes('timeout') || callDuration >= timeout) {
      throw new Error(`Firecrawl timeout after ${timeout / 1000} seconds`)
    }
    
    throw new Error(`Firecrawl error: ${error.message || 'Unknown error'}`)
  }
}

/**
 * Scrape a URL using the configured provider
 * @param url - URL to scrape
 * @param timeout - Timeout in milliseconds (default: 170000 = 170 seconds)
 */
export async function scrapeUrl(url: string, timeout: number = 170000): Promise<ScrapeResult> {
  const provider = getScraperProvider()
  
  if (provider === 'firecrawl') {
    return await scrapeWithFirecrawl(url, timeout)
  } else {
    return await scrapeWithScraperAPI(url, timeout)
  }
}
