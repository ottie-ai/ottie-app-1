/**
 * Scraper Provider Abstraction
 * Supports multiple scraping providers:
 * - Firecrawl (general purpose - return HTML, with auto proxy mode)
 * - Apify (site-specific scrapers - return structured JSON, automatically selected based on URL)
 * 
 * Apify scrapers are automatically selected based on URL (e.g., Zillow)
 * For all other URLs, Firecrawl is used with auto proxy mode
 */

import Firecrawl from '@mendable/firecrawl-js'
import { findApifyScraperForUrl, type ApifyScraperConfig } from './apify-scrapers'
import { runApifyActor, type ApifyResult } from './apify-client'
import { getFirecrawlActions, getFirecrawlActionsGallery, getFirecrawlActionsCombined } from './firecrawl-actions'
import { getGalleryImageExtractor } from './html-processors'
import { htmlToMarkdownUniversal } from './markdown-converter'
import { load } from 'cheerio'

export type ScraperProvider = 'firecrawl' | 'apify'

export interface ScrapeResult {
  html?: string // Raw HTML - general providers return this (or HTML after actions if actions were used)
  htmlBeforeActions?: string // Original HTML before actions (only if actions were used)
  markdown?: string // Markdown representation of the default scrape (if provided by Firecrawl)
  json?: any // Structured JSON - Apify scrapers return this
  provider: ScraperProvider
  duration: number
  apifyScraperId?: string // Only for Apify results
  galleryImages?: string[] // Gallery images extracted from second call (only for Realtor.com)
  galleryHtml?: string // Raw HTML from Call 2 (for debugging)
  galleryMarkdown?: string // Markdown from gallery scrape when available
  actualProvider?: string // Actual provider used (e.g., 'firecrawl_stealth', 'apify_fallback')
}

/**
 * Whitelist of known virtual tour platform domains
 */
const VIRTUAL_TOUR_DOMAINS = [
  'matterport.com',
  'my.matterport.com',
  'kuula.co',
  'cloudpano.com',
  'youriguide.com',
  'iguide',
  'ricoh360.com',
  'theta360.com',
  'view.ricohtours.com',
  'giraffe360.com',
  'realisti.co',
  'eyespy360.com',
  'panoee.com',
  '3dvista.com',
  'immoviewer.com',
  'nocknock.io',
  'vieweet.com',
  'zillow.com', // Specifically for /view-3d-home paths
]

/**
 * Generic keywords that indicate virtual tours
 * These are often used in custom subdomains (e.g., tours.realitka.sk)
 */
const VIRTUAL_TOUR_KEYWORDS = [
  'virtualtour',
  'virtual-tour',
  '3dtour',
  '3d-tour',
  'walkthrough',
  'panorama',
  'pano',
  '360view',
  '360tour',
  '360',
  'spins',
  'spin-v2',
]

/**
 * Check if a URL is a virtual tour link
 * @param url - URL to check
 * @returns true if URL contains a virtual tour domain or keyword
 */
function isVirtualTourLink(url: string): boolean {
  if (!url || url.trim().length === 0) {
    return false
  }

  const lowerUrl = url.toLowerCase()

  // Check for whitelist domains
  for (const domain of VIRTUAL_TOUR_DOMAINS) {
    if (lowerUrl.includes(domain.toLowerCase())) {
      // Special case for Zillow - only match /view-3d-home paths
      if (domain === 'zillow.com' && !lowerUrl.includes('/view-3d-home')) {
        continue
      }
      return true
    }
  }

  // Check for generic keywords
  for (const keyword of VIRTUAL_TOUR_KEYWORDS) {
    if (lowerUrl.includes(keyword.toLowerCase())) {
      return true
    }
  }

  return false
}

/**
 * Extract all virtual tour links from raw HTML using Cheerio
 * Includes Matterport, Kuula, CloudPano, and other 3D tour platforms
 * @param html - Raw HTML content
 * @returns Array of unique virtual tour URLs
 */
