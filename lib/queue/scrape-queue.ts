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
import { findApifyScraperById } from '@/lib/scraper/apify-scrapers'
import { getHtmlProcessor, getHtmlCleaner, getMainContentSelector } from '@/lib/scraper/html-processors'
import { load } from 'cheerio'
import { generateStructuredJSON, generateTitle } from '@/lib/openai/client'
import { getRealEstateConfigPrompt } from '@/lib/openai/main-prompt'
import { sortConfigToSampleOrder } from '@/lib/openai/config-sorter'

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
    
    if (provider === 'apify' && json) {
      const scraper = scrapeResult.apifyScraperId ? findApifyScraperById(scrapeResult.apifyScraperId) : null
      const cleaner = scraper?.cleanJson
      cleanedJson = cleaner ? cleaner(json) : json
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
    
    // Determine final status based on OpenAI processing availability
    const finalStatus = process.env.DISABLE_OPENAI_PROCESSING ? 'completed' : 'pending'
    
    // Ensure markdown fallbacks for downstream steps
    if (!markdown && html) {
      markdown = extractStructuredText(html)
    }
    if (!galleryMarkdown && galleryHtml) {
      galleryMarkdown = extractStructuredText(galleryHtml)
    }
    
    // Update preview with scraped data
    await supabase
      .from('temp_previews')
      .update({
        default_raw_html: rawHtml || null,
        default_markdown: markdown || null,
        gallery_raw_html: galleryHtml,
        gallery_markdown: galleryMarkdown,
        gallery_image_urls: galleryImages && galleryImages.length > 0 ? galleryImages : [],
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
    
    // OpenAI processing (if not disabled) - runs AFTER queue slot is freed
    // This is not part of queue processing, just post-processing
    if (!process.env.DISABLE_OPENAI_PROCESSING) {
      console.log('🤖 [Queue Worker] Starting OpenAI processing (async, queue slot already freed)...')
      try {
        if (provider === 'apify' && cleanedJson) {
          await generateConfigFromData(job.id, cleanedJson, 'apify')
        } else if (provider === 'firecrawl' && (markdown || rawHtml)) {
          let structuredText = markdown || null

          if (!structuredText && rawHtml) {
            const $ = load(rawHtml)
            const mainContentSelector = getMainContentSelector(job.url) || 'main'
            const mainElement = $(mainContentSelector)
            
            if (mainElement.length > 0) {
              const htmlCleaner = getHtmlCleaner(job.url)
              if (htmlCleaner) {
                htmlCleaner(mainElement)
              }
              
              const mainHtml = $.html(mainElement)
              structuredText = extractStructuredText(mainHtml)
            }
          }

          if (structuredText) {
            // Persist updated markdown for debugging
            await supabase
              .from('temp_previews')
              .update({
                default_markdown: structuredText,
                updated_at: new Date().toISOString(),
              })
              .eq('id', job.id)
            
            await generateConfigFromData(job.id, structuredText, 'text')
          }
        }
      } catch (openAiError: any) {
        console.error('⚠️ [Queue Worker] OpenAI processing failed:', openAiError)
        // Don't fail the whole job if OpenAI fails - scraping was successful
        // Update status to completed even if OpenAI fails (scraping was successful)
        await supabase
          .from('temp_previews')
          .update({
            status: 'completed',
            error_message: `OpenAI processing failed: ${openAiError.message}`,
          })
          .eq('id', job.id)
      }
    } else {
      console.log('✅ [Queue Worker] OpenAI processing disabled, preview marked as completed')
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
  try {
    // Get prompt from centralized prompts file
    const dataToProcess = type === 'apify' ? JSON.stringify(data, null, 2) : data
    const prompt = getRealEstateConfigPrompt(type, dataToProcess)

    // Call 1: Generate base config
    const openaiResponse1 = await generateStructuredJSON(prompt, undefined, 'gpt-4o-mini')
    let generatedConfig = openaiResponse1.data
    const call1Usage = openaiResponse1.usage
    const call1Duration = openaiResponse1.callDuration

    // Sort config keys to match sample config order (local operation, not part of OpenAI call)
    generatedConfig = sortConfigToSampleOrder(generatedConfig)

    // Call 2: Generate improved title and highlights with higher temperature (0.8) for more creativity
    // Use only relevant parts from generated config (not the full JSON)
    let finalConfig = { ...generatedConfig }
    let call2Usage = undefined
    let call2Duration = 0
    try {
      console.log('🤖 [Queue Worker] Generating improved title and highlights...')
      
      // Extract only relevant parts for title generation
      const relevantData = {
        language: generatedConfig.language || '',
        photos: generatedConfig.photos || [],
        address: {
          city: generatedConfig.address?.city || '',
          neighborhood: generatedConfig.address?.neighborhood || '',
        },
        beds: generatedConfig.beds || 0,
        baths: generatedConfig.baths || 0,
        property_type: generatedConfig.property_type || 'OTHER',
        description: generatedConfig.description || '',
        features_amenities: generatedConfig.features_amenities || {},
        highlights: generatedConfig.highlights || [], // for improvement
      }
      
      const configJsonForTitle = JSON.stringify(relevantData, null, 2)
      const titleResponse = await generateTitle(
        configJsonForTitle,
        generatedConfig.title,
        generatedConfig.highlights
      )
      
      call2Usage = titleResponse.usage
      call2Duration = titleResponse.callDuration
      
      // Update title and highlights in config
      if (titleResponse.title && titleResponse.title.trim().length > 0) {
        finalConfig.title = titleResponse.title.trim()
        console.log(`✅ [Queue Worker] Title improved: "${titleResponse.title}"`)
      }
      if (titleResponse.highlights && Array.isArray(titleResponse.highlights)) {
        finalConfig.highlights = titleResponse.highlights
        console.log(`✅ [Queue Worker] Highlights improved: ${titleResponse.highlights.length} items`)
      }
    } catch (titleError: any) {
      // Don't fail the whole job if title generation fails - use original title and highlights from config
      console.warn(`⚠️ [Queue Worker] Title/highlights generation failed, using original values:`, titleError.message)
    }

    // Record timestamps (using actual OpenAI call durations)
    const now = Date.now()
    const call1StartTime = new Date(now - call1Duration - call2Duration).toISOString()
    const call1EndTime = new Date(now - call2Duration).toISOString()
    const call2StartTime = call1EndTime
    const call2EndTime = new Date(now).toISOString()

    const supabase = createAdminClient()
    await supabase
      .from('temp_previews')
      .update({
        generated_config: {
          ...generatedConfig,
          _metadata: {
            call1_started_at: call1StartTime,
            call1_completed_at: call1EndTime,
            call1_duration_ms: call1Duration,
            call1_usage: call1Usage,
          }
        },
        unified_json: {
          ...finalConfig,
          _metadata: {
            call1_started_at: call1StartTime,
            call1_completed_at: call1EndTime,
            call1_duration_ms: call1Duration,
            call1_usage: call1Usage,
            call2_started_at: call2StartTime,
            call2_completed_at: call2EndTime,
            call2_duration_ms: call2Duration,
            call2_usage: call2Usage,
          }
        },
        status: 'completed',
        updated_at: call2EndTime,
      })
      .eq('id', previewId)

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
