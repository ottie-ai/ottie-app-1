'use server'

import { createClient } from '@/lib/supabase/server'
import { RESERVED_SLUGS } from '@/lib/data/reserved-slugs'

/**
 * Workspace Slug Availability Functions
 * 
 * These functions check and validate workspace slugs.
 * Workspace slugs must be globally unique as they are used as subdomains.
 */

/**
 * Validate workspace slug format
 * @param slug - The slug to validate
 * @returns null if valid, error message if invalid
 */
export function validateWorkspaceSlugFormat(slug: string): string | null {
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
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(trimmedSlug) && trimmedSlug.length > 1) {
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
 * Check if a workspace slug is available
 * Workspace slugs must be globally unique (not per workspace)
 * 
 * @param slug - The slug to check
 * @param excludeWorkspaceId - Optional workspace ID to exclude from check (for updates)
 * @returns { available: boolean, error?: string }
 */
export async function checkWorkspaceSlugAvailability(
  slug: string,
  excludeWorkspaceId?: string
): Promise<{ available: boolean; error?: string }> {
  if (!slug || !slug.trim()) {
    return { available: false, error: 'Slug is required' }
  }

  // Validate format first
  const formatError = validateWorkspaceSlugFormat(slug)
  if (formatError) {
    return { available: false, error: formatError }
  }

  const supabase = await createClient()
  
  let query = supabase
    .from('workspaces')
    .select('id')
    .eq('slug', slug.trim().toLowerCase())
    .is('deleted_at', null)

  // Exclude current workspace if updating
  if (excludeWorkspaceId) {
    query = query.neq('id', excludeWorkspaceId)
  }

  const { data, error } = await query.limit(1)

  if (error) {
    console.error('Error checking workspace slug availability:', error)
    return { available: false, error: 'Failed to check slug availability' }
  }

  return { available: !data || data.length === 0 }
}

/**
 * Generate an available workspace slug by appending a number if needed
 * 
 * @param baseSlug - The base slug to start with
 * @param excludeWorkspaceId - Optional workspace ID to exclude from check (for updates)
 * @returns An available slug
 */
export async function generateAvailableWorkspaceSlug(
  baseSlug: string,
  excludeWorkspaceId?: string
): Promise<string> {
  if (!baseSlug || !baseSlug.trim()) {
    return ''
  }

  const trimmedSlug = baseSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '')
  
  // First check if base slug is available
  const { available } = await checkWorkspaceSlugAvailability(trimmedSlug, excludeWorkspaceId)
  
  if (available) {
    return trimmedSlug
  }

  // Try appending numbers until we find an available slug
  let counter = 1
  const maxAttempts = 100
  
  while (counter <= maxAttempts) {
    const candidateSlug = `${trimmedSlug}-${counter}`
    const { available } = await checkWorkspaceSlugAvailability(candidateSlug, excludeWorkspaceId)
    
    if (available) {
      return candidateSlug
    }
    
    counter++
  }

  // Fallback: append timestamp if we can't find a number
  return `${trimmedSlug}-${Date.now()}`
}

