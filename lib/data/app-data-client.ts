'use client'

import { createClient } from '@/lib/supabase/client'
import type { Profile, Workspace, Membership } from '@/types/database'

/**
 * Client-side version of loadAppData
 * Uses localStorage for preferred workspace ID
 */

/**
 * Get preferred workspace ID from localStorage
 */
function getPreferredWorkspaceId(): string | null {
  if (typeof window === 'undefined') {
    return null
  }
  return localStorage.getItem('current_workspace_id')
}

/**
 * Update preferred workspace ID in localStorage
 */
function setPreferredWorkspaceId(workspaceId: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('current_workspace_id', workspaceId)
  }
}

/**
 * Load all app data (client-side)
 * Uses RPC function for batched queries
 * 
 * @param userId - User ID
 * @returns Complete app data object
 */
export async function loadAppData(userId: string): Promise<{
  profile: Profile | null
  currentWorkspace: Workspace | null
  currentMembership: Membership | null
  allWorkspaces: Array<{ workspace: Workspace; role: string }>
}> {
  const supabase = createClient()
  const preferredId = getPreferredWorkspaceId()

  // Use RPC for batched query
  const { data: dashboardData, error: rpcError } = await supabase.rpc('get_user_dashboard_data', {
    p_user_id: userId,
    p_preferred_workspace_id: preferredId || null,
  })

  let profile: Profile | null = null
  let currentWorkspace: Workspace | null = null
  let currentMembership: Membership | null = null

  if (rpcError) {
    console.error('Error fetching dashboard data:', rpcError)
    // Fallback to empty data
    return {
      profile: null,
      currentWorkspace: null,
      currentMembership: null,
      allWorkspaces: [],
    }
  }

  // Parse the RPC result
  profile = dashboardData?.profile && dashboardData.profile !== 'null' 
    ? (dashboardData.profile as Profile) 
    : null
  currentWorkspace = dashboardData?.workspace && dashboardData.workspace !== 'null'
    ? (dashboardData.workspace as Workspace)
    : null
  currentMembership = dashboardData?.membership && dashboardData.membership !== 'null'
    ? (dashboardData.membership as Membership)
    : null

  // Update localStorage with the actual workspace (if we got one)
  if (currentWorkspace?.id) {
    setPreferredWorkspaceId(currentWorkspace.id)
  }

  // Fetch all workspaces separately
  const { data: memberships, error: workspacesError } = await supabase
    .from('memberships')
    .select('role, workspace:workspaces!inner(*)')
    .eq('user_id', userId)
    .is('workspace.deleted_at', null)
    .order('created_at', { ascending: false })

  const allWorkspaces = workspacesError || !memberships
    ? []
    : memberships
        .filter(m => m.workspace)
        .map(m => ({
          workspace: m.workspace as Workspace,
          role: m.role,
        }))

  return {
    profile,
    currentWorkspace,
    currentMembership,
    allWorkspaces,
  }
}

