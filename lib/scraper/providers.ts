/**
 * Scraper Provider Abstraction
 * Supports multiple scraping providers:
 * - Firecrawl (general purpose - return HTML, with basic proxy and stealth mode fallback)
 * - Apify (site-specific scrapers - return structured JSON, automatically selected based on URL)
 * 
 * Apify scrapers are automatically selected based on URL (e.g., Zillow)
 * For all other URLs, Firecrawl is used with automatic fallback to stealth mode if blocked
 */

import Firecrawl from '@mendable/firecrawl-js'
import { findApifyScraperForUrl, type ApifyScraperConfig } from './apify-scrapers'
import { runApifyActor, type ApifyResult } from './apify-client'
import { getFirecrawlActions, getFirecrawlActionsGallery } from './firecrawl-actions'
import { getGalleryImageExtractor } from './html-processors'

export type ScraperProvider = 'firecrawl' | 'apify'

export interface ScrapeResult {
  html?: string // Raw HTML - general providers return this (or HTML after actions if actions were used)
  htmlBeforeActions?: string // Original HTML before actions (only if actions were used)
  json?: any // Structured JSON - Apify scrapers return this
  provider: ScraperProvider
  duration: number
  apifyScraperId?: string // Only for Apify results
  galleryImages?: string[] // Gallery images extracted from second call (only for Realtor.com)
  actualProvider?: string // Actual provider used (e.g., 'firecrawl_stealth', 'apify_fallback')
}

/**
 * Detect if HTML content indicates a blocking/access denied error
 * Universal detection for various blocking patterns
 */
function isBlockedContent(html: string): boolean {
  if (!html || html.trim().length === 0) {
    return false
  }

  const htmlLower = html.toLowerCase()
  
  // Common blocking patterns
  const blockingPatterns = [
    'access denied',
    'access forbidden',
    'permission denied',
    'you don\'t have permission',
    'blocked',
    'forbidden',
    '403 forbidden',
    'cloudflare',
    'checking your browser',
    'please wait',
    'ddos protection',
    'captcha',
    'robot',
    'bot detected',
    'reference #', // Common in error pages
    'errors.edgesuite.net', // Akamai error pages
  ]
  
  // Check if any blocking pattern is present
  for (const pattern of blockingPatterns) {
    if (htmlLower.includes(pattern)) {
      return true
    }
  }
  
  // Check for very short HTML that might be an error page
  if (html.length < 500 && (
    htmlLower.includes('<h1>') && htmlLower.includes('denied') ||
    htmlLower.includes('<h1>') && htmlLower.includes('forbidden') ||
    htmlLower.includes('<h1>') && htmlLower.includes('error')
  )) {
    return true
  }
  
  return false
}

/**
 * Scrape URL using Apify Web Scraper (general purpose)
 * Returns HTML content like other providers
 */
async function scrapeWithApify(url: string, timeout: number): Promise<ScrapeResult> {
  const apiToken = process.env.APIFY_API_TOKEN
  
  if (!apiToken) {
    throw new Error('APIFY_API_TOKEN is not configured')
  }

  console.log('🔵 [Apify] Scraping URL:', url)
  const callStartTime = Date.now()
  
  // Create a generic scraper config for Website Content Crawler
  const genericScraper: ApifyScraperConfig = {
    id: 'generic_web_scraper',
    name: 'Website Content Crawler',
    actorId: 'apify/website-content-crawler',
    shouldHandle: () => true,
    buildInput: (url: string) => ({
      startUrls: [{ url }],
      maxCrawlPages: 1,
      crawlerType: 'cheerio',
    }),
  }
  
  try {
    const result = await runApifyActor(genericScraper, url, timeout)
    const callDuration = Date.now() - callStartTime
    
    // Extract HTML from Apify result
    let html = ''
    if (result.data && Array.isArray(result.data) && result.data.length > 0) {
      const item = result.data[0]
      html = item.html || item.text || item.markdown || ''
    }
    
    console.log('✅ [Apify] Successfully scraped URL, content length:', html.length, `(${callDuration}ms)`)
    
    return {
      html,
      provider: 'apify',
      duration: callDuration,
      actualProvider: 'apify_generic',
    }
  } catch (error: any) {
    if (error.message?.includes('timeout')) {
      throw new Error(`Apify timeout after ${timeout / 1000} seconds`)
    }
    
    throw error
  }
}

/**
 * Scrape URL using Firecrawl
 * Returns raw HTML (unified interface with other providers)
 * 
 * @param url - URL to scrape
 * @param timeout - Timeout in milliseconds
 * @param useStealth - Use stealth proxy mode (default: false)
 */
