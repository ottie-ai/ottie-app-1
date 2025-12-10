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
import { getFirecrawlActions, getFirecrawlActionsGallery, getFirecrawlActionsCombined } from './firecrawl-actions'
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
  galleryHtml?: string // Raw HTML from Call 2 (for debugging)
  actualProvider?: string // Actual provider used (e.g., 'firecrawl_stealth', 'apify_fallback')
}

/**
 * Detect if HTML content indicates a blocking/access denied error
 * Universal detection for various blocking patterns
 */
export function isBlockedContent(html: string): boolean {
  if (!html || html.trim().length === 0) {
    return false
  }

  const lowerHtml = html.toLowerCase()
  
  // Common blocking patterns
  const blockingPatterns = [
    'access denied',
    'accessdenied',
    'cloudflare',
    'checking your browser',
    'please wait',
    'ddos protection',
    'reference #',
    'error 403',
    'error 429',
    'too many requests',
    'blocked',
    'forbidden',
    'captcha',
    'recaptcha',
  ]
  
  return blockingPatterns.some(pattern => lowerHtml.includes(pattern))
}

/**
 * Scrape URL using Firecrawl
 * Returns raw HTML (unified interface with other providers)
 * 
 * REFACTORED: Uses single call with multiple scrape actions when gallery extraction is needed
 * Format: [main actions..., scrape1, wait, click, wait, scrape2]
 * Response contains actions.scrapes array with HTML from each scrape action
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
    
    // Base scrape options
    const baseScrapeOptions: any = {
      formats: ['html'], // Request only HTML
      proxy: useStealth ? 'stealth' : 'basic', // Use stealth proxy if requested, otherwise basic (saves credits)
    }
    
    let html: string | undefined = undefined
    let galleryImages: string[] | undefined = undefined
    let galleryHtml: string | undefined = undefined
    let usedStealth = false
    
    // Try to get combined actions (single call with multiple scrapes)
    // Format: [scrape1, wait, click, wait, scrape2]
    const combinedActions = getFirecrawlActionsCombined(url)
    
    if (combinedActions) {
      // Single call with combined actions (multiple scrapes in one call)
      // Format: [main actions..., scrape1, wait, click, wait, scrape2]
      console.log(`🔵 [Firecrawl] Using single call with ${combinedActions.length} combined actions (multiple scrapes) for ${url}`)
      
      try {
        // Normalize actions format (convert 'ms' to 'milliseconds' if needed)
        const normalizedActions = combinedActions.map((action: any) => {
          if (action.type === 'wait' && action.ms !== undefined && action.milliseconds === undefined) {
            return { type: 'wait', milliseconds: action.ms }
          }
          return action
        })
        
        const scrapeOptions = {
          ...baseScrapeOptions,
          actions: normalizedActions,
        }
        
        const scrapeResponse: any = await firecrawl.scrape(url, scrapeOptions)
        
        // Firecrawl returns HTML from actions.scrapes array when multiple scrape actions are used
        // Response structure: { html, rawHtml, actions: { scrapes: [{ html, url }, { html, url }] } }
        // Main html/rawHtml is from the LAST scrape action
        
        let firstScrapeHtml: string | undefined = undefined
        let secondScrapeHtml: string | undefined = undefined
        
        // Check if response has actions.scrapes array (multiple scrapes)
        if (scrapeResponse.actions?.scrapes && Array.isArray(scrapeResponse.actions.scrapes)) {
          const scrapes = scrapeResponse.actions.scrapes
          
          if (scrapes.length >= 2) {
            // First scrape (raw HTML - pre-action)
            firstScrapeHtml = scrapes[0].html || scrapes[0].rawHtml
            // Second scrape (gallery HTML - post-action)
            secondScrapeHtml = scrapes[1].html || scrapes[1].rawHtml
            console.log(`✅ [Firecrawl] Got both scrapes from actions.scrapes array (${scrapes.length} scrapes)`)
          } else if (scrapes.length === 1) {
            // Only one scrape in array - use main response as second scrape
            firstScrapeHtml = scrapes[0].html || scrapes[0].rawHtml
            secondScrapeHtml = scrapeResponse.html || scrapeResponse.rawHtml
            console.log(`⚠️ [Firecrawl] Only one scrape in actions.scrapes, using main response as second scrape`)
          }
        } else {
          // Fallback: actions.scrapes not available, use main response as gallery HTML
          // This shouldn't happen if Firecrawl properly returns scrapes array
          console.warn('⚠️ [Firecrawl] actions.scrapes array not found in response, using main response as gallery HTML')
          secondScrapeHtml = scrapeResponse.html || scrapeResponse.rawHtml
          
          // Get first scrape HTML from separate call (fallback)
          const actionsConfig = getFirecrawlActions(url)
          if (actionsConfig && actionsConfig.actions) {
            const firstScrapeIndex = actionsConfig.actions.findIndex((a: any) => a.type === 'scrape')
            const firstScrapeActions = firstScrapeIndex >= 0 
              ? actionsConfig.actions.slice(0, firstScrapeIndex + 1)
              : [...actionsConfig.actions, { type: 'scrape' }]
            
            const firstScrapeOptions = {
              ...baseScrapeOptions,
              actions: firstScrapeActions,
            }
            
            const firstScrapeResponse = await firecrawl.scrape(url, firstScrapeOptions)
            firstScrapeHtml = firstScrapeResponse.html || firstScrapeResponse.rawHtml
          } else {
            const initialScrapeResponse = await firecrawl.scrape(url, baseScrapeOptions)
            firstScrapeHtml = initialScrapeResponse.html || initialScrapeResponse.rawHtml
          }
        }
        
        html = firstScrapeHtml
        galleryHtml = secondScrapeHtml
        
        if (galleryHtml && galleryHtml.trim().length > 0) {
          // Extract gallery images from gallery HTML
          const galleryExtractor = getGalleryImageExtractor(url)
          if (galleryExtractor) {
            galleryImages = galleryExtractor(galleryHtml)
            console.log(`✅ [Firecrawl] Combined call complete, extracted ${galleryImages.length} gallery images`)
          }
        }
        
        if (!html || html.trim().length === 0) {
          throw new Error('Firecrawl combined call returned empty HTML for first scrape')
        }
        
        console.log(`✅ [Firecrawl] Combined call complete, raw HTML: ${html.length} chars, gallery HTML: ${galleryHtml?.length || 0} chars`)
      } catch (combinedError: any) {
        console.warn(`⚠️ [Firecrawl] Combined call failed: ${combinedError.message || 'Unknown error'}`)
        
        // Fallback to stealth mode
        if (!useStealth && process.env.FIRECRAWL_API_KEY) {
          try {
            console.log(`🔄 [Firecrawl] Trying combined call with stealth mode as fallback...`)
            usedStealth = true
            
            // Retry with stealth mode (same logic)
            const normalizedActions = combinedActions.map((action: any) => {
              if (action.type === 'wait' && action.ms !== undefined && action.milliseconds === undefined) {
                return { type: 'wait', milliseconds: action.ms }
              }
              return action
            })
            
            const stealthScrapeOptions = {
              ...baseScrapeOptions,
              proxy: 'stealth',
              actions: normalizedActions,
            }
            
            const stealthScrapeResponse: any = await firecrawl.scrape(url, stealthScrapeOptions)
            
            // Parse response same way
            let firstScrapeHtml: string | undefined = undefined
            let secondScrapeHtml: string | undefined = undefined
            
            if (stealthScrapeResponse.actions?.scrapes && Array.isArray(stealthScrapeResponse.actions.scrapes)) {
              const scrapes = stealthScrapeResponse.actions.scrapes
              if (scrapes.length >= 2) {
                firstScrapeHtml = scrapes[0].html || scrapes[0].rawHtml
                secondScrapeHtml = scrapes[1].html || scrapes[1].rawHtml
              } else if (scrapes.length === 1) {
                firstScrapeHtml = scrapes[0].html || scrapes[0].rawHtml
                secondScrapeHtml = stealthScrapeResponse.html || stealthScrapeResponse.rawHtml
              }
            } else {
              secondScrapeHtml = stealthScrapeResponse.html || stealthScrapeResponse.rawHtml
              // Get first scrape from separate call
              const actionsConfig = getFirecrawlActions(url)
              if (actionsConfig && actionsConfig.actions) {
                const firstScrapeIndex = actionsConfig.actions.findIndex((a: any) => a.type === 'scrape')
                const firstScrapeActions = firstScrapeIndex >= 0 
                  ? actionsConfig.actions.slice(0, firstScrapeIndex + 1)
                  : [...actionsConfig.actions, { type: 'scrape' }]
                
                const firstScrapeOptions = {
                  ...baseScrapeOptions,
                  proxy: 'stealth',
                  actions: firstScrapeActions,
                }
                
                const firstScrapeResponse = await firecrawl.scrape(url, firstScrapeOptions)
                firstScrapeHtml = firstScrapeResponse.html || firstScrapeResponse.rawHtml
              } else {
                const initialScrapeResponse = await firecrawl.scrape(url, { ...baseScrapeOptions, proxy: 'stealth' })
                firstScrapeHtml = initialScrapeResponse.html || initialScrapeResponse.rawHtml
              }
            }
            
            html = firstScrapeHtml
            galleryHtml = secondScrapeHtml
            
            if (galleryHtml && galleryHtml.trim().length > 0) {
              const galleryExtractor = getGalleryImageExtractor(url)
              if (galleryExtractor) {
                galleryImages = galleryExtractor(galleryHtml)
              }
            }
            
            if (!html || html.trim().length === 0) {
              throw new Error('Firecrawl combined call (stealth) returned empty HTML for first scrape')
            }
            
            console.log(`✅ [Firecrawl] Combined call (stealth) complete, raw HTML: ${html.length} chars, gallery HTML: ${galleryHtml?.length || 0} chars`)
          } catch (stealthError: any) {
            console.error(`❌ [Firecrawl] Combined call stealth fallback also failed: ${stealthError.message || 'Unknown error'}`)
            // Fall through to old two-call method
            throw combinedError
          }
        } else {
          throw combinedError
        }
      }
    } else {
      // Fallback: No combined actions available (websites without gallery extraction)
      // Use single call with main actions or simple scrape
      const actionsConfig = getFirecrawlActions(url)
      
      if (actionsConfig && actionsConfig.actions) {
      // Single call with actions (websites with main content actions but no gallery)
      console.log(`🔵 [Firecrawl] Website has actions, performing scrape with ${actionsConfig.actions.length} actions for ${url}`)
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
    
    // Determine actual provider based on what was used
    let actualProvider = 'firecrawl'
    if (useStealth || usedStealth) {
      actualProvider = 'firecrawl_stealth'
    }
    
    return {
      html: html, // HTML after actions (or normal HTML if no actions)
      provider: 'firecrawl',
      duration: callDuration,
      galleryImages: galleryImages, // Gallery images from Call 2 (for Realtor.com and Redfin.com)
      galleryHtml: galleryHtml, // Raw HTML from Call 2 (for debugging)
      actualProvider: actualProvider,
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
  // Uses single call with combined actions when gallery extraction is needed
  // Fallback logic is handled inside scrapeWithFirecrawl()
  console.log(`🎯 [Routing] Using Firecrawl with basic proxy`)
  
  // Call Firecrawl - uses combined actions (single call) or fallback to simple scrape
  const result = await scrapeWithFirecrawl(url, timeout, false)
  result.actualProvider = result.actualProvider || 'firecrawl'
  
  return result
}

/**
 * Retry Call 1 (main content) for a URL
 * Used for debugging - allows retrying just Call 1 without running Call 2
 * 
 * @param url - URL to scrape
 * @param timeout - Timeout in milliseconds (default: 170000 = 170 seconds)
 * @param useStealth - Use stealth proxy mode (default: false)
 * @returns HTML string from Call 1
 */
