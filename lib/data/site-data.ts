'use server'

import { createClient } from '@/lib/supabase/server'
import type { Site, SiteInsert, SiteUpdate } from '@/types/database'

/**
 * Centralized site data queries
 * Server-side functions for fetching and managing sites
 */

/**
 * Get all sites for a workspace
 * Respects RLS policies - users see only sites they have access to
 */
export async function getSites(workspaceId: string): Promise<Site[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('sites')
    .select('*')
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error fetching sites:', error)
    return []
  }

  return data || []
}

/**
 * Count active sites for a workspace (published + draft, excluding archived)
 * Active sites are those that count towards the plan limit
 */
export async function countActiveSites(workspaceId: string): Promise<number> {
  const supabase = await createClient()
  
  const { data, error, count } = await supabase
    .from('sites')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .in('status', ['published', 'draft']) // Only count published and draft, not archived

  if (error) {
    console.error('Error counting active sites:', error)
    return 0
  }

  return count || 0
}

/**
 * Count sites for a workspace based on plan type
 * - For free plan: counts ALL sites (published, draft, archived) - limit is 1 total
 * - For other plans: counts only published + draft sites (archived don't count)
 */
export async function countSitesForPlanLimit(
  workspaceId: string,
  planName: string | null | undefined
): Promise<number> {
  const supabase = await createClient()
  
  // For free plan, count ALL sites (including archived)
  if (planName === 'free' || !planName) {
    const { data, error, count } = await supabase
      .from('sites')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      // Count all statuses for free plan

    if (error) {
      console.error('Error counting sites for free plan:', error)
      return 0
    }

    return count || 0
  }

  // For other plans, count only published + draft (not archived)
  return await countActiveSites(workspaceId)
}

/**
 * Get a single site by ID
 */
export async function getSite(siteId: string): Promise<Site | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('sites')
    .select('*')
    .eq('id', siteId)
    .is('deleted_at', null)
    .single()

  if (error) {
    console.error('Error fetching site:', error)
    return null
  }

  return data
}

/**
 * Get a site by slug and domain
 * Used for public site routing (e.g., slug.ottie.site)
 */
export async function getSiteBySlug(
  slug: string,
  domain: string = 'ottie.site'
): Promise<Site | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('sites')
    .select('*')
    .eq('slug', slug)
    .eq('domain', domain)
    .is('deleted_at', null)
    .single()

  if (error) {
    console.error('Error fetching site by slug:', error)
    return null
  }

  return data
}

/**
 * Create a new site
 * Validates that published sites have assigned_agent_id
 * Checks plan limit before creating
 * - For free plan: counts ALL sites (including archived) - limit is 1 total
 * - For other plans: counts only published + draft sites
 */