function extractMatterportLinks(html: string): string[] {
  if (!html || html.trim().length === 0) {
    return []
  }

  const links: Set<string> = new Set()
  const $ = load(html)
  
  // Find all elements with href attributes containing virtual tour links
  $('[href]').each((_, element) => {
    const href = $(element).attr('href')
    if (href && isVirtualTourLink(href)) {
      links.add(href.trim())
    }
  })
  
  // Find all elements with data-href attributes containing virtual tour links
  $('[data-href]').each((_, element) => {
    const dataHref = $(element).attr('data-href')
    if (dataHref && isVirtualTourLink(dataHref)) {
      links.add(dataHref.trim())
    }
  })
  
  // Find all elements with src attributes containing virtual tour links (iframes, images, etc.)
  $('[src]').each((_, element) => {
    const src = $(element).attr('src')
    if (src && isVirtualTourLink(src)) {
      links.add(src.trim())
    }
  })
  
  // Also check other common data attributes that might contain links
  $('[data-url], [data-link], [data-src]').each((_, element) => {
    const dataUrl = $(element).attr('data-url') || $(element).attr('data-link') || $(element).attr('data-src')
    if (dataUrl && isVirtualTourLink(dataUrl)) {
      links.add(dataUrl.trim())
    }
  })
  
  return Array.from(links).sort()
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
    
    // Base scrape options
    const baseScrapeOptions: any = {
      formats: ['html', 'markdown'], // Request HTML + Markdown in a single call
      proxy: 'auto', // Use auto proxy mode (Firecrawl automatically selects best proxy)
      onlyMainContent: true, // Return only main content, excluding headers, navigation, footers
    }
    
    let html: string | undefined = undefined
    let galleryImages: string[] | undefined = undefined
    let galleryHtml: string | undefined = undefined
    let markdown: string | undefined = undefined
    let galleryMarkdown: string | undefined = undefined
    
    // Try to get combined actions (single call with multiple scrapes)
    // Format: [scrape1, wait, click, wait, scrape2]
    const combinedActions = getFirecrawlActionsCombined(url)
    
    if (combinedActions) {
      // Single call with combined actions (multiple scrapes in one call)
      // Format: [main actions..., scrape1, wait, click, wait, scrape2]
      console.log(`🔵 [Firecrawl] Using single call with ${combinedActions.length} combined actions (multiple scrapes) for ${url}`)
      
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
      let firstScrapeMarkdown: string | undefined = undefined
      let secondScrapeMarkdown: string | undefined = undefined
      
      // Check if response has actions.scrapes array (multiple scrapes)
      if (scrapeResponse.actions?.scrapes && Array.isArray(scrapeResponse.actions.scrapes)) {
        const scrapes = scrapeResponse.actions.scrapes
        
        if (scrapes.length >= 2) {
          // First scrape (raw HTML - pre-action)
          firstScrapeHtml = scrapes[0].html || scrapes[0].rawHtml
          firstScrapeMarkdown = scrapes[0].markdown
          // Second scrape (gallery HTML - post-action)
          secondScrapeHtml = scrapes[1].html || scrapes[1].rawHtml
          secondScrapeMarkdown = scrapes[1].markdown
          console.log(`✅ [Firecrawl] Got both scrapes from actions.scrapes array (${scrapes.length} scrapes)`)
        } else if (scrapes.length === 1) {
          // Only one scrape in array - use main response as second scrape
          firstScrapeHtml = scrapes[0].html || scrapes[0].rawHtml
          firstScrapeMarkdown = scrapes[0].markdown
          secondScrapeHtml = scrapeResponse.html || scrapeResponse.rawHtml
          secondScrapeMarkdown = scrapeResponse.markdown
          console.log(`⚠️ [Firecrawl] Only one scrape in actions.scrapes, using main response as second scrape`)
        }
      } else {
        // Fallback: actions.scrapes not available, use main response as gallery HTML
        // This shouldn't happen if Firecrawl properly returns scrapes array
        console.warn('⚠️ [Firecrawl] actions.scrapes array not found in response, using main response as gallery HTML')
        secondScrapeHtml = scrapeResponse.html || scrapeResponse.rawHtml
        secondScrapeMarkdown = scrapeResponse.markdown
        
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
          firstScrapeMarkdown = firstScrapeResponse.markdown
        } else {
          const initialScrapeResponse = await firecrawl.scrape(url, baseScrapeOptions)
          firstScrapeHtml = initialScrapeResponse.html || initialScrapeResponse.rawHtml
          firstScrapeMarkdown = initialScrapeResponse.markdown
        }
      }
      
      html = firstScrapeHtml
      galleryHtml = secondScrapeHtml
      markdown = firstScrapeMarkdown
      galleryMarkdown = secondScrapeMarkdown
      
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
    } else {
      // Fallback: No combined actions available (websites without gallery extraction)
      // Use single call with main actions or simple scrape
      const actionsConfig = getFirecrawlActions(url)
      
      if (actionsConfig && actionsConfig.actions) {
        // Single call with actions (websites with main content actions but no gallery)
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
      markdown = scrapeResponse.markdown
      
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
      markdown = scrapeResponse.markdown
      
      if (!html || html.trim().length === 0) {
        throw new Error('Firecrawl returned empty HTML content')
        }
      }
    }
    
    clearTimeout(timeoutId)
    const callDuration = Date.now() - callStartTime
    
    console.log('✅ [Firecrawl] Successfully scraped URL', 
      `(${html?.length || 0} chars)`, 
      galleryImages ? `(${galleryImages.length} gallery images)` : '',
      `(${callDuration}ms)`)
    
    // Ensure markdown fallbacks so callers always get both representations
    if (!markdown && html) {
      markdown = htmlToMarkdownUniversal(html).markdown
    }
    if (!galleryMarkdown && galleryHtml) {
      galleryMarkdown = htmlToMarkdownUniversal(galleryHtml).markdown
    }
    
    // Extract virtual tour links (Matterport, Kuula, CloudPano, etc.) from raw HTML and append to markdown
    const virtualTourLinks = new Set<string>()
    
    if (html) {
      const linksFromHtml = extractMatterportLinks(html)
      linksFromHtml.forEach(link => virtualTourLinks.add(link))
    }
    
    // Also check gallery HTML if available
    if (galleryHtml) {
      const linksFromGallery = extractMatterportLinks(galleryHtml)
      linksFromGallery.forEach(link => virtualTourLinks.add(link))
    }
    
    if (virtualTourLinks.size > 0 && markdown) {
      markdown += '\n\n## Virtual Tour Links\n\n'
      Array.from(virtualTourLinks).sort().forEach(link => {
        markdown += `- ${link}\n`
      })
      console.log(`✅ [Firecrawl] Added ${virtualTourLinks.size} virtual tour links to markdown`)
    }
    
    return {
      html: html, // HTML after actions (or normal HTML if no actions)
      markdown: markdown,
      provider: 'firecrawl',
      duration: callDuration,
      galleryImages: galleryImages, // Gallery images from Call 2 (for Realtor.com and Redfin.com)
      galleryHtml: galleryHtml, // Raw HTML from Call 2 (for debugging)
      galleryMarkdown: galleryMarkdown,
      actualProvider: 'firecrawl_auto',
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
 * 2. Otherwise, use Firecrawl (auto proxy mode)
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
    
    // For Realtor scraper: Try DATACENTER first, fallback to RESIDENTIAL if it fails
    // This provides cost optimization (datacenter is cheaper) with reliability fallback
    if (apifyScraper.id === 'realtor') {
      // Try datacenter proxy first (faster, cheaper)
      try {
        console.log(`🔄 [Apify:${apifyScraper.name}] Attempting with DATACENTER proxy...`)
        const apifyResult = await runApifyActor(apifyScraper, url, timeout, ['DATACENTER'])
        
        return {
          json: apifyResult.data,
          provider: 'apify',
          duration: apifyResult.duration,
          apifyScraperId: apifyScraper.id,
          actualProvider: `apify_${apifyScraper.id}`,
        }
      } catch (error: any) {
        console.warn(`⚠️ [Apify:${apifyScraper.name}] DATACENTER proxy failed, retrying with RESIDENTIAL proxy...`)
        console.warn(`⚠️ [Apify:${apifyScraper.name}] Error:`, error.message)
        
        // Retry with residential proxy (more reliable, less likely to be blocked)
        try {
          const apifyResult = await runApifyActor(apifyScraper, url, timeout, ['RESIDENTIAL'])
          
          return {
            json: apifyResult.data,
            provider: 'apify',
            duration: apifyResult.duration,
            apifyScraperId: apifyScraper.id,
            actualProvider: `apify_${apifyScraper.id}`,
          }
        } catch (retryError) {
          console.error(`❌ [Apify:${apifyScraper.name}] Both proxy attempts (DATACENTER and RESIDENTIAL) failed`)
          throw retryError
        }
      }
    } else {
      // For other scrapers, use default proxy configuration
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
  }
  
  // PRIORITY 2: Use Firecrawl (auto proxy)
  // Uses single call with combined actions when gallery extraction is needed
  console.log(`🎯 [Routing] Using Firecrawl with auto proxy`)
  
  // Call Firecrawl - uses combined actions (single call) or fallback to simple scrape
  const result = await scrapeWithFirecrawl(url, timeout)
  result.actualProvider = result.actualProvider || 'firecrawl_auto'
  
  return result
}

