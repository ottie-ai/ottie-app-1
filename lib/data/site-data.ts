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
 */
export async function createSite(site: SiteInsert): Promise<{ success: true; site: Site } | { error: string }> {
  const supabase = await createClient()
  
  // Ensure domain is set (default to 'ottie.site')
  const siteData: SiteInsert = {
    ...site,
    domain: site.domain || 'ottie.site',
  }
  
  const { data, error } = await supabase
    .from('sites')
    .insert(siteData)
    .select()
    .single()

  if (error) {
    console.error('Error creating site:', error)
    // Check if error is due to duplicate slug
    if (error.code === '23505') { // Unique violation
      return { error: 'This slug is already taken. Please choose a different one.' }
    }
    return { error: 'Failed to create site' }
  }

  return { success: true, site: data }
}

/**
 * Update a site
 */
export async function updateSite(
  siteId: string, 
  updates: SiteUpdate
): Promise<{ success: true; site: Site } | { error: string }> {
  const supabase = await createClient()
  
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
    return { error: 'Failed to update site' }
  }

  return { success: true, site: data }
}

/**
 * Soft delete a site
 */
export async function deleteSite(siteId: string): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    console.error('❌ Error getting user:', userError)
    return { error: 'You must be logged in to delete a site' }
  }

  // First check if site exists
  const { data: site, error: fetchError } = await supabase
    .from('sites')
    .select('id, workspace_id, deleted_at, creator_id, assigned_agent_id')
    .eq('id', siteId)
    .single()

  if (fetchError || !site) {
    console.error('❌ Error fetching site for delete:', fetchError)
    return { error: 'Site not found or access denied' }
  }

  // Check if already deleted
  if (site.deleted_at) {
    return { error: 'Site is already deleted' }
  }

  // Check user's membership
  const { data: membership, error: membershipError } = await supabase
    .from('memberships')
    .select('role')
    .eq('workspace_id', site.workspace_id)
    .eq('user_id', user.id)
    .single()

  console.log('🔍 Delete attempt debug:', {
    siteId,
    userId: user.id,
    userEmail: user.email,
    workspaceId: site.workspace_id,
    membership: membership?.role,
    membershipError: membershipError?.message,
    creatorId: site.creator_id,
    assignedAgentId: site.assigned_agent_id,
    isCreator: site.creator_id === user.id,
    isAssigned: site.assigned_agent_id === user.id,
    canDeleteAsOwner: membership?.role === 'owner' || membership?.role === 'admin',
    canDeleteAsAgent: membership?.role === 'agent' && (site.creator_id === user.id || site.assigned_agent_id === user.id)
  })

  if (membershipError || !membership) {
    console.error('❌ Error fetching membership:', membershipError)
    return { error: 'You are not a member of this workspace' }
  }

  // Check permissions
  const isOwnerOrAdmin = membership.role === 'owner' || membership.role === 'admin'
  const isCreatorOrAssigned = site.creator_id === user.id || site.assigned_agent_id === user.id
  const canDelete = isOwnerOrAdmin || (membership.role === 'agent' && isCreatorOrAssigned)

  if (!canDelete) {
    console.error('❌ Permission check failed:', {
      role: membership.role,
      isOwnerOrAdmin,
      isCreatorOrAssigned,
      canDelete
    })
    return { error: `You do not have permission to delete this site. Your role: ${membership.role}` }
  }

  // Perform soft delete - no .select() to avoid SELECT policy check on result
  // After soft delete, the row won't pass SELECT policy (deleted_at IS NULL check)
  // If UPDATE succeeds without error, it means RLS policies allowed it and row was updated
  const { error } = await supabase
    .from('sites')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', siteId)
    .is('deleted_at', null)

  if (error) {
    console.error('❌ Error deleting site:', error)
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    })
    // Return user-facing error message
    if (error.code === '42501' || error.message?.includes('permission') || error.message?.includes('policy') || error.message?.includes('violates row-level security')) {
      return { error: 'You do not have permission to delete this site' }
    }
    return { error: 'Failed to delete site' }
  }

  // If UPDATE succeeded without error, RLS policies allowed it and row was updated
  // We can't verify with SELECT because deleted rows don't pass SELECT policy
  console.log('✅ Site deleted successfully:', siteId)
  return { success: true }
}

/**
 * Publish a site (sets status to published and records published_at)
 */
export async function publishSite(siteId: string): Promise<{ success: true; site: Site } | { error: string }> {
  const supabase = await createClient()
  
  // Get current site to check if it's already published
  const { data: currentSite } = await supabase
    .from('sites')
    .select('published_at')
    .eq('id', siteId)
    .single()

  const updates: SiteUpdate = {
    status: 'published',
    updated_at: new Date().toISOString(),
  }

  // Only set published_at if it's the first time publishing
  if (!currentSite?.published_at) {
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
 * Archive a site (sets status to archived)
 * Slug remains reserved, but site is not accessible via public URL
 */
export async function archiveSite(siteId: string): Promise<{ success: true; site: Site } | { error: string }> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('sites')
    .update({
      status: 'archived',
      updated_at: new Date().toISOString(),
    })
    .eq('id', siteId)
    .select()
    .single()

  if (error) {
    console.error('Error archiving site:', error)
    return { error: 'Failed to archive site' }
  }

  return { success: true, site: data }
}

/**
 * Unarchive a site (sets status to draft)
 * Site becomes accessible again via builder, but not published
 */
export async function unarchiveSite(siteId: string): Promise<{ success: true; site: Site } | { error: string }> {
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
    console.error('Error unarchiving site:', error)
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
    published_at: null, // Reset published_at for duplicate
    title: `${originalSite.title} (Copy)`,
    slug: newSlug,
    status: 'draft', // Always draft
    availability: originalSite.availability,
    description: originalSite.description,
    config: originalSite.config, // Copy the entire config
    domain: originalSite.domain,
    thumbnail_url: originalSite.thumbnail_url,
    metadata: originalSite.metadata,
    // Don't copy published_at, views_count, etc.
  }

  const result = await createSite(newSite)
  return result
}
