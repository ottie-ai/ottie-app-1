'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { extractStructuredData, extractText } from '@/lib/scraper/html-parser'
import { load } from 'cheerio'
import { htmlToMarkdownUniversal } from '@/lib/scraper/markdown-converter'
import { scrapeUrl, getScraperProvider, type ScrapeResult, type ScraperProvider } from '@/lib/scraper/providers'
import { findApifyScraperById } from '@/lib/scraper/apify-scrapers'
import { getHtmlProcessor, extractRealtorGalleryImages } from '@/lib/scraper/html-processors'
import { generateStructuredJSON } from '@/lib/openai/client'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Scrape a URL using configured provider (ScraperAPI or Firecrawl) and create anonymous preview
 * Returns preview_id for accessing the generated preview
 * 
 * Provider can be switched via SCRAPER_PROVIDER env variable:
 * - 'scraperapi' (default) - requires SCRAPERAPI_KEY
 * - 'firecrawl' - requires FIRECRAWL_API_KEY
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

    const configuredProvider = getScraperProvider()
    console.log(`🔵 [generatePreview] Using provider: ${configuredProvider}`)
    
    // Check if required API key is configured
    if (configuredProvider === 'firecrawl' && !process.env.FIRECRAWL_API_KEY) {
      console.error('FIRECRAWL_API_KEY is not configured')
      return { 
        error: 'Firecrawl API is not configured. Please set FIRECRAWL_API_KEY environment variable.' 
      }
    }
    
    if (configuredProvider === 'scraperapi' && !process.env.SCRAPERAPI_KEY) {
      console.error('SCRAPERAPI_KEY is not configured')
      return { 
        error: 'ScraperAPI is not configured. Please set SCRAPERAPI_KEY environment variable.' 
      }
    }

    // Scrape URL using configured provider (170 seconds timeout)
    // Returns either HTML (general scrapers) or JSON (Apify scrapers)
    // For websites with actions: returns HTML after all actions are performed
    const scrapeResult = await scrapeUrl(url, 170000)
    const rawHtml = scrapeResult.html // HTML after actions (or normal HTML if no actions)
    let html = scrapeResult.html // This will be processed if processor exists
    const json = 'json' in scrapeResult ? scrapeResult.json : undefined
    const provider: ScraperProvider = scrapeResult.provider
    const callDuration = scrapeResult.duration

    // Apply website-specific HTML processor if available (e.g., realtor.com)
    let processedHtml: string | null = null
    if (html) {
      const htmlProcessor = getHtmlProcessor(url)
      if (htmlProcessor) {
        console.log(`🔵 [generatePreview] Applying website-specific HTML processor for ${url}`)
        processedHtml = htmlProcessor(html)
        html = processedHtml // Use processed HTML for further processing
        console.log(`✅ [generatePreview] HTML processed, new length: ${html.length}`)
      }
    }

    let structuredData: any = {}
    let markdownResult: any = {}
    let parallelDuration = 0
    let cleanedJson: any = null // Store cleaned JSON for OpenAI processing

    // Handle Apify results (structured JSON) differently from HTML results
    if (provider === 'apify' && json) {
      console.log('🔵 [generatePreview] Processing Apify JSON result...')
      const parallelStart = Date.now()
      
      // Get scraper-specific cleaner if available
      const scraper = scrapeResult.apifyScraperId ? findApifyScraperById(scrapeResult.apifyScraperId) : null
      const cleaner = scraper?.cleanJson
      
      // Clean the JSON using website-specific cleaner if available, otherwise use raw JSON
      cleanedJson = cleaner ? cleaner(json) : json
      console.log(`🔵 [generatePreview] Cleaned Apify JSON using ${scraper?.name || 'default'} cleaner`)
      
      // For Apify results, store the cleaned JSON as structured data
      structuredData = {
        apifyData: cleanedJson, // Store the cleaned Apify JSON
        apifyScraperId: scrapeResult.apifyScraperId,
      }
      
      // Create a simple markdown representation of the cleaned JSON
      markdownResult = {
        markdown: `# Scraped Data\n\n\`\`\`json\n${JSON.stringify(cleanedJson, null, 2)}\n\`\`\``,
        title: (Array.isArray(cleanedJson) ? cleanedJson[0] : cleanedJson)?.address?.streetAddress || 'Apify Scraped Data',
        excerpt: `Data scraped using Apify scraper: ${scrapeResult.apifyScraperId}`,
        byline: null,
        length: JSON.stringify(cleanedJson).length,
        siteName: 'Apify',
      }
      
      parallelDuration = Date.now() - parallelStart
      console.log(`✅ [generatePreview] Apify processing complete in ${parallelDuration}ms`)
    } else if (html) {
      // Extract structured data from HTML
      console.log('🔵 [generatePreview] Extracting structured data from HTML...')
      const parallelStart = Date.now()
      
      structuredData = extractStructuredData(html)
      
      // Create minimal markdown result for backward compatibility (not used anymore)
      markdownResult = {
        markdown: '',
        title: structuredData.metadata?.title || '',
        excerpt: structuredData.metadata?.description || '',
        byline: null,
        length: html.length,
        siteName: provider === 'firecrawl' ? 'Firecrawl' : 'ScraperAPI',
      }
      
      parallelDuration = Date.now() - parallelStart
      console.log(`✅ [generatePreview] Structured data extraction complete in ${parallelDuration}ms`)
    } else {
      throw new Error('Scraper returned neither HTML nor JSON')
    }
    
    // Determine source_domain based on provider
    let sourceDomain = 'unknown'
    if (provider === 'apify' && scrapeResult.apifyScraperId === 'zillow') {
      sourceDomain = 'apify_zillow'
    } else if (provider === 'firecrawl') {
      sourceDomain = 'firecrawl'
    } else if (provider === 'scraperapi') {
      sourceDomain = 'scraperapi'
    } else if (provider === 'apify') {
      sourceDomain = `apify_${scrapeResult.apifyScraperId || 'unknown'}`
    }

    // Get gallery images from scrape result (extracted from Call 2 for Realtor.com)
    // For Realtor.com, gallery images are extracted from the second Firecrawl call
    // and returned in scrapeResult.galleryImages (not extracted from rawHtml)
    const galleryImages: string[] = scrapeResult.galleryImages || []
    if (galleryImages.length > 0) {
      console.log(`🔵 [generatePreview] Using ${galleryImages.length} gallery images from scrape result (Call 2)`)
    }

    // Build ai_ready_data: {html, apify_json, structuredData, readabilityMetadata, processed_html, gallery_images}
    // structuredData and readabilityMetadata are included for backward compatibility with preview display
    const aiReadyData: {
      html: string
      apify_json: any | null
      structuredData?: any // For backward compatibility with preview page
      readabilityMetadata?: any // For backward compatibility with preview page
      processed_html?: string | null // Processed HTML (e.g., only <main> element for realtor.com)
      gallery_images?: string[] // Extracted gallery images (e.g., from Realtor.com)
    } = {
      html: '', // We don't store cleaned HTML anymore
      apify_json: provider === 'apify' && json ? (() => {
        const scraper = scrapeResult.apifyScraperId ? findApifyScraperById(scrapeResult.apifyScraperId) : null
        const cleaner = scraper?.cleanJson
        return cleaner ? cleaner(json) : json
      })() : null,
      structuredData: structuredData, // Include for preview page display
      readabilityMetadata: provider !== 'apify' ? {
        title: markdownResult.title,
        excerpt: markdownResult.excerpt,
        byline: markdownResult.byline,
        length: markdownResult.length,
        siteName: markdownResult.siteName,
      } : undefined,
      processed_html: processedHtml || null, // Store processed HTML if processor was used
      gallery_images: galleryImages.length > 0 ? galleryImages : undefined, // Store gallery images if extracted
    }

    // Save to temp_previews
    const supabase = await createClient()
    const { data: preview, error: insertError } = await supabase
      .from('temp_previews')
      .insert({
        external_url: url,
        source_domain: sourceDomain,
        raw_html: rawHtml || null, // HTML after actions (or normal HTML if no actions)
        ai_ready_data: aiReadyData,
        unified_data: {}, // Empty for now - will be populated after LLM processing
        status: 'pending',
      })
      .select('id')
      .single()
    
    if (insertError) {
      console.error('🔴 [generatePreview] Failed to save preview:', insertError)
      return { 
        error: 'Failed to save preview. Please try again.' 
      }
    }
    
    console.log('✅ [generatePreview] Preview created:', preview.id)

    // If this is an Apify result, process it with OpenAI to generate config
    // Can be disabled via DISABLE_OPENAI_PROCESSING env variable for debugging
    if (provider === 'apify' && json && preview.id && !process.env.DISABLE_OPENAI_PROCESSING) {
      try {
        console.log('🤖 [generatePreview] Processing Apify data with OpenAI...')
        await generateConfigFromApifyData(preview.id, cleanedJson)
        console.log('✅ [generatePreview] OpenAI processing complete')
      } catch (openAiError) {
        console.error('⚠️ [generatePreview] OpenAI processing failed:', openAiError)
        // Don't fail the whole request if OpenAI fails - preview is still created
      }
    } else if (provider === 'apify' && process.env.DISABLE_OPENAI_PROCESSING) {
      console.log('⏭️ [generatePreview] OpenAI processing skipped (DISABLE_OPENAI_PROCESSING=true)')
    }

    return { 
      success: true,
      previewId: preview.id,
      timing: {
        scrapeCall: callDuration,
        parallelProcessing: parallelDuration,
        total: Date.now() - (Date.now() - callDuration - parallelDuration),
      }
    }
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
  
  // Extract title from ai_ready_data (markdown title) or use default
  // The markdown in ai_ready_data was generated with Readability, which includes title
  // For now, we'll try to extract it or use a default
  let title = 'Imported Property'
  
  // Try to get title from generated_config or markdown
  if (preview.generated_config?.title) {
    title = preview.generated_config.title
  } else if (preview.ai_ready_data?.markdown) {
    const markdown = preview.ai_ready_data.markdown
    const titleMatch = markdown.match(/^#\s+(.+)$/m)
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
  
  // Create site
  const { data: site, error: siteError } = await supabase
    .from('sites')
    .insert({
      workspace_id: workspaceId,
      creator_id: userId,
      title: title,
      slug: finalSlug,
      status: 'draft',
      config: preview.generated_config || {}, // Use generated_config from AI processing
      metadata: {
        external_url: preview.external_url, // Use external_url instead of source_url
        source_domain: preview.source_domain,
        ai_ready_data: preview.ai_ready_data,
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
  
  // Optionally delete preview (or let it expire naturally)
  // await supabase.from('temp_previews').delete().eq('id', previewId)
  
  return { 
    success: true, 
    siteId: site.id,
    slug: site.slug,
  }
}

/**
 * Generate site config from Apify JSON data using OpenAI
 */
async function generateConfigFromApifyData(previewId: string, apifyData: any) {
  try {
    // Load site-config-sample.json as example
    const sampleConfigPath = join(process.cwd(), 'docs', 'site-config-sample.json')
    const sampleConfig = JSON.parse(readFileSync(sampleConfigPath, 'utf-8'))

    // Build prompt according to specification
    const prompt = `Extract from provided real estate JSON - exact structure below.

**RULES (strict):**

1. ONLY use explicit JSON data

2. Detect language - set "language" (en, es, etc.) + use same language everywhere

3. Missing = "" / 0 / []

4. NEVER invent data

5. **currency:** detect from country/city/price symbol → USD(EUR,GBP,CZK,etc.) NOT hardcoded

6. title: lifestyle marketing hero title

7. photos: ALL jpeg from mixedSources

8. highlights: max 6 - Phosphor icon names (Eye, Car, Building2, etc.)

9. font: Inter/Playfair Display (luxury=Playfair, modern=Inter)

10. brand_color: match property style

11. description: EXACT from data

12. original_price: ONLY if discounted

**CURRENCY MAPPING:**

- USA/PR → USD

- Spain/EU → EUR

- UK → GBP

- CZ/SK → CZK

- price symbol $ → USD, € → EUR, £ → GBP

**STRUCTURE:**

${JSON.stringify(sampleConfig, null, 2)}

**OUTPUT:** JSON only

**DATA TO PROCESS:**

${JSON.stringify(apifyData, null, 2)}`

    // Call OpenAI
    const generatedConfig = await generateStructuredJSON(prompt, undefined, 'gpt-4o-mini')

    // Update preview with generated config
    const supabase = await createClient()
    const { error: updateError } = await supabase
      .from('temp_previews')
      .update({
        generated_config: generatedConfig,
        status: 'completed',
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
  const apifyJson = preview?.ai_ready_data?.apify_json
  if (!apifyJson) {
    return { error: 'This preview does not contain Apify JSON data' }
  }

  // Get scraper ID from preview metadata
  const scraperId = preview?.scraped_data?.apifyScraperId || preview?.source_domain?.replace('apify_', '')
  const scraper = scraperId ? findApifyScraperById(scraperId) : null
  const cleaner = scraper?.cleanJson

  // Clean the JSON using website-specific cleaner if available
  const cleanedJson = cleaner ? cleaner(apifyJson) : apifyJson
  console.log(`🔵 [processApifyJson] Cleaned Apify JSON using ${scraper?.name || 'default'} cleaner for preview:`, previewId)

  // Update the preview with cleaned JSON
  const updatedAiReadyData = {
    ...preview.ai_ready_data,
    apify_json: cleanedJson,
    structuredData: {
      ...preview.ai_ready_data?.structuredData,
      apifyData: cleanedJson,
    },
  }

  const { error: updateError } = await supabase
    .from('temp_previews')
    .update({
      ai_ready_data: updatedAiReadyData,
    })
    .eq('id', previewId)

  if (updateError) {
    console.error('🔴 [processApifyJson] Failed to update preview:', updateError)
    return { error: 'Failed to process JSON. Please try again.' }
  }

  return { success: true }
}

/**
 * Process and clean raw HTML using website-specific processor
 * This is useful for debugging and reprocessing existing previews without using API credits
 */
export async function processRawHtml(previewId: string) {
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

  // Check if raw HTML exists
  if (!preview.raw_html) {
    return { error: 'This preview does not contain raw HTML data to process' }
  }

  // Get source URL
  const sourceUrl = preview.source_url || preview.external_url
  if (!sourceUrl) {
    return { error: 'Source URL not found in preview' }
  }

  // Get HTML processor for this website
  const htmlProcessor = getHtmlProcessor(sourceUrl)
  if (!htmlProcessor) {
    return { error: 'No HTML processor available for this website' }
  }

  // Process the raw HTML
  const processedHtml = htmlProcessor(preview.raw_html)
  console.log(`🔵 [processRawHtml] Processed HTML using website-specific processor for preview:`, previewId)

  // Update the preview with processed HTML
  const updatedAiReadyData = {
    ...preview.ai_ready_data,
    processed_html: processedHtml,
  }

  const { error: updateError } = await supabase
    .from('temp_previews')
    .update({
      ai_ready_data: updatedAiReadyData,
    })
    .eq('id', previewId)

  if (updateError) {
    console.error('🔴 [processRawHtml] Failed to update preview:', updateError)
    return { error: 'Failed to process HTML. Please try again.' }
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

  // Check if raw HTML exists
  if (!preview.raw_html) {
    return { error: 'This preview does not contain raw HTML data to extract images from' }
  }

  // Get source URL
  const sourceUrl = preview.source_url || preview.external_url
  if (!sourceUrl) {
    return { error: 'Source URL not found in preview' }
  }

  // Check if this is Realtor.com
  try {
    const urlObj = new URL(sourceUrl)
    const hostname = urlObj.hostname.toLowerCase()
    
    if (hostname === 'realtor.com' || hostname === 'www.realtor.com') {
      // Extract gallery images
      const galleryImages = extractRealtorGalleryImages(preview.raw_html)
      console.log(`🔵 [extractGalleryImages] Extracted ${galleryImages.length} gallery images for preview:`, previewId)

      // Update the preview with extracted images
      const updatedAiReadyData = {
        ...preview.ai_ready_data,
        gallery_images: galleryImages,
      }

      const { error: updateError } = await supabase
        .from('temp_previews')
        .update({
          ai_ready_data: updatedAiReadyData,
        })
        .eq('id', previewId)

      if (updateError) {
        console.error('🔴 [extractGalleryImages] Failed to update preview:', updateError)
        return { error: 'Failed to extract images. Please try again.' }
      }

      return { success: true, imageCount: galleryImages.length }
    } else {
      return { error: 'Gallery image extraction is only available for Realtor.com' }
    }
  } catch (error) {
    console.error('🔴 [extractGalleryImages] Error:', error)
    return { error: 'Failed to extract images. Please try again.' }
  }
}

/**
 * Convert processed HTML to markdown (manual trigger for debugging)
 * Converts processed HTML (e.g., <main> element) to markdown
 */
export async function convertProcessedHtmlToMarkdown(previewId: string) {
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

  // Get processed HTML (from html_before_actions after processing)
  // First try processed_html, then try to process html_before_actions
  let processedHtml: string | null = null
  
  if (preview.ai_ready_data?.processed_html) {
    processedHtml = preview.ai_ready_data.processed_html
  } else if (preview.ai_ready_data?.html_before_actions) {
    // Process html_before_actions if not already processed
    const sourceUrl = preview.source_url || preview.external_url
    if (sourceUrl) {
      const htmlProcessor = getHtmlProcessor(sourceUrl)
      if (htmlProcessor) {
        processedHtml = htmlProcessor(preview.ai_ready_data.html_before_actions)
      } else {
        processedHtml = preview.ai_ready_data.html_before_actions
      }
    }
  }

  if (!processedHtml || processedHtml.trim().length === 0) {
    return { error: 'This preview does not contain processed HTML data to convert to markdown' }
  }

  // Convert processed HTML to markdown using Mozilla Readability + Turndown
  try {
    const result = htmlToMarkdownUniversal(processedHtml)
    const markdown = result.markdown
    console.log(`🔵 [convertProcessedHtmlToMarkdown] Converted processed HTML to markdown using Mozilla Readability (${markdown.length} chars) for preview:`, previewId)

    // Update the preview with markdown
    const updatedAiReadyData = {
      ...preview.ai_ready_data,
      processed_html_markdown: markdown,
    }

    const { error: updateError } = await supabase
      .from('temp_previews')
      .update({
        ai_ready_data: updatedAiReadyData,
      })
      .eq('id', previewId)

    if (updateError) {
      console.error('🔴 [convertProcessedHtmlToMarkdown] Failed to update preview:', updateError)
      return { error: 'Failed to convert to markdown. Please try again.' }
    }

    return { success: true, markdownLength: markdown.length }
  } catch (error) {
    console.error('🔴 [convertProcessedHtmlToMarkdown] Error:', error)
    return { error: 'Failed to convert to markdown. Please try again.' }
  }
}

/**
 * Convert raw HTML to markdown (manual trigger for debugging)
 * Converts raw HTML directly to markdown without processing
 */
export async function convertRawHtmlToMarkdown(previewId: string) {
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

  // Get raw HTML
  const rawHtml = preview.raw_html
  if (!rawHtml || rawHtml.trim().length === 0) {
    return { error: 'This preview does not contain raw HTML data to convert to markdown' }
  }

  // Convert raw HTML to markdown using Mozilla Readability + Turndown
  try {
    const result = htmlToMarkdownUniversal(rawHtml)
    const markdown = result.markdown
    console.log(`🔵 [convertRawHtmlToMarkdown] Converted raw HTML to markdown using Mozilla Readability (${markdown.length} chars) for preview:`, previewId)

    // Update the preview with markdown
    const updatedAiReadyData = {
      ...preview.ai_ready_data || {},
      raw_html_markdown: markdown,
    }

    const { error: updateError } = await supabase
      .from('temp_previews')
      .update({
        ai_ready_data: updatedAiReadyData,
      })
      .eq('id', previewId)

    if (updateError) {
      console.error('🔴 [convertRawHtmlToMarkdown] Failed to update preview:', updateError)
      return { error: 'Failed to convert to markdown. Please try again.' }
    }

    return { success: true, markdownLength: markdown.length }
  } catch (error) {
    console.error('🔴 [convertRawHtmlToMarkdown] Error:', error)
    return { error: 'Failed to convert to markdown. Please try again.' }
  }
}

/**
 * Extract structured text from HTML element (LLM-ready format)
 * Preserves hierarchy with markdown-style formatting
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

  // Get raw HTML
  const rawHtml = preview.raw_html
  if (!rawHtml || rawHtml.trim().length === 0) {
    return { error: 'This preview does not contain raw HTML data to process' }
  }

  // Extract structured text content (remove HTML tags, preserve hierarchy)
  try {
    // First, extract only <main> element from raw HTML
    const $ = load(rawHtml)
    const mainElement = $('main')
    
    let textContent: string
    if (mainElement.length > 0) {
      // Remove unwanted sections from Realtor.com (before text extraction)
      // These sections are not relevant for property details
      
      // Remove "Similar homes" and related sections
      mainElement.find('[data-testid*="similar"]').remove()
      mainElement.find('section:contains("Similar homes")').remove()
      mainElement.find('h2:contains("Similar homes")').parent().remove()
      mainElement.find('h2:contains("Homes with similar exteriors")').parent().remove()
      mainElement.find('h2:contains("Similar new construction homes")').parent().remove()
      mainElement.find('h3:contains("Homes with similar exteriors")').parent().remove()
      mainElement.find('h3:contains("Similar new construction homes")').parent().remove()
      mainElement.find('section:contains("Homes with similar exteriors")').remove()
      mainElement.find('section:contains("Similar new construction homes")').remove()
      
      // Remove "Schedule tour" section
      mainElement.find('[data-testid*="schedule"]').remove()
      mainElement.find('[data-testid*="tour"]').remove()
      mainElement.find('section:contains("Schedule")').remove()
      mainElement.find('button:contains("Schedule")').parent().remove()
      
      // Remove "Nearby" sections (Cities, ZIPs, Neighborhoods)
      mainElement.find('[data-testid*="nearby"]').remove()
      mainElement.find('section:contains("Nearby Cities")').remove()
      mainElement.find('section:contains("Nearby ZIPs")').remove()
      mainElement.find('section:contains("Nearby Neighborhoods")').remove()
      mainElement.find('h2:contains("Nearby Cities")').parent().remove()
      mainElement.find('h2:contains("Nearby ZIPs")').parent().remove()
      mainElement.find('h2:contains("Nearby Neighborhoods")').parent().remove()
      mainElement.find('h3:contains("Nearby Cities")').parent().remove()
      mainElement.find('h3:contains("Nearby ZIPs")').parent().remove()
      mainElement.find('h3:contains("Nearby Neighborhoods")').parent().remove()
      
      // Remove sidebar and other noise
      mainElement.find('[data-testid="ldp-sidebar"]').remove()
      mainElement.find('[data-testid="ldp-footer-additional-information"]').remove()
      
      // Extract cleaned <main> element HTML
      const mainHtml = $.html(mainElement)
      // Convert to structured text (LLM-ready format with preserved hierarchy)
      textContent = extractStructuredText(mainHtml)
      console.log(`🔵 [removeHtmlTagsFromRawHtml] Extracted <main> element, removed unwanted sections, and converted to structured text (${textContent.length} chars) for preview:`, previewId)
    } else {
      // Fallback: use entire HTML if <main> not found
      textContent = extractStructuredText(rawHtml)
      console.log(`⚠️ [removeHtmlTagsFromRawHtml] No <main> element found, using entire HTML (${textContent.length} chars) for preview:`, previewId)
    }

    // Update the preview with text content
    const updatedAiReadyData = {
      ...preview.ai_ready_data || {},
      raw_html_text: textContent,
    }

    const { error: updateError } = await supabase
      .from('temp_previews')
      .update({
        ai_ready_data: updatedAiReadyData,
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
  const apifyJson = preview?.ai_ready_data?.apify_json
  if (!apifyJson) {
    return { error: 'This preview does not contain Apify JSON data' }
  }

  try {
    const result = await generateConfigFromApifyData(previewId, apifyJson)
    return result
  } catch (error: any) {
    return { error: error.message || 'Failed to generate config' }
  }
}

