'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { extractStructuredData, extractText } from '@/lib/scraper/html-parser'
import { load } from 'cheerio'
import { scrapeUrl, type ScrapeResult, type ScraperProvider } from '@/lib/scraper/providers'
import { findApifyScraperById } from '@/lib/scraper/apify-scrapers'
import { getHtmlProcessor, getHtmlCleaner, getMainContentSelector, getGalleryImageExtractor } from '@/lib/scraper/html-processors'
import { generateStructuredJSON } from '@/lib/openai/client'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Scrape a URL using Firecrawl (with Apify for specific sites like Zillow) and create anonymous preview
 * Returns preview_id for accessing the generated preview
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
        siteName: provider === 'firecrawl' ? 'Firecrawl' : provider === 'apify' ? 'Apify' : 'Unknown',
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

    // Get gallery HTML from scrape result (from Call 2 for debugging)
    const galleryHtml = scrapeResult.galleryHtml || null

    // Build ai_ready_data: {html, apify_json, structuredData, readabilityMetadata, processed_html, gallery_images, gallery_html, actual_provider}
    // structuredData and readabilityMetadata are included for backward compatibility with preview display
    const aiReadyData: {
      html: string
      apify_json: any | null
      structuredData?: any // For backward compatibility with preview page
      readabilityMetadata?: any // For backward compatibility with preview page
      processed_html?: string | null // Processed HTML (e.g., only <main> element for realtor.com)
      gallery_images?: string[] // Extracted gallery images (e.g., from Realtor.com)
      gallery_html?: string | null // Raw HTML from Call 2 (for debugging)
      actual_provider?: string // Actual provider used (e.g., 'firecrawl_stealth', 'apify_fallback')
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
      gallery_html: galleryHtml || null, // Store gallery HTML from Call 2 (for debugging)
      actual_provider: scrapeResult.actualProvider || provider, // Store actual provider used (including fallbacks)
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
    
    // If this is Firecrawl result (HTML), automatically extract structured text and process with OpenAI
    // Works for any website that uses Firecrawl, not just Realtor.com
    if (provider === 'firecrawl' && rawHtml && preview.id && !process.env.DISABLE_OPENAI_PROCESSING) {
      try {
        console.log('🤖 [generatePreview] Processing Firecrawl HTML with OpenAI...')
        
        // First, extract structured text (remove HTML tags and website-specific unwanted sections)
        const $ = load(rawHtml)
        
        // Get website-specific main content selector
        const mainContentSelector = getMainContentSelector(url) || 'main' // Fallback to 'main' if not specified
        const mainElement = $(mainContentSelector)
        
        if (mainElement.length > 0) {
          // Get website-specific HTML cleaner if available
          const htmlCleaner = getHtmlCleaner(url)
          if (htmlCleaner) {
            htmlCleaner(mainElement)
            console.log('🔵 [generatePreview] Applied website-specific HTML cleaner')
          }
          
          // Extract structured text (universal function)
          const mainHtml = $.html(mainElement)
          const structuredText = extractStructuredText(mainHtml)
          
          // Update preview with structured text
          const updatedAiReadyData = {
            ...aiReadyData,
            raw_html_text: structuredText,
          }
          
          await supabase
            .from('temp_previews')
            .update({
              ai_ready_data: updatedAiReadyData,
            })
            .eq('id', preview.id)
          
          // Process with OpenAI (universal function)
          await generateConfigFromStructuredText(preview.id, structuredText)
          console.log(`✅ [generatePreview] Firecrawl OpenAI processing complete (used selector: ${mainContentSelector})`)
        } else {
          console.warn(`⚠️ [generatePreview] No main content element found (selector: ${mainContentSelector}), skipping OpenAI processing`)
        }
      } catch (openAiError) {
        console.error('⚠️ [generatePreview] Firecrawl OpenAI processing failed:', openAiError)
        // Don't fail the whole request if OpenAI fails - preview is still created
      }
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
 * Generate site config from structured text using OpenAI
 * Universal function - works with any structured text extracted from HTML
 */
async function generateConfigFromStructuredText(previewId: string, structuredText: string) {
  try {
    // Load site-config-sample.json as example
    const sampleConfigPath = join(process.cwd(), 'docs', 'site-config-sample.json')
    const sampleConfig = JSON.parse(readFileSync(sampleConfigPath, 'utf-8'))

    // Build prompt for text-based extraction (similar to Apify but for structured text)
    const prompt = `Extract from provided real estate property text - exact structure below.

**RULES (strict):**

1. ONLY use explicit data from the text

2. Detect language - set "language" (en, es, etc.) + use same language everywhere

3. Missing = "" / 0 / []

4. NEVER invent data

5. **currency:** detect from country/city/price symbol → USD(EUR,GBP,CZK,etc.) NOT hardcoded

6. title: lifestyle marketing hero title

7. photos: extract ALL image URLs from the text

8. highlights: max 6 - Phosphor icon names (Eye, Car, Building2, etc.)

9. font: Inter/Playfair Display (luxury=Playfair, modern=Inter)

10. brand_color: match property style

11. description: EXACT from text

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

**TEXT TO PROCESS:**

${structuredText}`

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

  // Use gallery_html if available (from Call 2), otherwise fallback to raw_html
  const htmlToExtract = preview.ai_ready_data?.gallery_html || preview.raw_html
  
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

  // Get raw HTML
  const rawHtml = preview.raw_html
  if (!rawHtml || rawHtml.trim().length === 0) {
    return { error: 'This preview does not contain raw HTML data to process' }
  }

  // Extract structured text content (remove HTML tags, preserve hierarchy)
  try {
    // Get website-specific main content selector
    const sourceUrl = preview.external_url || preview.source_url
    const mainContentSelector = sourceUrl ? (getMainContentSelector(sourceUrl) || 'main') : 'main' // Fallback to 'main' if not specified
    
    const $ = load(rawHtml)
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
      textContent = extractStructuredText(rawHtml)
      console.log(`⚠️ [removeHtmlTagsFromRawHtml] No main content element found (selector: ${mainContentSelector}), using entire HTML (${textContent.length} chars) for preview:`, previewId)
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