async function scrapeWithFirecrawl(url: string, timeout: number, useStealth: boolean = false): Promise<ScrapeResult> {
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
    const galleryActionsConfig = getFirecrawlActionsGallery(url)
    
    // Base scrape options
    const baseScrapeOptions: any = {
      formats: ['html'], // Request only HTML
      proxy: useStealth ? 'stealth' : 'basic', // Use stealth proxy if requested, otherwise basic (saves credits)
    }
    
    let html: string | undefined = undefined
    let galleryImages: string[] | undefined = undefined
    
    // Check if we need to do two calls (websites with gallery extraction)
    // Two calls are needed if galleryActionsConfig exists (even if actionsConfig is null)
    const needsTwoCalls = galleryActionsConfig && galleryActionsConfig.actions
    
    if (needsTwoCalls) {
      // Call 1: Main content (with or without actions)
      if (actionsConfig && actionsConfig.actions) {
        console.log(`🔵 [Firecrawl] Website needs two calls, performing Call 1 with ${actionsConfig.actions.length} actions for ${url}`)
        
        const scrapeOptions1 = {
          ...baseScrapeOptions,
          actions: actionsConfig.actions,
        }
        
        const scrapeResponse1 = await firecrawl.scrape(url, scrapeOptions1)
        
        if (scrapeResponse1.html) {
          html = scrapeResponse1.html
        } else if (scrapeResponse1.rawHtml) {
          html = scrapeResponse1.rawHtml
        }
        
        if (!html || html.trim().length === 0) {
          throw new Error('Firecrawl Call 1 returned empty HTML content')
        }
        
        console.log(`✅ [Firecrawl] Call 1 complete, HTML length: ${html.length}`)
      } else {
        // Call 1: No actions needed, just scrape main content
        console.log(`🔵 [Firecrawl] Website needs two calls, performing Call 1 (no actions) for ${url}`)
        
        const scrapeResponse1 = await firecrawl.scrape(url, baseScrapeOptions)
        
        if (scrapeResponse1.html) {
          html = scrapeResponse1.html
        } else if (scrapeResponse1.rawHtml) {
          html = scrapeResponse1.rawHtml
        }
        
        if (!html || html.trim().length === 0) {
          throw new Error('Firecrawl Call 1 returned empty HTML content')
        }
        
        console.log(`✅ [Firecrawl] Call 1 complete, HTML length: ${html.length}`)
      }
      
      // Call 2: Gallery images only (don't save raw HTML, just extract images)
      console.log(`🔵 [Firecrawl] Performing Call 2 with ${galleryActionsConfig.actions!.length} gallery actions for ${url}`)
      
      const scrapeOptions2 = {
        ...baseScrapeOptions,
        actions: galleryActionsConfig.actions!,
      }
      
      let galleryHtml: string | undefined = undefined
      let call2Success = false
      
      try {
        const scrapeResponse2 = await firecrawl.scrape(url, scrapeOptions2)
        
        if (scrapeResponse2.html) {
          galleryHtml = scrapeResponse2.html
        } else if (scrapeResponse2.rawHtml) {
          galleryHtml = scrapeResponse2.rawHtml
        }
        
        if (galleryHtml && galleryHtml.trim().length > 0) {
          call2Success = true
          // Extract gallery images from Call 2 HTML using website-specific extractor
          const galleryExtractor = getGalleryImageExtractor(url)
          if (galleryExtractor) {
            galleryImages = galleryExtractor(galleryHtml)
            console.log(`✅ [Firecrawl] Call 2 complete, extracted ${galleryImages.length} gallery images`)
          } else {
            console.warn('⚠️ [Firecrawl] Call 2 complete but no gallery extractor found for this website')
          }
        } else {
          console.warn('⚠️ [Firecrawl] Call 2 returned empty HTML, no gallery images extracted')
        }
      } catch (call2Error: any) {
        console.warn(`⚠️ [Firecrawl] Call 2 failed: ${call2Error.message || 'Unknown error'}`)
        
        // Try fallback: Call 2 with stealth mode
        if (!useStealth && process.env.FIRECRAWL_API_KEY) {
          try {
            console.log(`🔄 [Firecrawl] Trying Call 2 with stealth mode as fallback...`)
            const stealthScrapeOptions2 = {
              ...baseScrapeOptions,
              proxy: 'stealth', // Use stealth mode for fallback
              actions: galleryActionsConfig.actions!,
            }
            
            const stealthScrapeResponse2 = await firecrawl.scrape(url, stealthScrapeOptions2)
            
            if (stealthScrapeResponse2.html) {
              galleryHtml = stealthScrapeResponse2.html
            } else if (stealthScrapeResponse2.rawHtml) {
              galleryHtml = stealthScrapeResponse2.rawHtml
            }
            
            if (galleryHtml && galleryHtml.trim().length > 0) {
              call2Success = true
              // Extract gallery images from stealth Call 2 HTML
              const galleryExtractor = getGalleryImageExtractor(url)
              if (galleryExtractor) {
                galleryImages = galleryExtractor(galleryHtml)
                console.log(`✅ [Firecrawl] Call 2 stealth fallback succeeded, extracted ${galleryImages.length} gallery images`)
              } else {
                console.warn('⚠️ [Firecrawl] Call 2 stealth fallback complete but no gallery extractor found')
              }
            } else {
              console.warn('⚠️ [Firecrawl] Call 2 stealth fallback returned empty HTML')
            }
          } catch (stealthError: any) {
            console.error(`❌ [Firecrawl] Call 2 stealth fallback also failed: ${stealthError.message || 'Unknown error'}`)
            // Continue without gallery images - Call 1 was successful, so we can still return the result
          }
        }
        
        // If Call 2 failed and no fallback succeeded, log warning but don't throw error
        // Call 1 was successful, so we can still return the result without gallery images
        if (!call2Success) {
          console.warn('⚠️ [Firecrawl] Call 2 failed and fallback also failed, continuing without gallery images')
        }
      }
    } else if (actionsConfig && actionsConfig.actions) {
      // Single call with actions (other websites)
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
      galleryImages ? `(${galleryImages.length} gallery images)` : '',
      `(${callDuration}ms)`)
    
    return {
      html: html, // HTML after actions (or normal HTML if no actions)
      provider: 'firecrawl',
      duration: callDuration,
      galleryImages: galleryImages, // Gallery images from Call 2 (for Realtor.com and Redfin.com)
      actualProvider: useStealth ? 'firecrawl_stealth' : 'firecrawl',
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
 * Scrape a URL using the appropriate provider with fallback logic
 * 
 * Priority:
 * 1. Check if URL has a dedicated Apify scraper (e.g., Zillow)
 * 2. Otherwise, use Firecrawl (basic proxy)
 * 3. If Firecrawl fails or is blocked → fallback to Firecrawl stealth mode
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
        actualProvider: `apify_${apifyScraper.id}`,
      }
    } catch (error) {
      console.error(`❌ [Apify:${apifyScraper.name}] Failed:`, error)
      // If Apify fails, throw error (don't fallback to general scraper)
      // This ensures we get proper error messages for site-specific issues
      throw error
    }
  }
  
  // PRIORITY 2: Use Firecrawl (basic proxy)
  console.log(`🎯 [Routing] Using Firecrawl with basic proxy`)
  
  try {
    // Try Firecrawl with basic proxy first
    const result = await scrapeWithFirecrawl(url, timeout, false)
    result.actualProvider = 'firecrawl'
    
    // Check if result is blocked
    if (result.html && isBlockedContent(result.html)) {
      console.warn(`⚠️ [Routing] Firecrawl returned blocked content, trying stealth mode...`)
      
      // Try Firecrawl with stealth mode
      try {
        const stealthResult = await scrapeWithFirecrawl(url, timeout, true)
        
        if (stealthResult.html && !isBlockedContent(stealthResult.html)) {
          console.log(`✅ [Routing] Firecrawl stealth succeeded`)
          return stealthResult
        }
        
        console.error(`❌ [Routing] Firecrawl stealth also blocked`)
        result.actualProvider = 'firecrawl_blocked'
        return result
      } catch (stealthError) {
        console.error(`❌ [Routing] Firecrawl stealth failed:`, stealthError)
        result.actualProvider = 'firecrawl_blocked'
        return result
      }
    }
    
    // Success - return result
    return result
    
  } catch (error: any) {
    console.error(`❌ [Routing] Firecrawl failed:`, error.message)
    
    // Try Firecrawl with stealth mode as fallback
    if (process.env.FIRECRAWL_API_KEY) {
      try {
        console.log(`🔄 [Routing] Trying Firecrawl with stealth mode after error...`)
        const stealthResult = await scrapeWithFirecrawl(url, timeout, true)
        
        if (stealthResult.html && !isBlockedContent(stealthResult.html)) {
          console.log(`✅ [Routing] Firecrawl stealth succeeded after error`)
          return stealthResult
        }
      } catch (stealthError) {
        console.error(`❌ [Routing] Firecrawl stealth also failed:`, stealthError)
      }
    }
    
    // All attempts failed, throw original error
    throw error
  }
}
