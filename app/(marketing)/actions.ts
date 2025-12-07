'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { extractStructuredData } from '@/lib/scraper/html-parser'
import { htmlToMarkdownUniversal } from '@/lib/scraper/markdown-converter'
import { scrapeUrl, getScraperProvider, type ScrapeResult } from '@/lib/scraper/providers'

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
    const scrapeResult = await scrapeUrl(url, 170000)
    const html = scrapeResult.html
    const json = scrapeResult.json
    const provider = scrapeResult.provider
    const callDuration = scrapeResult.duration

    let structuredData: any = {}
    let markdownResult: any = {}
    let parallelDuration = 0

    // Handle Apify results (structured JSON) differently from HTML results
    if (provider === 'apify' && json) {
      console.log('🔵 [generatePreview] Processing Apify JSON result...')
      const parallelStart = Date.now()
      
      // For Apify results, store the JSON directly as structured data
      structuredData = {
        apifyData: json, // Store the raw Apify JSON
        apifyScraperId: scrapeResult.apifyScraperId,
      }
      
      // Create a simple markdown representation of the JSON
      markdownResult = {
        markdown: `# Scraped Data\n\n\`\`\`json\n${JSON.stringify(json, null, 2)}\n\`\`\``,
        title: json[0]?.address?.streetAddress || 'Apify Scraped Data',
        excerpt: `Data scraped using Apify scraper: ${scrapeResult.apifyScraperId}`,
        byline: null,
        length: JSON.stringify(json).length,
        siteName: 'Apify',
      }
      
      parallelDuration = Date.now() - parallelStart
      console.log(`✅ [generatePreview] Apify processing complete in ${parallelDuration}ms`)
    } else if (html) {
      // PARALLEL PROCESSING: Run both branches simultaneously to save time (for HTML)
      console.log('🔵 [generatePreview] Starting parallel processing (extract + convert)...')
      const parallelStart = Date.now()
      
      const results = await Promise.all([
        // BRANCH A: Extract structured data (JSON-LD, __NEXT_DATA__, OpenGraph, etc.)
        Promise.resolve(extractStructuredData(html)),
        
        // BRANCH B: Convert to clean Markdown using Mozilla Readability
        Promise.resolve(htmlToMarkdownUniversal(html)),
      ])
      
      structuredData = results[0]
      markdownResult = results[1]
      
      parallelDuration = Date.now() - parallelStart
      console.log(`✅ [generatePreview] Parallel processing complete in ${parallelDuration}ms`)
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

    // Build ai_ready_data: {html, markdown, apify_json, structuredData, readabilityMetadata}
    // structuredData and readabilityMetadata are included for backward compatibility with preview display
    const aiReadyData: {
      html: string
      markdown: string
      apify_json: any | null
      structuredData?: any // For backward compatibility with preview page
      readabilityMetadata?: any // For backward compatibility with preview page
    } = {
      html: '', // We don't store cleaned HTML anymore (Mozilla Readability handles it)
      markdown: markdownResult.markdown || '',
      apify_json: provider === 'apify' && json ? json : null,
      structuredData: structuredData, // Include for preview page display
      readabilityMetadata: provider !== 'apify' ? {
        title: markdownResult.title,
        excerpt: markdownResult.excerpt,
        byline: markdownResult.byline,
        length: markdownResult.length,
        siteName: markdownResult.siteName,
      } : undefined,
    }

    // Save to temp_previews
    const supabase = await createClient()
    const { data: preview, error: insertError } = await supabase
      .from('temp_previews')
      .insert({
        external_url: url,
        source_domain: sourceDomain,
        raw_html: html || null, // Raw HTML from provider (or null for Apify)
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
  
  // Try to get title from markdown (first line after #) or from unified_data if available
  if (preview.unified_data?.title) {
    title = preview.unified_data.title
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
      config: preview.unified_data || {}, // Use unified_data instead of generated_config
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

