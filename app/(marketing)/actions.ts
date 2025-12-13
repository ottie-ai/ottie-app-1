'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { extractStructuredData, extractText } from '@/lib/scraper/html-parser'
import { load } from 'cheerio'
import { scrapeUrl, type ScrapeResult, type ScraperProvider } from '@/lib/scraper/providers'
import { findApifyScraperById } from '@/lib/scraper/apify-scrapers'
import { getApifyCleaner, removeEmptyValues } from '@/lib/scraper/apify-cleaners'
import { getHtmlProcessor, getHtmlCleaner, getMainContentSelector, getGalleryImageExtractor } from '@/lib/scraper/html-processors'
import { generateStructuredJSON } from '@/lib/openai/client'
import { getRealEstateConfigPrompt } from '@/lib/openai/main-prompt'
import { sortConfigToSampleOrder } from '@/lib/openai/config-sorter'
import { readFileSync } from 'fs'
import { join } from 'path'
import { addToQueue, getJobPosition, isJobProcessing, type ScrapeJob } from '@/lib/queue/scrape-queue'

/**
 * Scrape a URL using Firecrawl (with Apify for specific sites like Zillow) and create anonymous preview
 * Returns preview_id for accessing the generated preview
 * 
 * NEW: Uses Redis queue to prevent rate limiting and manage concurrent scrapes
 * Jobs are added to queue and processed by worker
 * 
 * Uses Firecrawl for general websites, automatically uses Apify for specific sites (e.g., Zillow)
 * Requires FIRECRAWL_API_KEY (and APIFY_API_TOKEN for Apify-supported sites)
 */
export async function generatePreview(url: string) {
  try {
    // Validate URL format
    try {
      new URL(url)
    } catch {
      return { 
        error: 'Invalid URL format. Please enter a valid URL (e.g., https://example.com)' 
      }
    }

    // Check if required API key is configured
    if (!process.env.FIRECRAWL_API_KEY) {
      console.error('FIRECRAWL_API_KEY is not configured')
      return { 
        error: 'Firecrawl API is not configured. Please set FIRECRAWL_API_KEY environment variable.' 
      }
    }

    // Create preview record first with 'queued' status
    const supabase = await createClient()
    const { data: preview, error: insertError } = await supabase
      .from('temp_previews')
      .insert({
        external_url: url,
        status: 'queued', // New status: queued -> scraping -> pending -> completed/error
        source_domain: 'firecrawl', // Default to firecrawl, will be updated by queue worker if Apify is used
        generated_config: {},
        unified_json: {},
        gallery_image_urls: [],
      })
      .select('id')
      .single()
    
    if (insertError || !preview) {
      console.error('🔴 [generatePreview] Failed to create preview:', insertError)
      return { 
        error: 'Failed to create preview. Please try again.' 
      }
    }
    
    const previewId = preview.id
    console.log(`✅ [generatePreview] Preview created: ${previewId}, adding to queue...`)

    // Add job to Redis queue
    const job: ScrapeJob = {
      id: previewId,
      url: url,
      createdAt: Date.now(),
    }

      try {
      const queuePosition = await addToQueue(job)
      console.log(`✅ [generatePreview] Job added to queue at position ${queuePosition}`)
      
      // Trigger worker to start processing (non-blocking)
      // Worker will self-trigger for remaining jobs, so we only need to start it once
      // This makes a POST request to our worker API endpoint
      // Use production domain for worker URL to avoid Vercel Deployment Protection issues
      // VERCEL_URL points to preview/deployment URLs which may have authentication enabled
      const getWorkerUrl = () => {
        // Priority 1: Use explicit production URL if set
        if (process.env.NEXT_PUBLIC_APP_URL) {
          return `${process.env.NEXT_PUBLIC_APP_URL}/api/queue/process-scrape`
        }
        // Priority 2: In production on Vercel, use the production domain directly
        // This avoids Deployment Protection on preview URLs
        if (process.env.VERCEL_ENV === 'production') {
          return 'https://www.ottie.com/api/queue/process-scrape'
        }
        // Priority 3: For preview deployments, try VERCEL_URL (may fail with Deployment Protection)
        if (process.env.VERCEL_URL) {
          return `https://${process.env.VERCEL_URL}/api/queue/process-scrape`
        }
        // Fallback to localhost for local development
        return 'http://localhost:3000/api/queue/process-scrape'
      }
      
      const workerUrl = getWorkerUrl()
      // Use internal token for authentication (bypasses Vercel/platform auth)
      const internalToken = process.env.INTERNAL_API_TOKEN || process.env.VERCEL_URL || 'internal'
      
      console.log(`🔄 [generatePreview] Triggering worker at ${workerUrl}...`)
      console.log(`🔄 [generatePreview] Using token: ${internalToken ? 'set' : 'not set'} (${process.env.INTERNAL_API_TOKEN ? 'INTERNAL_API_TOKEN' : process.env.VERCEL_URL ? 'VERCEL_URL' : 'fallback'})`)
      
      fetch(workerUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-internal-token': internalToken,
        },
      })
        .then(response => {
          if (!response.ok) {
            console.error(`⚠️ [generatePreview] Worker responded with status ${response.status}`)
          } else {
            console.log(`✅ [generatePreview] Worker triggered successfully`)
          }
        })
        .catch(err => {
          console.error('⚠️ [generatePreview] Failed to trigger worker:', err)
          // Non-critical error - cron will pick it up as fallback
        })

      return {
        success: true,
        previewId: previewId,
        queuePosition: queuePosition,
      }
    } catch (queueError: any) {
      console.error('🔴 [generatePreview] Failed to add to queue:', queueError)
      
      // Fallback: update status to error
          await supabase
            .from('temp_previews')
            .update({
          status: 'error',
          error_message: 'Failed to add to processing queue',
        })
        .eq('id', previewId)

    return { 
        error: 'Failed to add to processing queue. Please try again.'
      }
    }

    // All scraping and processing logic moved to queue worker
    // See lib/queue/scrape-queue.ts for implementation
  } catch (error) {
    console.error('🔴 [generatePreview] Error:', error)
    
    // Handle timeout errors specifically
    if (error instanceof Error && error.message.includes('timeout')) {
      return { 
        error: 'Request timed out. The website may be too slow or unresponsive. Please try again or use a different URL.' 
      }
    }
    
    return { 
      error: error instanceof Error ? error.message : 'Failed to generate preview' 
    }
  }
}

