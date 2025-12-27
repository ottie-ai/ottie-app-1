import type { Workspace } from '@/types/database'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * Workspace Domain Data Functions
 * 
 * These functions handle custom workspace domain lookups.
 * A workspace domain allows users to use their own domain (e.g., properties.agency.com)
 * instead of the default workspace-slug.ottie.site URL structure.
 */

/**
 * Normalize domain by removing www. prefix
 * Domains are stored without www prefix
 */
function normalizeDomain(domain: string): string {
  return domain.toLowerCase().startsWith('www.') 
    ? domain.substring(4) 
    : domain.toLowerCase()
}

/**
 * Get workspace by custom workspace domain (edge-compatible for middleware)
 * This version works in middleware by using request cookies directly
 * Supports both www and non-www variants
 * 
 * Checks both new field names (custom_workspace_domain) and legacy field names
 * (custom_brand_domain) for backward compatibility during migration.
 */
export async function getWorkspaceByWorkspaceDomain(
  domain: string,
  request?: NextRequest
): Promise<{ workspace: Workspace; verified: boolean } | null> {
  // For middleware, we need to use createServerClient with request cookies
  // For server actions/components, we can use the server client
  let supabase: any

  if (request) {
    // Middleware context - use request cookies
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
                        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('[Workspace Domain] Missing Supabase environment variables')
      return null
    }

    supabase = createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll() {
            // In middleware, we don't set cookies for read-only queries
          },
        },
      }
    )
  } else {
    // Server action/component context - use server client
    const { createClient } = await import('@/lib/supabase/server')
    supabase = await createClient()
  }

  // Only log in development - avoid exposing domain lookup info in production
  if (process.env.NODE_ENV === 'development') {
    console.log('[Workspace Domain] Looking up domain:', domain)
  }
  
  // Try the new RPC function first
  try {
    const { data: rpcResult, error: rpcError } = await supabase
      .rpc('get_workspace_by_workspace_domain', { domain_name: domain })
    
    if (!rpcError && rpcResult && rpcResult.length > 0) {
      const workspace = rpcResult[0] as Workspace
      if (process.env.NODE_ENV === 'development') {
        console.log('[Workspace Domain] Found verified workspace via new RPC')
      }
      const brandingConfig = (workspace.branding_config || {}) as {
        custom_workspace_domain_verified?: boolean
        custom_brand_domain_verified?: boolean // Legacy field
      }
      return {
        workspace,
        verified: brandingConfig.custom_workspace_domain_verified === true || 
                  brandingConfig.custom_brand_domain_verified === true,
      }
    }
    
    if (rpcError && process.env.NODE_ENV === 'development') {
      console.log('[Workspace Domain] New RPC function not available, trying legacy...')
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Workspace Domain] New RPC function not available, trying legacy...')
    }
  }
  
  // Fallback to legacy RPC function (get_workspace_by_brand_domain)
  try {
    const { data: rpcResult, error: rpcError } = await supabase
      .rpc('get_workspace_by_brand_domain', { domain_name: domain })
    
    if (!rpcError && rpcResult && rpcResult.length > 0) {
      const workspace = rpcResult[0] as Workspace
      if (process.env.NODE_ENV === 'development') {
        console.log('[Workspace Domain] Found verified workspace via legacy RPC')
      }
      const brandingConfig = (workspace.branding_config || {}) as {
        custom_workspace_domain_verified?: boolean
        custom_brand_domain_verified?: boolean
      }
      return {
        workspace,
        verified: brandingConfig.custom_workspace_domain_verified === true ||
                  brandingConfig.custom_brand_domain_verified === true,
      }
    }
    
    if (rpcError && process.env.NODE_ENV === 'development') {
      console.log('[Workspace Domain] Legacy RPC function not available, using direct query')
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Workspace Domain] RPC functions not available, using direct query')
    }
  }
  
  // Final fallback: Direct query supporting both new and legacy field names
  const normalizedDomain = normalizeDomain(domain)
  if (process.env.NODE_ENV === 'development') {
    console.log('[Workspace Domain] Using normalized domain for fallback query:', normalizedDomain)
  }
  
  // Query for new field name first
  let { data: workspaces, error } = await supabase
    .from('workspaces')
    .select('*')
    .eq('branding_config->>custom_workspace_domain', normalizedDomain)
    .eq('branding_config->>custom_workspace_domain_verified', 'true')
    .is('deleted_at', null)
    .limit(1)

  if (error) {
    console.error('[Workspace Domain] Error fetching workspace (new fields):', error)
  }

  // If not found with new fields, try legacy fields
  if (!workspaces || workspaces.length === 0) {
    const legacyResult = await supabase
      .from('workspaces')
      .select('*')
      .eq('branding_config->>custom_brand_domain', normalizedDomain)
      .eq('branding_config->>custom_brand_domain_verified', 'true')
      .is('deleted_at', null)
      .limit(1)
    
    if (legacyResult.error) {
      console.error('[Workspace Domain] Error fetching workspace (legacy fields):', legacyResult.error)
      return null
    }
    
    workspaces = legacyResult.data
  }

  if (!workspaces || workspaces.length === 0) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Workspace Domain] No verified workspace found for domain:', normalizedDomain)
    }
    return null
  }
  
  const workspace = workspaces[0] as Workspace
  if (process.env.NODE_ENV === 'development') {
    console.log('[Workspace Domain] Found verified workspace')
  }
  const brandingConfig = (workspace.branding_config || {}) as {
    custom_workspace_domain_verified?: boolean
    custom_brand_domain_verified?: boolean
  }

  return {
    workspace,
    verified: brandingConfig.custom_workspace_domain_verified === true ||
              brandingConfig.custom_brand_domain_verified === true,
  }
}

// ==========================================
// LEGACY COMPATIBILITY
// ==========================================

/**
 * @deprecated Use getWorkspaceByWorkspaceDomain instead
 * Legacy alias for backward compatibility
 */
export const getWorkspaceByBrandDomain = getWorkspaceByWorkspaceDomain

