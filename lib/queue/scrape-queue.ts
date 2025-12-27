/**
 * Scrape Queue Management with Upstash Redis
 * Handles queuing and processing of scrape jobs to avoid rate limiting
 * Supports concurrent processing with configurable limit
 */

import { redis, QUEUE_KEYS } from '@/lib/redis/client'

// Maximum concurrent scrape jobs (configurable via env)
const MAX_CONCURRENT_SCRAPES = parseInt(process.env.MAX_CONCURRENT_SCRAPES || '2')
import { scrapeUrl, type ScrapeResult } from '@/lib/scraper/providers'
import { createAdminClient } from '@/lib/supabase/admin'
import { 
  extractImageUrlsFromConfig, 
  processImages, 
  replaceImageUrlsInConfig 
} from '@/lib/storage/image-processor'
import { findApifyScraperById } from '@/lib/scraper/apify-scrapers'
import { getHtmlProcessor, getHtmlCleaner, getMainContentSelector } from '@/lib/scraper/html-processors'
import { load } from 'cheerio'
import { generateStructuredJSON, generateTitle, analyzeImagesWithVision } from '@/lib/openai/client'
import type { ImageAnalysisResult } from '@/types/builder'
import { getRealEstateConfigPrompt } from '@/lib/openai/main-prompt'
import { sortConfigToSampleOrder } from '@/lib/openai/config-sorter'
import { upscaleHeroImageIfNeeded } from '@/lib/replicate/upscale'

export interface ScrapeJob {
  id: string // preview_id from temp_previews
  url: string
  createdAt: number
  priority?: number // Optional priority (higher = processed first)
}

export interface QueueStats {
  queueLength: number
  processingCount: number
  completedToday: number
  failedToday: number
}

/**
 * Add a scrape job to the queue
 * Returns position in queue
 */
export async function addToQueue(job: ScrapeJob): Promise<number> {
  // Add job to queue (FIFO using list)
  const jobData = JSON.stringify(job)
  await redis.rpush(QUEUE_KEYS.SCRAPE_QUEUE, jobData)
  
  // Get queue position (1-indexed)
  const queueLength = await redis.llen(QUEUE_KEYS.SCRAPE_QUEUE)
  
  // Update stats
  await redis.hincrby(QUEUE_KEYS.SCRAPE_STATS, 'total_queued', 1)
  
  console.log(`✅ [Queue] Added job ${job.id} to queue, position: ${queueLength}`)
  
  return queueLength
}

/**
 * Get next job from queue
 * Moves job to processing set to prevent duplicate processing
 */
export async function getNextJob(): Promise<ScrapeJob | null> {
  // Pop job from queue (FIFO)
  const jobData = await redis.lpop(QUEUE_KEYS.SCRAPE_QUEUE)
  
  if (!jobData) {
    return null
  }
  
  // Upstash Redis automatically deserializes JSON, so jobData might already be an object
  const job: ScrapeJob = typeof jobData === 'string' ? JSON.parse(jobData) : (jobData as ScrapeJob)
  
  // Add to processing set with TTL (expires after 5 minutes if not completed)
  await redis.setex(
    `${QUEUE_KEYS.SCRAPE_PROCESSING}:${job.id}`,
    300, // 5 minutes TTL
    JSON.stringify(job)
  )
  
  console.log(`🔄 [Queue] Processing job ${job.id} for URL: ${job.url}`)
  
  return job
}

/**
 * Mark job as completed (remove from processing set)
 */
