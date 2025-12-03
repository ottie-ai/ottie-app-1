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
 * Validates that published sites have assigned_agent_id
 */
export async function createSite(site: SiteInsert): Promise<{ success: true; site: Site } | { error: string }> {
  const supabase = await createClient()
  
  // Validate: Cannot publish site without assigned agent
  if (site.status === 'published' && !site.assigned_agent_id) {
    return { error: 'Site cannot be published without an assigned agent. Please assign an agent first.' }
  }
  
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
    // Check if it's the constraint violation
    if (error.message?.includes('cannot be published without an assigned agent') || 
        error.message?.includes('sites_published_must_be_assigned')) {
      return { error: 'Site cannot be published without an assigned agent. Please assign an agent first.' }
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
    password_protected: false, // Don't copy password protection
    password_hash: null, // Don't copy password
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
