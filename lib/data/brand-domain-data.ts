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
  
  // WORKAROUND: JSONB queries with -> operator don't work reliably in Supabase JS client
  // Instead, fetch all workspaces and filter in JS
  const { data: allWorkspaces, error: fetchError } = await supabase
    .from('workspaces')
    .select('*')
    .is('deleted_at', null)
  
  if (fetchError) {
    console.error('[Brand Domain] Error fetching workspaces:', fetchError)
    return null
  }
  
  if (!allWorkspaces || allWorkspaces.length === 0) {
    console.log('[Brand Domain] No workspaces found in database')
    return null
  }
  
  console.log('[Brand Domain] Fetched', allWorkspaces.length, 'workspaces, filtering in JS...')
  
  // Filter in JS to find matching verified brand domain
  const matchingWorkspaces = allWorkspaces.filter((w: any) => {
    const config = w.branding_config as any
    return config?.custom_brand_domain === domain && 
           config?.custom_brand_domain_verified === true
  })
  
  if (matchingWorkspaces.length === 0) {
    console.log('[Brand Domain] No verified workspace found for domain:', domain)
    
    // Debug: Check if domain exists but not verified
    const unverifiedWorkspaces = allWorkspaces.filter((w: any) => {
      const config = w.branding_config as any
      return config?.custom_brand_domain === domain
    })
    
    if (unverifiedWorkspaces.length > 0) {
      console.log('[Brand Domain] Found workspace(s) with this domain but not verified:', 
        unverifiedWorkspaces.map((w: any) => ({
          id: w.id,
          domain: (w.branding_config as any)?.custom_brand_domain,
          verified: (w.branding_config as any)?.custom_brand_domain_verified,
        }))
      )
    }
    
    return null
  }
  
  const workspace = matchingWorkspaces[0] as Workspace
  console.log('[Brand Domain] Found verified workspace:', workspace.id)
  const brandingConfig = (workspace.branding_config || {}) as {
    custom_brand_domain_verified?: boolean
  }

  return {
    workspace,
    verified: brandingConfig.custom_brand_domain_verified === true,
  }
}

