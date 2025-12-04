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
      status: (data.status || 'active') as Membership['status'],
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
    .filter(m => m.workspace && !Array.isArray(m.workspace))
    .map(m => ({
      workspace: m.workspace as unknown as Workspace,
      role: m.role,
    }))
}

/**
 * Check if workspace is locked due to subscription issues
 * 
 * @param workspaceId - Workspace ID
 * @returns true if workspace is locked, false otherwise
 */
export async function isWorkspaceLocked(workspaceId: string): Promise<boolean> {
  const supabase = await createClient()
  
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('subscription_status, seats_limit, seats_used, grace_period_ends_at')
    .eq('id', workspaceId)
    .single()
  
  if (!workspace) return false
  
  // Check if over seats limit
  if (workspace.seats_used > workspace.seats_limit) {
    return true
  }
  
  // Check subscription status
  if (workspace.subscription_status === 'unpaid' || workspace.subscription_status === 'canceled') {
    // Check if grace period expired
    if (workspace.grace_period_ends_at) {
      const graceEnds = new Date(workspace.grace_period_ends_at)
      return graceEnds < new Date()
    }
    return true
  }
  
  // If in grace period, check if it's expired
  if (workspace.subscription_status === 'grace_period' && workspace.grace_period_ends_at) {
    const graceEnds = new Date(workspace.grace_period_ends_at)
    return graceEnds < new Date()
  }
  
  return false
}

/**
 * Check if user has access to workspace (considering subscription status)
 * 
 * @param userId - User ID
 * @param workspaceId - Workspace ID
 * @returns Object with hasAccess, isOwner, and optional reason
 */
export async function canUserAccessWorkspace(
  userId: string,
  workspaceId: string
): Promise<{ hasAccess: boolean; isOwner: boolean; reason?: string }> {
  const supabase = await createClient()
  
  // Get user's membership
  const { data: membership } = await supabase
    .from('memberships')
    .select('role, status')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .single()
  
  if (!membership) {
    return { hasAccess: false, isOwner: false, reason: 'Not a member' }
  }
  
  const isOwner = membership.role === 'owner'
  
  // Owner always has access
  if (isOwner) {
    return { hasAccess: true, isOwner: true }
  }
  
  // Non-owners need active status and workspace must not be locked
  if (membership.status !== 'active') {
    return { hasAccess: false, isOwner: false, reason: 'Membership inactive' }
  }
  
  const isLocked = await isWorkspaceLocked(workspaceId)
  if (isLocked) {
    return { hasAccess: false, isOwner: false, reason: 'Workspace locked' }
  }
  
  return { hasAccess: true, isOwner: false }
}

