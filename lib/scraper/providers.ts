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
    
    let html: string | undefined = undefined
    
    // If actions config exists, perform ONE scrape with combined actions
    if (actionsConfig && actionsConfig.actions) {
      console.log(`🔵 [Firecrawl] Website has actions, performing scrape with ${actionsConfig.actions.length} actions for ${url}`)
      
      const scrapeOptions = {
        ...baseScrapeOptions,
        actions: actionsConfig.actions,
      }
      
      const scrapeResponse = await firecrawl.scrape(url, scrapeOptions)
      
      if (scrapeResponse.html) {
        html = scrapeResponse.html
      } else if (scrapeResponse.rawHtml) {
        html = scrapeResponse.rawHtml
      }
      
      if (!html || html.trim().length === 0) {
        throw new Error('Firecrawl returned empty HTML content')
      }
      
      console.log(`✅ [Firecrawl] Scrape complete with actions, HTML length: ${html.length}`)
    } else {
      // No actions: Single scrape (normal behavior)
      console.log('🔵 [Firecrawl] No actions, performing single scrape...')
      const scrapeResponse = await firecrawl.scrape(url, baseScrapeOptions)
      
      if (scrapeResponse.html) {
        html = scrapeResponse.html
      } else if (scrapeResponse.rawHtml) {
        html = scrapeResponse.rawHtml
      }
      
      if (!html || html.trim().length === 0) {
        throw new Error('Firecrawl returned empty HTML content')
      }
    }
    
    clearTimeout(timeoutId)
    const callDuration = Date.now() - callStartTime
    
    console.log('✅ [Firecrawl] Successfully scraped URL', 
      `(${html?.length || 0} chars)`, 
      `(${callDuration}ms)`)
    
    return {
      html: html, // HTML after actions (or normal HTML if no actions)
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
