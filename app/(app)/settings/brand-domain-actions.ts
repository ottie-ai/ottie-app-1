'use server'

import { createClient } from '@/lib/supabase/server'
import { addVercelDomain, removeVercelDomain, getVercelDomain, getVercelDomainConfig, updateVercelDomainRedirect } from '@/lib/vercel/domain-api'
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
 * Check rate limit for domain operations
 * Returns error message if rate limit exceeded, null if allowed
 */
async function checkDomainOperationRateLimit(
  workspaceId: string,
  operationType: 'set' | 'verify' | 'remove'
): Promise<string | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase.rpc('check_domain_operation_rate_limit', {
    p_workspace_id: workspaceId,
    p_operation_type: operationType,
  })
  
  if (error) {
    console.error('[Rate Limit] Error checking rate limit:', error)
    // If check fails, allow the operation (fail open)
    return null
  }
  
  if (!data.allowed) {
    const operationName = operationType === 'set' ? 'domain setup' : 
                          operationType === 'verify' ? 'domain verification' : 
                          'domain removal'
    return `Rate limit exceeded for ${operationName}. You have ${data.current}/${data.limit} attempts. Please try again in ${data.reset_in_minutes} minute(s).`
  }
  
  return null
}

/**
 * Reset rate limit for domain operations
 * Removes failed operations from the log to allow retry
 */
export async function resetDomainOperationRateLimit(
  workspaceId: string,
  userId: string,
  operationType: 'set' | 'verify' | 'remove'
): Promise<{ success: true; message: string } | { error: string }> {
  const supabase = await createClient()
  
  // Verify user is owner or admin
  const { data: membership } = await supabase
    .from('memberships')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single()

  if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
    return { error: 'Only workspace owners and admins can reset rate limit' }
  }

  const { data, error } = await supabase.rpc('reset_domain_operation_rate_limit', {
    p_workspace_id: workspaceId,
    p_operation_type: operationType,
  })
  
  if (error) {
    console.error('[Rate Limit] Error resetting rate limit:', error)
    return { error: 'Failed to reset rate limit. Please try again or contact support.' }
  }
  
  return { success: true, message: data.message || 'Rate limit reset successfully' }
}

/**
 * Log domain operation for rate limiting and audit
 */
