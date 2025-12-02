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
 * Create a new site
 */
export async function createSite(site: SiteInsert): Promise<{ success: true; site: Site } | { error: string }> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('sites')
    .insert(site)
    .select()
    .single()

  if (error) {
    console.error('Error creating site:', error)
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
  
  const { error } = await supabase
    .from('sites')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', siteId)

  if (error) {
    console.error('Error deleting site:', error)
    return { error: 'Failed to delete site' }
  }

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

