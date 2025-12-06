'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cleanHtml } from '@/lib/scraper/html-parser'
import { htmlToMarkdown } from '@/lib/htmlToMarkdown'
import { scrapeUrl, getScraperProvider } from '@/lib/scraper/providers'

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

    const provider = getScraperProvider()
    console.log(`🔵 [generatePreview] Using provider: ${provider}`)
    
    // Check if required API key is configured
    if (provider === 'firecrawl' && !process.env.FIRECRAWL_API_KEY) {
      console.error('FIRECRAWL_API_KEY is not configured')
      return { 
        error: 'Firecrawl API is not configured. Please set FIRECRAWL_API_KEY environment variable.' 
      }
    }
    
    if (provider === 'scraperapi' && !process.env.SCRAPERAPI_KEY) {
      console.error('SCRAPERAPI_KEY is not configured')
      return { 
        error: 'ScraperAPI is not configured. Please set SCRAPERAPI_KEY environment variable.' 
      }
    }

    // Scrape URL using configured provider (170 seconds timeout)
    const scrapeResult = await scrapeUrl(url, 170000)
    const { html, markdown, duration: callDuration } = scrapeResult

    // For Firecrawl: if we have markdown, store it directly and skip HTML cleaning
    // For ScraperAPI: clean HTML with cheerio as usual
    let cleanedHtml: string | null = null
    
    if (provider === 'firecrawl' && markdown) {
      // Firecrawl already returns clean markdown, no need for HTML cleaning
      // Store markdown directly
      console.log('🔵 [generatePreview] Firecrawl returned markdown, storing directly')
      // No cleaned HTML needed for Firecrawl
    } else {
      // ScraperAPI or fallback: clean HTML with cheerio
      console.log('🔵 [generatePreview] Cleaning HTML...')
      cleanedHtml = cleanHtml(html)
    }
    
    // Save to temp_previews
    const supabase = await createClient()
    const { data: preview, error: insertError } = await supabase
      .from('temp_previews')
      .insert({
        source_url: url,
        raw_html: provider === 'firecrawl' && markdown ? markdown : html, // Store markdown as raw_html for Firecrawl (for display), HTML for ScraperAPI
        cleaned_html: cleanedHtml, // Only for ScraperAPI (null for Firecrawl)
        markdown: markdown || null, // Store markdown if available (Firecrawl)
        scraped_data: {}, // Empty for now - no parsing yet
        generated_config: {}, // Empty for now - no config generation yet
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
    .gt('expires_at', new Date().toISOString())
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
    .gt('expires_at', new Date().toISOString())
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
  
  // Generate slug from title
  const title = preview.scraped_data?.title || 'Imported Property'
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
      config: preview.generated_config,
      metadata: {
        source_url: preview.source_url,
        scraped_data: preview.scraped_data,
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
 * Reprocess raw HTML through Cheerio cleaning
 * Updates cleaned_html in temp_previews table
 * Uses admin client to bypass RLS (no UPDATE policy needed)
 */
export async function reprocessHtml(previewId: string) {
  try {
    // Use admin client to bypass RLS (no UPDATE policy needed)
    const supabase = createAdminClient()
    
    // Get preview with raw_html
    const { data: preview, error: previewError } = await supabase
      .from('temp_previews')
      .select('raw_html')
      .eq('id', previewId)
      .gt('expires_at', new Date().toISOString())
      .single()
    
    if (previewError || !preview) {
      return { error: 'Preview not found or expired' }
    }
    
    if (!preview.raw_html) {
      return { error: 'No raw HTML available to process' }
    }
    
    // Clean HTML with cheerio
    console.log('🔵 [reprocessHtml] Reprocessing HTML for preview:', previewId)
    const cleanedHtml = cleanHtml(preview.raw_html)
    
    // Update cleaned_html in database (admin client bypasses RLS)
    const { data: updatedPreview, error: updateError } = await supabase
      .from('temp_previews')
      .update({ cleaned_html: cleanedHtml })
      .eq('id', previewId)
      .select('cleaned_html')
      .single()
    
    if (updateError || !updatedPreview) {
      console.error('🔴 [reprocessHtml] Failed to update preview:', updateError)
      return { error: 'Failed to update preview. Please try again.' }
    }
    
    console.log('✅ [reprocessHtml] Successfully reprocessed HTML')
    
    return { 
      success: true,
      cleaned_html: updatedPreview.cleaned_html,
    }
  } catch (error) {
    console.error('🔴 [reprocessHtml] Error:', error)
    return { 
      error: error instanceof Error ? error.message : 'Failed to reprocess HTML' 
    }
  }
}

/**
 * Convert cleaned HTML to markdown
 * Updates markdown in temp_previews table
 * Uses admin client to bypass RLS (no UPDATE policy needed)
 * This markdown is intended as LLM-ready content for property description generation
 */
export async function convertToMarkdown(previewId: string) {
  try {
    // Use admin client to bypass RLS (no UPDATE policy needed)
    const supabase = createAdminClient()
    
    // Get preview with cleaned_html
    const { data: preview, error: previewError } = await supabase
      .from('temp_previews')
      .select('cleaned_html')
      .eq('id', previewId)
      .gt('expires_at', new Date().toISOString())
      .single()
    
    if (previewError || !preview) {
      return { error: 'Preview not found or expired' }
    }
    
    if (!preview.cleaned_html) {
      return { error: 'No cleaned HTML available to convert. Please process with Cheerio first.' }
    }
    
    // Convert cleaned HTML to markdown
    console.log('🔵 [convertToMarkdown] Converting HTML to markdown for preview:', previewId)
    const markdown = htmlToMarkdown(preview.cleaned_html)
    
    // Update markdown in database (admin client bypasses RLS)
    const { data: updatedPreview, error: updateError } = await supabase
      .from('temp_previews')
      .update({ markdown: markdown })
      .eq('id', previewId)
      .select('markdown')
      .single()
    
    if (updateError || !updatedPreview) {
      console.error('🔴 [convertToMarkdown] Failed to update preview:', updateError)
      return { error: 'Failed to update preview. Please try again.' }
    }
    
    console.log('✅ [convertToMarkdown] Successfully converted HTML to markdown')
    
    return { 
      success: true,
      markdown: updatedPreview.markdown,
    }
  } catch (error) {
    console.error('🔴 [convertToMarkdown] Error:', error)
    return { 
      error: error instanceof Error ? error.message : 'Failed to convert to markdown' 
    }
  }
}
