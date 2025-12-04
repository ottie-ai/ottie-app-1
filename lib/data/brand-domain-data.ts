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
    return null
  }

  const workspace = workspaces[0] as Workspace
  const brandingConfig = (workspace.branding_config || {}) as {
    custom_brand_domain_verified?: boolean
  }

  return {
    workspace,
    verified: brandingConfig.custom_brand_domain_verified === true,
  }
}

