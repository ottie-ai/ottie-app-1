'use client'

import { createClient } from '@/lib/supabase/client'
import type { Workspace, Membership, Profile } from '@/types/database'

/**
 * Centralized workspace and user queries
 * Single source of truth for workspace and profile loading logic
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
 * Fetch user's workspace with fallback logic
 * 
 * @param userId - User ID
 * @param preferredId - Optional preferred workspace ID (from localStorage)
 * @returns Workspace or null if not found
 */
export async function fetchUserWorkspace(
  userId: string,
  preferredId?: string | null
): Promise<Workspace | null> {
  const supabase = createClient()

  let query = supabase
    .from('memberships')
    .select('*, workspace:workspaces!inner(*)')
    .eq('user_id', userId)
    .is('workspace.deleted_at', null)

  // If preferred workspace ID exists, try to load it first
  if (preferredId) {
    query = query.eq('workspace_id', preferredId)
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // If preferred workspace not found, fall back to most recent
  if (error || !data?.workspace) {
    if (preferredId) {
      // Recursive call without preferred ID to get most recent
      return fetchUserWorkspace(userId)
    }
    return null
  }

  // Update localStorage with the actual workspace
  setPreferredWorkspaceId(data.workspace.id)

  return data.workspace as Workspace
}

/**
 * Fetch all workspaces where user is a member
 * 
 * @param userId - User ID
 * @returns Array of workspace and membership pairs
 */
export async function fetchUserWorkspaces(
  userId: string
): Promise<Array<{ workspace: Workspace; membership: Membership }>> {
  const supabase = createClient()

  // First check if user has any memberships at all
  const { data: membershipCheck, error: checkError } = await supabase
    .from('memberships')
    .select('id')
    .eq('user_id', userId)
    .limit(1)

  if (checkError) {
    console.error('Error checking memberships:', checkError)
    return []
  }

  // If no memberships, return empty array (not an error)
  if (!membershipCheck || membershipCheck.length === 0) {
    return []
  }

  // Now fetch with workspace join
  const { data: memberships, error } = await supabase
    .from('memberships')
    .select('*, workspace:workspaces(*)')
    .eq('user_id', userId)
    .is('workspace.deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    // Log error with full details for debugging
    console.error('Error fetching user workspaces:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      fullError: JSON.stringify(error, null, 2)
    })
    return []
  }

  if (!memberships) {
    return []
  }

  return memberships
    .filter(m => m.workspace && !Array.isArray(m.workspace))
    .map(m => ({
      workspace: m.workspace as Workspace,
      membership: {
        id: m.id,
        workspace_id: m.workspace_id,
        user_id: m.user_id,
        role: m.role,
        last_active_at: m.last_active_at,
        created_at: m.created_at,
      } as Membership,
    }))
}

/**
 * Fetch user profile (client-side)
 * 
 * @param userId - User ID
 * @returns Profile or null if not found
 */
export async function fetchUserProfile(userId: string): Promise<Profile | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .is('deleted_at', null)
    .single()

  if (error) {
    console.error('Error fetching profile:', error)
    return null
  }

  return data
}

/**
 * Load workspace with localStorage preference handling
 * This is the main entry point for workspace loading
 * 
 * @param userId - User ID
 * @returns Workspace or null if not found
 */
export async function loadUserWorkspace(userId: string): Promise<Workspace | null> {
  const preferredId = getPreferredWorkspaceId()
  return fetchUserWorkspace(userId, preferredId)
}

/**
 * Load user profile and workspace using batched RPC call
 * Optimizes loading by fetching profile and workspace in a single database call
 * 
 * @param userId - User ID
 * @returns Object with profile and workspace (both can be null)
 */
export async function loadUserData(userId: string): Promise<{
  profile: Profile | null
  workspace: Workspace | null
}> {
  const preferredId = getPreferredWorkspaceId()
  const supabase = createClient()

  // Single batched RPC call for profile and workspace
  const { data: dashboardData, error: rpcError } = await supabase.rpc('get_user_dashboard_data', {
    p_user_id: userId,
    p_preferred_workspace_id: preferredId || null,
  })

  if (rpcError) {
    console.error('Error fetching dashboard data:', rpcError)
    // Fallback to empty data
    return {
      profile: null,
      workspace: null,
    }
  }

  // Parse the RPC result
  const profile = dashboardData?.profile && dashboardData.profile !== 'null' 
    ? (dashboardData.profile as Profile) 
    : null
  const workspace = dashboardData?.workspace && dashboardData.workspace !== 'null'
    ? (dashboardData.workspace as Workspace)
    : null

  // Update localStorage with the actual workspace (if we got one)
  if (workspace?.id) {
    setPreferredWorkspaceId(workspace.id)
  }

  return {
    profile,
    workspace,
  }
}

