import type { Workspace } from '@/types/database'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

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
 * Get workspace by brand domain (edge-compatible for middleware)
 * This version works in middleware by using request cookies directly
 * Supports both www and non-www variants
 */
export async function getWorkspaceByBrandDomain(
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
      console.error('[Brand Domain] Missing Supabase environment variables')
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
    console.log('[Brand Domain] Looking up domain:', domain)
  }
  
  // Use RPC function for secure and performant lookup
  // RPC function handles normalization internally
  // Falls back to direct query if RPC doesn't exist
  try {
    const { data: rpcResult, error: rpcError } = await supabase
      .rpc('get_workspace_by_brand_domain', { domain_name: domain })
    
    if (!rpcError && rpcResult && rpcResult.length > 0) {
      const workspace = rpcResult[0] as Workspace
      // Only log in development - avoid exposing workspace IDs in production
      if (process.env.NODE_ENV === 'development') {
        console.log('[Brand Domain] Found verified workspace via RPC:', workspace.id)
      }
      const brandingConfig = (workspace.branding_config || {}) as {
        custom_brand_domain_verified?: boolean
      }
      return {
        workspace,
        verified: brandingConfig.custom_brand_domain_verified === true,
      }
    }
    
    if (rpcError) {
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.log('[Brand Domain] RPC function not available, using direct query:', rpcError.message)
      }
    }
  } catch (error) {
    // Only log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Brand Domain] RPC function not available, using direct query')
    }
  }
  
  // Fallback: Use direct query with correct JSONB syntax
  // Normalize domain for fallback query (remove www prefix)
  const normalizedDomain = normalizeDomain(domain)
  // Only log in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Brand Domain] Using normalized domain for fallback query:', normalizedDomain)
  }
  
  // Note: ->> returns text, so we compare with string 'true'
  const { data: workspaces, error } = await supabase
    .from('workspaces')
    .select('*')
    .eq('branding_config->>custom_brand_domain', normalizedDomain)
    .eq('branding_config->>custom_brand_domain_verified', 'true') // Compare with string 'true'
    .is('deleted_at', null)
    .limit(1)

  if (error) {
    console.error('[Brand Domain] Error fetching workspace:', error)
    return null
  }

  if (!workspaces || workspaces.length === 0) {
    // Only log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Brand Domain] No verified workspace found for domain:', normalizedDomain)
    }
    return null
  }
  
  const workspace = workspaces[0] as Workspace
  // Only log in development - avoid exposing workspace IDs in production
  if (process.env.NODE_ENV === 'development') {
    console.log('[Brand Domain] Found verified workspace:', workspace.id)
  }
  const brandingConfig = (workspace.branding_config || {}) as {
    custom_brand_domain_verified?: boolean
  }

  return {
    workspace,
    verified: brandingConfig.custom_brand_domain_verified === true,
  }
}

