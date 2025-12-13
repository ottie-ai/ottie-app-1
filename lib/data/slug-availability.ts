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
 * Check if a slug is available for a given domain
 * @param slug - The slug to check
 * @param domain - The domain to check against (default: 'ottie.site')
 * @param excludeSiteId - Optional site ID to exclude from check (for updates)
 * @returns true if slug is available, false if taken
 */
export async function checkSlugAvailability(
  slug: string,
  domain: string = 'ottie.site',
  excludeSiteId?: string
): Promise<{ available: boolean; error?: string }> {
  if (!slug || !slug.trim()) {
    return { available: false, error: 'Slug is required' }
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
    .eq('domain', domain)
    .is('deleted_at', null) // Only check active sites (not soft-deleted)
    .in('status', ['published', 'draft']) // Only check published and draft sites (archived sites have released their slug)

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
 * @param baseSlug - The base slug to start with
 * @param domain - The domain to check against (default: 'ottie.site')
 * @param excludeSiteId - Optional site ID to exclude from check (for updates)
 * @returns An available slug
 */
export async function generateAvailableSlug(
  baseSlug: string,
  domain: string = 'ottie.site',
  excludeSiteId?: string
): Promise<string> {
  if (!baseSlug || !baseSlug.trim()) {
    return ''
  }

  const trimmedSlug = baseSlug.trim()
  
  // First check if base slug is available
  const { available } = await checkSlugAvailability(trimmedSlug, domain, excludeSiteId)
  
  if (available) {
    return trimmedSlug
  }

  // Try appending numbers until we find an available slug
  let counter = 1
  const maxAttempts = 100 // Prevent infinite loops
  
  while (counter <= maxAttempts) {
    const candidateSlug = `${trimmedSlug}-${counter}`
    const { available } = await checkSlugAvailability(candidateSlug, domain, excludeSiteId)
    
    if (available) {
      return candidateSlug
    }
    
    counter++
  }

  // Fallback: append timestamp if we can't find a number
  return `${trimmedSlug}-${Date.now()}`
}

