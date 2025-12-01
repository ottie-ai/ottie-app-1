'use server'

import { createClient } from '@/lib/supabase/server'
import type { Workspace, Membership } from '@/types/database'

/**
 * Centralized workspace data queries
 * Server-side functions for fetching workspace data
 */

/**
 * Get preferred workspace ID from localStorage (client-side only)
 * For server-side, this should be passed as parameter
 */
function getPreferredWorkspaceId(): string | null {
  // Server-side: always return null (preferred ID should be passed as parameter)
  return null
}

/**
 * Fetch user's current workspace with membership
 * 
 * @param userId - User ID
 * @param preferredWorkspaceId - Optional preferred workspace ID
 * @returns Workspace and membership, or null if not found
 */
export async function getCurrentUserWorkspace(
  userId: string,
  preferredWorkspaceId?: string | null
): Promise<{ workspace: Workspace; membership: Membership } | null> {
  const supabase = await createClient()

  let query = supabase
    .from('memberships')
    .select('*, workspace:workspaces!inner(*)')
    .eq('user_id', userId)
    .is('workspace.deleted_at', null)

  // If preferred workspace ID exists, try to load it first
  if (preferredWorkspaceId) {
    query = query.eq('workspace_id', preferredWorkspaceId)
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // If preferred workspace not found, fall back to most recent
  if (error || !data?.workspace) {
    if (preferredWorkspaceId) {
      // Recursive call without preferred ID to get most recent
      return getCurrentUserWorkspace(userId)
    }
    return null
  }

  return {
    workspace: data.workspace as Workspace,
    membership: {
      id: data.id,
      workspace_id: data.workspace_id,
      user_id: data.user_id,
      role: data.role,
      last_active_at: data.last_active_at,
      created_at: data.created_at,
    } as Membership,
  }
}

/**
 * Fetch all workspaces where user is a member
 * 
 * @param userId - User ID
 * @returns Array of workspace and role pairs
 */
export async function getAllUserWorkspaces(
  userId: string
): Promise<Array<{ workspace: Workspace; role: string }>> {
  const supabase = await createClient()

  const { data: memberships, error } = await supabase
    .from('memberships')
    .select('role, workspace:workspaces!inner(*)')
    .eq('user_id', userId)
    .is('workspace.deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching user workspaces:', error)
    return []
  }

  if (!memberships) {
    return []
  }

  return memberships
    .filter(m => m.workspace)
    .map(m => ({
      workspace: m.workspace as Workspace,
      role: m.role,
    }))
}

