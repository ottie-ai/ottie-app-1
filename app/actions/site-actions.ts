'use server'

import { createClient } from '@/lib/supabase/server'
import { archiveSite, unarchiveSite, duplicateSite, deleteSite, updateSite } from '@/lib/data/site-data'
import bcrypt from 'bcryptjs'

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

/**
 * Update site title
 * Note: We don't revalidate here - the client will refresh React Query cache
 */
export async function handleUpdateSiteTitle(siteId: string, title: string) {
  const result = await updateSite(siteId, { title })
  
  if ('error' in result) {
    return result
  }
  
  return result
}

/**
 * Set password protection for a site
 * Hashes the password and stores it in the database
 * Note: We don't revalidate here - the client will refresh React Query cache
 */
export async function handleSetSitePassword(siteId: string, password: string) {
  const supabase = await createClient()
  
  // Verify user has permission to update this site
  const { data: site, error: siteError } = await supabase
    .from('sites')
    .select('workspace_id')
    .eq('id', siteId)
    .single()
  
  if (siteError || !site) {
    return { error: 'Site not found' }
  }
  
  // Check if user is member of workspace
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Unauthorized' }
  }
  
  const { data: membership } = await supabase
    .from('memberships')
    .select('role')
    .eq('workspace_id', site.workspace_id)
    .eq('user_id', user.id)
    .single()
  
  if (!membership) {
    return { error: 'Unauthorized' }
  }
  
  // Check if workspace plan has password protection feature
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('plan')
    .eq('id', site.workspace_id)
    .single()
  
  if (!workspace) {
    return { error: 'Workspace not found' }
  }
  
  // Get plan to check feature
  const planName = workspace.plan || 'free'
  const { data: plan } = await supabase
    .from('plans')
    .select('feature_password_protection')
    .eq('name', planName)
    .single()
  
  if (!plan || !plan.feature_password_protection) {
    return { error: 'Password protection is not available on your current plan. Please upgrade to access this feature.' }
  }
  
  // Hash password with bcrypt (10 rounds)
  const passwordHash = await bcrypt.hash(password, 10)
  
  // Update site with password protection
  const result = await updateSite(siteId, {
    password_protected: true,
    password_hash: passwordHash,
  })
  
  if ('error' in result) {
    return result
  }
  
  return result
}

/**
 * Remove password protection from a site
 * Note: We don't revalidate here - the client will refresh React Query cache
 */
export async function handleRemoveSitePassword(siteId: string) {
  const supabase = await createClient()
  
  // Verify user has permission to update this site
  const { data: site, error: siteError } = await supabase
    .from('sites')
    .select('workspace_id')
    .eq('id', siteId)
    .single()
  
  if (siteError || !site) {
    return { error: 'Site not found' }
  }
  
  // Check if user is member of workspace
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Unauthorized' }
  }
  
  const { data: membership } = await supabase
    .from('memberships')
    .select('role')
    .eq('workspace_id', site.workspace_id)
    .eq('user_id', user.id)
    .single()
  
  if (!membership) {
    return { error: 'Unauthorized' }
  }
  
  // Check if workspace plan has password protection feature
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('plan')
    .eq('id', site.workspace_id)
    .single()
  
  if (!workspace) {
    return { error: 'Workspace not found' }
  }
  
  // Get plan to check feature
  const planName = workspace.plan || 'free'
  const { data: plan } = await supabase
    .from('plans')
    .select('feature_password_protection')
    .eq('name', planName)
    .single()
  
  if (!plan || !plan.feature_password_protection) {
    return { error: 'Password protection is not available on your current plan. Please upgrade to access this feature.' }
  }
  
  // Remove password protection
  const result = await updateSite(siteId, {
    password_protected: false,
    password_hash: null,
  })
  
  if ('error' in result) {
    return result
  }
  
  return result
}

/**
 * Verify password for a site (used on public site page)
 * Returns success if password is correct
 */
export async function verifySitePassword(siteId: string, password: string) {
  const supabase = await createClient()
  
  // Get site with password hash
  const { data: site, error } = await supabase
    .from('sites')
    .select('password_protected, password_hash')
    .eq('id', siteId)
    .single()
  
  if (error || !site) {
    return { error: 'Site not found' }
  }
  
  if (!site.password_protected || !site.password_hash) {
    return { error: 'Site is not password protected' }
  }
  
  // Verify password
  const isValid = await bcrypt.compare(password, site.password_hash)
  
  if (!isValid) {
    return { error: 'Incorrect password' }
  }
  
  return { success: true }
}