/**
 * Get preview by ID
 */
export async function getPreview(previewId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('temp_previews')
    .select('*')
    .eq('id', previewId)
    .single()
  
  if (error || !data) {
    return { error: 'Preview not found or expired' }
  }
  
  return { success: true, preview: data }
}

/**
 * Get preview status with queue information and granular phase tracking
 * Used by frontend to poll status while in queue and show accurate loading messages
 */
export async function getPreviewStatus(previewId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('temp_previews')
    .select('id, status, error_message, created_at, generated_config, unified_json, gallery_raw_html, gallery_image_urls')
    .eq('id', previewId)
    .single()
  
  if (error || !data) {
    return { error: 'Preview not found or expired' }
  }
  
  // Get queue position if still queued
  let queuePosition: number | null = null
  let processing = false
  
  if (data.status === 'queued') {
    try {
      processing = await isJobProcessing(previewId)
      // Only get queue position if not already processing
      if (!processing) {
        queuePosition = await getJobPosition(previewId)
      } else {
        // Job is processing, not in queue anymore
        queuePosition = null
      }
    } catch (err) {
      console.error('Error getting queue position:', err)
    }
  }
  
  // Determine granular phase based on status and metadata
  let phase: 'queue' | 'scraping' | 'gallery' | 'call1' | 'call2' | 'assembling' | 'completed' | 'error' = 'queue'
  
  if (data.status === 'queued' && !processing && queuePosition !== null && queuePosition > 0) {
    // Only show queue phase if actually in queue (not processing and has valid position)
    phase = 'queue'
  } else if (data.status === 'scraping') {
    // Check if gallery scraping is happening (has gallery_html but no gallery_images yet)
    if (data.gallery_raw_html && (!data.gallery_image_urls || data.gallery_image_urls.length === 0)) {
      phase = 'gallery'
    } else {
      phase = 'scraping'
    }
  } else if (data.status === 'pending') {
    // Check OpenAI call phases using metadata
    const unifiedMetadata = data.unified_json?._metadata
    const generatedMetadata = data.generated_config?._metadata
    
    if (unifiedMetadata?.call2_started_at) {
      // Call 2 is in progress or completed
      if (unifiedMetadata.call2_completed_at) {
        phase = 'assembling' // Both calls done, assembling final result
      } else {
        phase = 'call2' // Call 2 in progress
      }
    } else if (generatedMetadata?.call1_started_at) {
      // Call 1 is in progress or completed
      if (generatedMetadata.call1_completed_at) {
        phase = 'call2' // Call 1 done, starting call 2
      } else {
        phase = 'call1' // Call 1 in progress
      }
    } else {
      // Scraping done, waiting for OpenAI to start
      phase = 'call1'
    }
  } else if (data.status === 'completed') {
    phase = 'completed'
  } else if (data.status === 'error') {
    phase = 'error'
  }
  
  return {
    success: true,
    status: data.status,
    phase,
    queuePosition,
    processing,
    errorMessage: data.error_message,
  }
}