export async function createSite(
  site: SiteInsert,
  maxSites?: number,
  planName?: string | null
): Promise<{ success: true; site: Site } | { error: string; limitExceeded?: boolean }> {
  const supabase = await createClient()
  
  // Validate: Cannot publish site without assigned agent
  if (site.status === 'published' && !site.assigned_agent_id) {
    return { error: 'Site cannot be published without an assigned agent. Please assign an agent first.' }
  }
  
  // Check plan limit if maxSites is provided
  if (maxSites !== undefined && site.workspace_id) {
    const sitesCount = await countSitesForPlanLimit(site.workspace_id, planName)
    if (sitesCount >= maxSites) {
      const isFreePlan = planName === 'free' || !planName
      const message = isFreePlan
        ? `You've reached the limit of 1 site for the free plan. Please upgrade to create more sites.`
        : `You've reached the limit of ${maxSites} active site${maxSites !== 1 ? 's' : ''} for your plan. Please upgrade to create more sites or archive existing ones.`
      
      return { 
        error: message,
        limitExceeded: true
      }
    }
  }
  
  // Ensure domain is set (default to 'ottie.site')
  const siteData: SiteInsert = {
    ...site,
    domain: site.domain || 'ottie.site',
  }
  
  // Retry logic for slug conflicts (race conditions)
  const maxRetries = 3
  let currentSlug = siteData.slug
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const { data, error } = await supabase
      .from('sites')
      .insert({ ...siteData, slug: currentSlug })
      .select()
      .single()

    if (!error) {
      // Success!
      return { success: true, site: data }
    }
    
    // Check if error is due to duplicate slug (race condition)
    if (error.code === '23505' && attempt < maxRetries - 1) {
      // Unique violation - slug was taken between our check and insert
      console.log(`[createSite] Slug conflict detected (attempt ${attempt + 1}/${maxRetries}), generating new slug...`)
      
      // Import slug generation function
      const { generateAvailableSlug } = await import('@/lib/data/slug-availability')
      
      // Generate a new available slug
      currentSlug = await generateAvailableSlug(site.slug, siteData.domain)
      console.log(`[createSite] Generated new slug: ${currentSlug}`)
      
      // Retry with new slug
      continue
    }
    
    // Non-retryable error or last attempt
    console.error('Error creating site:', error)
    
    if (error.code === '23505') {
      // Unique violation on last attempt
      return { error: 'This slug is already taken. Please choose a different one.' }
    }
    
    // Check if it's the constraint violation
    if (error.message?.includes('cannot be published without an assigned agent') || 
        error.message?.includes('sites_published_must_be_assigned')) {
      return { error: 'Site cannot be published without an assigned agent. Please assign an agent first.' }
    }
    
    return { error: 'Failed to create site' }
  }
  
  // Should never reach here, but TypeScript requires a return
  return { error: 'Failed to create site after multiple attempts' }
}

/**
 * Update a site
 */
export async function updateSite(
  siteId: string, 
  updates: SiteUpdate
): Promise<{ success: true; site: Site } | { error: string }> {
  const supabase = await createClient()
  
  // Validate: Cannot publish site without assigned agent
  if (updates.status === 'published') {
    // Get current site to check assigned_agent_id
    const { data: currentSite } = await supabase
      .from('sites')
      .select('assigned_agent_id')
      .eq('id', siteId)
      .single()
    
    const assignedAgentId = updates.assigned_agent_id !== undefined 
      ? updates.assigned_agent_id 
      : currentSite?.assigned_agent_id
    
    if (!assignedAgentId) {
      return { error: 'Site cannot be published without an assigned agent. Please assign an agent first.' }
    }
  }
  
  const { data, error } = await supabase
    .from('sites')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', siteId)
    .select()
    .single()

  if (error) {
    console.error('Error updating site:', error)
    // Check if it's the constraint violation
    if (error.message?.includes('cannot be published without an assigned agent') || 
        error.message?.includes('sites_published_must_be_assigned')) {
      return { error: 'Site cannot be published without an assigned agent. Please assign an agent first.' }
    }
    return { error: 'Failed to update site' }
  }

  return { success: true, site: data }
}

/**
 * Soft delete a site
 */
export async function deleteSite(siteId: string): Promise<{ success: true } | { error: string }> {
  console.log('🚀 deleteSite called with siteId:', siteId)
  const supabase = await createClient()
  
  // Get site config before deletion for image cleanup
  const { data: siteData } = await supabase
    .from('sites')
    .select('config')
    .eq('id', siteId)
    .single()
  
  // Use RPC function to soft delete (bypasses RLS issues)
  const { data, error } = await supabase.rpc('soft_delete_site', { site_id: siteId })
  
  console.log('🔍 soft_delete_site RPC result:', { data, error })

  if (error) {
    console.error('❌ Error calling soft_delete_site RPC:', error)
    return { error: error.message || 'Failed to delete site' }
  }

  // Check RPC response
  if (data && typeof data === 'object') {
    if ('error' in data && data.error) {
      console.error('❌ RPC returned error:', data.error)
      return { error: data.error as string }
    }
    if ('success' in data && data.success) {
      console.log('✅ Site deleted successfully:', siteId)
      
      // Cleanup images asynchronously (don't block deletion)
      if (siteData?.config) {
        import('@/lib/storage/cleanup').then(({ cleanupSiteImages }) => {
          cleanupSiteImages(siteId, siteData.config).catch(err => {
            console.error('Error cleaning up site images:', err)
            // Don't fail deletion if image cleanup fails
          })
        })
      }
      
      return { success: true }
    }
  }
  
  console.error('❌ Unexpected RPC response:', data)
  return { error: 'Failed to delete site' }
}

