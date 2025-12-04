'use server'

import { createClient } from '@/lib/supabase/server'
import { addVercelDomain, removeVercelDomain, getVercelDomain } from '@/lib/vercel/domain-api'
import { updateWorkspace } from '@/lib/supabase/queries'
import { loadPlans } from '@/lib/data/plans'
import { hasFeature } from '@/lib/data/plans'
import type { Workspace } from '@/types/database'
import { revalidatePath } from 'next/cache'

interface BrandingConfig {
  custom_brand_domain?: string | null
  custom_brand_domain_verified?: boolean
  custom_brand_domain_verified_at?: string | null
  custom_brand_domain_vercel_added?: boolean
  custom_brand_domain_vercel_dns_instructions?: Array<{
    type: string
    domain: string
    value: string
    reason: string
  }>
}

/**
 * Set brand domain for workspace
 * 1. Validates domain format
 * 2. Checks feature flag
 * 3. Generates verification token
 * 4. Adds domain (automatic)
 * 5. Saves to branding_config
 */
export async function setBrandDomain(
  workspaceId: string,
  userId: string,
  domain: string
): Promise<{ 
  success: true
  vercelDNSInstructions: Array<{
    type: string
    domain: string
    value: string
    reason: string
  }>
  vercelVerified: boolean
} | { error: string }> {
  // 1. Validate user permissions
  const supabase = await createClient()
  const { data: membership } = await supabase
    .from('memberships')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single()

  if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
    return { error: 'Only workspace owners and admins can set brand domain' }
  }

  // 2. Validate domain format
  const trimmedDomain = domain.trim().toLowerCase()
  const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i
  if (!domainRegex.test(trimmedDomain)) {
    return { error: 'Invalid domain format. Please enter a valid domain (e.g., example.com)' }
  }

  // 3. Check reserved domains
  const reservedDomains = ['ottie.com', 'ottie.site', 'app.ottie.com', 'www.ottie.com', 'www.ottie.site']
  if (reservedDomains.some(reserved => trimmedDomain === reserved || trimmedDomain.endsWith(`.${reserved}`))) {
    return { error: 'This domain is reserved and cannot be used' }
  }

  // 4. Get workspace with plan
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('plan, branding_config')
    .eq('id', workspaceId)
    .single()

  if (!workspace) {
    return { error: 'Workspace not found' }
  }

  // 5. Check feature flag
  const plans = await loadPlans()
  if (!hasFeature(plans, workspace.plan, 'feature_custom_brand_domain')) {
    return { error: 'Brand domain feature is not available for your plan. Please upgrade to Growth or higher.' }
  }

  // 6. Check if domain is already used by another workspace
  const { data: existingWorkspaces } = await supabase
    .from('workspaces')
    .select('id')
    .neq('id', workspaceId)
    .not('branding_config->custom_brand_domain', 'is', null)
    .eq('branding_config->>custom_brand_domain', trimmedDomain)
    .is('deleted_at', null)

  if (existingWorkspaces && existingWorkspaces.length > 0) {
    return { error: 'This domain is already in use by another workspace' }
  }

  // 7. Add domain (automatic)
  const vercelResult = await addVercelDomain(trimmedDomain)
  if ('error' in vercelResult) {
    return { error: 'Failed to add domain. Please try again later.' }
  }

  // 8. Get DNS instructions
  const vercelDomain = vercelResult.domain
  const vercelDNSInstructions = vercelDomain.verification || []

  // 9. Update branding_config
  const currentConfig = (workspace.branding_config || {}) as BrandingConfig
  const updatedConfig: BrandingConfig = {
    ...currentConfig,
    custom_brand_domain: trimmedDomain,
    custom_brand_domain_verified: vercelDomain.verified || false,
    custom_brand_domain_verified_at: vercelDomain.verified ? new Date().toISOString() : null,
    custom_brand_domain_vercel_added: true,
    custom_brand_domain_vercel_dns_instructions: vercelDNSInstructions,
  }

  const updatedWorkspace = await updateWorkspace(workspaceId, {
    branding_config: updatedConfig,
  })

  if (!updatedWorkspace) {
    // Rollback: remove domain if DB update fails
    await removeVercelDomain(trimmedDomain)
    return { error: 'Failed to save domain configuration' }
  }

  revalidatePath('/settings')
  return { 
    success: true, 
    vercelDNSInstructions: vercelDNSInstructions,
    vercelVerified: vercelDomain.verified || false
  }
}