/**
 * Claim preview as a site (convert temp_preview to site)
 */
export async function claimPreview(previewId: string, workspaceId: string, userId: string) {
  const supabase = await createClient()
  
  // Get preview
  const { data: preview, error: previewError } = await supabase
    .from('temp_previews')
    .select('*')
    .eq('id', previewId)
    .single()
  
  if (previewError || !preview) {
    return { error: 'Preview not found or expired' }
  }
  
  // Get workspace to verify access
  const { data: workspace, error: workspaceError } = await supabase
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .single()
  
  if (workspaceError || !workspace) {
    return { error: 'Workspace not found' }
  }
  
  // Verify user has access to workspace
  const { data: membership } = await supabase
    .from('memberships')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single()
  
  if (!membership) {
    return { error: 'You do not have access to this workspace' }
  }
  
  // Extract title from generated/unified config or markdown fallback
  let title = 'Imported Property'
  
  if (preview.unified_json?.title) {
    title = preview.unified_json.title
  } else if (preview.generated_config?.title) {
    title = preview.generated_config.title
  } else if (preview.default_markdown) {
    const titleMatch = preview.default_markdown.match(/^#\s+(.+)$/m)
    if (titleMatch) {
      title = titleMatch[1].trim()
    }
  }
  
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50)
  
  // Check if slug exists in workspace
  const { data: existingSite } = await supabase
    .from('sites')
    .select('slug')
    .eq('workspace_id', workspaceId)
    .eq('slug', slug)
    .is('deleted_at', null)
    .single()
  
  const finalSlug = existingSite ? `${slug}-${Date.now()}` : slug
  
  // Get config with processed images
  const configWithImages = preview.unified_json || preview.generated_config || {}
  
  // When claiming, move images from temp-preview/{previewId}/ to {siteId}/
  // We'll do this after site creation since we need the site ID
  // For now, images are already in Supabase, just need to update paths in config if needed
  
  // Create site
  const { data: site, error: siteError } = await supabase
    .from('sites')
    .insert({
      workspace_id: workspaceId,
      creator_id: userId,
      title: title,
      slug: finalSlug,
      status: 'draft',
      config: configWithImages, // Use unified_json as production config (images already processed)
      metadata: {
        external_url: preview.external_url, // Use external_url instead of source_url
        source_domain: preview.source_domain,
        generated_config: preview.generated_config,
        imported_from_preview: true,
        preview_id: previewId,
      },
    })
    .select('id, slug')
    .single()
  
  if (siteError || !site) {
    console.error('Failed to create site:', siteError)
    return { error: 'Failed to create site. Please try again.' }
  }
  
  // Move images from temp-preview/{previewId}/ to {siteId}/
  // This ensures images persist after temp preview expires
  try {
    const { moveTempPreviewImagesToSite } = await import('@/lib/storage/image-processor')
    const moveResult = await moveTempPreviewImagesToSite(previewId, site.id, configWithImages)
    
    // Update site config with moved image URLs if successful
    if (moveResult.success && moveResult.updatedConfig) {
      await supabase
        .from('sites')
        .update({ config: moveResult.updatedConfig })
        .eq('id', site.id)
    }
  } catch (error) {
    console.error('Error moving images during claim:', error)
    // Don't fail claim if image move fails - images are already accessible
  }
  
  // Optionally delete preview (or let it expire naturally)
  // await supabase.from('temp_previews').delete().eq('id', previewId)
  
  return { 
    success: true, 
    siteId: site.id,
    slug: site.slug,
  }
}

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
 * Generate site config from structured text using OpenAI
 * Universal function - works with any structured text extracted from HTML
 */
