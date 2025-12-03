'use server'

import { createClient } from '@/lib/supabase/server'
import { archiveSite, unarchiveSite, duplicateSite, deleteSite, updateSite } from '@/lib/data/site-data'

/**
 * Archive a site (sets status to archived)
 * Slug remains reserved, but site is not accessible via public URL
 * Note: We don't revalidate here - the client will refresh React Query cache
 */
export async function handleArchiveSite(siteId: string) {
  const result = await archiveSite(siteId)
  
  if ('error' in result) {
    return result
  }
  
  return result
}

/**
 * Unarchive a site (sets status to draft)
 * Site becomes accessible again via builder, but not published
 * Note: We don't revalidate here - the client will refresh React Query cache
 */
export async function handleUnarchiveSite(siteId: string) {
  const result = await unarchiveSite(siteId)
  
  if ('error' in result) {
    return result
  }
  
  return result
}

/**
 * Duplicate a site
 * Creates a new site with the same data, but always as draft
 * Note: We don't revalidate here - the client will refresh React Query cache
 */
export async function handleDuplicateSite(siteId: string) {
  const result = await duplicateSite(siteId)
  
  if ('error' in result) {
    return result
  }
  
  return result
}

/**
 * Delete a site (soft delete)
 * Sets deleted_at timestamp
 * Note: We don't revalidate here - the client will refresh React Query cache
 */
export async function handleDeleteSite(siteId: string) {
  console.log('🔵 [handleDeleteSite] Called with siteId:', siteId)
  const result = await deleteSite(siteId)
  console.log('🔵 [handleDeleteSite] Result:', result)
  
  if ('error' in result) {
    return result
  }
  
  return result
}

/**
 * Reassign a site to a different agent
 * Updates assigned_agent_id
 * If site is published and agentId is null, changes status to draft
 * Note: We don't revalidate here - the client will refresh React Query cache
 */
export async function handleReassignSite(siteId: string, agentId: string | null) {
  const supabase = await createClient()
  
  // Get current site to check status
  const { data: currentSite } = await supabase
    .from('sites')
    .select('status, assigned_agent_id')
    .eq('id', siteId)
    .single()
  
  // If site is published and we're removing assigned_agent_id, change to draft
  const updates: { assigned_agent_id: string | null; status?: 'draft' } = {
    assigned_agent_id: agentId,
  }
  
  if (currentSite?.status === 'published' && !agentId) {
    updates.status = 'draft'
  }
  
  const result = await updateSite(siteId, updates)
  
  if ('error' in result) {
    return result
  }
  
  return result
}