/**
 * Publish a site (sets status to published and records published_at)
 * Validates that site has assigned_agent_id before publishing
 */
export async function publishSite(siteId: string): Promise<{ success: true; site: Site } | { error: string }> {
  const supabase = await createClient()
  
  // Get current site to check if it can be published
  const { data: currentSite, error: fetchError } = await supabase
    .from('sites')
    .select('assigned_agent_id, status, published_at')
    .eq('id', siteId)
    .single()

  if (fetchError || !currentSite) {
    return { error: 'Site not found' }
  }

  // Validate: Cannot publish site without assigned agent
  if (!currentSite.assigned_agent_id) {
    return { error: 'Site cannot be published without an assigned agent. Please assign an agent first.' }
  }

  // If already published, just return success
  if (currentSite.status === 'published') {
    return { error: 'Site is already published' }
  }

  const updates: SiteUpdate = {
    status: 'published',
    updated_at: new Date().toISOString(),
  }

  // Only set published_at if it's the first time publishing
  if (!currentSite.published_at) {
    updates.published_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('sites')
    .update(updates)
    .eq('id', siteId)
    .select()
    .single()

  if (error) {
    console.error('Error publishing site:', error)
    // Check if it's the constraint violation
    if (error.message?.includes('cannot be published without an assigned agent') || 
        error.message?.includes('sites_published_must_be_assigned')) {
      return { error: 'Site cannot be published without an assigned agent. Please assign an agent first.' }
    }
    return { error: 'Failed to publish site' }
  }

  return { success: true, site: data }
}

/**
 * Unpublish a site (sets status to draft)
 */
export async function unpublishSite(siteId: string): Promise<{ success: true; site: Site } | { error: string }> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('sites')
    .update({
      status: 'draft',
      updated_at: new Date().toISOString(),
    })
    .eq('id', siteId)
    .select()
    .single()

  if (error) {
    console.error('Error unpublishing site:', error)
    return { error: 'Failed to unpublish site' }
  }

  return { success: true, site: data }
}

/**
 * Archive a site (sets status to archived and clears slug to release it)
 * Archived sites don't count towards plan limit and their slug is released
 * IMPORTANT: This will delete all site images to free up storage
 */
export async function archiveSite(siteId: string): Promise<{ success: true; site: Site; imagesDeleted?: number } | { error: string }> {
  const supabase = await createClient()
  
  // Get current site to preserve slug and config before archiving
  const { data: currentSite } = await supabase
    .from('sites')
    .select('slug, metadata, config')
    .eq('id', siteId)
    .single()

  if (!currentSite) {
    return { error: 'Site not found' }
  }

  // Store original slug in metadata for potential unarchive
  const updatedMetadata = {
    ...(currentSite.metadata || {}),
    archived_slug: currentSite.slug,
    archived_at: new Date().toISOString(),
    images_deleted: true, // Mark that images were deleted
  }

  // Archive site and clear slug to release it
  // Use a unique archived slug format to avoid conflicts
  const archivedSlug = `archived-${siteId}-${Date.now()}`
  
  const { data, error } = await supabase
    .from('sites')
    .update({
      status: 'archived',
      slug: archivedSlug, // Clear original slug by setting unique archived slug
      metadata: updatedMetadata,
      updated_at: new Date().toISOString(),
    })
    .eq('id', siteId)
    .select()
    .single()

  if (error) {
    console.error('Error archiving site:', error)
    return { error: 'Failed to archive site' }
  }

  // Delete all site images asynchronously (don't block archival)
  let deletedCount = 0
  if (currentSite.config) {
    import('@/lib/storage/cleanup').then(({ cleanupSiteImages }) => {
      cleanupSiteImages(siteId, currentSite.config).then(result => {
        if (result.success) {
          deletedCount = result.deletedCount
          console.log(`✅ Deleted ${deletedCount} images for archived site ${siteId}`)
        } else {
          console.error('Failed to delete archived site images:', result.error)
        }
      }).catch(err => {
        console.error('Error deleting archived site images:', err)
      })
    })
  }

  return { success: true, site: data, imagesDeleted: deletedCount }
}

