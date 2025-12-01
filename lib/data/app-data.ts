'use server'

import { createClient } from '@/lib/supabase/server'
import { getUserProfile } from './user-data'
import { getCurrentUserWorkspace, getAllUserWorkspaces } from './workspace-data'
import type { Profile, Workspace, Membership } from '@/types/database'

/**
 * Load all app data in a single optimized call
 * Uses RPC function for batched queries when possible
 * 
 * @param userId - User ID
 * @param preferredWorkspaceId - Optional preferred workspace ID (from localStorage on client)
 * @returns Complete app data object
 */
export async function loadAppData(
  userId: string,
  preferredWorkspaceId?: string | null
): Promise<{
  profile: Profile | null
  currentWorkspace: Workspace | null
  currentMembership: Membership | null
  allWorkspaces: Array<{ workspace: Workspace; role: string }>
}> {
  const supabase = await createClient()

  // Get preferred workspace ID (for client-side, this comes from localStorage)
  // For server-side, it should be passed as parameter
  const preferredId = preferredWorkspaceId || null

  // Try to use RPC for batched query (profile + workspace + membership)
  const { data: dashboardData, error: rpcError } = await supabase.rpc('get_user_dashboard_data', {
    p_user_id: userId,
    p_preferred_workspace_id: preferredId,
  })

  let profile: Profile | null = null
  let currentWorkspace: Workspace | null = null
  let currentMembership: Membership | null = null

  // If RPC succeeds, use the batched data
  if (!rpcError && dashboardData) {
    profile = dashboardData?.profile && dashboardData.profile !== 'null' 
      ? (dashboardData.profile as Profile) 
      : null
    currentWorkspace = dashboardData?.workspace && dashboardData.workspace !== 'null'
      ? (dashboardData.workspace as Workspace)
      : null
    currentMembership = dashboardData?.membership && dashboardData.membership !== 'null'
      ? (dashboardData.membership as Membership)
      : null
  } else {
    // Fallback to parallel queries if RPC fails
    console.warn('RPC failed, falling back to parallel queries:', rpcError)
    const [profileResult, workspaceResult] = await Promise.all([
      getUserProfile(userId),
      getCurrentUserWorkspace(userId, preferredId),
    ])

    profile = profileResult
    currentWorkspace = workspaceResult?.workspace || null
    currentMembership = workspaceResult?.membership || null
  }

  // Parse allWorkspaces from RPC result (now included in the RPC call)
  let allWorkspaces: Array<{ workspace: Workspace; role: string }> = []
  
  if (!rpcError && dashboardData?.allWorkspaces && Array.isArray(dashboardData.allWorkspaces)) {
    allWorkspaces = dashboardData.allWorkspaces
      .filter((item: any) => item.workspace && !Array.isArray(item.workspace))
      .map((item: any) => ({
        workspace: item.workspace as Workspace,
        role: item.role,
      }))
  } else {
    // Fallback to separate query if RPC doesn't include allWorkspaces
    allWorkspaces = await getAllUserWorkspaces(userId)
  }

  return {
    profile,
    currentWorkspace,
    currentMembership,
    allWorkspaces,
  }
}