export async function markJobCompleted(jobId: string, success: boolean): Promise<void> {
  // Remove from processing set
  await redis.del(`${QUEUE_KEYS.SCRAPE_PROCESSING}:${jobId}`)
  
  // Update stats
  const statKey = success ? 'completed_today' : 'failed_today'
  await redis.hincrby(QUEUE_KEYS.SCRAPE_STATS, statKey, 1)
  
  console.log(`${success ? '✅' : '❌'} [Queue] Job ${jobId} ${success ? 'completed' : 'failed'}`)
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<QueueStats> {
  const [queueLength, processingKeys, stats] = await Promise.all([
    redis.llen(QUEUE_KEYS.SCRAPE_QUEUE),
    redis.keys(`${QUEUE_KEYS.SCRAPE_PROCESSING}:*`),
    redis.hgetall(QUEUE_KEYS.SCRAPE_STATS),
  ])
  
  return {
    queueLength: queueLength || 0,
    processingCount: processingKeys?.length || 0,
    completedToday: parseInt(stats?.completed_today as string || '0'),
    failedToday: parseInt(stats?.failed_today as string || '0'),
  }
}

/**
 * Get position of a job in queue
 * Returns null if job not in queue
 */
export async function getJobPosition(jobId: string): Promise<number | null> {
  // Get all jobs in queue
  const queueJobs = await redis.lrange(QUEUE_KEYS.SCRAPE_QUEUE, 0, -1)
  
  if (!queueJobs || queueJobs.length === 0) {
    return null
  }
  
  // Find job position
  // Upstash Redis automatically deserializes JSON, so jobData might already be an object
  const position = queueJobs.findIndex((jobData) => {
    const job: ScrapeJob = typeof jobData === 'string' 
      ? JSON.parse(jobData) 
      : (jobData as ScrapeJob)
    return job.id === jobId
  })
  
  return position === -1 ? null : position + 1 // 1-indexed
}

/**
 * Check if job is currently being processed
 */
export async function isJobProcessing(jobId: string): Promise<boolean> {
  const processingJob = await redis.get(`${QUEUE_KEYS.SCRAPE_PROCESSING}:${jobId}`)
  return processingJob !== null
}

/**
 * Process next job in queue (respects MAX_CONCURRENT_SCRAPES limit)
 * This is called by the worker API endpoint
 * 
 * IMPORTANT: Queue is ONLY for Firecrawl/Apify scraping calls
 * - Job is "done" from queue perspective once scraping is complete
 * - OpenAI processing happens AFTER queue slot is freed
 * - Each job sends self-trigger immediately after scraping (doesn't wait for OpenAI)
 */
/**
 * Format Apify JSON to readable text format (for Call 1)
 * Converts Apify JSON structure to text similar to formatPropertyDataForTitle
 * This makes Apify JSON more readable for OpenAI, similar to how Call 2 processes data
 */
function formatApifyJsonToText(apifyJson: any): string {
  if (!apifyJson) {
    return ''
  }

  const lines: string[] = []
  
  // Handle array of items (common in Apify responses)
  const items = Array.isArray(apifyJson) ? apifyJson : [apifyJson]
  
  // Process each item
  items.forEach((item, index) => {
    if (index > 0) {
      lines.push('') // Add separator between multiple items
      lines.push(`--- Property ${index + 1} ---`)
      lines.push('')
    }
    
    // Extract and format common property fields
    formatApifyPropertyItem(item, lines)
  })
  
  return lines.join('\n')
}

/**
 * Format a single property item from Apify JSON
 * Recursively includes all non-empty fields
 */
function formatApifyPropertyItem(item: any, lines: string[], depth: number = 0): void {
  if (!item || typeof item !== 'object') {
    return
  }

  const indent = '  '.repeat(depth)
  const processedKeys = new Set<string>()

  // Helper to check if value is empty
  const isEmpty = (val: any): boolean => {
    if (val === null || val === undefined || val === '') return true
    if (Array.isArray(val) && val.length === 0) return true
    if (typeof val === 'object' && !Array.isArray(val) && Object.keys(val).length === 0) return true
    return false
  }

  // Helper to format field name
  const formatFieldName = (key: string): string => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      .trim()
  }

  // Helper to format value based on type
  const formatValue = (val: any, key: string): string | null => {
    if (isEmpty(val)) return null
    
    // Numbers that look like prices
    if (typeof val === 'number' && (key.toLowerCase().includes('price') || key.toLowerCase().includes('fee') || key.toLowerCase().includes('tax'))) {
      return `$${val.toLocaleString()}`
    }
    
    // Regular numbers
    if (typeof val === 'number') {
      return val.toLocaleString()
    }
    
    // Booleans
    if (typeof val === 'boolean') {
      return val ? 'Yes' : 'No'
    }
    
    // Strings
    if (typeof val === 'string') {
      return val
    }
    
    return null
  }

  // Helper to process nested object and return lines
  const processObject = (obj: any, currentDepth: number): string[] => {
    if (isEmpty(obj)) return []
    
    const objLines: string[] = []
    const objIndent = '  '.repeat(currentDepth)
    
    for (const [key, value] of Object.entries(obj)) {
      if (isEmpty(value)) continue
      
      const fieldName = formatFieldName(key)
      
      if (typeof value === 'object' && !Array.isArray(value)) {
        // Nested object
        objLines.push(`${objIndent}${fieldName}:`)
        const nestedLines = processObject(value, currentDepth + 1)
        objLines.push(...nestedLines)
      } else if (Array.isArray(value)) {
        // Array
        if (value.length > 0) {
          objLines.push(`${objIndent}${fieldName}: (${value.length} items)`)
          value.forEach((item: any, idx: number) => {
            if (typeof item === 'object') {
              objLines.push(`${objIndent}  ${idx + 1}.`)
              const nestedLines = processObject(item, currentDepth + 2)
              objLines.push(...nestedLines)
            } else {
              const formatted = formatValue(item, key)
              if (formatted) {
                objLines.push(`${objIndent}  - ${formatted}`)
              }
            }
          })
        }
      } else {
        // Primitive value
        const formatted = formatValue(value, key)
        if (formatted) {
          objLines.push(`${objIndent}${fieldName}: ${formatted}`)
        }
      }
    }
    
    return objLines
  }

  // Process all top-level fields
  for (const [key, value] of Object.entries(item)) {
    if (isEmpty(value) || processedKeys.has(key)) continue
    
    // Skip technical fields
    if (['__typename', 'url', 'loadedUrl', 'requestId', 'requestQueueId'].includes(key)) {
      continue
    }
    
    processedKeys.add(key)
    const fieldName = formatFieldName(key)
    
    if (typeof value === 'object' && !Array.isArray(value)) {
      // Object - process recursively
      lines.push('')
      lines.push(`${fieldName}:`)
      const objLines = processObject(value, 1)
      lines.push(...objLines)
    } else if (Array.isArray(value)) {
      // Array
      if (value.length > 0) {
        lines.push('')
        lines.push(`${fieldName}: (${value.length} items)`)
        value.forEach((item: any, idx: number) => {
          if (typeof item === 'object') {
            lines.push(`  ${idx + 1}.`)
            const objLines = processObject(item, 2)
            lines.push(...objLines)
          } else {
            const formatted = formatValue(item, key)
            if (formatted) {
              lines.push(`  - ${formatted}`)
            }
          }
        })
      }
    } else {
      // Primitive value
      const formatted = formatValue(value, key)
      if (formatted) {
        lines.push(`${fieldName}: ${formatted}`)
      }
    }
  }
}