async function logDomainOperation(
  workspaceId: string,
  userId: string,
  operationType: 'set' | 'verify' | 'remove',
  domain: string,
  success: boolean,
  errorMessage?: string
): Promise<void> {
  const supabase = await createClient()
  
  const { error } = await supabase.rpc('log_domain_operation', {
    p_workspace_id: workspaceId,
    p_user_id: userId,
    p_operation_type: operationType,
    p_domain: domain,
    p_success: success,
    p_error_message: errorMessage || null,
  })
  
  if (error) {
    console.error('[Rate Limit] Error logging operation:', error)
    // Don't fail the operation if logging fails
  }
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
  // 0. Check rate limit (5 attempts per hour)
  const rateLimitError = await checkDomainOperationRateLimit(workspaceId, 'set')
  if (rateLimitError) {
    return { error: rateLimitError }
  }

  // 1. Validate user permissions
  const supabase = await createClient()
  const { data: membership } = await supabase
    .from('memberships')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single()

  if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
    await logDomainOperation(workspaceId, userId, 'set', domain, false, 'Permission denied')
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
    const errorMsg = 'Invalid domain format. Please enter a valid subdomain (e.g., properties.example.com)'
    await logDomainOperation(workspaceId, userId, 'set', normalizedDomain, false, errorMsg)
    return { error: errorMsg }
  }

  // 2.5. Validate that it's a subdomain (must have at least 3 parts: subdomain.domain.tld)
  const domainParts = normalizedDomain.split('.')
  if (domainParts.length < 3) {
    const errorMsg = 'Only subdomains are supported. Please enter an address like properties.yourdomain.com or sites.yourdomain.com.'
    await logDomainOperation(workspaceId, userId, 'set', normalizedDomain, false, errorMsg)
    return { error: errorMsg }
  }
  
  // 2.6. Validate subdomain depth (max 4 levels to prevent abuse)
  // e.g., "a.b.c.domain.com" is OK, but "a.b.c.d.e.domain.com" is not
  if (domainParts.length > 5) {
    const errorMsg = 'Subdomain is too deep. Maximum 4 subdomain levels are supported.'
    await logDomainOperation(workspaceId, userId, 'set', normalizedDomain, false, errorMsg)
    return { error: errorMsg }
  }
  
  // 2.7. Validate each part length (prevent extremely long subdomain labels)
  for (const part of domainParts) {
    if (part.length > 63) {
      const errorMsg = 'Each part of the domain must be 63 characters or less.'
      await logDomainOperation(workspaceId, userId, 'set', normalizedDomain, false, errorMsg)
      return { error: errorMsg }
    }
  }
  
  // 2.8. Validate total domain length (max 253 characters per DNS spec)
  if (normalizedDomain.length > 253) {
    const errorMsg = 'Domain name is too long. Maximum 253 characters allowed.'
    await logDomainOperation(workspaceId, userId, 'set', normalizedDomain, false, errorMsg)
    return { error: errorMsg }
  }
  
  // Extract apex domain from subdomain (e.g., properties.example.com -> example.com)
  const apexDomain = domainParts.slice(1).join('.')
  
  // Check www version of the subdomain for reserved domain check
  const wwwSubdomain = `www.${normalizedDomain}`

  // 3. Check reserved domains (check both normalized and www versions)
  const reservedDomains = ['ottie.com', 'ottie.site', 'app.ottie.com', 'www.ottie.com', 'www.ottie.site']
  if (reservedDomains.some(reserved => normalizedDomain === reserved || normalizedDomain.endsWith(`.${reserved}`))) {
    const errorMsg = 'This domain is reserved and cannot be used'
    await logDomainOperation(workspaceId, userId, 'set', normalizedDomain, false, errorMsg)
    return { error: errorMsg }
  }
  if (reservedDomains.some(reserved => wwwSubdomain === reserved || wwwSubdomain.endsWith(`.${reserved}`))) {
    const errorMsg = 'This domain is reserved and cannot be used'
    await logDomainOperation(workspaceId, userId, 'set', normalizedDomain, false, errorMsg)
    return { error: errorMsg }
  }
  
  // 3.5. Check for suspicious/phishing patterns in subdomain
  const suspiciousPatterns = [
    /^(login|signin|auth|secure|account|verify|confirm|update|security|bank|paypal|amazon|google|microsoft|apple|facebook)/i,
    /^(support|help|admin|administrator|root|system|mail|email|webmail)/i,
    /(password|credential|ssn|credit.?card|billing)/i,
  ]
  const subdomain = domainParts[0]
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(subdomain)) {
      const errorMsg = 'This subdomain name is not allowed due to security restrictions.'
      await logDomainOperation(workspaceId, userId, 'set', normalizedDomain, false, errorMsg)
      return { error: errorMsg }
    }
  }

  // 4. Get workspace with plan
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('plan, branding_config')
    .eq('id', workspaceId)
    .single()

  if (!workspace) {
    const errorMsg = 'Workspace not found'
    await logDomainOperation(workspaceId, userId, 'set', normalizedDomain, false, errorMsg)
    return { error: errorMsg }
  }

  // Get current config once - will be used multiple times
  const currentConfig = (workspace.branding_config || {}) as BrandingConfig

  // 5. Check feature flag
  const plans = await loadPlansServer()
  if (!hasFeature(plans, workspace.plan, 'feature_custom_brand_domain')) {
    const firstPlanWithFeature = getFirstPlanWithFeature(plans, 'feature_custom_brand_domain')
    const planName = firstPlanWithFeature ? firstPlanWithFeature.name.charAt(0).toUpperCase() + firstPlanWithFeature.name.slice(1) : 'a higher tier'
    const errorMsg = `Brand domain feature is not available for your plan. Please upgrade to ${planName} plan or higher.`
    await logDomainOperation(workspaceId, userId, 'set', normalizedDomain, false, 'Feature not available on plan')
    return { error: errorMsg }
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
    const errorMsg = 'This subdomain is already in use by another workspace'
    await logDomainOperation(workspaceId, userId, 'set', normalizedDomain, false, errorMsg)
    return { error: errorMsg }
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
      const errorMsg = 'This subdomain is already configured. It may belong to another project or account. Please contact support if you believe this is an error.'
      await logDomainOperation(workspaceId, userId, 'set', normalizedDomain, false, 'Domain exists in Vercel')
      return { error: errorMsg }
    }
  }
  
  // Check if www version exists
  if (!('error' in existingWwwCheck)) {
    // www domain already exists - check if it belongs to this workspace
    if (currentDomain !== normalizedDomain) {
      const errorMsg = 'This subdomain (www) is already configured. It may belong to another project or account. Please contact support if you believe this is an error.'
      await logDomainOperation(workspaceId, userId, 'set', normalizedDomain, false, 'WWW domain exists in Vercel')
      return { error: errorMsg }
    }
  }

  // 7. Add www domain first (as primary, without redirect)
  // Then add non-www domain WITH redirect to www
  // This matches Vercel's automatic behavior when adding domains manually
  console.log('[Brand Domain] Adding www domain to Vercel (primary):', wwwDomain)
  const vercelWwwResult = await addVercelDomain(wwwDomain)
  if ('error' in vercelWwwResult) {
    // If www domain already exists error, check if it's ours
    if (vercelWwwResult.error.includes('already') || vercelWwwResult.error.includes('in use')) {
      // Try to get the www domain to verify it exists
      const wwwDomainCheck = await getVercelDomain(wwwDomain)
      if (!('error' in wwwDomainCheck)) {
        // www domain exists - check if it's ours
        if (currentDomain !== normalizedDomain) {
          const errorMsg = 'This subdomain (www) is already configured. It may belong to another project or account.'
          await logDomainOperation(workspaceId, userId, 'set', normalizedDomain, false, 'WWW domain conflict in Vercel')
          return { error: errorMsg }
        }
        // It's our domain, continue with existing www domain
        console.log('[Brand Domain] www domain already exists in Vercel, continuing with existing domain')
      } else {
        const errorMsg = 'www subdomain already exists but cannot be accessed. Please contact support.'
        await logDomainOperation(workspaceId, userId, 'set', normalizedDomain, false, errorMsg)
        return { error: errorMsg }
      }
    } else {
      // Sanitize error message to remove any platform-specific references
      const sanitizedError = vercelWwwResult.error.replace(/Vercel/gi, 'the platform').trim()
      const errorMsg = `Failed to add www subdomain: ${sanitizedError}. Please try again later.`
      await logDomainOperation(workspaceId, userId, 'set', normalizedDomain, false, 'API error')
      return { error: errorMsg }
    }
  }
  
  // Add non-www version WITH redirect to www (redirect is set during creation)
  // Note: redirect parameter should be just the domain name (no protocol)
  console.log('[Brand Domain] Adding non-www domain to Vercel WITH 307 redirect to www:', normalizedDomain, '->', wwwDomain)
  const vercelResult = await addVercelDomain(normalizedDomain, undefined, {
    redirect: wwwDomain,  // Just domain name, no https:// protocol
    redirectStatusCode: 307,
  })
  
  if ('error' in vercelResult) {
    // If domain already exists error, check if it's ours
    if (vercelResult.error.includes('already') || vercelResult.error.includes('in use')) {
      // Try to get the domain to verify it exists
      const domainCheck = await getVercelDomain(normalizedDomain)
      if (!('error' in domainCheck)) {
        // Domain exists - check if it's ours
        if (currentDomain !== normalizedDomain) {
          // Rollback: remove www domain if non-www belongs to someone else
          await removeVercelDomain(wwwDomain)
          const errorMsg = 'This subdomain is already configured. It may belong to another project or account.'
          await logDomainOperation(workspaceId, userId, 'set', normalizedDomain, false, 'Domain conflict in Vercel')
          return { error: errorMsg }
        }
        // It's our domain, continue with existing domain
        // No need to update redirect - if domain already exists, it should have been set correctly when first added
        console.log('[Brand Domain] Non-www domain already exists in Vercel, continuing with existing domain')
      } else {
        // Rollback: remove www domain if we can't verify non-www
        await removeVercelDomain(wwwDomain)
        const errorMsg = 'Subdomain already exists but cannot be accessed. Please contact support.'
        await logDomainOperation(workspaceId, userId, 'set', normalizedDomain, false, errorMsg)
        return { error: errorMsg }
      }
    } else {
      // Rollback: remove www domain if non-www addition fails
      await removeVercelDomain(wwwDomain)
      // Sanitize error message to remove any platform-specific references
      const sanitizedError = vercelResult.error.replace(/Vercel/gi, 'the platform').trim()
      const errorMsg = `Failed to add subdomain: ${sanitizedError}. Please try again later.`
      await logDomainOperation(workspaceId, userId, 'set', normalizedDomain, false, 'API error')
      return { error: errorMsg }
    }
  } else {
    console.log('[Brand Domain] Successfully added non-www domain with 307 redirect to www')
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
    return { error: `Failed to get DNS configuration: ${configResult?.error || 'Unknown error'}. The subdomain may need a few moments to be processed. Please try again in a minute.` }
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
      reason: 'Point your subdomain to our hosting platform'
    })
    
    // Add CNAME for www version
    vercelDNSInstructions.push({
      type: 'CNAME',
      domain: `www.${subdomainName}`, // e.g., "www.properties"
      value: cnameValue,
      reason: 'Point your www subdomain to our hosting platform'
    })
  } else if (config.cnames && config.cnames.length > 0) {
    // Fallback to cnames - use first one only
    const cnameValue = config.cnames[0]
    
    // Add CNAME for non-www version
    vercelDNSInstructions.push({
      type: 'CNAME',
      domain: subdomainName, // e.g., "properties"
      value: cnameValue,
      reason: 'Point your subdomain to our hosting platform'
    })
    
    // Add CNAME for www version
    vercelDNSInstructions.push({
      type: 'CNAME',
      domain: `www.${subdomainName}`, // e.g., "www.properties"
      value: cnameValue,
      reason: 'Point your www subdomain to our hosting platform'
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
        reason: 'Point your subdomain to our hosting platform'
      })
      
      // Add A record for www version
      vercelDNSInstructions.push({
        type: 'A',
        domain: `www.${subdomainName}`, // e.g., "www.properties"
        value: aValue,
        reason: 'Point your www subdomain to our hosting platform'
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
      reason: 'Point your subdomain to our hosting platform'
    })
    
    // Add A record for www version
    vercelDNSInstructions.push({
      type: 'A',
      domain: `www.${subdomainName}`, // e.g., "www.properties"
      value: aValue,
      reason: 'Point your www subdomain to our hosting platform'
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
    return { error: 'Failed to get DNS configuration. Please try again or contact support.' }
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

  // Log successful operation
  await logDomainOperation(workspaceId, userId, 'set', normalizedDomain, true)

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
  // 0. Check rate limit (10 attempts per hour)
  const rateLimitError = await checkDomainOperationRateLimit(workspaceId, 'verify')
  if (rateLimitError) {
    return { error: rateLimitError }
  }

  // 1. Validate permissions
  const supabase = await createClient()
  const { data: membership } = await supabase
    .from('memberships')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single()

  if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
    await logDomainOperation(workspaceId, userId, 'verify', '', false, 'Permission denied')
    return { error: 'Only workspace owners and admins can verify domain' }
  }

  // 2. Get workspace with branding_config
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('branding_config')
    .eq('id', workspaceId)
    .single()

  if (!workspace) {
    await logDomainOperation(workspaceId, userId, 'verify', '', false, 'Workspace not found')
    return { error: 'Workspace not found' }
  }

  const config = (workspace.branding_config || {}) as BrandingConfig
  const domain = config.custom_brand_domain

  if (!domain) {
    await logDomainOperation(workspaceId, userId, 'verify', '', false, 'Domain not set')
    return { error: 'Brand domain not set. Please set a domain first.' }
  }

  // 3. Check domain verification status via Vercel
  // Check non-www domain (both www and non-www should be verified)
  const vercelResult = await getVercelDomain(domain)
  if ('error' in vercelResult) {
    const errorMsg = 'Domain not found. Please contact support.'
    await logDomainOperation(workspaceId, userId, 'verify', domain, false, 'Domain not found in Vercel')
    return { error: errorMsg }
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
    
    await logDomainOperation(workspaceId, userId, 'verify', domain, false, 'DNS not configured or misconfigured')
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
    const errorMsg = 'Failed to update workspace configuration'
    await logDomainOperation(workspaceId, userId, 'verify', domain, false, errorMsg)
    return { error: errorMsg }
  }

  // Log successful verification
  await logDomainOperation(workspaceId, userId, 'verify', domain, true)

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

  // 4. Clear branding_config domain fields
  // Create new config object - preserve other fields but explicitly set domain fields to null
  // Using destructuring to remove domain fields and then explicitly setting them to null
  // This ensures Supabase properly updates the JSONB field
  const { 
    custom_brand_domain, 
    custom_brand_domain_verified, 
    custom_brand_domain_verified_at, 
    custom_brand_domain_vercel_added, 
    custom_brand_domain_vercel_dns_instructions, 
    ...otherConfig 
  } = config
  
  const updatedConfig: BrandingConfig = {
    ...otherConfig,
    custom_brand_domain: null,
    custom_brand_domain_verified: false,
    custom_brand_domain_verified_at: null,
    custom_brand_domain_vercel_added: false,
    custom_brand_domain_vercel_dns_instructions: null, // Use null instead of undefined for proper JSONB update
  }

  // Use updateWorkspace function which handles the update properly
  const updatedWorkspace = await updateWorkspace(workspaceId, {
    branding_config: updatedConfig,
  })

  if (!updatedWorkspace) {
    console.error('[Brand Domain] Failed to update workspace configuration via updateWorkspace')
    // Try direct update as fallback
    const { data: directUpdate, error: directError } = await supabase
      .from('workspaces')
      .update({ branding_config: updatedConfig })
      .eq('id', workspaceId)
      .select('branding_config')
      .single()

    if (directError || !directUpdate) {
      console.error('[Brand Domain] Direct update also failed:', directError)
      return { error: 'Failed to update workspace configuration' }
    }

    // Verify the domain was actually removed
    const finalConfig = (directUpdate.branding_config || {}) as BrandingConfig
    if (finalConfig.custom_brand_domain !== null && finalConfig.custom_brand_domain !== undefined) {
      console.warn('[Brand Domain] Domain still present after removal')
      return { error: 'Domain was not completely removed from configuration. Please try again or contact support.' }
    }
  } else {
    // Verify the domain was actually removed
    const finalConfig = (updatedWorkspace.branding_config || {}) as BrandingConfig
    if (finalConfig.custom_brand_domain !== null && finalConfig.custom_brand_domain !== undefined) {
      console.warn('[Brand Domain] Domain still present after removal, retrying update...')
      // Retry with explicit null values using direct update
      const { error: retryError } = await supabase
        .from('workspaces')
        .update({ 
          branding_config: {
            ...finalConfig,
            custom_brand_domain: null,
            custom_brand_domain_verified: false,
            custom_brand_domain_verified_at: null,
            custom_brand_domain_vercel_added: false,
            custom_brand_domain_vercel_dns_instructions: null,
          }
        })
        .eq('id', workspaceId)

      if (retryError) {
        console.error('[Brand Domain] Retry update also failed:', retryError)
        return { error: 'Failed to completely remove domain from configuration' }
      }
    }
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
  // 0. Check rate limit (3 attempts per day)
  const rateLimitError = await checkDomainOperationRateLimit(workspaceId, 'remove')
  if (rateLimitError) {
    return { error: rateLimitError }
  }

  // 1. Validate permissions
  const supabase = await createClient()
  const { data: membership } = await supabase
    .from('memberships')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single()

  if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
    await logDomainOperation(workspaceId, userId, 'remove', '', false, 'Permission denied')
    return { error: 'Only workspace owners and admins can remove brand domain' }
  }

  // Get domain before removal for logging
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('branding_config')
    .eq('id', workspaceId)
    .single()

  const config = (workspace?.branding_config || {}) as BrandingConfig
  const domain = config.custom_brand_domain || ''

  // 2. Call internal function to perform the removal
  const result = await removeBrandDomainInternal(workspaceId)
  
  // Log operation result
  // Only log successful operations for rate limiting purposes
  // Failed operations due to errors (not rate limits) should not count against the limit
  if ('error' in result) {
    // Only log if it's a rate limit error - other errors shouldn't count against limit
    if (result.error.includes('Rate limit exceeded')) {
      await logDomainOperation(workspaceId, userId, 'remove', domain, false, result.error)
    } else {
      // Don't log other errors to rate limit - they're system/configuration errors
      console.log('[Brand Domain] Operation failed but not counting against rate limit:', result.error)
    }
  } else {
    // Log successful operations for rate limiting
    await logDomainOperation(workspaceId, userId, 'remove', domain, true)
  }
  
  return result
}