export async function retryCall1(url: string, timeout: number = 170000, useStealth: boolean = false): Promise<{ html: string; duration: number }> {
  const apiKey = process.env.FIRECRAWL_API_KEY
  
  if (!apiKey) {
    throw new Error('FIRECRAWL_API_KEY is not configured')
  }

  console.log('🔵 [Retry Call 1] Scraping URL:', url, useStealth ? '(stealth mode)' : '(basic mode)')
  const callStartTime = Date.now()
  
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  try {
    const firecrawl = new Firecrawl({ apiKey })
    const actionsConfig = getFirecrawlActions(url)
    
    const baseScrapeOptions: any = {
      formats: ['html'],
      proxy: useStealth ? 'stealth' : 'basic',
    }
    
    let html: string | undefined = undefined
    
    if (actionsConfig && actionsConfig.actions) {
      console.log(`🔵 [Retry Call 1] Performing with ${actionsConfig.actions.length} actions`)
      const scrapeOptions = {
        ...baseScrapeOptions,
        actions: actionsConfig.actions,
      }
      const scrapeResponse = await firecrawl.scrape(url, scrapeOptions)
      html = scrapeResponse.html || scrapeResponse.rawHtml
    } else {
      console.log(`🔵 [Retry Call 1] Performing without actions`)
      const scrapeResponse = await firecrawl.scrape(url, baseScrapeOptions)
      html = scrapeResponse.html || scrapeResponse.rawHtml
    }
    
    clearTimeout(timeoutId)
    const callDuration = Date.now() - callStartTime
    
    if (!html || html.trim().length === 0) {
      throw new Error('Call 1 returned empty HTML content')
    }
    
    console.log(`✅ [Retry Call 1] Complete, HTML length: ${html.length} (${callDuration}ms)`)
    
    return { html, duration: callDuration }
  } catch (error: any) {
    clearTimeout(timeoutId)
    const callDuration = Date.now() - callStartTime
    
    if (error.name === 'AbortError' || error.message?.includes('aborted') || callDuration >= timeout) {
      throw new Error(`Call 1 timeout after ${timeout / 1000} seconds`)
    }
    
    throw new Error(`Call 1 error: ${error.message || 'Unknown error'}`)
  }
}

