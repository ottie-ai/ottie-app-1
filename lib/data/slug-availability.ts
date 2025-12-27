'use server'

import { createClient } from '@/lib/supabase/server'
import { RESERVED_SLUGS } from '@/lib/data/reserved-slugs'

/**
 * Validate slug format and check if it's reserved
 * @param slug - The slug to validate
 * @returns null if valid, error message if invalid
 */
function validateSlugFormat(slug: string): string | null {
  const trimmedSlug = slug.trim().toLowerCase()
  
  if (!trimmedSlug) {
    return 'Slug is required'
  }
  
  // Check minimum length
  if (trimmedSlug.length < 5) {
    return 'Slug must be at least 5 characters long'
  }
  
  // Check maximum length (DNS subdomain limit)
  if (trimmedSlug.length > 63) {
    return 'Slug must be at most 63 characters long'
  }
  
  // Check format: only lowercase letters, numbers, and hyphens
  // Pattern: ^[a-z0-9][a-z0-9-]{3,61}[a-z0-9]$
  if (!/^[a-z0-9][a-z0-9-]{3,61}[a-z0-9]$/.test(trimmedSlug)) {
    if (trimmedSlug[0] === '-' || trimmedSlug[trimmedSlug.length - 1] === '-') {
      return 'Slug cannot start or end with a hyphen'
    }
    if (!/^[a-z0-9]/.test(trimmedSlug)) {
      return 'Slug must start with a letter or number'
    }
    if (!/[a-z0-9]$/.test(trimmedSlug)) {
      return 'Slug must end with a letter or number'
    }
    return 'Slug can only contain lowercase letters, numbers, and hyphens'
  }
  
  // Check reserved words
  if (RESERVED_SLUGS.includes(trimmedSlug)) {
    return `"${trimmedSlug}" is a reserved word and cannot be used`
  }
  
  return null
}

/**
 * Check if a site slug is available within a workspace
 * NEW: Site slugs are unique per workspace, not per domain
 * 
 * @param slug - The slug to check
 * @param workspaceId - The workspace ID to check within
 * @param excludeSiteId - Optional site ID to exclude from check (for updates)
 * @returns { available: boolean, error?: string }
 */
export async function checkSlugAvailability(
  slug: string,
  workspaceId: string,
  excludeSiteId?: string
): Promise<{ available: boolean; error?: string }> {
  if (!slug || !slug.trim()) {
    return { available: false, error: 'Slug is required' }
  }

  if (!workspaceId) {
    return { available: false, error: 'Workspace ID is required' }
  }

  // Validate format first
  const formatError = validateSlugFormat(slug)
  if (formatError) {
    return { available: false, error: formatError }
  }

  const supabase = await createClient()
  
  let query = supabase
    .from('sites')
    .select('id')
    .eq('slug', slug.trim().toLowerCase())
    .eq('workspace_id', workspaceId)
    .is('deleted_at', null) // Only check active sites (not soft-deleted)

  // Exclude current site if updating
  if (excludeSiteId) {
    query = query.neq('id', excludeSiteId)
  }

  const { data, error } = await query.limit(1)

  if (error) {
    console.error('Error checking slug availability:', error)
    return { available: false, error: 'Failed to check slug availability' }
  }

  return { available: !data || data.length === 0 }
}

/**
 * Generate an available slug by appending a number if needed
 * NEW: Checks within workspace, not domain
 * 
 * @param baseSlug - The base slug to start with
 * @param workspaceId - The workspace ID to check within
 * @param excludeSiteId - Optional site ID to exclude from check (for updates)
 * @returns An available slug
 */
export async function generateAvailableSlug(
  baseSlug: string,
  workspaceId: string,
  excludeSiteId?: string
): Promise<string> {
  if (!baseSlug || !baseSlug.trim()) {
    return ''
  }

  if (!workspaceId) {
    return baseSlug.trim()
  }

  const trimmedSlug = baseSlug.trim().toLowerCase()
  
  // First check if base slug is available
  const { available } = await checkSlugAvailability(trimmedSlug, workspaceId, excludeSiteId)
  
  if (available) {
    return trimmedSlug
  }

  // Try appending numbers until we find an available slug
  let counter = 1
  const maxAttempts = 100 // Prevent infinite loops
  
  while (counter <= maxAttempts) {
    const candidateSlug = `${trimmedSlug}-${counter}`
    const { available } = await checkSlugAvailability(candidateSlug, workspaceId, excludeSiteId)
    
    if (available) {
      return candidateSlug
    }
    
    counter++
  }

  // Fallback: append timestamp if we can't find a number
  return `${trimmedSlug}-${Date.now()}`
}

// ==========================================
// LEGACY COMPATIBILITY
// ==========================================
// These functions maintain backward compatibility with code that
// still uses domain-based slug checking. They convert domain to workspace lookup.

/**
 * @deprecated Use checkSlugAvailability with workspaceId instead
 * Legacy function for checking slug by domain - converts to workspace-based check
 */
export async function checkSlugAvailabilityByDomain(
  slug: string,
  domain: string = 'ottie.site',
  excludeSiteId?: string
): Promise<{ available: boolean; error?: string }> {
  // For ottie.site, we need workspace context - this is a legacy fallback
  // In the new architecture, slug uniqueness is per workspace, not per domain
  // This function is kept for backward compatibility but may not work correctly
  // for all cases. Prefer using checkSlugAvailability with workspaceId.
  
  if (!slug || !slug.trim()) {
    return { available: false, error: 'Slug is required' }
  }

  // Validate format first
  const formatError = validateSlugFormat(slug)
  if (formatError) {
    return { available: false, error: formatError }
  }

  const supabase = await createClient()
  
  // For custom domains, we can check by domain
  // For ottie.site, this is a global check which is more restrictive than needed
  let query = supabase
    .from('sites')
    .select('id')
    .eq('slug', slug.trim().toLowerCase())
    .is('deleted_at', null)

  // Exclude current site if updating
  if (excludeSiteId) {
    query = query.neq('id', excludeSiteId)
  }

  const { data, error } = await query.limit(1)

  if (error) {
    console.error('Error checking slug availability:', error)
    return { available: false, error: 'Failed to check slug availability' }
  }

  return { available: !data || data.length === 0 }
}
