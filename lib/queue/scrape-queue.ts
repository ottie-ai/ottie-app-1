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
 */
function formatApifyPropertyItem(item: any, lines: string[]): void {
  if (!item || typeof item !== 'object') {
    return
  }

  // Address information
  if (item.address || item.streetAddress || item.city || item.state) {
    const addressParts: string[] = []
    
    if (item.streetAddress || item.address?.street || item.address?.streetAddress) {
      addressParts.push(item.streetAddress || item.address?.street || item.address?.streetAddress)
    }
    if (item.city || item.address?.city) {
      addressParts.push(item.city || item.address?.city)
    }
    if (item.neighborhood || item.address?.neighborhood) {
      addressParts.push(item.neighborhood || item.address?.neighborhood)
    }
    if (item.state || item.address?.state || item.stateCode || item.address?.stateCode) {
      addressParts.push(item.state || item.address?.state || item.stateCode || item.address?.stateCode)
    }
    if (item.zipCode || item.zipcode || item.address?.zipCode || item.address?.zipcode || item.postalCode || item.address?.postalCode) {
      addressParts.push(item.zipCode || item.zipcode || item.address?.zipCode || item.address?.zipcode || item.postalCode || item.address?.postalCode)
    }
    if (item.country || item.address?.country) {
      addressParts.push(item.country || item.address?.country)
    }
    
    if (addressParts.length > 0) {
      lines.push(`Address: ${addressParts.filter(Boolean).join(', ')}`)
    }
  }

  // Price
  if (item.price || item.listPrice || item.rentPrice || item.priceHistory) {
    const price = item.price || item.listPrice || item.rentPrice
    if (price) {
      const priceStr = typeof price === 'number' ? `$${price.toLocaleString()}` : price
      lines.push(`Price: ${priceStr}`)
    }
  }

  // Property specs
  const specs: string[] = []
  if (item.bedrooms || item.beds || item.bed) {
    const beds = item.bedrooms || item.beds || item.bed
    specs.push(`${beds} bed${beds !== 1 ? 's' : ''}`)
  }
  if (item.bathrooms || item.baths || item.bath) {
    const baths = item.bathrooms || item.baths || item.bath
    specs.push(`${baths} bath${baths !== 1 ? 's' : ''}`)
  }
  if (specs.length > 0) {
    const propType = item.propertyType || item.type || item.property_type || 'OTHER'
    lines.push(`Property: ${specs.join(', ')} - ${propType}`)
  }

  // Square footage / Living area
  if (item.livingArea || item.squareFeet || item.sqft || item.area || item.living_area) {
    const area = item.livingArea || item.squareFeet || item.sqft || item.area || item.living_area
    const unit = item.areaUnit || item.unit || 'sqft'
    lines.push(`Living Area: ${area} ${unit}`)
  }

  // Lot size
  if (item.lotSize || item.lotSquareFeet || item.lotSqft || item.lot_size) {
    const lotSize = item.lotSize || item.lotSquareFeet || item.lotSqft || item.lot_size
    const unit = item.lotSizeUnit || item.lot_size?.unit || 'sqft'
    lines.push(`Lot Size: ${lotSize} ${unit}`)
  }

  // Year built
  if (item.yearBuilt || item.year_built) {
    lines.push(`Year Built: ${item.yearBuilt || item.year_built}`)
  }

  // Description
  if (item.description || item.listingDescription || item.remarks || item.text) {
    lines.push('')
    lines.push('Description:')
    const desc = item.description || item.listingDescription || item.remarks || item.text
    lines.push(desc)
  }

  // Features and amenities
  const features: string[] = []
  
  // Pool
  if (item.pool || item.hasPool || item.features?.pool) {
    features.push('Pool')
  }
  
  // Parking
  if (item.parking || item.parkingSpaces || item.garage) {
    const parking = item.parking || item.parkingSpaces || item.garage
    features.push(`Parking: ${parking}`)
  }
  
  // Fireplace
  if (item.fireplace || item.hasFireplace || item.features?.fireplace) {
    features.push('Fireplace')
  }
  
  // Features array
  if (item.features && Array.isArray(item.features)) {
    features.push(...item.features)
  }
  
  // Amenities array
  if (item.amenities && Array.isArray(item.amenities)) {
    features.push(...item.amenities)
  }
  
  // Additional features from nested objects
  if (item.features && typeof item.features === 'object' && !Array.isArray(item.features)) {
    Object.keys(item.features).forEach(key => {
      if (item.features[key] === true || (typeof item.features[key] === 'string' && item.features[key])) {
        features.push(key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '))
      }
    })
  }
  
  if (features.length > 0) {
    lines.push('')
    lines.push('Features & Amenities:')
    features.forEach(feature => lines.push(`- ${feature}`))
  }

  // Photos/Images
  if (item.photos && Array.isArray(item.photos) && item.photos.length > 0) {
    lines.push('')
    lines.push(`Photos: ${item.photos.length} image(s)`)
    // Optionally list first few photo URLs
    item.photos.slice(0, 3).forEach((photo: any, i: number) => {
      const url = typeof photo === 'string' ? photo : (photo.url || photo.src || photo.href)
      if (url) {
        lines.push(`  ${i + 1}. ${url}`)
      }
    })
    if (item.photos.length > 3) {
      lines.push(`  ... and ${item.photos.length - 3} more`)
    }
  } else if (item.images && Array.isArray(item.images) && item.images.length > 0) {
    lines.push('')
    lines.push(`Images: ${item.images.length} image(s)`)
    item.images.slice(0, 3).forEach((image: any, i: number) => {
      const url = typeof image === 'string' ? image : (image.url || image.src || image.href)
      if (url) {
        lines.push(`  ${i + 1}. ${url}`)
      }
    })
    if (item.images.length > 3) {
      lines.push(`  ... and ${item.images.length - 3} more`)
    }
  }

  // Agent information
  if (item.agent || item.listingAgent || item.realtor) {
    const agent = item.agent || item.listingAgent || item.realtor
    if (agent.name || agent.firstName || agent.lastName) {
      const name = agent.name || `${agent.firstName || ''} ${agent.lastName || ''}`.trim()
      if (name) {
        lines.push('')
        lines.push(`Agent: ${name}`)
        if (agent.phone) lines.push(`  Phone: ${agent.phone}`)
        if (agent.email) lines.push(`  Email: ${agent.email}`)
        if (agent.agency || agent.brokerage) {
          lines.push(`  Agency: ${agent.agency || agent.brokerage}`)
        }
      }
    }
  }

  // Additional metadata (if useful)
  if (item.status || item.listingStatus) {
    lines.push(`Status: ${item.status || item.listingStatus}`)
  }
  
  if (item.mlsId || item.mlsNumber || item.listingId) {
    lines.push(`MLS ID: ${item.mlsId || item.mlsNumber || item.listingId}`)
  }

  // Include any other top-level fields that might be useful
  // This handles various Apify scraper formats
  const otherFields = ['url', 'id', 'zpid', 'propertyId']
  otherFields.forEach(field => {
    if (item[field] && !lines.some(line => line.includes(field))) {
      lines.push(`${field.charAt(0).toUpperCase() + field.slice(1)}: ${item[field]}`)
    }
  })
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
    
    // Determine final status based on OpenAI processing availability
    const finalStatus = process.env.DISABLE_OPENAI_PROCESSING ? 'completed' : 'pending'
    
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

    // Update with Call 1 results immediately (so frontend can see Call 1 is done)
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
        unified_json: generatedConfig, // Set initial unified_json with Call 1 data
        updated_at: call1EndTime,
      })
      .eq('id', previewId)
    
    console.log(`✅ [Queue Worker] Call 1 completed for ${previewId}`)

    // Call 2: Generate improved title and highlights with higher temperature (0.8) for more creativity
    // Use only relevant parts from generated config (not the full JSON)
    let finalConfig = { ...generatedConfig }
    let call2Usage = undefined
    let call2Duration = 0
    try {
      const call2StartTime = new Date().toISOString()
      console.log('🤖 [Queue Worker] Starting Call 2 (title and highlights improvement)...')
      
      // Update status to show Call 2 is starting
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
              call2_started_at: call2StartTime,
            }
          },
          updated_at: call2StartTime,
        })
        .eq('id', previewId)
      
      // Extract only relevant parts for title generation
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
        highlights: generatedConfig.highlights || [], // for improvement
      }
      
      // Convert relevant data to text format (not JSON)
      const propertyText = formatPropertyDataForTitle(relevantData)
      
      const titleResponse = await generateTitle(
        propertyText,
        generatedConfig.title,
        generatedConfig.highlights,
        'gpt-4o-mini',
        generatedConfig.language // Pass language explicitly
      )
      
      call2Usage = titleResponse.usage
      call2Duration = titleResponse.callDuration
      const call2EndTime = new Date().toISOString()
      
      // Update title and highlights in config
      if (titleResponse.title && titleResponse.title.trim().length > 0) {
        finalConfig.title = titleResponse.title.trim()
        console.log(`✅ [Queue Worker] Title improved: "${titleResponse.title}"`)
      }
      if (titleResponse.highlights && Array.isArray(titleResponse.highlights)) {
        finalConfig.highlights = titleResponse.highlights
        console.log(`✅ [Queue Worker] Highlights improved: ${titleResponse.highlights.length} items`)
      }

      // Update with Call 2 results and mark as completed
      await supabase
        .from('temp_previews')
        .update({
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
      
      console.log(`✅ [Queue Worker] Call 2 completed for ${previewId}`)
    } catch (titleError: any) {
      // Don't fail the whole job if title generation fails - use original title and highlights from config
      console.warn(`⚠️ [Queue Worker] Title/highlights generation failed, using original values:`, titleError.message)
      
      // Still mark as completed with Call 1 data only
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
            }
          },
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', previewId)
    }

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
