'use server'

import { createClient } from '@/lib/supabase/server'
import type { Workspace } from '@/types/database'

/**
 * Get workspace by brand domain
 * Used in middleware to route brand domain requests
 */
export async function getWorkspaceByBrandDomain(
  domain: string
): Promise<{ workspace: Workspace; verified: boolean } | null> {
  const supabase = await createClient()

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

