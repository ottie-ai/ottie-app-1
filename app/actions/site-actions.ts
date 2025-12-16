'use server'

import { createClient } from '@/lib/supabase/server'
import { archiveSite, unarchiveSite, duplicateSite, deleteSite, updateSite, publishSite, unpublishSite } from '@/lib/data/site-data'
import bcrypt from 'bcryptjs'
import { headers } from 'next/headers'

/**
 * Get client IP address from request headers
 */
async function getClientIp(): Promise<string> {
  const headersList = await headers()
  const forwardedFor = headersList.get('x-forwarded-for')
  const realIp = headersList.get('x-real-ip')
  const cfConnectingIp = headersList.get('cf-connecting-ip')
  
  return forwardedFor?.split(',')[0]?.trim() ||
         realIp?.trim() ||
         cfConnectingIp?.trim() ||
         'unknown'
}

/**
 * Verify user has access to site through workspace membership
 * Returns workspace_id if authorized, null otherwise
 */
async function verifySiteAccess(siteId: string): Promise<{ workspaceId: string; role: string } | null> {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return null
  }
  
  // Get site's workspace_id
  const { data: site, error: siteError } = await supabase
    .from('sites')
    .select('workspace_id')
    .eq('id', siteId)
    .is('deleted_at', null)
    .single()
  
  if (siteError || !site) {
    return null
  }
  
  // Verify user is member of the workspace
  const { data: membership, error: membershipError } = await supabase
    .from('memberships')
    .select('role')
    .eq('workspace_id', site.workspace_id)
    .eq('user_id', user.id)
    .single()
  
  if (membershipError || !membership) {
    return null
  }
  
  return {
    workspaceId: site.workspace_id,
    role: membership.role
  }
}

/**
 * Archive a site (sets status to archived)
 * Slug remains reserved, but site is not accessible via public URL
 * Note: We don't revalidate here - the client will refresh React Query cache
 */
export async function handleArchiveSite(siteId: string) {
  // Verify user has access to this site
  const access = await verifySiteAccess(siteId)
  if (!access) {
    return { error: 'Unauthorized: You do not have access to this site' }
  }
  
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
  // Verify user has access to this site
  const access = await verifySiteAccess(siteId)
  if (!access) {
    return { error: 'Unauthorized: You do not have access to this site' }
  }
  
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
  // Verify user has access to this site
  const access = await verifySiteAccess(siteId)
  if (!access) {
    return { error: 'Unauthorized: You do not have access to this site' }
  }
  
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
  
  // Verify user has access to this site
  const access = await verifySiteAccess(siteId)
  if (!access) {
    return { error: 'Unauthorized: You do not have access to this site' }
  }
  
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
  // Verify user has access to this site
  const access = await verifySiteAccess(siteId)
  if (!access) {
    return { error: 'Unauthorized: You do not have access to this site' }
  }
  
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
  // Verify user has access to this site
  const access = await verifySiteAccess(siteId)
  if (!access) {
    return { error: 'Unauthorized: You do not have access to this site' }
  }
  
  const result = await updateSite(siteId, { title })
  
  if ('error' in result) {
    return result
  }
  
  return result
}

/**
 * Update site heading font family
 * Updates config.theme.headingFontFamily in site config
 * Note: We don't revalidate here - the client will refresh React Query cache
 */
export async function handleUpdateSiteFont(siteId: string, headingFontFamily: string) {
  // Verify user has access to this site
  const access = await verifySiteAccess(siteId)
  if (!access) {
    return { error: 'Unauthorized: You do not have access to this site' }
  }
  
  const supabase = await createClient()
  
  // Get current site config
  const { data: site, error: siteError } = await supabase
    .from('sites')
    .select('config')
    .eq('id', siteId)
    .single()
  
  if (siteError || !site) {
    return { error: 'Site not found' }
  }
  
  // Merge new font into existing config
  const currentConfig = (site.config as any) || {}
  const updatedConfig = {
    ...currentConfig,
    theme: {
      ...currentConfig.theme,
      headingFontFamily,
    },
  }
  
  const result = await updateSite(siteId, { config: updatedConfig })
  
  if ('error' in result) {
    return result
  }
  
  return result
}

/**
 * Update site title case
 * Updates config.theme.titleCase in site config
 * Note: We don't revalidate here - the client will refresh React Query cache
 */
export async function handleUpdateSiteTitleCase(siteId: string, titleCase: 'uppercase' | 'title' | 'sentence') {
  // Verify user has access to this site
  const access = await verifySiteAccess(siteId)
  if (!access) {
    return { error: 'Unauthorized: You do not have access to this site' }
  }
  
  const supabase = await createClient()
  
  // Get current site config
  const { data: site, error: siteError } = await supabase
    .from('sites')
    .select('config')
    .eq('id', siteId)
    .single()
  
  if (siteError || !site) {
    return { error: 'Site not found' }
  }
  
  // Merge new titleCase into existing config
  const currentConfig = (site.config as any) || {}
  const updatedTheme = {
    ...currentConfig.theme,
    titleCase,
  }
  
  const updatedConfig = {
    ...currentConfig,
    theme: updatedTheme,
  }
  
  const result = await updateSite(siteId, { config: updatedConfig })
  
  if ('error' in result) {
    return result
  }
  
  return result
}