async function generateConfigFromStructuredText(previewId: string, structuredText: string) {
  try {
    // Get prompt from centralized prompts file
    const prompt = getRealEstateConfigPrompt('text', structuredText)

    // Call OpenAI - Call 1 only (base config generation)
    console.log('🔄 [generateConfigFromStructuredText] Starting Call 1 (base config generation only)')
    
    // Call OpenAI and get response with usage info
    const openaiResponse = await generateStructuredJSON(prompt, undefined, 'gpt-4o-mini')
    let generatedConfig = openaiResponse.data
    const call1Usage = openaiResponse.usage
    const call1Duration = openaiResponse.callDuration

    // Sort config keys to match sample config order (this is local operation, not part of OpenAI call)
    generatedConfig = sortConfigToSampleOrder(generatedConfig)

    // Record timestamps (using actual OpenAI call duration)
    const call1StartTime = new Date(Date.now() - call1Duration).toISOString()
    const call1EndTime = new Date().toISOString()

    // Update preview with generated config
    // When manually calling Call 1, reset unified_json to only contain Call 1 data
    // This allows Call 2 to be run separately later
    const supabase = await createClient()
    
    const { error: updateError } = await supabase
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
        unified_json: generatedConfig, // Reset to Call 1 only (Call 2 will update this later)
        status: 'completed',
        updated_at: call1EndTime,
      })
      .eq('id', previewId)

    if (updateError) {
      console.error('🔴 [generateConfigFromStructuredText] Failed to update preview:', updateError)
      throw new Error('Failed to save generated config')
    }

    console.log('✅ [generateConfigFromStructuredText] Config generated and saved')
    return { success: true, config: generatedConfig }
  } catch (error: any) {
    console.error('🔴 [generateConfigFromStructuredText] Error:', error)
    
    // Update status to error
    const supabase = await createClient()
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
 * Generate site config from Apify JSON data using OpenAI
 */
async function generateConfigFromApifyData(previewId: string, apifyData: any) {
  try {
    // Get prompt from centralized prompts file
    // Convert Apify JSON to text format (similar to Call 2) for better readability
    const apifyText = formatApifyJsonToText(apifyData)
    const prompt = getRealEstateConfigPrompt('text', apifyText)

    // Call OpenAI - Call 1 only (base config generation)
    console.log('🔄 [generateConfigFromApifyData] Starting Call 1 (base config generation only)')
    
    // Call OpenAI and get response with usage info
    const openaiResponse = await generateStructuredJSON(prompt, undefined, 'gpt-4o-mini')
    let generatedConfig = openaiResponse.data
    const call1Usage = openaiResponse.usage
    const call1Duration = openaiResponse.callDuration

    // Sort config keys to match sample config order (this is local operation, not part of OpenAI call)
    generatedConfig = sortConfigToSampleOrder(generatedConfig)

    // Record timestamps (using actual OpenAI call duration)
    const call1StartTime = new Date(Date.now() - call1Duration).toISOString()
    const call1EndTime = new Date().toISOString()

    // Update preview with generated config
    // When manually calling Call 1, reset unified_json to only contain Call 1 data
    // This allows Call 2 to be run separately later
    const supabase = await createClient()
    
    const { error: updateError } = await supabase
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
        unified_json: generatedConfig, // Reset to Call 1 only (Call 2 will update this later)
        status: 'completed',
        updated_at: call1EndTime,
      })
      .eq('id', previewId)

    if (updateError) {
      console.error('🔴 [generateConfigFromApifyData] Failed to update preview:', updateError)
      throw new Error('Failed to save generated config')
    }

    console.log('✅ [generateConfigFromApifyData] Config generated and saved')
    return { success: true, config: generatedConfig }
  } catch (error: any) {
    console.error('🔴 [generateConfigFromApifyData] Error:', error)
    
    // Update status to error
    const supabase = await createClient()
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
 * Process and clean Apify JSON in an existing preview
 * This is useful for debugging and reprocessing existing previews
 */
export async function processApifyJson(previewId: string) {
  const supabase = await createClient()
  
  // Get preview
  const { data: preview, error: previewError } = await supabase
    .from('temp_previews')
    .select('*')
    .eq('id', previewId)
    .single()
  
  if (previewError || !preview) {
    return { error: 'Preview not found or expired' }
  }

  // Check if this is an Apify result
  const apifyJson = preview?.generated_config?.apify_json || preview?.unified_json?.apify_json
  if (!apifyJson) {
    return { error: 'This preview does not contain Apify JSON data in the new schema' }
  }

  // Get scraper ID from preview metadata
  const scraperId = preview?.scraped_data?.apifyScraperId || preview?.source_domain?.replace('apify_', '')
  const scraper = scraperId ? findApifyScraperById(scraperId) : null
  const cleaner = scraper?.cleanJson

  // Clean the JSON using website-specific cleaner if available
  const cleanedJson = cleaner ? cleaner(apifyJson) : apifyJson
  console.log(`🔵 [processApifyJson] Cleaned Apify JSON using ${scraper?.name || 'default'} cleaner for preview:`, previewId)

  const { error: updateError } = await supabase
    .from('temp_previews')
    .update({
      generated_config: { ...(preview.generated_config || {}), apify_json: cleanedJson },
      updated_at: new Date().toISOString(),
    })
    .eq('id', previewId)

  if (updateError) {
    console.error('🔴 [processApifyJson] Failed to update preview:', updateError)
    return { error: 'Failed to process JSON. Please try again.' }
  }

  return { success: true }
}

/**
 * Extract gallery images from HTML (manual trigger for debugging)
 * Extracts images from gallery-photo-container elements
 */
export async function extractGalleryImages(previewId: string) {
  const supabase = await createClient()
  
  // Get preview
  const { data: preview, error: previewError } = await supabase
    .from('temp_previews')
    .select('*')
    .eq('id', previewId)
    .single()
  
  if (previewError || !preview) {
    return { error: 'Preview not found or expired' }
  }

  // Get source URL
  const sourceUrl = preview.source_url || preview.external_url
  if (!sourceUrl) {
    return { error: 'Source URL not found in preview' }
  }

  // Use gallery_html if available (from Call 2), otherwise fallback to default_raw_html
  const htmlToExtract = preview.gallery_raw_html || preview.default_raw_html || preview.raw_html
  
  if (!htmlToExtract) {
    return { error: 'This preview does not contain HTML data to extract images from' }
  }

  // Get website-specific gallery extractor
  try {
    const urlObj = new URL(sourceUrl)
    const galleryExtractor = getGalleryImageExtractor(sourceUrl)
    
    if (!galleryExtractor) {
      return { error: 'Gallery image extraction is not available for this website' }
    }
    
    // Extract gallery images using website-specific extractor
    const galleryImages = galleryExtractor(htmlToExtract)
    console.log(`🔵 [extractGalleryImages] Extracted ${galleryImages.length} gallery images for preview:`, previewId)

    const { error: updateError } = await supabase
      .from('temp_previews')
      .update({
        gallery_image_urls: galleryImages,
        updated_at: new Date().toISOString(),
      })
      .eq('id', previewId)

    if (updateError) {
      console.error('🔴 [extractGalleryImages] Failed to update preview:', updateError)
      return { error: 'Failed to extract images. Please try again.' }
    }

    return { success: true, imageCount: galleryImages.length }
  } catch (error) {
    console.error('🔴 [extractGalleryImages] Error:', error)
    return { error: 'Failed to extract images. Please try again.' }
  }
}

/**
 * Extract structured text from HTML element (LLM-ready format)
 * Universal function - preserves hierarchy with markdown-style formatting
 * Works with any HTML content, no website-specific logic
 */
function extractStructuredText(htmlContent: string): string {
  const $ = load(htmlContent)
  const lines: string[] = []
  
  // Process each significant element and preserve structure
  function processElement(element: any): void {
    const $el = $(element)
    const tagName = element.tagName?.toLowerCase()
    
    // Skip script and style tags
    if (tagName === 'script' || tagName === 'style') {
      return
    }
    
    // Headings - add markdown-style hierarchy
    if (tagName?.match(/^h[1-6]$/)) {
      const level = parseInt(tagName[1])
      const text = $el.text().trim()
      if (text) {
        lines.push('') // empty line before heading
        lines.push('#'.repeat(level) + ' ' + text)
        lines.push('') // empty line after heading
      }
      return
    }
    
    // Paragraphs
    if (tagName === 'p') {
      const text = $el.text().trim()
      if (text && text.length > 10) { // ignore very short paragraphs
        lines.push(text)
        lines.push('') // empty line between paragraphs
      }
      return
    }
    
    // Lists
    if (tagName === 'ul' || tagName === 'ol') {
      $el.children('li').each((i: number, li: any) => {
        const text = $(li).text().trim()
        if (text) {
          const prefix = tagName === 'ul' ? '• ' : `${i + 1}. `
          lines.push(prefix + text)
        }
      })
      lines.push('') // empty line after list
      return
    }
    
    // Divs, sections, articles - recursively process children
    if (tagName === 'div' || tagName === 'section' || tagName === 'article' || tagName === 'main') {
      $el.children().each((i: number, child: any) => {
        processElement(child)
      })
      return
    }
    
    // For other elements, try to process children
    if ($el.children().length > 0) {
      $el.children().each((i: number, child: any) => {
        processElement(child)
      })
    } else {
      // Leaf node with text content
      const text = $el.text().trim()
      if (text && text.length > 3 && !lines[lines.length - 1]?.includes(text)) {
        lines.push(text)
      }
    }
  }
  
  // Start processing from root
  $.root().children().each((i: number, child: any) => {
    processElement(child)
  })
  
  // Join lines and clean up
  return lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n') // max 2 empty lines in a row
    .replace(/\s+$/gm, '') // remove trailing whitespace from each line
    .trim()
}

/**
 * Remove HTML tags from raw HTML (manual trigger for debugging)
 * Extracts structured text content with preserved hierarchy (LLM-ready format)
 */
export async function removeHtmlTagsFromRawHtml(previewId: string) {
  const supabase = await createClient()
  
  // Get preview
  const { data: preview, error: previewError } = await supabase
    .from('temp_previews')
    .select('*')
    .eq('id', previewId)
    .single()
  
  if (previewError || !preview) {
    return { error: 'Preview not found or expired' }
  }

  // Get raw HTML/JSON
  const rawData = preview.default_raw_html || preview.raw_html
  if (!rawData || rawData.trim().length === 0) {
    return { error: 'This preview does not contain raw HTML data to process' }
  }

  // Check if this is Apify JSON (stored as JSON string in default_raw_html)
  try {
    // Try to parse as JSON
    const parsedJson = JSON.parse(rawData)
    
    // If it's valid JSON and looks like Apify data (object or array)
    if (parsedJson && (typeof parsedJson === 'object' || Array.isArray(parsedJson))) {
      console.log('🔵 [removeHtmlTagsFromRawHtml] Detected Apify JSON, cleaning and converting to text...')
      
      // Get scraper ID from preview metadata
      const scraperId = preview?.scraped_data?.apifyScraperId || preview?.source_domain?.replace('apify_', '')
      const cleaner = scraperId ? getApifyCleaner(scraperId) : null
      
      // Clean the JSON using website-specific cleaner if available
      const cleanedJson = cleaner ? cleaner(parsedJson) : parsedJson
      console.log(`🔵 [removeHtmlTagsFromRawHtml] Cleaned Apify JSON using ${scraperId || 'default'} cleaner`)
      
      // Convert cleaned JSON to text format
      const apifyText = formatApifyJsonToText(cleanedJson)
      console.log(`🔵 [removeHtmlTagsFromRawHtml] Converted to text format (${apifyText.length} chars)`)
      
      // Update the preview with cleaned JSON (as string) and text format
      const { error: updateError } = await supabase
        .from('temp_previews')
        .update({
          default_raw_html: JSON.stringify(cleanedJson, null, 2), // Store cleaned JSON as string
          default_markdown: apifyText, // Store text format
          updated_at: new Date().toISOString(),
        })
        .eq('id', previewId)

      if (updateError) {
        console.error('🔴 [removeHtmlTagsFromRawHtml] Failed to update preview:', updateError)
        return { error: 'Failed to clean and process JSON. Please try again.' }
      }

      return { success: true, textLength: apifyText.length }
    }
  } catch (e) {
    // Not JSON, continue with HTML processing
    console.log('🔵 [removeHtmlTagsFromRawHtml] Not JSON, processing as HTML...')
  }

  // Original HTML processing logic (for non-Apify previews)
  try {
    // Get website-specific main content selector
    const sourceUrl = preview.external_url || preview.source_url
    const mainContentSelector = sourceUrl ? (getMainContentSelector(sourceUrl) || 'main') : 'main' // Fallback to 'main' if not specified
    
    const $ = load(rawData)
    const mainElement = $(mainContentSelector)
    
    let textContent: string
    if (mainElement.length > 0) {
      // Get website-specific HTML cleaner if available
      if (sourceUrl) {
        const htmlCleaner = getHtmlCleaner(sourceUrl)
        if (htmlCleaner) {
          htmlCleaner(mainElement)
          console.log('🔵 [removeHtmlTagsFromRawHtml] Applied website-specific HTML cleaner')
        }
      }
      
      // Extract cleaned main content element HTML
      const mainHtml = $.html(mainElement)
      // Convert to structured text (universal function, LLM-ready format)
      textContent = extractStructuredText(mainHtml)
      console.log(`🔵 [removeHtmlTagsFromRawHtml] Extracted main content (selector: ${mainContentSelector}) and converted to structured text (${textContent.length} chars) for preview:`, previewId)
    } else {
      // Fallback: use entire HTML if main content element not found
      textContent = extractStructuredText(rawData)
      console.log(`⚠️ [removeHtmlTagsFromRawHtml] No main content element found (selector: ${mainContentSelector}), using entire HTML (${textContent.length} chars) for preview:`, previewId)
    }

    // Update the preview with text content (store as markdown/text for debugging)
    const { error: updateError } = await supabase
      .from('temp_previews')
      .update({
        default_markdown: textContent,
      })
      .eq('id', previewId)

    if (updateError) {
      console.error('🔴 [removeHtmlTagsFromRawHtml] Failed to update preview:', updateError)
      return { error: 'Failed to remove HTML tags. Please try again.' }
    }

    return { success: true, textLength: textContent.length }
  } catch (error) {
    console.error('🔴 [removeHtmlTagsFromRawHtml] Error:', error)
    return { error: 'Failed to remove HTML tags. Please try again.' }
  }
}

/**
 * Generate site config from Apify data using OpenAI (manual trigger)
 * This can be called manually if automatic processing failed
 */
export async function generateConfigFromApify(previewId: string) {
  const supabase = await createClient()
  
  // Get preview
  const { data: preview, error: previewError } = await supabase
    .from('temp_previews')
    .select('*')
    .eq('id', previewId)
    .single()
  
  if (previewError || !preview) {
    return { error: 'Preview not found or expired' }
  }

  // Check if this is an Apify result
  const apifyJson = preview?.generated_config?.apify_json || preview?.unified_json?.apify_json
  if (!apifyJson) {
    return { error: 'This preview does not contain Apify JSON data in the new schema' }
  }

  try {
    const result = await generateConfigFromApifyData(previewId, apifyJson)
    return result
  } catch (error: any) {
    return { error: error.message || 'Failed to generate config' }
  }
}

/**
 * Generate config - Call 1 only (JSON config generation)
 * This generates the base JSON config without title/highlights improvements
 */
export async function generateConfigCall1(previewId: string) {
  const supabase = await createClient()
  
  // Get preview
  const { data: preview, error: previewError } = await supabase
    .from('temp_previews')
    .select('*')
    .eq('id', previewId)
    .single()
  
  if (previewError || !preview) {
    return { error: 'Preview not found or expired' }
  }

  try {
    // Check if this is an Apify result
    const apifyJson = preview?.generated_config?.apify_json || preview?.unified_json?.apify_json
    if (apifyJson) {
      // Apify result - use Apify data
      const result = await generateConfigFromApifyData(previewId, apifyJson)
      return result
    }

    // Firecrawl result - use markdown or extract from HTML
    let structuredText = preview.default_markdown || null

    if (!structuredText && preview.raw_html) {
      const $ = load(preview.raw_html)
      const mainContentSelector = getMainContentSelector(preview.external_url) || 'main'
      const mainElement = $(mainContentSelector)
      
      if (mainElement.length > 0) {
        const htmlCleaner = getHtmlCleaner(preview.external_url)
        if (htmlCleaner) {
          htmlCleaner(mainElement)
        }
        
        const mainHtml = $.html(mainElement)
        structuredText = extractStructuredText(mainHtml)
      }
    }

    if (!structuredText) {
      return { error: 'No markdown or HTML content available to generate config' }
    }

    // Generate config from structured text (Call 1 only)
    const result = await generateConfigFromStructuredText(previewId, structuredText)
    return result
  } catch (error: any) {
    return { error: error.message || 'Failed to generate config' }
  }
}

/**
 * Generate title and highlights - Call 2 only
 * This improves title and highlights using the generated_config from Call 1
 */
export async function generateTitleCall2(previewId: string) {
  const supabase = await createClient()
  const { generateTitle } = await import('@/lib/openai/client')
  
  // Get preview
  const { data: preview, error: previewError } = await supabase
    .from('temp_previews')
    .select('*')
    .eq('id', previewId)
    .single()
  
  if (previewError || !preview) {
    return { error: 'Preview not found or expired' }
  }

  // Check if generated_config exists (from Call 1)
  if (!preview.generated_config || Object.keys(preview.generated_config).length === 0) {
    return { error: 'Please run Call 1 (Generate Config) first to generate base config' }
  }

  try {
    const generatedConfig = preview.generated_config
    
    // Extract only relevant parts for title generation (not the full config)
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
    
    // Generate improved title and highlights
    const openaiResponse = await generateTitle(
      propertyText,
      generatedConfig.title,
      generatedConfig.highlights
    )
    
    const titleAndHighlights = {
      title: openaiResponse.title,
      highlights: openaiResponse.highlights,
    }
    const call2Usage = openaiResponse.usage
    const call2Duration = openaiResponse.callDuration
    
    // Record timestamps (using actual OpenAI call duration)
    const call2StartTime = new Date(Date.now() - call2Duration).toISOString()
    const call2EndTime = new Date().toISOString()
    
    // Merge with existing config
    const finalConfig = {
      ...generatedConfig,
      title: titleAndHighlights.title.trim(),
      highlights: titleAndHighlights.highlights,
    }

    // Update unified_json with improved title and highlights
    const { error: updateError } = await supabase
      .from('temp_previews')
      .update({
        unified_json: {
          ...finalConfig,
          _metadata: {
            ...(generatedConfig._metadata || {}),
            call2_started_at: call2StartTime,
            call2_completed_at: call2EndTime,
            call2_duration_ms: call2Duration,
            call2_usage: call2Usage,
          }
        },
        updated_at: call2EndTime,
      })
      .eq('id', previewId)

    if (updateError) {
      console.error('🔴 [generateTitleCall2] Failed to update preview:', updateError)
      throw new Error('Failed to save improved title and highlights')
    }

    console.log('✅ [generateTitleCall2] Title and highlights improved and saved')
    return { success: true, config: finalConfig }
  } catch (error: any) {
    console.error('🔴 [generateTitleCall2] Error:', error)
    return { error: error.message || 'Failed to generate title and highlights' }
  }
}

/**
 * Generate site config manually (universal - works for both Apify and Firecrawl)
 * This can be called manually if automatic processing failed or to regenerate
 * Runs both calls sequentially
 */
export async function generateConfigManually(previewId: string) {
  const supabase = await createClient()
  
  // Get preview
  const { data: preview, error: previewError } = await supabase
    .from('temp_previews')
    .select('*')
    .eq('id', previewId)
    .single()
  
  if (previewError || !preview) {
    return { error: 'Preview not found or expired' }
  }

  try {
    // Check if this is an Apify result
    const apifyJson = preview?.generated_config?.apify_json || preview?.unified_json?.apify_json
    if (apifyJson) {
      // Apify result - use Apify data
      const result = await generateConfigFromApifyData(previewId, apifyJson)
      return result
    }

    // Firecrawl result - use markdown or extract from HTML
    let structuredText = preview.default_markdown || null

    if (!structuredText && preview.raw_html) {
      const $ = load(preview.raw_html)
      const mainContentSelector = getMainContentSelector(preview.external_url) || 'main'
      const mainElement = $(mainContentSelector)
      
      if (mainElement.length > 0) {
        const htmlCleaner = getHtmlCleaner(preview.external_url)
        if (htmlCleaner) {
          htmlCleaner(mainElement)
        }
        
        const mainHtml = $.html(mainElement)
        structuredText = extractStructuredText(mainHtml)
      }
    }

    if (!structuredText) {
      return { error: 'No markdown or HTML content available to generate config' }
    }

    // Generate config from structured text
    const result = await generateConfigFromStructuredText(previewId, structuredText)
    return result
  } catch (error: any) {
    return { error: error.message || 'Failed to generate config' }
  }
}


