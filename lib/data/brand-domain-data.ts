import type { Workspace } from '@/types/database'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * Get workspace by brand domain (edge-compatible for middleware)
 * This version works in middleware by using request cookies directly
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

  console.log('[Brand Domain] Looking up domain:', domain)
  
  // First, try to find workspace with this domain (even if not verified) for debugging
  const { data: allWorkspaces, error: debugError } = await supabase
    .from('workspaces')
    .select('id, branding_config')
    .eq('branding_config->>custom_brand_domain', domain)
    .is('deleted_at', null)
    .limit(5)
  
  if (allWorkspaces && allWorkspaces.length > 0) {
    console.log('[Brand Domain] Found workspace(s) with this domain (may not be verified):', 
      allWorkspaces.map(w => ({
        id: w.id,
        domain: (w.branding_config as any)?.custom_brand_domain,
        verified: (w.branding_config as any)?.custom_brand_domain_verified,
      }))
    )
  } else {
    console.log('[Brand Domain] No workspace found with this domain at all')
    // Try case-insensitive search
    const { data: caseInsensitive } = await supabase
      .from('workspaces')
      .select('id, branding_config')
      .is('deleted_at', null)
      .limit(10)
    
    if (caseInsensitive) {
      const matching = caseInsensitive.filter(w => {
        const config = w.branding_config as any
        const storedDomain = config?.custom_brand_domain
        return storedDomain && storedDomain.toLowerCase() === domain.toLowerCase()
      })
      if (matching.length > 0) {
        console.log('[Brand Domain] Found case-insensitive match:', matching.map(w => ({
          id: w.id,
          domain: (w.branding_config as any)?.custom_brand_domain,
          verified: (w.branding_config as any)?.custom_brand_domain_verified,
        })))
      }
    }
  }
  
  // Query workspaces with verified brand domain
  const { data: workspaces, error } = await supabase
    .from('workspaces')
    .select('*')
    .eq('branding_config->>custom_brand_domain', domain)
    .eq('branding_config->>custom_brand_domain_verified', 'true')
    .is('deleted_at', null)
    .limit(1)

  if (error) {
    console.error('[Brand Domain] Error fetching workspace:', error)
    return null
  }

  if (!workspaces || workspaces.length === 0) {
    console.log('[Brand Domain] No workspace found for domain:', domain)
    // Try to find workspace with this domain even if not verified (for debugging)
    const { data: allWorkspaces } = await supabase
      .from('workspaces')
      .select('id, branding_config')
      .eq('branding_config->>custom_brand_domain', domain)
      .is('deleted_at', null)
      .limit(1)
    
    if (allWorkspaces && allWorkspaces.length > 0) {
      const config = allWorkspaces[0].branding_config as any
      console.log('[Brand Domain] Found workspace but domain not verified:', {
        workspaceId: allWorkspaces[0].id,
        domain: config?.custom_brand_domain,
        verified: config?.custom_brand_domain_verified,
      })
    }
    return null
  }
  
  console.log('[Brand Domain] Found verified workspace:', workspaces[0].id)

  const workspace = workspaces[0] as Workspace
  const brandingConfig = (workspace.branding_config || {}) as {
    custom_brand_domain_verified?: boolean
  }

  return {
    workspace,
    verified: brandingConfig.custom_brand_domain_verified === true,
  }
}