export async function processNextJob(): Promise<{ success: boolean; jobId?: string; error?: string }> {
  // Check if we're at concurrent limit
  const stats = await getQueueStats()
  if (stats.processingCount >= MAX_CONCURRENT_SCRAPES) {
    console.log(`⏸️ [Queue Worker] At concurrent limit (${stats.processingCount}/${MAX_CONCURRENT_SCRAPES}), skipping...`)
    return { success: false, error: `At concurrent limit (${stats.processingCount}/${MAX_CONCURRENT_SCRAPES})` }
  }
  
  const job = await getNextJob()
  
  if (!job) {
    return { success: false, error: 'No jobs in queue' }
  }
  
  try {
    console.log(`🔵 [Queue Worker] Starting scrape for job ${job.id}`)
    
    // Update preview status to 'scraping'
    const supabase = createAdminClient()
    await supabase
      .from('temp_previews')
      .update({ 
        status: 'scraping',
      })
      .eq('id', job.id)
    
    // Perform scrape (uses existing scrapeUrl function with all fallbacks)
    const scrapeResult = await scrapeUrl(job.url, 170000)
    
    // Process result (same logic as in old generatePreview)
    const rawHtml = scrapeResult.html
    let html = scrapeResult.html
    let markdown = scrapeResult.markdown
    const galleryHtml = scrapeResult.galleryHtml || null
    let galleryMarkdown = scrapeResult.galleryMarkdown || null
    const json = 'json' in scrapeResult ? scrapeResult.json : undefined
    const provider = scrapeResult.provider
    
    // Apply website-specific HTML processor if available
    let processedHtml: string | null = null
    if (html) {
      const htmlProcessor = getHtmlProcessor(job.url)
      if (htmlProcessor) {
        console.log(`🔵 [Queue Worker] Applying HTML processor for ${job.url}`)
        processedHtml = htmlProcessor(html)
        html = processedHtml
      }
    }
    
    // Extract structured data
    let cleanedJson: any = null
    let apifyJsonString: string | null = null
    let apifyTextFormat: string | null = null
    
    if (provider === 'apify' && json) {
      const scraper = scrapeResult.apifyScraperId ? findApifyScraperById(scrapeResult.apifyScraperId) : null
      const cleaner = scraper?.cleanJson
      cleanedJson = cleaner ? cleaner(json) : json
      
      // For Apify: Save JSON string as "raw HTML" equivalent and text format as "markdown" equivalent
      apifyJsonString = JSON.stringify(cleanedJson, null, 2)
      apifyTextFormat = formatApifyJsonToText(cleanedJson)
    }
    
    // Get gallery images
    const galleryImages: string[] = scrapeResult.galleryImages || []
    
    // Determine source_domain
    let sourceDomain = 'unknown'
    if (provider === 'apify' && scrapeResult.apifyScraperId) {
      sourceDomain = `apify_${scrapeResult.apifyScraperId}`
    } else if (provider === 'firecrawl') {
      sourceDomain = 'firecrawl'
    }
    
    // Set status to pending - OpenAI processing will run after scraping
    const finalStatus = 'pending'
    
    // Ensure markdown fallbacks for downstream steps
    if (!markdown && html) {
      markdown = extractStructuredText(html)
    }
    if (!galleryMarkdown && galleryHtml) {
      galleryMarkdown = extractStructuredText(galleryHtml)
    }
    
    // Prepare scraped_data for Apify JSON (saved to same column as markdown for Firecrawl)
    let scrapedData: any = null
    if (provider === 'apify' && cleanedJson) {
      // Save Apify JSON to scraped_data column (same as where markdown would be saved for Firecrawl)
      scrapedData = {
        provider: 'apify',
        apifyScraperId: scrapeResult.apifyScraperId,
        data: cleanedJson,
      }
    }
    
    // Check if we have any content to process
    // For Apify: check if we have cleanedJson
    // For Firecrawl: check if we have markdown or can extract from rawHtml
    let hasContent = false
    if (provider === 'apify' && cleanedJson) {
      hasContent = true
    } else if (provider === 'firecrawl') {
      // Check if markdown has content
      if (markdown && markdown.trim().length > 0) {
        hasContent = true
      } else if (rawHtml) {
        // Try to extract structured text from rawHtml as fallback
        const $ = load(rawHtml)
        const mainContentSelector = getMainContentSelector(job.url) || 'main'
        const mainElement = $(mainContentSelector)
        
        if (mainElement.length > 0) {
          const htmlCleaner = getHtmlCleaner(job.url)
          if (htmlCleaner) {
            htmlCleaner(mainElement)
          }
          
          const mainHtml = $.html(mainElement)
          const extractedText = extractStructuredText(mainHtml)
          if (extractedText && extractedText.trim().length > 0) {
            markdown = extractedText
            hasContent = true
          }
        }
      }
    }
    
    // If no content, set error status immediately and stop processing
    if (!hasContent) {
      console.error('❌ [Queue Worker] No content extracted from scraped page')
      console.error('❌ [Queue Worker] Provider:', provider)
      console.error('❌ [Queue Worker] Markdown length:', markdown?.length || 0)
      console.error('❌ [Queue Worker] Raw HTML length:', rawHtml?.length || 0)
      console.error('❌ [Queue Worker] Has cleanedJson:', !!cleanedJson)
      
      await supabase
        .from('temp_previews')
        .update({
          default_raw_html: provider === 'apify' ? apifyJsonString : (rawHtml || null),
          default_markdown: provider === 'apify' ? apifyTextFormat : (markdown || null),
          gallery_raw_html: galleryHtml,
          gallery_markdown: galleryMarkdown,
          gallery_image_urls: galleryImages && galleryImages.length > 0 ? galleryImages : [],
          scraped_data: scrapedData || undefined,
          status: 'error',
          error_message: 'Túto webstránku nemožno scrapnúť. Skúste inú URL.',
          source_domain: sourceDomain,
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id)
      
      await markJobCompleted(job.id, false)
      console.log(`❌ [Queue Worker] Job ${job.id} failed - no content extracted`)
      return { success: false, jobId: job.id, error: 'No content extracted from scraped page' }
    }
    
    // Update preview with scraped data
    // For Apify: use JSON string as raw_html and text format as markdown
    // For Firecrawl: use actual HTML and markdown
    await supabase
      .from('temp_previews')
      .update({
        default_raw_html: provider === 'apify' ? apifyJsonString : (rawHtml || null),
        default_markdown: provider === 'apify' ? apifyTextFormat : (markdown || null),
        gallery_raw_html: galleryHtml,
        gallery_markdown: galleryMarkdown,
        gallery_image_urls: galleryImages && galleryImages.length > 0 ? galleryImages : [],
        scraped_data: scrapedData || undefined, // Save Apify JSON to scraped_data column
        status: finalStatus, // 'completed' if OpenAI disabled, 'pending' if OpenAI will process
        source_domain: sourceDomain,
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id)
    
    // MARK AS COMPLETED FOR QUEUE PURPOSES
    // Queue is only for Firecrawl/Apify scraping calls, not for OpenAI processing
    // Once we have scraped data, job is "done" from queue perspective
    await markJobCompleted(job.id, true)
    
    console.log(`✅ [Queue Worker] Scraping completed for job ${job.id}, status: ${finalStatus}, queue slot freed`)
    
    // Self-trigger: Check if there are more jobs in queue and we're under concurrent limit
    // Each job sends self-trigger immediately after scraping (doesn't wait for OpenAI)
    // This enables continuous processing without waiting for cron
    try {
      const stats = await getQueueStats()
      const maxConcurrent = parseInt(process.env.MAX_CONCURRENT_SCRAPES || '2')
      
      // Only trigger if queue has jobs AND we're under concurrent limit
      if (stats.queueLength > 0 && stats.processingCount < maxConcurrent) {
        console.log(`🔄 [Queue Worker] ${stats.queueLength} job(s) remaining, ${stats.processingCount}/${maxConcurrent} processing, triggering next worker...`)
        
        // Trigger next worker asynchronously (non-blocking)
        // This ensures each job triggers the next one immediately (concurrent processing)
        // Use production domain to avoid Vercel Deployment Protection issues
        const getWorkerUrl = () => {
          if (process.env.NEXT_PUBLIC_APP_URL) {
            return `${process.env.NEXT_PUBLIC_APP_URL}/api/queue/process-scrape`
          }
          if (process.env.VERCEL_ENV === 'production') {
            return 'https://www.ottie.com/api/queue/process-scrape'
          }
          if (process.env.VERCEL_URL) {
            return `https://${process.env.VERCEL_URL}/api/queue/process-scrape`
          }
          return 'http://localhost:3000/api/queue/process-scrape'
        }
        // Use internal token for authentication (bypasses Vercel/platform auth)
        const internalToken = process.env.INTERNAL_API_TOKEN || process.env.VERCEL_URL || 'internal'
        
        fetch(getWorkerUrl(), {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-internal-token': internalToken,
          },
          // Don't wait for response - fire and forget
        }).catch(err => {
          console.error('⚠️ [Queue Worker] Failed to trigger next worker:', err)
          // Non-critical - cron will pick it up
        })
      } else if (stats.queueLength > 0 && stats.processingCount >= maxConcurrent) {
        console.log(`⏸️ [Queue Worker] Queue has ${stats.queueLength} job(s) but at concurrent limit (${stats.processingCount}/${maxConcurrent}), waiting...`)
      } else {
        console.log(`✅ [Queue Worker] Queue empty, stopping continuous processing`)
      }
    } catch (triggerError) {
      console.error('⚠️ [Queue Worker] Error checking queue for self-trigger:', triggerError)
      // Non-critical - cron will pick up remaining jobs
    }
    
    // OpenAI/Groq processing - runs AFTER queue slot is freed
    // This is not part of queue processing, just post-processing
    console.log('🤖 [Queue Worker] Starting AI processing (async, queue slot already freed)...')
    console.log('🤖 [Queue Worker] Provider:', provider)
    console.log('🤖 [Queue Worker] Has cleanedJson:', !!cleanedJson)
    console.log('🤖 [Queue Worker] Has markdown:', !!markdown, markdown ? `(${markdown.length} chars)` : '')
    console.log('🤖 [Queue Worker] Has rawHtml:', !!rawHtml, rawHtml ? `(${rawHtml.length} chars)` : '')
    
      try {
        if (provider === 'apify' && cleanedJson) {
          await generateConfigFromData(job.id, cleanedJson, 'apify')
        } else if (provider === 'firecrawl' && markdown) {
          // Content was already validated earlier, so markdown should have content
            // Persist updated markdown for debugging
            await supabase
              .from('temp_previews')
              .update({
              default_markdown: markdown,
                updated_at: new Date().toISOString(),
              })
              .eq('id', job.id)
            
          await generateConfigFromData(job.id, markdown, 'text')
        } else {
          // This should not happen as we check content earlier, but keep as safety fallback
          console.error('⚠️ [Queue Worker] Unexpected: No data available for AI processing')
          console.error('⚠️ [Queue Worker] Provider:', provider)
          console.error('⚠️ [Queue Worker] Has cleanedJson:', !!cleanedJson)
          console.error('⚠️ [Queue Worker] Has markdown:', !!markdown)
          
          await supabase
            .from('temp_previews')
            .update({
              status: 'error',
              error_message: 'Túto webstránku nemožno scrapnúť. Skúste inú URL.',
            })
            .eq('id', job.id)
        }
    } catch (aiError: any) {
      console.error('⚠️ [Queue Worker] AI processing failed:', aiError)
      // Don't fail the whole job if AI fails - scraping was successful
      // Update status to completed even if AI fails (scraping was successful)
        await supabase
          .from('temp_previews')
          .update({
            status: 'completed',
          error_message: `AI processing failed: ${aiError.message}`,
          })
          .eq('id', job.id)
    }
    
    return { success: true, jobId: job.id }
  } catch (error: any) {
    console.error(`❌ [Queue Worker] Job ${job.id} failed:`, error)
    
    // Update preview status to 'error'
    const supabase = createAdminClient()
    await supabase
      .from('temp_previews')
      .update({
        status: 'error',
        error_message: error.message || 'Failed to scrape URL',
      })
      .eq('id', job.id)
    
    // Mark as failed (scraping failed, so queue slot is freed)
    await markJobCompleted(job.id, false)
    
    // Self-trigger: Even on error, check if there are more jobs and we're under concurrent limit
    // This ensures queue keeps processing even if one job fails
    // Each failed job also sends self-trigger (doesn't wait for other jobs)
    // Queue is only for scraping calls, so even failed scraping frees the slot
    try {
      const stats = await getQueueStats()
      const maxConcurrent = parseInt(process.env.MAX_CONCURRENT_SCRAPES || '2')
      
      if (stats.queueLength > 0 && stats.processingCount < maxConcurrent) {
        console.log(`🔄 [Queue Worker] ${stats.queueLength} job(s) remaining after error, ${stats.processingCount}/${maxConcurrent} processing, triggering next worker...`)
        
        // Use production domain to avoid Vercel Deployment Protection issues
        const getWorkerUrl = () => {
          if (process.env.NEXT_PUBLIC_APP_URL) {
            return `${process.env.NEXT_PUBLIC_APP_URL}/api/queue/process-scrape`
          }
          if (process.env.VERCEL_ENV === 'production') {
            return 'https://www.ottie.com/api/queue/process-scrape'
          }
          if (process.env.VERCEL_URL) {
            return `https://${process.env.VERCEL_URL}/api/queue/process-scrape`
          }
          return 'http://localhost:3000/api/queue/process-scrape'
        }
        // Use internal token for authentication (bypasses Vercel/platform auth)
        const internalToken = process.env.INTERNAL_API_TOKEN || process.env.VERCEL_URL || 'internal'
        
        fetch(getWorkerUrl(), {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-internal-token': internalToken,
          },
        }).catch(err => {
          console.error('⚠️ [Queue Worker] Failed to trigger next worker after error:', err)
        })
      } else if (stats.queueLength > 0 && stats.processingCount >= maxConcurrent) {
        console.log(`⏸️ [Queue Worker] Queue has ${stats.queueLength} job(s) after error but at concurrent limit (${stats.processingCount}/${maxConcurrent})`)
      }
    } catch (triggerError) {
      console.error('⚠️ [Queue Worker] Error checking queue after failure:', triggerError)
    }
    
    return { success: false, jobId: job.id, error: error.message }
  }
}

