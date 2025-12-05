'use server'

import { createClient } from '@/lib/supabase/server'
import { addVercelDomain, removeVercelDomain, getVercelDomain, getVercelDomainConfig } from '@/lib/vercel/domain-api'
import { updateWorkspace } from '@/lib/supabase/queries'
import { loadPlansServer, hasFeature, getFirstPlanWithFeature } from '@/lib/data/plans-server'
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

  // 2. Validate domain format - ONLY subdomains are allowed
  const trimmedDomain = domain.trim().toLowerCase()
  
  // Normalize: remove www. prefix if present
  // Domains are stored without www prefix for consistency
  const normalizedDomain = trimmedDomain.startsWith('www.') 
    ? trimmedDomain.substring(4) 
    : trimmedDomain
  
  const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i
  if (!domainRegex.test(normalizedDomain)) {
    return { error: 'Invalid domain format. Please enter a valid subdomain (e.g., properties.example.com)' }
  }

  // 2.5. Validate that it's a subdomain (must have at least 3 parts: subdomain.domain.tld)
  const domainParts = normalizedDomain.split('.')
  if (domainParts.length < 3) {
    return { error: 'Only subdomains are supported. Please enter an address like properties.yourdomain.com or sites.yourdomain.com.' }
  }
  
  // Extract apex domain from subdomain (e.g., properties.example.com -> example.com)
  const apexDomain = domainParts.slice(1).join('.')
  
  // For subdomains, we don't need www version check
  const wwwDomain = `www.${apexDomain}`

  // 3. Check reserved domains (check both apex and www versions)
  const reservedDomains = ['ottie.com', 'ottie.site', 'app.ottie.com', 'www.ottie.com', 'www.ottie.site']
  if (reservedDomains.some(reserved => normalizedDomain === reserved || normalizedDomain.endsWith(`.${reserved}`))) {
    return { error: 'This domain is reserved and cannot be used' }
  }
  if (reservedDomains.some(reserved => wwwDomain === reserved || wwwDomain.endsWith(`.${reserved}`))) {
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

  // Get current config once - will be used multiple times
  const currentConfig = (workspace.branding_config || {}) as BrandingConfig

  // 5. Check feature flag
  const plans = await loadPlansServer()
  if (!hasFeature(plans, workspace.plan, 'feature_custom_brand_domain')) {
    const firstPlanWithFeature = getFirstPlanWithFeature(plans, 'feature_custom_brand_domain')
    const planName = firstPlanWithFeature ? firstPlanWithFeature.name.charAt(0).toUpperCase() + firstPlanWithFeature.name.slice(1) : 'a higher tier'
    return { error: `Brand domain feature is not available for your plan. Please upgrade to ${planName} plan or higher.` }
  }

  // 6. Check if subdomain is already used by another workspace
  // Since we only allow subdomains, check exact match
  const { data: existingWorkspaces } = await supabase
    .from('workspaces')
    .select('id')
    .neq('id', workspaceId)
    .not('branding_config->custom_brand_domain', 'is', null)
    .eq('branding_config->>custom_brand_domain', normalizedDomain)
    .is('deleted_at', null)

  if (existingWorkspaces && existingWorkspaces.length > 0) {
    return { error: 'This subdomain is already in use by another workspace' }
  }

  // 6.5. Check if subdomain already exists in Vercel project (check both www and non-www versions)
  // This prevents exposing domains that belong to other projects/accounts
  const wwwDomain = `www.${normalizedDomain}`
  const existingDomainCheck = await getVercelDomain(normalizedDomain)
  const existingWwwCheck = await getVercelDomain(wwwDomain)
  
  const currentDomain = currentConfig.custom_brand_domain
  
  // Check if non-www domain exists in Vercel
  if (!('error' in existingDomainCheck)) {
    // Domain already exists in Vercel - check if it belongs to this workspace
    if (currentDomain !== normalizedDomain) {
      return { error: 'This subdomain is already configured in Vercel. It may belong to another project or account. Please contact support if you believe this is an error.' }
    }
  }
  
  // Check if www version exists
  if (!('error' in existingWwwCheck)) {
    // www domain already exists - check if it belongs to this workspace
    if (currentDomain !== normalizedDomain) {
      return { error: 'This subdomain (www) is already configured in Vercel. It may belong to another project or account. Please contact support if you believe this is an error.' }
    }
  }

  // 7. Add both www and non-www domains to Vercel (automatic)
  // We add both versions to support both www.properties.ottie.ai and properties.ottie.ai
  // We store the normalized subdomain (e.g., properties.example.com) in database
  console.log('[Brand Domain] Adding non-www domain to Vercel:', normalizedDomain)
  const vercelResult = await addVercelDomain(normalizedDomain)
  if ('error' in vercelResult) {
    // If domain already exists error, check if it's ours
    if (vercelResult.error.includes('already') || vercelResult.error.includes('in use')) {
      // Try to get the domain to verify it exists
      const domainCheck = await getVercelDomain(normalizedDomain)
      if (!('error' in domainCheck)) {
        // Domain exists - check if it's ours
        if (currentDomain !== normalizedDomain) {
          return { error: 'This subdomain is already configured in Vercel. It may belong to another project or account.' }
        }
        // It's our domain, continue with existing domain
        console.log('[Brand Domain] Non-www domain already exists in Vercel, continuing with existing domain')
      } else {
        return { error: 'Subdomain already exists but cannot be accessed. Please contact support.' }
      }
    } else {
      return { error: `Failed to add subdomain: ${vercelResult.error}. Please try again later.` }
    }
  }
  
  // Add www version as well
  console.log('[Brand Domain] Adding www domain to Vercel:', wwwDomain)
  const vercelWwwResult = await addVercelDomain(wwwDomain)
  if ('error' in vercelWwwResult) {
    // If www domain already exists error, check if it's ours
    if (vercelWwwResult.error.includes('already') || vercelWwwResult.error.includes('in use')) {
      // Try to get the www domain to verify it exists
      const wwwDomainCheck = await getVercelDomain(wwwDomain)
      if (!('error' in wwwDomainCheck)) {
        // www domain exists - check if it's ours
        if (currentDomain !== normalizedDomain) {
          // Rollback: remove non-www domain if www belongs to someone else
          await removeVercelDomain(normalizedDomain)
          return { error: 'This subdomain (www) is already configured in Vercel. It may belong to another project or account.' }
        }
        // It's our domain, continue with existing www domain
        console.log('[Brand Domain] www domain already exists in Vercel, continuing with existing domain')
      } else {
        // Rollback: remove non-www domain if we can't verify www
        await removeVercelDomain(normalizedDomain)
        return { error: 'www subdomain already exists but cannot be accessed. Please contact support.' }
      }
    } else {
      // Rollback: remove non-www domain if www addition fails
      await removeVercelDomain(normalizedDomain)
      return { error: `Failed to add www subdomain: ${vercelWwwResult.error}. Please try again later.` }
    }
  }

  // 8. Get DNS configuration - recommended CNAME/A records from Vercel API
  // IMPORTANT: Only use config endpoint, NOT verification array from domain response
  // Verification array only indicates domain was added, not DNS configuration
  // Note: There may be a delay after adding domain before DNS config is available
  // Retry up to 3 times with 2 second delay between attempts
  // Use non-www domain for DNS config (both www and non-www should have same config)
  let configResult: Awaited<ReturnType<typeof getVercelDomainConfig>> | null = null
  let retryCount = 0
  const maxRetries = 3
  const retryDelay = 2000 // 2 seconds

  while (retryCount < maxRetries) {
    // Get DNS config for non-www domain
    configResult = await getVercelDomainConfig(normalizedDomain)
    
    if (!('error' in configResult)) {
      // Success - DNS config is available
      break
    }
    
    // If 404 or 403, don't retry (these are permanent errors)
    if (configResult.error.includes('not found') || configResult.error.includes('forbidden')) {
      break
    }
    
    retryCount++
    if (retryCount < maxRetries) {
      console.log(`[Brand Domain] DNS config not available yet, retrying in ${retryDelay}ms (attempt ${retryCount + 1}/${maxRetries})`)
      await new Promise(resolve => setTimeout(resolve, retryDelay))
    }
  }

  let vercelDNSInstructions: Array<{
    type: string
    domain: string
    value: string
    reason: string
  }> = []

  if (!configResult || 'error' in configResult) {
    console.error('[Brand Domain] Failed to get DNS config from Vercel after retries:', configResult?.error)
    // Rollback: remove both www and non-www domains from Vercel since we can't get DNS config
    console.log('[Brand Domain] Rolling back: removing both www and non-www subdomains from Vercel')
    await removeVercelDomain(normalizedDomain)
    await removeVercelDomain(wwwDomain)
    // Rollback: clear domain from database if it was a new domain (not updating existing)
    // Only clear if there was no previous domain (adding new domain, not changing existing)
    if (!currentDomain || currentDomain === null) {
      await updateWorkspace(workspaceId, {
        branding_config: {
          ...currentConfig,
          custom_brand_domain: null,
          custom_brand_domain_verified: false,
          custom_brand_domain_verified_at: null,
          custom_brand_domain_vercel_added: false,
          custom_brand_domain_vercel_dns_instructions: undefined,
        },
      })
    }
    return { error: `Failed to get DNS configuration: ${configResult?.error || 'Unknown error'}. The subdomain may need a few moments to be processed by Vercel. Please try again in a minute.` }
  }

  const { config } = configResult
  console.log('[Brand Domain] Vercel config response:', JSON.stringify(config, null, 2))
  
  // For subdomains, we need CNAME records, not A records
  // Subdomains use CNAME to point to Vercel
  // We'll provide DNS instructions for both www and non-www versions
  const subdomainName = domainParts[0] // e.g., "properties" from "properties.example.com"
  // Note: apexDomain is already defined earlier in the function (line 79)
  
  if (config.recommendedCNAME && config.recommendedCNAME.length > 0) {
    // Get the first item (highest rank)
    const firstItem = config.recommendedCNAME[0]
    
    const cnameValue = typeof firstItem === 'string' ? firstItem : firstItem.value
    
    // Add CNAME for non-www version
    vercelDNSInstructions.push({
      type: 'CNAME',
      domain: subdomainName, // e.g., "properties"
      value: cnameValue,
      reason: 'Point your subdomain to Vercel'
    })
    
    // Add CNAME for www version
    vercelDNSInstructions.push({
      type: 'CNAME',
      domain: `www.${subdomainName}`, // e.g., "www.properties"
      value: cnameValue,
      reason: 'Point your www subdomain to Vercel'
    })
  } else if (config.cnames && config.cnames.length > 0) {
    // Fallback to cnames - use first one only
    const cnameValue = config.cnames[0]
    
    // Add CNAME for non-www version
    vercelDNSInstructions.push({
      type: 'CNAME',
      domain: subdomainName, // e.g., "properties"
      value: cnameValue,
      reason: 'Point your subdomain to Vercel'
    })
    
    // Add CNAME for www version
    vercelDNSInstructions.push({
      type: 'CNAME',
      domain: `www.${subdomainName}`, // e.g., "www.properties"
      value: cnameValue,
      reason: 'Point your www subdomain to Vercel'
    })
  } else if (config.recommendedIPv4 && config.recommendedIPv4.length > 0) {
    // Fallback: if no CNAME, try A records (shouldn't happen for subdomains, but just in case)
    const firstItem = config.recommendedIPv4[0]
    const aValue = typeof firstItem === 'string' ? firstItem : (firstItem.value && Array.isArray(firstItem.value) ? firstItem.value[0] : null)
    
    if (aValue) {
      // Add A record for non-www version
      vercelDNSInstructions.push({
        type: 'A',
        domain: subdomainName, // e.g., "properties"
        value: aValue,
        reason: 'Point your subdomain to Vercel'
      })
      
      // Add A record for www version
      vercelDNSInstructions.push({
        type: 'A',
        domain: `www.${subdomainName}`, // e.g., "www.properties"
        value: aValue,
        reason: 'Point your www subdomain to Vercel'
      })
    }
  } else if (config.aValues && config.aValues.length > 0) {
    // Fallback to aValues (older API format) - use only first value
    const aValue = config.aValues[0]
    
    // Add A record for non-www version
    vercelDNSInstructions.push({
      type: 'A',
      domain: subdomainName, // e.g., "properties"
      value: aValue,
      reason: 'Point your subdomain to Vercel'
    })
    
    // Add A record for www version
    vercelDNSInstructions.push({
      type: 'A',
      domain: `www.${subdomainName}`, // e.g., "www.properties"
      value: aValue,
      reason: 'Point your www subdomain to Vercel'
    })
  }
  
  // Log what we're doing for debugging
  console.log('[Brand Domain] DNS instructions from API:', {
    normalizedDomain: normalizedDomain,
    wwwDomain: wwwDomain,
    hasRecommendedIPv4: !!config.recommendedIPv4,
    hasAValues: !!config.aValues,
    hasRecommendedCNAME: !!config.recommendedCNAME,
    hasCnames: !!config.cnames,
    instructionsCount: vercelDNSInstructions.length,
  })

  // If still no instructions, return error and rollback - we cannot proceed without DNS config
  if (vercelDNSInstructions.length === 0) {
    console.error('[Brand Domain] No DNS instructions from Vercel API for subdomain:', normalizedDomain)
    console.error('[Brand Domain] Config response:', JSON.stringify(config, null, 2))
    // Rollback: remove both www and non-www subdomains from Vercel since we can't get DNS config
    console.log('[Brand Domain] Rolling back: removing both www and non-www subdomains from Vercel (no DNS instructions)')
    await removeVercelDomain(normalizedDomain)
    await removeVercelDomain(wwwDomain)
    // Rollback: clear domain from database if it was a new domain (not updating existing)
    // Only clear if there was no previous domain (adding new domain, not changing existing)
    if (!currentDomain || currentDomain === null) {
      await updateWorkspace(workspaceId, {
        branding_config: {
          ...currentConfig,
          custom_brand_domain: null,
          custom_brand_domain_verified: false,
          custom_brand_domain_verified_at: null,
          custom_brand_domain_vercel_added: false,
          custom_brand_domain_vercel_dns_instructions: undefined,
        },
      })
    }
    return { error: 'Failed to get DNS configuration from Vercel. Please try again or contact support.' }
  }

  // 9. Update branding_config
  // IMPORTANT: Always set verified to false initially, even if Vercel says verified
  // User must configure DNS first, then verify manually via "Check Status" button
  // Store normalized domain (without www) in database
  // Both www and non-www versions are stored in Vercel, but we store normalized version (properties.ottie.ai) in DB
  const updatedConfig: BrandingConfig = {
    ...currentConfig,
    // Store the normalized subdomain without www prefix (e.g., properties.example.com)
    // This allows lookup to work for both www and non-www variants via SQL function normalization
    custom_brand_domain: normalizedDomain,
    custom_brand_domain_verified: false, // Always false initially - user must verify after DNS setup
    custom_brand_domain_verified_at: null,
    custom_brand_domain_vercel_added: true,
    custom_brand_domain_vercel_dns_instructions: vercelDNSInstructions,
  }

  const updatedWorkspace = await updateWorkspace(workspaceId, {
    branding_config: updatedConfig,
  })

  if (!updatedWorkspace) {
    // Rollback: remove both www and non-www subdomains if DB update fails
    await removeVercelDomain(normalizedDomain)
    await removeVercelDomain(wwwDomain)
    // Rollback: clear domain from database if it was a new domain (not updating existing)
    // Only clear if there was no previous domain (adding new domain, not changing existing)
    if (!currentDomain || currentDomain === null) {
      await updateWorkspace(workspaceId, {
        branding_config: {
          ...currentConfig,
          custom_brand_domain: null,
          custom_brand_domain_verified: false,
          custom_brand_domain_verified_at: null,
          custom_brand_domain_vercel_added: false,
          custom_brand_domain_vercel_dns_instructions: undefined,
        },
      })
    }
    return { error: 'Failed to save subdomain configuration' }
  }

  revalidatePath('/settings')
  return { 
    success: true, 
    vercelDNSInstructions: vercelDNSInstructions,
    vercelVerified: false // Always return false - verification happens via verifyBrandDomain
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

  // 3. Check domain verification status via Vercel
  // Check non-www domain (both www and non-www should be verified)
  const vercelResult = await getVercelDomain(domain)
  if ('error' in vercelResult) {
    return { error: 'Domain not found. Please contact support.' }
  }

  // 4. Check domain config to see if DNS is configured correctly
  // Check non-www domain config (both www and non-www should have same config)
  const configResult = await getVercelDomainConfig(domain)
  
  // Domain is verified only if:
  // - Vercel says it's verified (domain is linked)
  // - AND domain config shows it's not misconfigured (DNS is correct)
  const isVerified = vercelResult.domain.verified
  const isMisconfigured = !('error' in configResult) && configResult.config.misconfigured

  if (!isVerified || isMisconfigured) {
    // Domain verification failed - DNS not configured correctly
    let errorMessage = 'This can take some time after updating DNS. Please wait a few minutes, then check that your DNS records are configured correctly and try again.'
    
    // Get specific error messages from verification array
    const verificationErrors = vercelResult.domain.verification || []
    if (verificationErrors.length > 0) {
      errorMessage = verificationErrors.map(v => v.reason).join(', ')
    }
    
    return { 
      error: `Domain verification failed. ${errorMessage}` 
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
  // This ensures all sites (including already published ones) use the brand domain
  const { error: sitesError } = await supabase
    .from('sites')
    .update({ domain })
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)

  if (sitesError) {
    console.error('[Brand Domain] Error updating sites:', sitesError)
    // Continue anyway - domain verification can succeed even if sites update fails
  } else {
    console.log('[Brand Domain] Updated all sites in workspace to use brand domain:', domain)
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
 * Remove brand domain from workspace (internal function)
 * This function contains the core removal logic without permission checks.
 * Used by both the public removeBrandDomain function and during plan downgrades.
 */
export async function removeBrandDomainInternal(
  workspaceId: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()

  // 1. Get workspace with branding_config
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
    // No domain set - nothing to remove, but return success
    return { success: true }
  }

  // 2. Remove both www and non-www domains from Vercel
  // We added both versions, so we need to remove both
  const wwwDomain = `www.${domain}`
  console.log('[Brand Domain] Removing non-www domain from Vercel:', domain)
  const vercelResult = await removeVercelDomain(domain)
  
  console.log('[Brand Domain] Removing www domain from Vercel:', wwwDomain)
  const vercelWwwResult = await removeVercelDomain(wwwDomain)
  
  // Log results but continue even if removal fails (domains might already be removed)
  if ('error' in vercelResult) {
    if (vercelResult.error.includes('not found') || vercelResult.error.includes('404')) {
      console.log('[Brand Domain] Non-www domain not found in Vercel (may have been already removed):', domain)
    } else {
      console.warn('[Brand Domain] Failed to remove non-www domain from Vercel:', vercelResult.error)
    }
  } else {
    console.log('[Brand Domain] Successfully removed non-www domain from Vercel:', domain)
  }
  
  if ('error' in vercelWwwResult) {
    if (vercelWwwResult.error.includes('not found') || vercelWwwResult.error.includes('404')) {
      console.log('[Brand Domain] www domain not found in Vercel (may have been already removed):', wwwDomain)
    } else {
      console.warn('[Brand Domain] Failed to remove www domain from Vercel:', vercelWwwResult.error)
    }
  } else {
    console.log('[Brand Domain] Successfully removed www domain from Vercel:', wwwDomain)
  }

  // 3. Revert all sites in workspace to ottie.site
  const { error: sitesError } = await supabase
    .from('sites')
    .update({ domain: 'ottie.site' })
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null)

  if (sitesError) {
    console.error('[Brand Domain] Error reverting sites:', sitesError)
    // Continue anyway
  }

  // 4. Clear branding_config
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

/**
 * Remove brand domain from workspace
 * Public function with permission checks
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

  // 2. Call internal function to perform the removal
  return await removeBrandDomainInternal(workspaceId)
}

