'use server'

import { createClient } from '@/lib/supabase/server'
import { parsePropertyData, generatePageConfig } from '@/lib/scraper/html-parser'

/**
 * Scrape a URL using ScraperAPI and create anonymous preview
 * Returns preview_id for accessing the generated preview
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

    const apiKey = process.env.SCRAPERAPI_KEY
    
    if (!apiKey) {
      console.error('SCRAPERAPI_KEY is not configured')
      return { 
        error: 'Scraper API is not configured. Please contact support.' 
      }
    }

    // Call ScraperAPI with the URL
    const scraperUrl = `http://api.scraperapi.com/?api_key=${apiKey}&url=${encodeURIComponent(url)}`
    
    console.log('🔵 [generatePreview] Scraping URL:', url)
    
    // Start timing the API call
    const callStartTime = Date.now()
    
    const response = await fetch(scraperUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      console.error('🔴 [generatePreview] ScraperAPI error:', response.status, response.statusText)
      return { 
        error: `Failed to scrape URL: ${response.status} ${response.statusText}` 
      }
    }

    const html = await response.text()
    
    // Calculate call duration
    const callEndTime = Date.now()
    const callDuration = callEndTime - callStartTime
    
    console.log('✅ [generatePreview] Successfully scraped URL, content length:', html.length, `(${callDuration}ms)`)

    // Parse property data from HTML
    console.log('🔵 [generatePreview] Parsing property data...')
    const parsedData = parsePropertyData(html, url)
    
    // Generate PageConfig
    console.log('🔵 [generatePreview] Generating page config...')
    const generatedConfig = generatePageConfig(parsedData)
    
    // Save to temp_previews (including raw HTML for debugging)
    const supabase = await createClient()
    const { data: preview, error: insertError } = await supabase
      .from('temp_previews')
      .insert({
        source_url: url,
        raw_html: html, // Store raw HTML for inspection
        scraped_data: parsedData,
        generated_config: generatedConfig,
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