/**
 * Reorder sections in site config
 * Updates the order of sections in config.sections array
 */
export async function handleReorderSections(siteId: string, sectionIds: string[]) {
  // Verify user has access to this site
  const access = await verifySiteAccess(siteId)
  if (!access) {
    return { error: 'Unauthorized: You do not have access to this site' }
  }
  
  const supabase = await createClient()
  
  // Get current site config
  const { data: site, error: siteError } = await supabase
    .from('sites')
    .select('config')
    .eq('id', siteId)
    .single()
  
  if (siteError || !site) {
    return { error: 'Site not found' }
  }
  
  const currentConfig = (site.config as any) || {}
  const currentSections = currentConfig.sections || []
  
  // Reorder sections based on provided order
  const reorderedSections = sectionIds
    .map(id => currentSections.find((s: any) => s.id === id))
    .filter(Boolean)
  
  // Keep any sections that weren't in the provided list (shouldn't happen, but safety check)
  const remainingSections = currentSections.filter((s: any) => !sectionIds.includes(s.id))
  const finalSections = [...reorderedSections, ...remainingSections]
  
  const updatedConfig = {
    ...currentConfig,
    sections: finalSections,
  }
  
  const result = await updateSite(siteId, { config: updatedConfig })
  
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
 * Includes rate limiting to prevent brute-force attacks
 */
export async function verifySitePassword(siteId: string, password: string) {
  const supabase = await createClient()
  
  // Get client IP from request headers
  const clientIp = await getClientIp()
  
  // Check rate limit (5 failed attempts per 15 minutes per IP)
  const { data: rateLimitCheck, error: rateLimitError } = await supabase
    .rpc('check_password_verification_rate_limit', {
      p_site_id: siteId,
      p_ip_address: clientIp
    })
  
  if (rateLimitError) {
    console.error('[verifySitePassword] Rate limit check error:', rateLimitError)
    // Continue even if rate limit check fails (fail open for availability)
  } else if (rateLimitCheck && !rateLimitCheck.allowed) {
    return { 
      error: rateLimitCheck.error || 'Too many failed attempts. Please try again later.',
      retryAfterMinutes: rateLimitCheck.retry_after_minutes 
    }
  }
  
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
  
  // Log the attempt (success or failure)
  try {
    await supabase.rpc('log_password_verification_attempt', {
      p_site_id: siteId,
      p_ip_address: clientIp,
      p_success: isValid
    })
  } catch (err) {
    // Log error but don't fail the request
    console.error('[verifySitePassword] Failed to log attempt:', err)
  }
  
  if (!isValid) {
    return { error: 'Incorrect password' }
  }
  
  return { success: true }
}

/**
 * Publish a site (sets status to published)
 * Validates that site has assigned_agent_id before publishing
 * Also ensures site uses correct domain (brand domain if verified)
 * Note: We don't revalidate here - the client will refresh React Query cache
 */
export async function handlePublishSite(siteId: string) {
  // Verify user has access to this site
  const access = await verifySiteAccess(siteId)
  if (!access) {
    return { error: 'Unauthorized: You do not have access to this site' }
  }
  
  const supabase = await createClient()
  
  // Get site to check workspace and current domain
  const { data: site, error: siteError } = await supabase
    .from('sites')
    .select('workspace_id, domain')
    .eq('id', siteId)
    .single()
  
  if (siteError || !site) {
    return { error: 'Site not found' }
  }
  
  // Check if workspace has verified brand domain
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('branding_config')
    .eq('id', site.workspace_id)
    .single()
  
  if (workspace?.branding_config) {
    const brandingConfig = workspace.branding_config as {
      custom_brand_domain?: string | null
      custom_brand_domain_verified?: boolean
    }
    
    // If brand domain is verified, ensure site uses it
    if (brandingConfig.custom_brand_domain_verified && brandingConfig.custom_brand_domain) {
      if (site.domain !== brandingConfig.custom_brand_domain) {
        // Update domain first
        const domainUpdate = await updateSite(siteId, { domain: brandingConfig.custom_brand_domain })
        if ('error' in domainUpdate) {
          console.error('[Publish Site] Error updating domain:', domainUpdate.error)
          // Continue anyway - publish can still succeed
        }
      }
    }
  }
  
  // Publish the site
  const result = await publishSite(siteId)
  
  if ('error' in result) {
    return result
  }
  
  return result
}

/**
 * Unpublish a site (sets status to draft)
 * Note: We don't revalidate here - the client will refresh React Query cache
 */
export async function handleUnpublishSite(siteId: string) {
  // Verify user has access to this site
  const access = await verifySiteAccess(siteId)
  if (!access) {
    return { error: 'Unauthorized: You do not have access to this site' }
  }
  
  const result = await unpublishSite(siteId)
  
  if ('error' in result) {
    return result
  }
  
  return result
}