/**
 * Retry Call 2 (gallery) for a URL
 * Used for debugging - allows retrying just Call 2 without running Call 1
 * 
 * @param url - URL to scrape
 * @param timeout - Timeout in milliseconds (default: 170000 = 170 seconds)
 * @param useStealth - Use stealth proxy mode (default: false)
 * @returns HTML string and extracted gallery images from Call 2
 */
export async function retryCall2(url: string, timeout: number = 170000, useStealth: boolean = false): Promise<{ html: string; galleryImages: string[]; duration: number }> {
  const apiKey = process.env.FIRECRAWL_API_KEY
  
  if (!apiKey) {
    throw new Error('FIRECRAWL_API_KEY is not configured')
  }

  console.log('🔵 [Retry Call 2] Scraping URL:', url, useStealth ? '(stealth mode)' : '(basic mode)')
  const callStartTime = Date.now()
  
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  try {
    const firecrawl = new Firecrawl({ apiKey })
    const galleryActionsConfig = getFirecrawlActionsGallery(url)
    
    if (!galleryActionsConfig || !galleryActionsConfig.actions) {
      throw new Error('No gallery actions configured for this URL')
    }
    
    const baseScrapeOptions: any = {
      formats: ['html'],
      proxy: useStealth ? 'stealth' : 'basic',
      actions: galleryActionsConfig.actions,
    }
    
    console.log(`🔵 [Retry Call 2] Performing with ${galleryActionsConfig.actions.length} gallery actions`)
    const scrapeResponse = await firecrawl.scrape(url, baseScrapeOptions)
    
    const galleryHtml = scrapeResponse.html || scrapeResponse.rawHtml
    
    if (!galleryHtml || galleryHtml.trim().length === 0) {
      throw new Error('Call 2 returned empty HTML content')
    }
    
    // Extract gallery images
    const galleryExtractor = getGalleryImageExtractor(url)
    let galleryImages: string[] = []
    
    if (galleryExtractor) {
      galleryImages = galleryExtractor(galleryHtml)
      console.log(`✅ [Retry Call 2] Extracted ${galleryImages.length} gallery images`)
    } else {
      console.warn('⚠️ [Retry Call 2] No gallery extractor found for this website')
    }
    
    clearTimeout(timeoutId)
    const callDuration = Date.now() - callStartTime
    
    console.log(`✅ [Retry Call 2] Complete, HTML length: ${galleryHtml.length} (${callDuration}ms)`)
    
    return { html: galleryHtml, galleryImages, duration: callDuration }
  } catch (error: any) {
    clearTimeout(timeoutId)
    const callDuration = Date.now() - callStartTime
    
    if (error.name === 'AbortError' || error.message?.includes('aborted') || callDuration >= timeout) {
      throw new Error(`Call 2 timeout after ${timeout / 1000} seconds`)
    }
    
    throw new Error(`Call 2 error: ${error.message || 'Unknown error'}`)
  }
}