/**
 * Process multiple jobs (batch processing)
 * Returns number of jobs processed
 */
export async function processBatch(maxJobs: number = 5): Promise<number> {
  let processed = 0
  
  for (let i = 0; i < maxJobs; i++) {
    const result = await processNextJob()
    
    if (!result.success && result.error === 'No jobs in queue') {
      break // No more jobs
    }
    
    processed++
  }
  
  return processed
}

/**
 * Helper: Generate site config from data using OpenAI
 * Works with both Apify JSON and structured text
 */
async function generateConfigFromData(
  previewId: string,
  data: any,
  type: 'apify' | 'text'
): Promise<void> {
  const supabase = createAdminClient()
  
  try {
    // Update status to pending before starting OpenAI calls
    await supabase
      .from('temp_previews')
      .update({
        status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', previewId)

    // Get prompt from centralized prompts file
    // Convert Apify JSON to text format (similar to Call 2) for better readability
    const dataToProcess = type === 'apify' ? formatApifyJsonToText(data) : data
    // Use 'text' type for both Apify (converted to text) and regular text
    const prompt = getRealEstateConfigPrompt('text', dataToProcess)

    // Call 1: Generate base config
    const call1StartTime = new Date().toISOString()
    console.log('🤖 [Queue Worker] Starting Call 1 (base config generation)...')
    
    const openaiResponse1 = await generateStructuredJSON(prompt, undefined, 'gpt-4o-mini')
    let generatedConfig = openaiResponse1.data
    const call1Usage = openaiResponse1.usage
    const call1Duration = openaiResponse1.callDuration
    const call1EndTime = new Date().toISOString()

    // Sort config keys to match sample config order (local operation, not part of OpenAI call)
    generatedConfig = sortConfigToSampleOrder(generatedConfig)

    // Process images: download and upload to Supabase Storage
    console.log(`🖼️ [Queue Worker] Processing images for ${previewId}...`)
    const imageUrls = extractImageUrlsFromConfig(generatedConfig)
    let processedConfig = generatedConfig
    
    if (imageUrls.length > 0) {
      console.log(`🖼️ [Queue Worker] Found ${imageUrls.length} images to process`)
      const basePath = `temp-preview/${previewId}`
      const urlMap = await processImages(imageUrls, basePath, 5)
      processedConfig = replaceImageUrlsInConfig(generatedConfig, urlMap)
      console.log(`✅ [Queue Worker] Processed ${urlMap.size} images`)
    } else {
      console.log(`ℹ️ [Queue Worker] No images found in config`)
    }

    // Update with Call 1 results immediately (so frontend can see Call 1 is done)
    await supabase
      .from('temp_previews')
      .update({
        generated_config: {
          ...processedConfig,
          _metadata: {
            call1_started_at: call1StartTime,
            call1_completed_at: call1EndTime,
            call1_duration_ms: call1Duration,
            call1_usage: call1Usage,
          }
        },
        unified_json: processedConfig, // Set initial unified_json with Call 1 data (with processed images)
        updated_at: call1EndTime,
      })
      .eq('id', previewId)
    
    console.log(`✅ [Queue Worker] Call 1 completed for ${previewId}`)

    // ============================================
    // Call 2 (Title) + Call 3 (Vision) run in PARALLEL
    // ============================================
    const call2And3StartTime = new Date().toISOString()
    console.log('🤖 [Queue Worker] Starting Call 2 (title) + Call 3 (vision) in parallel...')
    
    // Update status to show parallel calls are starting
    await supabase
      .from('temp_previews')
      .update({
        unified_json: {
          ...generatedConfig,
          _metadata: {
            call1_started_at: call1StartTime,
            call1_completed_at: call1EndTime,
            call1_duration_ms: call1Duration,
            call1_usage: call1Usage,
            call2_started_at: call2And3StartTime,
            call3_started_at: call2And3StartTime,
          }
        },
        updated_at: call2And3StartTime,
      })
      .eq('id', previewId)
    
    // Prepare Call 2 (title generation)
    const relevantData = {
      language: generatedConfig.language || '',
      title: generatedConfig.title || '',
      address: generatedConfig.address || {},
      beds: generatedConfig.beds || 0,
      baths: generatedConfig.baths || 0,
      property_type: generatedConfig.property_type || 'OTHER',
      year_built: generatedConfig.year_built || 0,
      living_area: generatedConfig.living_area || {},
      lot_size: generatedConfig.lot_size || {},
      description: generatedConfig.description || '',
      features_amenities: generatedConfig.features_amenities || {},
      highlights: generatedConfig.highlights || [],
    }
    const propertyText = formatPropertyDataForTitle(relevantData)
    
    // Prepare Call 3 (vision analysis) - extract photo URLs from config
    const photoUrls: string[] = (generatedConfig.photos || [])
      .map((p: { url?: string }) => p?.url)
      .filter((url: string | undefined): url is string => typeof url === 'string' && url.length > 0)
    
    // Run Call 2 and Call 3 in parallel using Promise.allSettled
    const [titleResult, visionResult] = await Promise.allSettled([
      generateTitle(propertyText, 'gpt-4o-mini', generatedConfig.language),
      photoUrls.length > 0 
        ? analyzeImagesWithVision(photoUrls, 10) 
        : Promise.resolve(null as ImageAnalysisResult | null)
    ])
    
    const call2And3EndTime = new Date().toISOString()
    
    // Process Call 2 result (title/highlights)
    let finalConfig = { ...generatedConfig }
    let call2Usage = undefined
    let call2Duration = 0
    
    if (titleResult.status === 'fulfilled' && titleResult.value) {
      const titleResponse = titleResult.value
      call2Usage = titleResponse.usage
      call2Duration = titleResponse.callDuration
      
      if (titleResponse.title && titleResponse.title.trim().length > 0) {
        finalConfig.title = titleResponse.title.trim()
        console.log(`✅ [Queue Worker] Call 2 - Title improved: "${titleResponse.title}"`)
      }
      if (titleResponse.subtitle && titleResponse.subtitle.trim().length > 0) {
        finalConfig.subtitle = titleResponse.subtitle.trim()
        console.log(`✅ [Queue Worker] Call 2 - Subtitle generated: "${titleResponse.subtitle.substring(0, 50)}..."`)
      }
      if (titleResponse.highlights && Array.isArray(titleResponse.highlights)) {
        finalConfig.highlights = titleResponse.highlights
        console.log(`✅ [Queue Worker] Call 2 - Highlights improved: ${titleResponse.highlights.length} items`)
      }
    } else if (titleResult.status === 'rejected') {
      console.warn(`⚠️ [Queue Worker] Call 2 failed, using original values:`, titleResult.reason?.message || titleResult.reason)
    }
    
    // Process Call 3 result (vision analysis)
    let imageAnalysis: ImageAnalysisResult | null = null
    let call3Usage = undefined
    let call3Duration = 0
    
    if (visionResult.status === 'fulfilled' && visionResult.value) {
      imageAnalysis = visionResult.value
      call3Usage = imageAnalysis.usage
      call3Duration = imageAnalysis.call_duration_ms
      console.log(`✅ [Queue Worker] Call 3 - Vision analysis complete. Best hero: index ${imageAnalysis.best_hero_index}`)
    } else if (visionResult.status === 'rejected') {
      console.warn(`⚠️ [Queue Worker] Call 3 (vision) failed:`, visionResult.reason?.message || visionResult.reason)
    } else if (photoUrls.length === 0) {
      console.log(`ℹ️ [Queue Worker] Call 3 - Skipped (no photos in config)`)
    }
    
    // ============================================
    // Call 4: Upscale hero image if needed (< 1920px width)
    // ============================================
    if (imageAnalysis?.best_hero_url) {
      console.log('🚀 [Queue Worker] Starting Call 4 - Hero image upscaling check...')
      const call4StartTime = Date.now()
      
      try {
        const upscaledUrl = await upscaleHeroImageIfNeeded(
          imageAnalysis.best_hero_url,
          `temp-preview/${previewId}`
        )
        
        // If upscaling produced a different URL, update the config
        if (upscaledUrl !== imageAnalysis.best_hero_url) {
          console.log(`✅ [Queue Worker] Call 4 - Hero image upscaled successfully`)
          
          // Update the hero image URL in photos array
          if (finalConfig.photos && Array.isArray(finalConfig.photos)) {
            const heroPhotoIndex = finalConfig.photos.findIndex(
              (p: any) => p?.url === imageAnalysis.best_hero_url
            )
            
            if (heroPhotoIndex >= 0 && finalConfig.photos[heroPhotoIndex]) {
              finalConfig.photos[heroPhotoIndex].url = upscaledUrl
              console.log(`✅ [Queue Worker] Call 4 - Updated photos[${heroPhotoIndex}] with upscaled URL`)
            }
          }
          
          // Also update the best_hero_url in imageAnalysis for consistency
          imageAnalysis.best_hero_url = upscaledUrl
        } else {
          console.log(`ℹ️ [Queue Worker] Call 4 - No upscaling needed or upscaling skipped`)
        }
        
        const call4Duration = Date.now() - call4StartTime
        console.log(`✅ [Queue Worker] Call 4 completed (${call4Duration}ms)`)
      } catch (upscaleError: any) {
        console.error(`❌ [Queue Worker] Call 4 - Upscaling failed:`, upscaleError?.message || upscaleError)
        console.warn(`⚠️ [Queue Worker] Continuing with original hero image`)
      }
    }
    
    // Process any new images that might have been added in Call 2
    const imageUrlsCall2 = extractImageUrlsFromConfig(finalConfig)
    if (imageUrlsCall2.length > 0) {
      const basePath = `temp-preview/${previewId}`
      const urlMapCall2 = await processImages(imageUrlsCall2, basePath, 5)
      finalConfig = replaceImageUrlsInConfig(finalConfig, urlMapCall2)
    }
    
    // Build final update with all results
    const finalUpdate: Record<string, any> = {
      unified_json: {
        ...finalConfig,
        _metadata: {
          call1_started_at: call1StartTime,
          call1_completed_at: call1EndTime,
          call1_duration_ms: call1Duration,
          call1_usage: call1Usage,
          call2_started_at: call2And3StartTime,
          call2_completed_at: call2And3EndTime,
          call2_duration_ms: call2Duration,
          call2_usage: call2Usage,
          call3_started_at: call2And3StartTime,
          call3_completed_at: call2And3EndTime,
          call3_duration_ms: call3Duration,
          call3_usage: call3Usage,
        }
      },
      status: 'completed',
      updated_at: call2And3EndTime,
    }
    
    // Add image_analysis to separate column if available
    if (imageAnalysis) {
      finalUpdate.image_analysis = imageAnalysis
    }
    
    await supabase
      .from('temp_previews')
      .update(finalUpdate)
      .eq('id', previewId)
    
    console.log(`✅ [Queue Worker] Call 2 + Call 3 completed for ${previewId}`)
    console.log(`✅ [Queue Worker] Config generated for ${previewId}`)
  } catch (error: any) {
    console.error(`🔴 [Queue Worker] Failed to generate config:`, error)
    
    const supabase = createAdminClient()
    await supabase
      .from('temp_previews')
      .update({
        status: 'error',
        error_message: error.message || 'Failed to generate config',
      })
      .eq('id', previewId)
    
    throw error
  }
}

/**
 * Format property data as text for title generation (Call 2)
 * Converts relevant data object to readable text format
 */
function formatPropertyDataForTitle(data: any): string {
  const lines: string[] = []
  
  if (data.language) {
    lines.push(`Language: ${data.language}`)
  }
  
  if (data.title) {
    lines.push(`Current Title: ${data.title}`)
  }
  
  if (data.address) {
    const addressParts = []
    if (data.address.street) addressParts.push(data.address.street)
    if (data.address.city) addressParts.push(data.address.city)
    if (data.address.neighborhood) addressParts.push(data.address.neighborhood)
    if (data.address.state) addressParts.push(data.address.state)
    if (data.address.zipcode) addressParts.push(data.address.zipcode)
    if (data.address.country) addressParts.push(data.address.country)
    if (data.address.subdivision) addressParts.push(data.address.subdivision)
    if (addressParts.length > 0) {
      lines.push(`Address: ${addressParts.filter(Boolean).join(', ')}`)
    }
  }
  
  if (data.beds || data.baths) {
    const specs = []
    if (data.beds) specs.push(`${data.beds} bed${data.beds !== 1 ? 's' : ''}`)
    if (data.baths) specs.push(`${data.baths} bath${data.baths !== 1 ? 's' : ''}`)
    if (specs.length > 0) {
      lines.push(`Property: ${specs.join(', ')} - ${data.property_type || 'OTHER'}`)
    }
  }
  
  if (data.year_built && data.year_built > 0) {
    lines.push(`Year Built: ${data.year_built}`)
  }
  
  if (data.living_area?.value && data.living_area.value > 0) {
    lines.push(`Living Area: ${data.living_area.value} ${data.living_area.unit || 'sqft'}`)
  }
  
  if (data.lot_size?.value && data.lot_size.value > 0) {
    lines.push(`Lot Size: ${data.lot_size.value} ${data.lot_size.unit || 'sqft'}`)
  }
  
  if (data.description) {
    lines.push('')
    lines.push('Description:')
    lines.push(data.description)
  }
  
  if (data.features_amenities) {
    const features: string[] = []
    const fa = data.features_amenities
    
    if (fa.pool) features.push('Pool')
    if (fa.outdoor?.pool) features.push('Pool')
    if (fa.outdoor?.balcony_terrace) features.push('Balcony/Terrace')
    if (fa.outdoor?.garden) features.push('Garden')
    if (fa.outdoor?.amenities && Array.isArray(fa.outdoor.amenities) && fa.outdoor.amenities.length > 0) {
      features.push(...fa.outdoor.amenities)
    }
    if (fa.interior?.fireplace) features.push('Fireplace')
    if (fa.interior?.kitchen_features && Array.isArray(fa.interior.kitchen_features) && fa.interior.kitchen_features.length > 0) {
      features.push(...fa.interior.kitchen_features)
    }
    if (fa.appliances && Array.isArray(fa.appliances) && fa.appliances.length > 0) {
      features.push(...fa.appliances)
    }
    if (fa.parking?.type) features.push(`Parking: ${fa.parking.type}`)
    if (fa.building?.elevator) features.push('Elevator')
    if (fa.energy?.solar) features.push('Solar')
    if (fa.energy?.ev_charger) features.push('EV Charger')
    
    if (features.length > 0) {
      lines.push('')
      lines.push('Features & Amenities:')
      features.forEach(feature => lines.push(`- ${feature}`))
    }
  }
  
  if (data.highlights && Array.isArray(data.highlights) && data.highlights.length > 0) {
    lines.push('')
    lines.push('Current Highlights (for improvement):')
    data.highlights.forEach((h: any, i: number) => {
      lines.push(`${i + 1}. ${h.title || ''}: ${h.value || ''}`)
    })
  }
  
  return lines.join('\n')
}

/**
 * Helper: Extract structured text from HTML (LLM-ready format)
 */
function extractStructuredText(htmlContent: string): string {
  const $ = load(htmlContent)
  const lines: string[] = []
  
  function processElement(element: any): void {
    const $el = $(element)
    const tagName = element.tagName?.toLowerCase()
    
    if (tagName === 'script' || tagName === 'style') {
      return
    }
    
    if (tagName?.match(/^h[1-6]$/)) {
      const level = parseInt(tagName[1])
      const text = $el.text().trim()
      if (text) {
        lines.push('')
        lines.push('#'.repeat(level) + ' ' + text)
        lines.push('')
      }
      return
    }
    
    if (tagName === 'p') {
      const text = $el.text().trim()
      if (text && text.length > 10) {
        lines.push(text)
        lines.push('')
      }
      return
    }
    
    if (tagName === 'ul' || tagName === 'ol') {
      $el.children('li').each((i: number, li: any) => {
        const text = $(li).text().trim()
        if (text) {
          const prefix = tagName === 'ul' ? '• ' : `${i + 1}. `
          lines.push(prefix + text)
        }
      })
      lines.push('')
      return
    }
    
    if (tagName === 'div' || tagName === 'section' || tagName === 'article' || tagName === 'main') {
      $el.children().each((i: number, child: any) => {
        processElement(child)
      })
      return
    }
    
    if ($el.children().length > 0) {
      $el.children().each((i: number, child: any) => {
        processElement(child)
      })
    } else {
      const text = $el.text().trim()
      if (text && text.length > 3 && !lines[lines.length - 1]?.includes(text)) {
        lines.push(text)
      }
    }
  }
  
  $.root().children().each((i: number, child: any) => {
    processElement(child)
  })
  
  return lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s+$/gm, '')
    .trim()
}
