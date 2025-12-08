/**
 * Scraper Provider Abstraction
 * Supports multiple scraping providers:
 * - ScraperAPI, Firecrawl (general purpose - return HTML)
 * - Apify (site-specific scrapers - return structured JSON)
 * 
 * Switch between general providers via SCRAPER_PROVIDER env variable
 * Apify scrapers are automatically selected based on URL
 */

import Firecrawl from '@mendable/firecrawl-js'
import { findApifyScraperForUrl } from './apify-scrapers'
import { runApifyActor, type ApifyResult } from './apify-client'
import { getFirecrawlActions } from './firecrawl-actions'

export type ScraperProvider = 'scraperapi' | 'firecrawl' | 'apify'

export interface ScrapeResult {
  html?: string // Raw HTML - general providers return this (or HTML after actions if actions were used)
  htmlBeforeActions?: string // Original HTML before actions (only if actions were used)
  json?: any // Structured JSON - Apify scrapers return this
  provider: ScraperProvider
  duration: number
  apifyScraperId?: string // Only for Apify results
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
 * Returns raw HTML (unified interface with other providers)
 */
async function scrapeWithFirecrawl(url: string, timeout: number): Promise<ScrapeResult> {
  const apiKey = process.env.FIRECRAWL_API_KEY
  
  if (!apiKey) {
    throw new Error('FIRECRAWL_API_KEY is not configured')
  }

  console.log('🔵 [Firecrawl] Scraping URL:', url)
  const callStartTime = Date.now()
  
  // Set timeout for Firecrawl call
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  try {
    const firecrawl = new Firecrawl({ apiKey })
    
    // Get website-specific actions config
    // Returns null for websites without specific actions
    const actionsConfig = getFirecrawlActions(url)
    
    // Base scrape options
    const baseScrapeOptions: any = {
      formats: ['html'], // Request only HTML
      proxy: 'basic', // Use basic proxy instead of stealth/auto (saves 4 credits per scrape)
    }
    
    let htmlBeforeActions: string | undefined = undefined
    let htmlAfterActions: string | undefined = undefined
    
    // If actions config exists, do TWO scrapes with different actions:
    // 1. First scrape WITH firstScrapeActions (e.g., click property-details)
    // 2. Second scrape WITH secondScrapeActions (e.g., click "View all photos")
    if (actionsConfig && actionsConfig.firstScrapeActions && actionsConfig.secondScrapeActions) {
      console.log(`🔵 [Firecrawl] Website has dual actions, performing TWO scrapes for ${url}`)
      
      // SCRAPE 1: With first set of actions (e.g., property-details)
      console.log(`🔵 [Firecrawl] Scrape 1/2: Getting HTML after ${actionsConfig.firstScrapeActions.length} actions (property-details)...`)
      const scrape1Options = {
        ...baseScrapeOptions,
        actions: actionsConfig.firstScrapeActions,
      }
      
      const scrape1Response = await firecrawl.scrape(url, scrape1Options)
      
      if (scrape1Response.html) {
        htmlBeforeActions = scrape1Response.html
      } else if (scrape1Response.rawHtml) {
        htmlBeforeActions = scrape1Response.rawHtml
      }
      
      if (!htmlBeforeActions || htmlBeforeActions.trim().length === 0) {
        throw new Error('Firecrawl returned empty HTML content (scrape 1)')
      }
      
      console.log(`✅ [Firecrawl] Scrape 1/2 complete, HTML length: ${htmlBeforeActions.length}`)
      
      // SCRAPE 2: With second set of actions (e.g., gallery photos)
      console.log(`🔵 [Firecrawl] Scrape 2/2: Getting HTML after ${actionsConfig.secondScrapeActions.length} actions (gallery photos)...`)
      const scrape2Options = {
        ...baseScrapeOptions,
        actions: actionsConfig.secondScrapeActions,
      }
      
      const scrape2Response = await firecrawl.scrape(url, scrape2Options)
      
      if (scrape2Response.html) {
        htmlAfterActions = scrape2Response.html
      } else if (scrape2Response.rawHtml) {
        htmlAfterActions = scrape2Response.rawHtml
      }
      
      if (!htmlAfterActions || htmlAfterActions.trim().length === 0) {
        throw new Error('Firecrawl returned empty HTML content (scrape 2)')
      }
      
      console.log(`✅ [Firecrawl] Scrape 2/2 complete, HTML length: ${htmlAfterActions.length}`)
    } else {
      // No actions: Single scrape (normal behavior)
      console.log('🔵 [Firecrawl] No actions, performing single scrape...')
      const scrapeResponse = await firecrawl.scrape(url, baseScrapeOptions)
      
      if (scrapeResponse.html) {
        htmlAfterActions = scrapeResponse.html
      } else if (scrapeResponse.rawHtml) {
        htmlAfterActions = scrapeResponse.rawHtml
      }
      
      if (!htmlAfterActions || htmlAfterActions.trim().length === 0) {
        throw new Error('Firecrawl returned empty HTML content')
      }
    }
    
    clearTimeout(timeoutId)
    const callDuration = Date.now() - callStartTime
    
    console.log('✅ [Firecrawl] Successfully scraped URL', 
      htmlBeforeActions ? `(2 scrapes: ${htmlBeforeActions.length} + ${htmlAfterActions?.length || 0} chars)` : 
      `(1 scrape: ${htmlAfterActions?.length || 0} chars)`, 
      `(${callDuration}ms)`)
    
    return {
      html: htmlAfterActions, // HTML after actions (or normal HTML if no actions)
      htmlBeforeActions: htmlBeforeActions, // Original HTML before actions (only if actions were used)
      provider: 'firecrawl',
      duration: callDuration,
    }
  } catch (error: any) {
    clearTimeout(timeoutId)
    const callDuration = Date.now() - callStartTime
    
    if (error.name === 'AbortError' || error.message?.includes('aborted') || callDuration >= timeout) {
      throw new Error(`Firecrawl timeout after ${timeout / 1000} seconds`)
    }
    
    throw new Error(`Firecrawl error: ${error.message || 'Unknown error'}`)
  }
}

/**
 * Scrape a URL using the appropriate provider
 * 
 * Priority:
 * 1. Check if URL has a dedicated Apify scraper (e.g., Zillow)
 * 2. Otherwise, use general provider (ScraperAPI or Firecrawl)
 * 
 * @param url - URL to scrape
 * @param timeout - Timeout in milliseconds (default: 170000 = 170 seconds)
 * @returns ScrapeResult with either HTML (general) or JSON (Apify)
 */
export async function scrapeUrl(url: string, timeout: number = 170000): Promise<ScrapeResult> {
  // PRIORITY 1: Check if URL should use a dedicated Apify scraper
  const apifyScraper = findApifyScraperForUrl(url)
  
  if (apifyScraper) {
    console.log(`🎯 [Routing] URL matched Apify scraper: ${apifyScraper.name}`)
    
    try {
      const apifyResult = await runApifyActor(apifyScraper, url, timeout)
      
      return {
        json: apifyResult.data,
        provider: 'apify',
        duration: apifyResult.duration,
        apifyScraperId: apifyScraper.id,
      }
    } catch (error) {
      console.error(`❌ [Apify:${apifyScraper.name}] Failed:`, error)
      // If Apify fails, throw error (don't fallback to general scraper)
      // This ensures we get proper error messages for site-specific issues
      throw error
    }
  }
  
  // PRIORITY 2: Use general scraper (ScraperAPI or Firecrawl)
  const provider = getScraperProvider()
  console.log(`🎯 [Routing] Using general scraper: ${provider}`)
  
  switch (provider) {
    case 'firecrawl':
      return await scrapeWithFirecrawl(url, timeout)
    case 'scraperapi':
    default:
      return await scrapeWithScraperAPI(url, timeout)
  }
}