/**
 * Archive multiple sites (used during plan downgrade)
 * - For free plan: archives ALL sites except the newest one (limit is 1 total including archived)
 * - For other plans: archives active sites (published + draft) beyond limit, keeping newest ones
 */
export async function archiveSitesBeyondLimit(
  workspaceId: string,
  maxSites: number,
  planName?: string | null
): Promise<{ success: true; archivedCount: number } | { error: string }> {
  const supabase = await createClient()
  
  const isFreePlan = planName === 'free' || !planName
  
  if (isFreePlan && maxSites === 1) {
    // For free plan, archive ALL sites except the newest one (regardless of status)
    const { data: allSites, error: fetchError } = await supabase
      .from('sites')
      .select('id, slug, metadata, updated_at')
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null)
      // Get all sites (published, draft, archived) for free plan
      .order('updated_at', { ascending: false })

    if (fetchError) {
      console.error('Error fetching sites for archiving (free plan):', fetchError)
      return { error: 'Failed to fetch sites' }
    }

    if (!allSites || allSites.length <= 1) {
      // No sites need to be archived (0 or 1 site total)
      return { success: true, archivedCount: 0 }
    }

    // Archive all sites except the newest one
    const sitesToArchive = allSites.slice(1)
    const archivedCount = sitesToArchive.length

    // Archive each site
    for (const site of sitesToArchive) {
      // Only archive if not already archived
      if (site.metadata?.archived_slug) {
        // Already archived, skip
        continue
      }

      const archivedSlug = `archived-${site.id}-${Date.now()}`
      const updatedMetadata = {
        ...(site.metadata || {}),
        archived_slug: site.slug,
      }

      const { error: archiveError } = await supabase
        .from('sites')
        .update({
          status: 'archived',
          slug: archivedSlug,
          metadata: updatedMetadata,
          updated_at: new Date().toISOString(),
        })
        .eq('id', site.id)

      if (archiveError) {
        console.error(`Error archiving site ${site.id}:`, archiveError)
        // Continue with other sites even if one fails
      }
    }

    return { success: true, archivedCount }
  }

  // For other plans, archive only active sites (published + draft) beyond limit
  const { data: activeSites, error: fetchError } = await supabase
    .from('sites')
    .select('id, slug, metadata, updated_at')
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)
    .in('status', ['published', 'draft'])
    .order('updated_at', { ascending: false })

  if (fetchError) {
    console.error('Error fetching sites for archiving:', fetchError)
    return { error: 'Failed to fetch sites' }
  }

  if (!activeSites || activeSites.length <= maxSites) {
    // No sites need to be archived
    return { success: true, archivedCount: 0 }
  }

  // Sites beyond the limit (oldest ones) need to be archived
  const sitesToArchive = activeSites.slice(maxSites)
  const archivedCount = sitesToArchive.length

  // Archive each site
  for (const site of sitesToArchive) {
    const archivedSlug = `archived-${site.id}-${Date.now()}`
    const updatedMetadata = {
      ...(site.metadata || {}),
      archived_slug: site.slug,
    }

    const { error: archiveError } = await supabase
      .from('sites')
      .update({
        status: 'archived',
        slug: archivedSlug,
        metadata: updatedMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', site.id)

    if (archiveError) {
      console.error(`Error archiving site ${site.id}:`, archiveError)
      // Continue with other sites even if one fails
    }
  }

  return { success: true, archivedCount }
}

/**
 * Unarchive a site (sets status to draft and restores original slug if available)
 * Site becomes accessible again via builder, but not published
 * Note: Slug restoration may fail if the original slug is now taken
 */
export async function unarchiveSite(siteId: string): Promise<{ success: true; site: Site } | { error: string }> {
  const supabase = await createClient()
  
  // Get current site to check for archived slug
  const { data: currentSite } = await supabase
    .from('sites')
    .select('metadata')
    .eq('id', siteId)
    .single()

  if (!currentSite) {
    return { error: 'Site not found' }
  }

  // Try to restore original slug from metadata
  const archivedSlug = currentSite.metadata?.archived_slug
  const updates: SiteUpdate = {
    status: 'draft',
    updated_at: new Date().toISOString(),
  }

  // If we have the archived slug, try to restore it
  // Note: This might fail if slug is now taken, but we'll let the unique constraint handle it
  if (archivedSlug && typeof archivedSlug === 'string') {
    // Check if slug is available (only check published and draft sites, not archived)
    const { data: existingSite } = await supabase
      .from('sites')
      .select('id')
      .eq('slug', archivedSlug)
      .eq('domain', 'ottie.site') // Assuming default domain
      .is('deleted_at', null)
      .in('status', ['published', 'draft']) // Only check published and draft sites (archived sites have released their slug)
      .neq('id', siteId)
      .limit(1)

    if (!existingSite || existingSite.length === 0) {
      // Slug is available, restore it
      updates.slug = archivedSlug
    }
    // If slug is taken, we'll keep the archived slug format and user can change it manually
  }

  const { data, error } = await supabase
    .from('sites')
    .update(updates)
    .eq('id', siteId)
    .select()
    .single()

  if (error) {
    console.error('Error unarchiving site:', error)
    // Check if it's a unique constraint violation (slug conflict)
    if (error.code === '23505') {
      return { error: 'Cannot restore original slug - it is now taken by another site. Please change the slug manually.' }
    }
    return { error: 'Failed to unarchive site' }
  }

  return { success: true, site: data }
}

/**
 * Duplicate a site
 * Creates a new site with the same data, but always as draft
 * Generates a new unique slug by appending a number
 */
export async function duplicateSite(siteId: string): Promise<{ success: true; site: Site } | { error: string }> {
  const supabase = await createClient()
  
  // Get the original site
  const originalSite = await getSite(siteId)
  if (!originalSite) {
    return { error: 'Site not found' }
  }

  // Generate a unique slug by appending a number
  let newSlug = `${originalSite.slug}-copy`
  let counter = 1
  let isUnique = false

  while (!isUnique) {
    // Check if slug is available
    const existing = await getSiteBySlug(newSlug, originalSite.domain)
    if (!existing) {
      isUnique = true
    } else {
      counter++
      newSlug = `${originalSite.slug}-copy-${counter}`
    }
  }

  // Create new site with duplicated data
  const newSite: SiteInsert = {
    workspace_id: originalSite.workspace_id,
    creator_id: originalSite.creator_id,
    assigned_agent_id: originalSite.assigned_agent_id,
    password_protected: false, // Don't copy password protection
    password_hash: null, // Don't copy password
    published_at: null, // Reset published_at for duplicate
    title: `${originalSite.title} (Copy)`,
    slug: newSlug,
    status: 'draft', // Always draft
    availability: originalSite.availability,
    description: originalSite.description,
    config: originalSite.config, // Will be updated with new image URLs
    domain: originalSite.domain,
    thumbnail_url: originalSite.thumbnail_url,
    metadata: originalSite.metadata,
    // Don't copy published_at, views_count, etc.
  }

  const result = await createSite(newSite)
  
  // Copy images from original to new site folder
  if ('success' in result && result.success && result.site && originalSite.config) {
    const { copyImagesForSite } = await import('@/lib/storage/orphan-cleanup')
    const copyResult = await copyImagesForSite(siteId, result.site.id, originalSite.config)
    
    // Update site config with new image URLs if successful
    if (copyResult.success && copyResult.updatedConfig) {
      const supabase = await createClient()
      await supabase
        .from('sites')
        .update({ config: copyResult.updatedConfig })
        .eq('id', result.site.id)
      
      console.log(`✅ Duplicated site ${siteId} to ${result.site.id} with image copies`)
    } else if (copyResult.error) {
      console.warn(`⚠️ Failed to copy images during duplication: ${copyResult.error}`)
      // Don't fail duplication if image copy fails - user can re-upload
    }
  }
  
  return result
}