/**
 * Verify DNS TXT record and activate brand domain
 */
export async function verifyBrandDomain(
  workspaceId: string,
  userId: string
): Promise<{ success: true } | { error: string }> {
  // 1. Validate permissions
  const supabase = await createClient()
  const { data: membership } = await supabase
    .from('memberships')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single()

  if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
    return { error: 'Only workspace owners and admins can verify domain' }
  }

  // 2. Get workspace with branding_config
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('branding_config')
    .eq('id', workspaceId)
    .single()

  if (!workspace) {
    return { error: 'Workspace not found' }
  }

  const config = (workspace.branding_config || {}) as BrandingConfig
  const domain = config.custom_brand_domain

  if (!domain) {
    return { error: 'Brand domain not set. Please set a domain first.' }
  }

  // 3. Check domain verification status
  const vercelResult = await getVercelDomain(domain)
  if ('error' in vercelResult) {
    return { error: 'Domain not found. Please contact support.' }
  }

  // 4. Check if domain has been verified (DNS configured correctly)
  if (!vercelResult.domain.verified) {
    // Domain verification failed - DNS not configured correctly
    const verificationErrors = vercelResult.domain.verification || []
    const errorMessages = verificationErrors.map(v => v.reason).join(', ')
    
    return { 
      error: `Domain verification failed. ${errorMessages || 'Please check your DNS settings and ensure the DNS records are configured correctly.'}` 
    }
  }

  // 5. Update branding_config - mark as verified and update DNS instructions
  const updatedConfig: BrandingConfig = {
    ...config,
    custom_brand_domain_verified: true,
    custom_brand_domain_verified_at: new Date().toISOString(),
    custom_brand_domain_vercel_dns_instructions: vercelResult.domain.verification || [],
  }

  // 6. Update all sites in workspace to use brand domain
  const { error: sitesError } = await supabase
    .from('sites')
    .update({ domain })
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)

  if (sitesError) {
    console.error('[Brand Domain] Error updating sites:', sitesError)
    // Continue anyway - domain verification can succeed even if sites update fails
  }

  // 7. Update workspace
  const updatedWorkspace = await updateWorkspace(workspaceId, {
    branding_config: updatedConfig,
  })

  if (!updatedWorkspace) {
    return { error: 'Failed to update workspace configuration' }
  }

  revalidatePath('/settings')
  return { success: true }
}

/**
 * Remove brand domain from workspace
 */
export async function removeBrandDomain(
  workspaceId: string,
  userId: string
): Promise<{ success: true } | { error: string }> {
  // 1. Validate permissions
  const supabase = await createClient()
  const { data: membership } = await supabase
    .from('memberships')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single()

  if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
    return { error: 'Only workspace owners and admins can remove brand domain' }
  }

  // 2. Get workspace with branding_config
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('branding_config')
    .eq('id', workspaceId)
    .single()

  if (!workspace) {
    return { error: 'Workspace not found' }
  }

  const config = (workspace.branding_config || {}) as BrandingConfig
  const domain = config.custom_brand_domain

  if (!domain) {
    return { error: 'No brand domain set' }
  }

  // 3. Remove domain
  const vercelResult = await removeVercelDomain(domain)
  if ('error' in vercelResult) {
    // Log but continue - domain might already be removed
    console.warn('[Brand Domain] Failed to remove domain:', vercelResult.error)
  }

  // 4. Revert all sites in workspace to ottie.site
  const { error: sitesError } = await supabase
    .from('sites')
    .update({ domain: 'ottie.site' })
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)

  if (sitesError) {
    console.error('[Brand Domain] Error reverting sites:', sitesError)
    // Continue anyway
  }

  // 5. Clear branding_config
  const updatedConfig: BrandingConfig = {
    ...config,
    custom_brand_domain: null,
    custom_brand_domain_verified: false,
    custom_brand_domain_verified_at: null,
    custom_brand_domain_vercel_added: false,
    custom_brand_domain_vercel_dns_instructions: undefined,
  }

  const updatedWorkspace = await updateWorkspace(workspaceId, {
    branding_config: updatedConfig,
  })

  if (!updatedWorkspace) {
    return { error: 'Failed to update workspace configuration' }
  }

  revalidatePath('/settings')
  return { success: true }
}

